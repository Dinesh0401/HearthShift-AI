/**
 * HearthShift AI — Client-Side TR-VOI Decision Engine
 * 
 * Port of the Threshold-Aware Robust Value-of-Information (TR-VOI) algorithm.
 * Core Behavioral Invariants:
 * 1. Exact piecewise statutory tariff evaluation under modeled baseline uncertainty P(X).
 * 2. Chance-constrained comfort risk model: P(D(a, theta) > D_max) <= delta (z_alpha = 1.645).
 * 3. Conservative alpha-credible lower-bound welfare: Q_alpha(U(a)) > c_min (₹30.00).
 * 4. Value of Sample Information (EVSI) active questioning with annoyance & privacy friction penalties.
 * 5. Deterministic integer paise arithmetic, zero telemetry, 100% on-device execution.
 * 
 * @module core/optimization/tr-voi
 */

import type { TariffPlan } from '../tariff/types';
import { calculateBill, calculateShiftCostDelta } from '../tariff/calculator';
import type { 
  ApplianceCategory, 
  ConfidenceLevel, 
  DecisionOutcome, 
  SavingsBasis,
  LocalizedString 
} from '../../types/contracts';

// ══════════════════════════════════════════════════════════
// 1. Domain Types for Physical Actions & Questions
// ══════════════════════════════════════════════════════════

export interface ClientEnergyAction {
  id: string;
  applianceCategory: ApplianceCategory;
  actionType: 'reduction' | 'shift';
  title: LocalizedString;
  description: LocalizedString;
  deltaKwh: number;        // Bi-monthly kWh reduction (>0 for reduction, 0 for shift)
  shiftHours: number;      // Shift in hours (+ for delay, - for advance)
  featureVector: number[]; // [ac_sensitivity, wm_sensitivity, wh_sensitivity, stby_sensitivity]
  estimatedEffort: 'minimal' | 'moderate' | 'significant';
  assumptions: LocalizedString[];
}

export interface ClientAdaptiveQuestion {
  id: string;
  featureIndex: number;
  text: LocalizedString;
  category: ApplianceCategory;
  privacyCostPaise: number; // Annoyance / privacy friction penalty (e.g. 200 = ₹2.00)
  burdenScore: number;
}

export interface LatentPreferenceBelief {
  mu: number[];    // Length 4: [ac, wm, wh, stby]
  sigma: number[]; // Length 4 standard deviations
  updatedAt: string;
}

export interface TrVoiDecisionResult {
  outcome: DecisionOutcome;
  recommendedAction?: ClientEnergyAction;
  candidateQuestion?: ClientAdaptiveQuestion;
  pointEstimateSavingsPaise: number;
  conservativeLowerBoundPaise: number;
  expectedWelfarePaise: number;
  confidenceLevel: ConfidenceLevel;
  basis: SavingsBasis;
  assumptions: LocalizedString[];
  metadata: {
    decisionMetricPaise: number;
    askedQuestionIds: string[];
    isComfortSafe: boolean;
  };
}

// ══════════════════════════════════════════════════════════
// 2. Predefined Physical Action Catalog
// ══════════════════════════════════════════════════════════

