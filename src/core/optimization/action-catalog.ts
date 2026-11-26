/**
 * HearthShift AI — Client-Side Physical Action & Adaptive Question Catalogs
 *
 * Predefined advisory interventions and active EVSI clarifying queries
 * matching the research engine parameterization with bilingual (EN/TA) copy.
 *
 * @module core/optimization/action-catalog
 */

import type { ClientAdaptiveQuestion, ClientEnergyAction } from './types';

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
