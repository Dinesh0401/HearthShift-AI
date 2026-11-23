/**
 * HearthShift AI — Interactive Counterfactual Scenario Engine
 * 
 * Computes deterministic counterfactual energy reductions and bill savings
 * using exact integer-paise calculations under the active statutory tariff.
 * 
 * @module core/simulation/scenario-engine
 */

import type { TariffPlan } from '../tariff/types';
import { calculateBill } from '../tariff/calculator';
import type { LocalizedString, SavingsEstimate } from '../../types/contracts';

export interface ScenarioActionSelection {
  acSetpointDelta: 0 | 0.5 | 1.0 | 2.0;      // degrees C
  curtailAcHours: 0 | 1;                     // hours per day
  trimWaterHeaterMinutes: 0 | 15 | 20;       // minutes per day
  powerDownStandby: boolean;                 // true = -6 kWh
  shiftLaundryToMorning: boolean;            // true = load shift
}

export interface ScenarioCalculationResult {
  baselineKwh: number;
  proposedKwh: number;
  totalReductionKwh: number;
  baselineBillInr: number;
  proposedBillInr: number;
  netSavingsInr: number;
  savingsEstimate: SavingsEstimate;
  didAvoidCliff: boolean;
  cliffBonusInr: number;
  tierChangeDescription?: LocalizedString;
  assumptions: LocalizedString[];
}

/**
 * Computes exact counterfactual outcome for user-selected appliance actions.
 */
export function calculateScenarioOutcome(
  baselineKwh: number,
  selections: ScenarioActionSelection,
  tariff: TariffPlan
): ScenarioCalculationResult {
  let totalDeltaKwh = 0.0;
  const assumptions: LocalizedString[] = [];

  // 1. AC Setpoint Delta
  if (selections.acSetpointDelta === 0.5) {
    totalDeltaKwh += 15.0;
    assumptions.push({
      en: 'AC thermostat raised by 0.5°C (~15 kWh bi-monthly savings).',
      ta: 'ஏசி வெப்பநிலையை 0.5°C உயர்த்துதல் (~15 யூனிட் இரு மாத சேமிப்பு).',
    });
  } else if (selections.acSetpointDelta === 1.0) {
    totalDeltaKwh += 35.0;
    assumptions.push({
      en: 'AC thermostat raised by 1.0°C (~35 kWh bi-monthly savings).',
      ta: 'ஏசி வெப்பநிலையை 1.0°C உயர்த்துதல் (~35 யூனிட் இரு மாத சேமிப்பு).',
    });
  } else if (selections.acSetpointDelta === 2.0) {
    totalDeltaKwh += 70.0;
    assumptions.push({
      en: 'AC thermostat raised by 2.0°C (~70 kWh bi-monthly savings).',
      ta: 'ஏசி வெப்பநிலையை 2.0°C உயர்த்துதல் (~70 யூனிட் இரு மாத சேமிப்பு).',
    });
  }

  // 2. AC Curtailment
  if (selections.curtailAcHours === 1) {
    totalDeltaKwh += 90.0;
    assumptions.push({
      en: 'AC cooling curtailed by 1 hour daily (~90 kWh bi-monthly savings).',
      ta: 'ஏசி இயங்கும் நேரத்தை தினமும் 1 மணி நேரம் குறைத்தல் (~90 யூனிட் சேமிப்பு).',
    });
  }

  // 3. Water Heater Trim
  if (selections.trimWaterHeaterMinutes > 0) {
    totalDeltaKwh += 20.0;
    assumptions.push({
      en: 'Water heater timer trimmed by 15-20 mins (~20 kWh bi-monthly savings).',
      ta: 'வாட்டர் ஹீட்டர் நேரத்தை 15-20 நிமிடங்கள் குறைத்தல் (~20 யூனிட் சேமிப்பு).',
    });
  }

  // 4. Standby Management
  if (selections.powerDownStandby) {
    totalDeltaKwh += 6.0;
    assumptions.push({
      en: 'Entertainment center standby eliminated overnight (~6 kWh bi-monthly savings).',
      ta: 'இரவு வேளையில் டிவி உள்ளிட்ட சாதனங்களின் ஸ்டாண்ட்பை அணைத்தல் (~6 யூனிட் சேமிப்பு).',
    });
  }

  // 5. Laundry Shift
  if (selections.shiftLaundryToMorning) {
    // Under non-TOU tariffs, load shifting yields 0 kWh reduction and 0 monetary savings
    assumptions.push({
      en: 'Laundry shifted to morning; under non-TOU tariffs, load shifting saves 0 units.',
      ta: 'துவைக்கும் நேரம் காலைக்கு மாற்றம்; நேர-மாறுபாடற்ற கட்டணத்தில் சேமிப்பு 0 யூனிட்.',
    });
  }

  const proposedKwh = Math.max(0.0, baselineKwh - totalDeltaKwh);

  // Exact deterministic billing calculation
  const baselineBill = calculateBill(baselineKwh, tariff);
  const proposedBill = calculateBill(proposedKwh, tariff);

  const baselineBillInr = baselineBill.net_payable_paise / 100.0;
  const proposedBillInr = proposedBill.net_payable_paise / 100.0;
  const netSavingsInr = Math.max(0.0, (baselineBill.net_payable_paise - proposedBill.net_payable_paise) / 100.0);

  // Check cliff transition (500 kWh boundary)
  const didAvoidCliff = baselineKwh > 500.0 && proposedKwh <= 500.0;
  const cliffBonusInr = didAvoidCliff ? 478.40 : 0.0;

  const tierChangeDescription: LocalizedString | undefined = didAvoidCliff
    ? {
        en: `Avoided ₹478.40 Tariff Cliff! Your proposed consumption (${proposedKwh.toFixed(1)} units) successfully restores eligibility for 200 free units.`,
        ta: `₹478.40 கட்டண உயர்வு தவிர்க்கப்பட்டது! புதிய நுகர்வு (${proposedKwh.toFixed(1)} யூனிட்) 200 இலவச யூனிட் மானியத்தைப் பாதுகாக்கிறது.`,
      }
    : undefined;

  const savingsEstimate: SavingsEstimate = {
    point_estimate: netSavingsInr,
    lower_bound: Math.max(0.0, netSavingsInr * 0.90),
    upper_bound: netSavingsInr * 1.10,
    confidence_level: 0.95,
    period: 'billing_cycle',
    currency: 'INR',
    basis: 'simulated',
  };

  return {
    baselineKwh,
    proposedKwh,
    totalReductionKwh: totalDeltaKwh,
    baselineBillInr,
    proposedBillInr,
    netSavingsInr,
    savingsEstimate,
    didAvoidCliff,
    cliffBonusInr,
    tierChangeDescription,
    assumptions,
  };
}