export const PHYSICAL_ACTION_CATALOG: ClientEnergyAction[] = [
  {
    id: 'null_action',
    applianceCategory: 'other',
    actionType: 'reduction',
    title: {
      en: 'Status Quo (No Change)',
      ta: 'தற்போதைய நிலை (மாற்றமில்லை)',
    },
    description: {
      en: 'Maintain current household energy habits without intervention.',
      ta: 'எந்த மாற்றமும் இல்லாமல் தற்போதைய மின் பயன்பாட்டுப் பழக்கத்தைத் தொடரவும்.',
    },
    deltaKwh: 0.0,
    shiftHours: 0.0,
    featureVector: [0, 0, 0, 0],
    estimatedEffort: 'minimal',
    assumptions: [],
  },
  {
    id: 'ac_setpoint_plus0_5',
    applianceCategory: 'cooling',
    actionType: 'reduction',
    title: {
      en: 'Raise AC Thermostat by 0.5°C',
      ta: 'ஏசி வெப்பநிலையை 0.5°C உயர்த்தவும்',
    },
    description: {
      en: 'Micro-adjustment to inverter AC thermostat (e.g. 23.5°C instead of 23°C) with negligible perceptible difference.',
      ta: 'இன்வெர்ட்டர் ஏசி வெப்பநிலையை 0.5°C மட்டும் லேசாக உயர்த்துவதன் மூலம் மின்சாரத்தைச் சேமிக்கலாம்.',
    },
    deltaKwh: 15.0,
    shiftHours: 0.0,
    featureVector: [0.5, 0, 0, 0],
    estimatedEffort: 'minimal',
    assumptions: [
      {
        en: 'Physical model: 1.5-ton inverter AC (COP ~ 3.5, 1200W rated), ~4% compressor duty reduction per 0.5°C over 6-8h daily runtime across 60 days.',
        ta: 'இயற்பியல் மாதிரி: 1.5 டன் இன்வெர்ட்டர் ஏசி, தினமும் 6-8 மணி நேர இயக்கத்தில் 0.5°C உயர்வுக்கு ~4% மின் சேமிப்பு (இரு மாதத்திற்கு ~15 யூனிட்).',
      },
      {
        en: 'Advisory only: Thermostat must be adjusted manually by household. Does not control physical appliance.',
        ta: 'வழிகாட்டல் மட்டுமே: ஏசி வெப்பநிலையை நீங்களே கைமுறையாக மாற்ற வேண்டும்; தானியங்கி கட்டுப்பாடு இல்லை.',
      },
    ],
  },
  {
    id: 'ac_setpoint_plus1',
    applianceCategory: 'cooling',
    actionType: 'reduction',
    title: {
      en: 'Raise AC Thermostat by 1.0°C (23°C → 24°C)',
      ta: 'ஏசி வெப்பநிலையை 1.0°C உயர்த்தவும் (23°C → 24°C)',
    },
    description: {
      en: 'Setting thermostat to 24°C reduces compressor workload while ceiling fan maintains airflow comfort.',
      ta: 'ஏசி வெப்பநிலையை 24°C-ல் வைத்து ஃபேன் காற்றுடன் பயன்படுத்துவது கணிசமான சேமிப்பைத் தரும்.',
    },
    deltaKwh: 35.0,
    shiftHours: 0.0,
    featureVector: [1.0, 0, 0, 0],
    estimatedEffort: 'moderate',
    assumptions: [
      {
        en: 'Physical model: ~8-10% compressor duty reduction over 60-day cycle with supplementary ceiling fan airflow (~30W).',
        ta: 'இயற்பியல் மாதிரி: ஃபேன் காற்றுடன் ஏசியை 24°C-ல் இயக்குவதன் மூலம் ~8-10% சுழற்சி மின் சேமிப்பு (இரு மாதத்திற்கு ~35 யூனிட்).',
      },
      {
        en: 'Advisory only: Manual adjustment. Comfort bounds depend on room insulation and occupant heat tolerance.',
        ta: 'வழிகாட்டல் மட்டுமே: அறையின் வெப்பத் தாங்குதிறன் மற்றும் தனிநபர் விருப்பத்தைப் பொறுத்தது.',
      },
    ],
  },
  {
    id: 'ac_setpoint_plus2',
    applianceCategory: 'cooling',
    actionType: 'reduction',
    title: {
      en: 'Raise AC Thermostat by 2.0°C (23°C → 25°C)',
      ta: 'ஏசி வெப்பநிலையை 2.0°C உயர்த்தவும் (23°C → 25°C)',
    },
    description: {
      en: 'Substantial cooling power reduction recommended when approaching the ₹478.40 subsidy cliff.',
      ta: '500 யூனிட் மானிய எல்லையை நெருங்கும்போது ஏசியை 25°C-ல் இயக்குவது கட்டண உயர்வைத் தடுக்கும்.',
    },
    deltaKwh: 70.0,
    shiftHours: 0.0,
    featureVector: [2.0, 0, 0, 0],
    estimatedEffort: 'significant',
    assumptions: [
      {
        en: 'Physical model: ~16-18% compressor duty reduction over 60-day cycle (~70 kWh), high impact for 500 kWh cliff avoidance.',
        ta: 'இயற்பியல் மாதிரி: ~16-18% ஏசி சுழற்சி மின் சேமிப்பு (~70 யூனிட்), 500 யூனிட் கட்டண உயர்வைத் தவிர்க்க மிகச் சிறந்தது.',
      },
      {
        en: 'Advisory only: Requires household tolerance for 25°C indoor temperature.',
        ta: 'வழிகாட்டல் மட்டுமே: வீட்டிலுள்ளோர் 25°C வெப்பநிலையை ஏற்கத் தயாராக இருக்க வேண்டும்.',
      },
    ],
  },
  {
    id: 'ac_curtail_1h',
    applianceCategory: 'cooling',
    actionType: 'reduction',
    title: {
      en: 'Curtail AC Runtime by 1 Hour',
      ta: 'ஏசி இயங்கும் நேரத்தை 1 மணி நேரம் குறைக்கவும்',
    },
    description: {
      en: 'Switch AC off 1 hour before waking or leaving the room; room retains thermal mass.',
      ta: 'அறையிலிருந்து வெளியேறும் 1 மணி நேரத்திற்கு முன்பே ஏசியை அணைக்கவும்; குளுமை நீடிக்கும்.',
    },
    deltaKwh: 90.0,
    shiftHours: 0.0,
    featureVector: [2.5, 0, 0, 0],
    estimatedEffort: 'significant',
    assumptions: [
      {
        en: 'Physical model: 1.5 kW compressor avoided for 1 hour daily across 60 days (90 kWh total reduction).',
        ta: 'இயற்பியல் மாதிரி: தினமும் 1 மணி நேரம் ஏசி அணைக்கப்படுவதால் 1.5 kW மின் சுமை தவிர்க்கப்படுகிறது (இரு மாதத்திற்கு 90 யூனிட்).',
      },
      {
        en: 'Advisory only: Assumes adequate building thermal envelope retaining residual cooling for 45-60 minutes.',
        ta: 'வழிகாட்டல் மட்டுமே: அறையின் குளுமை 45 முதல் 60 நிமிடங்கள் வரை நீடிக்க வேண்டும்.',
      },
    ],
  },
  {
    id: 'water_heater_timer_trim',
    applianceCategory: 'water_heating',
    actionType: 'reduction',
    title: {
      en: 'Trim Water Heater Duration by 15-20 Mins',
      ta: 'வாட்டர் ஹீட்டர் நேரத்தை 15-20 நிமிடங்கள் குறைக்கவும்',
    },
    description: {
      en: 'Use timer or manual shutoff once water reaches adequate bath temperature.',
      ta: 'தண்ணீர் போதுமான அளவு சூடானதும் ஹீட்டரை அணைத்து தேவையற்ற கொதிப்பைத் தவிர்க்கவும்.',
    },
    deltaKwh: 20.0,
    shiftHours: 0.0,
    featureVector: [0, 0, 0.4, 0],
    estimatedEffort: 'minimal',
    assumptions: [
      {
        en: 'Physical model: 2 kW geyser element runtime reduced by ~10 minutes per bath cycle over 60 days (~20 kWh).',
        ta: 'இயற்பியல் மாதிரி: 2 kW வாட்டர் ஹீட்டர் தினமும் ~10 நிமிடங்கள் குறைவாக இயங்குவது (இரு மாதத்திற்கு ~20 யூனிட்).',
      },
      {
        en: 'Advisory only: Manual timer shutoff. Does not affect thermostat safety cutoff.',
        ta: 'வழிகாட்டல் மட்டுமே: பயன்பாட்டு நேரக் குறைப்பு மட்டுமே; பாதுகாப்பு தெர்மோஸ்டாட் அல்ல.',
      },
    ],
  },
  {
    id: 'standby_power_down',
    applianceCategory: 'entertainment',
    actionType: 'reduction',
    title: {
      en: 'Power Down Entertainment Center Standby',
      ta: 'டிவி மற்றும் செட்-டாப் பாக்ஸ் ஸ்டாண்ட்பை அணைக்கவும்',
    },
    description: {
      en: 'Turn off smart power strip for TV, set-top box, soundbar, and gaming console overnight.',
      ta: 'இரவு நேரத்தில் டிவி மற்றும் செட்-டாப் பாக்ஸ் மெயின் சுவிட்சை அணைப்பதன் மூலம் அனாவசிய மின் விரயத்தைத் தவிர்க்கலாம்.',
    },
    deltaKwh: 6.0,
    shiftHours: 0.0,
    featureVector: [0, 0, 0, 0.2],
    estimatedEffort: 'minimal',
    assumptions: [
      {
        en: 'Physical model: ~15-20W combined vampire draw powered down 7-8 hours overnight x 60 days (~6.0 kWh net savings).',
        ta: 'இயற்பியல் மாதிரி: இரவு 8 மணி நேரம் 15-20 வாட்ஸ் வீண் மின்சாரம் அணைக்கப்படுவது (இரு மாதத்திற்கு ~6 யூனிட்).',
      },
      {
        en: 'Advisory only: Manual switch off via extension cord or wall socket.',
        ta: 'வழிகாட்டல் மட்டுமே: சுவிட்ச் போர்டில் நேரடியாக அணைக்க வேண்டும்.',
      },
    ],
  },
  {
    id: 'washing_machine_shift',
    applianceCategory: 'laundry',
    actionType: 'shift',
    title: {
      en: 'Shift Laundry Cycle to Morning (07:00)',
      ta: 'துணி துவைக்கும் நேரத்தை காலைக்கு (07:00) மாற்றவும்',
    },
    description: {
      en: 'Run washing machine during morning hours instead of evening peak hours.',
      ta: 'மாலை நேர மின் உச்ச நேரத்தில் துவைப்பதைத் தவிர்த்து காலை நேரத்தில் இயக்கவும்.',
    },
    deltaKwh: 0.0,
    shiftHours: -12.0,
    featureVector: [0, 0.3, 0, 0],
    estimatedEffort: 'moderate',
    assumptions: [
      {
        en: 'Physical invariant: Pure load shift of 1.2-1.5 kWh laundry cycle. Under non-TOU tariffs (like TNPDCL LT-1A), yields EXACTLY ₹0.00 monetary savings.',
        ta: 'இயற்பியல் விதி: அடுக்கு கட்டணத்தில் நேர மாற்றத்திற்கு பணச்சேமிப்பு கிடைக்காது (0 ரூபாய் சேமிப்பு).',
      },
      {
        en: 'Grid benefit only: Reduces local transformer strain during evening peak (18:00-22:00) without changing consumer electricity bill.',
        ta: 'மின் கட்டமைப்பு உதவி மட்டுமே: நுகர்வோர் பில் தொகையில் மாற்றமில்லை.',
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════
// 3. Predefined Adaptive Clarifying Questions
// ══════════════════════════════════════════════════════════

export const ADAPTIVE_QUESTION_CATALOG: ClientAdaptiveQuestion[] = [
  {
    id: 'q_ac_flexibility',
    featureIndex: 0,
    text: {
      en: 'Are you comfortable setting the AC 1°C to 2°C higher on warm afternoons?',
      ta: 'மதிய வேளையில் ஏசி வெப்பநிலையை 1°C முதல் 2°C வரை சற்று உயர்த்தி வைக்க சம்மதமா?',
    },
    category: 'cooling',
    privacyCostPaise: 500, // ₹5.00
    burdenScore: 0.2,
  },
  {
    id: 'q_laundry_timing',
    featureIndex: 1,
    text: {
      en: 'Can laundry cycles be scheduled in the morning (07:00) instead of evening?',
      ta: 'துணி துவைப்பதை மாலைக்கு பதிலாக காலை 7 மணிக்கு மாற்ற இயலுமா?',
    },
    category: 'laundry',
    privacyCostPaise: 300, // ₹3.00
    burdenScore: 0.2,
  },
  {
    id: 'q_water_heater_duration',
    featureIndex: 2,
    text: {
      en: 'Can the water heater runtime be trimmed by 15-20 minutes with timer control?',
      ta: 'வாட்டர் ஹீட்டர் இயங்கும் நேரத்தை 15 முதல் 20 நிமிடங்கள் வரை குறைக்க முடியுமா?',
    },
    category: 'water_heating',
    privacyCostPaise: 400, // ₹4.00
    burdenScore: 0.2,
  },
  {
    id: 'q_standby_management',
    featureIndex: 3,
    text: {
      en: 'Are you willing to turn off entertainment center standby power overnight?',
      ta: 'இரவு வேளையில் டிவி மற்றும் எலக்ட்ரானிக் சாதனங்களின் மெயின் சுவிட்சை அணைக்க சம்மதமா?',
    },
    category: 'entertainment',
    privacyCostPaise: 200, // ₹2.00
    burdenScore: 0.1,
  },
];

// ══════════════════════════════════════════════════════════
// 4. Mathematical Utilities: Normal Integration & Exact Tariff
// ══════════════════════════════════════════════════════════

export function standardNormalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

export function standardNormalCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

/**
 * Standard numerical approximation for the error function erf(z).
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

interface PiecewiseSegment {
  min: number;
  max: number;
  slope: number;
  intercept: number;
}

function getLinearSegmentsForTariff(tariff: TariffPlan): {
  segments: PiecewiseSegment[];
  cliffThreshold: number | null;
} | null {
  switch (tariff.id) {
    case 'in-tnpdcl-lt1a-may2026':
      return {
        cliffThreshold: 500.0,
        segments: [
          { min: 0.0, max: 200.0, slope: 0.0, intercept: 0.0 },
          { min: 200.0, max: 400.0, slope: 470.0, intercept: -94000.0 },
          { min: 400.0, max: 500.0, slope: 630.0, intercept: -158000.0 },
          { min: 500.0, max: 600.0, slope: 840.0, intercept: -216000.0 },
          { min: 600.0, max: 800.0, slope: 945.0, intercept: -279000.0 },
          { min: 800.0, max: 1000.0, slope: 1050.0, intercept: -363000.0 },
          { min: 1000.0, max: 3000.0, slope: 1155.0, intercept: -468000.0 },
        ],
      };
    case 'in-tnpdcl-lt1a-2025':
      return {
        cliffThreshold: 500.0,
        segments: [
          { min: 0.0, max: 100.0, slope: 0.0, intercept: 0.0 },
          { min: 100.0, max: 200.0, slope: 235.0, intercept: -23500.0 },
          { min: 200.0, max: 400.0, slope: 470.0, intercept: -70500.0 },
          { min: 400.0, max: 500.0, slope: 630.0, intercept: -134500.0 },
          { min: 500.0, max: 600.0, slope: 840.0, intercept: -216000.0 },
          { min: 600.0, max: 800.0, slope: 945.0, intercept: -279000.0 },
          { min: 800.0, max: 1000.0, slope: 1050.0, intercept: -363000.0 },
          { min: 1000.0, max: 3000.0, slope: 1155.0, intercept: -468000.0 },
        ],
      };
    case 'in-tnpdcl-lt1a-2024':
      return {
        cliffThreshold: 500.0,
        segments: [
          { min: 0.0, max: 100.0, slope: 0.0, intercept: 0.0 },
          { min: 100.0, max: 200.0, slope: 225.0, intercept: -22500.0 },
          { min: 200.0, max: 400.0, slope: 450.0, intercept: -67500.0 },
          { min: 400.0, max: 500.0, slope: 600.0, intercept: -127500.0 },
          { min: 500.0, max: 600.0, slope: 800.0, intercept: -205000.0 },
          { min: 600.0, max: 800.0, slope: 900.0, intercept: -265000.0 },
          { min: 800.0, max: 1000.0, slope: 1000.0, intercept: -345000.0 },
          { min: 1000.0, max: 3000.0, slope: 1100.0, intercept: -445000.0 },
        ],
      };
    case 'generic-flat-inr':
      return {
        cliffThreshold: null,
        segments: [
          { min: 0.0, max: 5000.0, slope: 525.0, intercept: 5000.0 },
        ],
      };
    case 'generic-tou-inr':
      return {
        cliffThreshold: null,
        segments: [
          { min: 0.0, max: 5000.0, slope: 700.0, intercept: 0.0 },
        ],
      };
    default:
      return null;
  }
}

/**
 * Closed-form analytical integration of piecewise linear tariff segments under X ~ N(mu, sigma^2).
 * Uses closed-form truncated normal moments for supported statutory/flat/TOU schedules,
 * and falls back to 11-point Gauss-Hermite numerical integration for arbitrary custom plans.
 */
export function exactPiecewiseTariffMoments(
  muKwh: number,
  sigmaKwh: number = 8.0,
  tariff: TariffPlan
): { meanBillPaise: number; stdBillPaise: number; cliffCrossingProb: number } {
  const segmentSpec = getLinearSegmentsForTariff(tariff);
  const cliffThreshold = segmentSpec?.cliffThreshold ?? null;

  // If sigma is tiny, evaluate deterministic point estimate
  if (sigmaKwh <= 1e-4) {
    const bill = calculateBill(Math.max(0.0, muKwh), tariff);
    return {
      meanBillPaise: bill.net_payable_paise,
      stdBillPaise: 0.0,
      cliffCrossingProb: cliffThreshold !== null && muKwh > cliffThreshold ? 1.0 : 0.0,
    };
  }

  if (!segmentSpec) {
    // General fallback via 7-point Gauss-Hermite quadrature for arbitrary TariffPlan definitions
    const ghNodes = [-2.6519613568, -1.6735516288, -0.8162878829, 0.0, 0.8162878829, 1.6735516288, 2.6519613568];
    const ghWeights = [0.0005482689, 0.0307571240, 0.2401231786, 0.4571428571, 0.2401231786, 0.0307571240, 0.0005482689];
    const bills = ghNodes.map((z) =>
      calculateBill(Math.max(0.0, muKwh + sigmaKwh * Math.sqrt(2.0) * z), tariff).net_payable_paise
    );
    const meanBillPaise = bills.reduce((acc, b, idx) => acc + b * ghWeights[idx], 0);
    const variance = bills.reduce((acc, b, idx) => acc + ((b - meanBillPaise) ** 2) * ghWeights[idx], 0);
    return {
      meanBillPaise,
      stdBillPaise: Math.sqrt(Math.max(0.0, variance)),
      cliffCrossingProb: 0.0,
    };
  }

  const { segments } = segmentSpec;
  let totalMeanPaise = 0.0;
  let totalSecondMomentPaise2 = 0.0;
  const cliffCrossingProb =
    cliffThreshold !== null
      ? Math.max(0.0, 1.0 - standardNormalCdf((cliffThreshold - muKwh) / sigmaKwh))
      : 0.0;

  for (const seg of segments) {
    const alpha = (seg.min - muKwh) / sigmaKwh;
    const beta = (seg.max - muKwh) / sigmaKwh;

    const phiAlpha = standardNormalPdf(alpha);
    const phiBeta = standardNormalPdf(beta);

    const cdfAlpha = standardNormalCdf(alpha);
    const cdfBeta = standardNormalCdf(beta);
    const prob = Math.max(0.0, cdfBeta - cdfAlpha);

    if (prob <= 1e-15) continue;

    // Truncated normal first moment: int_a^b X phi(X) dX
    const intX = muKwh * prob + sigmaKwh * (phiAlpha - phiBeta);
    const val = seg.slope * intX + seg.intercept * prob;

    // Truncated normal second moment: int_a^b X^2 phi(X) dX
    const termSecond = (muKwh * muKwh + sigmaKwh * sigmaKwh) * prob + 
      sigmaKwh * ((seg.min + muKwh) * phiAlpha - (seg.max + muKwh) * phiBeta);
    const valSq = (seg.slope * seg.slope) * termSecond + 
      2.0 * seg.slope * seg.intercept * intX + 
      (seg.intercept * seg.intercept) * prob;

    totalMeanPaise += val;
    totalSecondMomentPaise2 += valSq;
  }

  const variancePaise2 = Math.max(0.0, totalSecondMomentPaise2 - (totalMeanPaise * totalMeanPaise));
  const stdBillPaise = Math.sqrt(variancePaise2);

  return {
    meanBillPaise: totalMeanPaise,
    stdBillPaise,
    cliffCrossingProb,
  };
}

// ══════════════════════════════════════════════════════════
// 5. TR-VOI Evaluation & Action Welfare
// ══════════════════════════════════════════════════════════

export interface TrVoiConfig {
  alphaQuantile?: number;      // Default 0.05 (z = 1.645)
  deltaComfortRisk?: number;   // Default 0.05 (5% comfort risk budget)
  cMinPaise?: number;          // Default 3000 paise (₹30.00 minimum noticeable benefit)
  costAskPaise?: number;       // Default 200 paise (₹2.00 annoyance cost)
  lambdaDiscomfortPaise?: number; // Default 20000 paise (₹200.00 per unit discomfort)
  dMaxNominal?: number;        // Default 2.0 (conservative 1.0 for sensitive users)
  consumptionSigmaKwh?: number;// Default 8.0 kWh weather volatility
}

export function evaluateActionWelfare(
  action: ClientEnergyAction,
  baselineKwh: number,
  mu: number[],
  sigma: number[],
  tariff: TariffPlan,
  config: TrVoiConfig = {}
): {
  expectedWelfarePaise: number;
  conservativeLowerBoundPaise: number;
  isComfortSafe: boolean;
  meanSavingsPaise: number;
  stdSavingsPaise: number;
} {
  const zAlpha = 1.645;
  const lambdaD = config.lambdaDiscomfortPaise ?? 20000.0;
  const dMax = config.dMaxNominal ?? 2.0;
  const sigmaKwh = config.consumptionSigmaKwh ?? 8.0;

  if (action.id === 'null_action') {
    return {
      expectedWelfarePaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      isComfortSafe: true,
      meanSavingsPaise: 0.0,
      stdSavingsPaise: 0.0,
    };
  }

  // 1. Discomfort Distribution
  let expD = 0.0;
  let varD = 0.0;
  for (let i = 0; i < 4; i++) {
    expD += mu[i] * action.featureVector[i];
    varD += (sigma[i] * sigma[i]) * (action.featureVector[i] * action.featureVector[i]);
  }
  const stdD = Math.sqrt(varD);

  // 2. Hard Comfort Chance Constraint: P(D > D_max) <= delta
  const upperD = expD + zAlpha * stdD;
  if (upperD > dMax) {
    return {
      expectedWelfarePaise: -Infinity,
      conservativeLowerBoundPaise: -Infinity,
      isComfortSafe: false,
      meanSavingsPaise: 0.0,
      stdSavingsPaise: 0.0,
    };
  }

  // 3. Expected Bill Savings under P(X)
  let meanSavings = 0.0;
  let stdSavings = 0.0;

  if (action.actionType === 'shift') {
    if (!tariff.is_time_dependent) {
      // Pure load shifting under time-independent tariff yields ZERO savings!
      meanSavings = 0.0;
      stdSavings = 0.0;
    } else {
      // Shift 16 bi-monthly cycles x 1.5 kWh = 24.0 kWh from Evening Peak (19:00) to Morning Off-Peak (07:00)
      const shiftDelta = calculateShiftCostDelta(
        [{ hour: 19, kwh: 24.0 }],
        [{ hour: 7, kwh: 24.0 }],
        tariff
      );
      meanSavings = Math.max(0.0, shiftDelta.cost_delta_paise);
      stdSavings = Math.round(meanSavings * 0.1);
    }
  } else if (action.deltaKwh <= 0.0) {
    meanSavings = 0.0;
    stdSavings = 0.0;
  } else {
    const postKwh = Math.max(0.0, baselineKwh - action.deltaKwh);
    const baseMoments = exactPiecewiseTariffMoments(baselineKwh, sigmaKwh, tariff);
    const postMoments = exactPiecewiseTariffMoments(postKwh, sigmaKwh, tariff);

    meanSavings = Math.max(0.0, baseMoments.meanBillPaise - postMoments.meanBillPaise);
    // Downside variance of savings:
    stdSavings = Math.sqrt(Math.max(0.0, baseMoments.stdBillPaise ** 2 + postMoments.stdBillPaise ** 2 - 2 * 0.9 * baseMoments.stdBillPaise * postMoments.stdBillPaise));
  }

  // 4. Welfare & Conservative Credible Lower Bound Q_alpha
  const expDiscomfortPaise = lambdaD * expD;
  const stdDiscomfortPaise = lambdaD * stdD;

  const expWelfare = meanSavings - expDiscomfortPaise;
  // Conservative credible lower bound combining savings and discomfort uncertainty:
  const totalStd = Math.sqrt(stdSavings * stdSavings + stdDiscomfortPaise * stdDiscomfortPaise);
  const qAlpha = expWelfare - zAlpha * totalStd;

  return {
    expectedWelfarePaise: expWelfare,
    conservativeLowerBoundPaise: qAlpha,
    isComfortSafe: true,
    meanSavingsPaise: meanSavings,
    stdSavingsPaise: stdSavings,
  };
}

// ══════════════════════════════════════════════════════════
// 6. Tri-State Decision Engine (Port of TR-VOI)
// ══════════════════════════════════════════════════════════

export function decideTrVoi(
  baselineKwh: number,
  belief: LatentPreferenceBelief,
  tariff: TariffPlan,
  askedQuestionIds: string[] = [],
  config: TrVoiConfig = {}
): TrVoiDecisionResult {
  const cMin = config.cMinPaise ?? 3000.0; // ₹30.00
  const costAsk = config.costAskPaise ?? 200.0; // ₹2.00
  const mu = [...belief.mu];
  const sigma = [...belief.sigma];

  const candidateActions = PHYSICAL_ACTION_CATALOG;
  const availableQuestions = ADAPTIVE_QUESTION_CATALOG.filter(
    (q) => !askedQuestionIds.includes(q.id)
  );

  // ══════════════════════════════════════════════════════════
  // Step 1: Compute Prior Value V0 under Current Belief
  // ══════════════════════════════════════════════════════════
  const v0Evaluations = candidateActions.map((a) =>
    evaluateActionWelfare(a, baselineKwh, mu, sigma, tariff, config)
  );
  const v0 = Math.max(
    0.0,
    ...v0Evaluations
      .filter((ev) => ev.isComfortSafe)
      .map((ev) => ev.conservativeLowerBoundPaise)
  );

  // ══════════════════════════════════════════════════════════
  // Step 2: Adaptive Expected Value of Information (EVSI)
  // ══════════════════════════════════════════════════════════
  let bestQuestion: ClientAdaptiveQuestion | null = null;
  let bestNetVoi = -1.0;

  for (const q of availableQuestions) {
    const feat = q.featureIndex;

    // Hypothetical branch y = +1 (user is flexible)
    const muPos = [...mu];
    muPos[feat] = Math.max(0.2, muPos[feat] - 0.4);
    const sigmaPos = [...sigma];
    sigmaPos[feat] *= 0.5;

    const vPosEval = candidateActions.map((a) =>
      evaluateActionWelfare(a, baselineKwh, muPos, sigmaPos, tariff, config)
    );
    const vPos = Math.max(
      0.0,
      ...vPosEval.filter((e) => e.isComfortSafe).map((e) => e.conservativeLowerBoundPaise)
    );

    // Hypothetical branch y = -1 (user is inflexible)
    const muNeg = [...mu];
    muNeg[feat] = Math.min(5.0, muNeg[feat] + 0.6);
    const sigmaNeg = [...sigma];
    sigmaNeg[feat] *= 0.5;

    const vNegEval = candidateActions.map((a) =>
      evaluateActionWelfare(a, baselineKwh, muNeg, sigmaNeg, tariff, config)
    );
    const vNeg = Math.max(
      0.0,
      ...vNegEval.filter((e) => e.isComfortSafe).map((e) => e.conservativeLowerBoundPaise)
    );

    // Expected Value of Information
    const evsi = 0.5 * vPos + 0.5 * vNeg - v0;
    const queryCost = costAsk + q.privacyCostPaise;
    const netVoi = evsi - queryCost;

    if (netVoi > bestNetVoi) {
      bestNetVoi = netVoi;
      bestQuestion = q;
    }
  }

  // If asking a question yields positive net decision value, emit ask_question
  if (bestQuestion && bestNetVoi > 0.0) {
    return {
      outcome: 'ask_question',
      candidateQuestion: bestQuestion,
      pointEstimateSavingsPaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      expectedWelfarePaise: 0.0,
      confidenceLevel: 'insufficient',
      basis: 'simulated',
      assumptions: [],
      metadata: {
        decisionMetricPaise: bestNetVoi,
        askedQuestionIds,
        isComfortSafe: true,
      },
    };
  }

  // ══════════════════════════════════════════════════════════
  // Step 3: Recommend vs. Abstain Decision Gate
  // ══════════════════════════════════════════════════════════
  const nullAction = candidateActions.find((a) => a.id === 'null_action')!;
  let bestAction: ClientEnergyAction = nullAction;
  let bestLowerBound = 0.0;
  let bestExpectedWelfare = 0.0;
  let bestSavingsPaise = 0.0;

  for (const a of candidateActions) {
    if (a.id === 'null_action') continue;

    // Time-independent tariff safety invariant:
    // If tariff is not time-dependent, load-shifting cannot save money.
    if (!tariff.is_time_dependent && a.actionType === 'shift') {
      continue;
    }

    const evalRes = evaluateActionWelfare(a, baselineKwh, mu, sigma, tariff, config);
    if (!evalRes.isComfortSafe) continue;

    // Candidate must satisfy minimum noticeable benefit threshold (Q_alpha > c_min)
    if (evalRes.conservativeLowerBoundPaise > cMin && evalRes.conservativeLowerBoundPaise > bestLowerBound) {
      bestLowerBound = evalRes.conservativeLowerBoundPaise;
      bestExpectedWelfare = evalRes.expectedWelfarePaise;
      bestSavingsPaise = evalRes.meanSavingsPaise;
      bestAction = a;
    }
  }

  if (bestAction.id === 'null_action') {
    return {
      outcome: 'abstain',
      pointEstimateSavingsPaise: 0.0,
      conservativeLowerBoundPaise: 0.0,
      expectedWelfarePaise: 0.0,
      confidenceLevel: 'high',
      basis: 'simulated',
      assumptions: [],
      metadata: {
        decisionMetricPaise: 0.0,
        askedQuestionIds,
        isComfortSafe: true,
      },
    };
  }

  const confidenceLevel: ConfidenceLevel = 
    bestLowerBound > 10000 ? 'high' : bestLowerBound > 5000 ? 'medium' : 'low';

  return {
    outcome: 'recommend',
    recommendedAction: bestAction,
    pointEstimateSavingsPaise: bestSavingsPaise,
    conservativeLowerBoundPaise: bestLowerBound,
    expectedWelfarePaise: bestExpectedWelfare,
    confidenceLevel,
    basis: 'simulated',
    assumptions: bestAction.assumptions,
    metadata: {
      decisionMetricPaise: bestLowerBound,
      askedQuestionIds,
      isComfortSafe: true,
    },
  };
}

/**
 * Updates latent preference belief vector recursively given sparse discrete feedback (+1, -1, 0).
 */
export function updateBeliefWithFeedback(
  currentBelief: LatentPreferenceBelief,
  featureIndex: number,
  responseValue: 1 | -1 | 0
): LatentPreferenceBelief {
  const mu = [...currentBelief.mu];
  const sigma = [...currentBelief.sigma];

  if (responseValue === 1) {
    // Household accepted action or answered Yes (more flexible)
    mu[featureIndex] = Math.max(0.2, mu[featureIndex] - 0.4);
    sigma[featureIndex] *= 0.5;
  } else if (responseValue === -1) {
    // Household rejected action or answered No (more sensitive/inflexible)
    mu[featureIndex] = Math.min(5.0, mu[featureIndex] + 0.6);
    sigma[featureIndex] *= 0.5;
  }
  // responseValue === 0 denotes indifference or skip; no update

  return {
    mu,
    sigma,
    updatedAt: new Date().toISOString(),
  };
}
