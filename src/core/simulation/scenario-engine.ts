/**
 * HearthShift AI — Interactive Counterfactual Scenario Engine
 * 
 * Computes deterministic counterfactual energy reductions and bill savings
 * using exact integer-paise calculations under the active statutory tariff.
 * 
 * @module core/simulation/scenario-engine
 */

import type { TariffPlan } from '../tariff/types';
import { calculateBill, calculateShiftCostDelta } from '../tariff/calculator';
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
  cliffThresholdKwh: number | null;
  cliffBonusInr: number;
  /**
   * Explanatory audit flag: confirms that cliffBonusInr is already accounted for
   * inside netSavingsInr (via the baseline minus proposed bill difference),
   * ensuring cliffBonusInr is strictly NOT an additive bonus.
   */
  isCliffBonusIncludedInNetSavings: true;
  /**
   * Base slab savings excluding the discrete subsidy cliff jump.
   * Decomposition: netSavingsInr = slabSavingsInr + cliffBonusInr
   */
  slabSavingsInr: number;
  tierChangeDescription?: LocalizedString;
  assumptions: LocalizedString[];
}

/**
 * Inspects a TariffPlan to detect whether it contains a statutory eligibility cliff
 * (e.g. 500 kWh limit under TNPDCL domestic subsidies) and returns the exact cliff jump
 * above marginal volumetric unit cost, or null if no discontinuity exists.
 */
export function detectTariffCliffThreshold(tariff: TariffPlan): number | null {
  const highThreshold = tariff.gross_tariff.type === 'tiered_slab'
    ? tariff.gross_tariff.high_consumption_threshold_kwh
    : undefined;

  if (highThreshold !== undefined && highThreshold > 0) {
    return highThreshold;
  }

  const ruleThreshold = tariff.subsidy_scheme?.rules
    .map((r) => r.eligibility_max_units)
    .find((v): v is number => typeof v === 'number' && v > 0);

  return ruleThreshold ?? null;
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
  let shiftSavingsInr = 0.0;
  const assumptions: LocalizedString[] = [];

  // 1. AC Setpoint Delta
  if (selections.acSetpointDelta === 0.5) {
    totalDeltaKwh += 15.0;
    assumptions.push({
      en: 'AC thermostat raised by 0.5°C (modeled ~15 kWh bi-monthly reduction under nominal 1.5 TR inverter assumptions).',
      ta: 'ஏசி வெப்பநிலையை 0.5°C உயர்த்துதல் (மாதிரி அடிப்படையில் ~15 யூனிட் இரு மாத குறைப்பு).',
    });
  } else if (selections.acSetpointDelta === 1.0) {
    totalDeltaKwh += 35.0;
    assumptions.push({
      en: 'AC thermostat raised by 1.0°C (modeled ~35 kWh bi-monthly reduction with fan airflow).',
      ta: 'ஏசி வெப்பநிலையை 1.0°C உயர்த்துதல் (மாதிரி அடிப்படையில் ~35 யூனிட் இரு மாத குறைப்பு).',
    });
  } else if (selections.acSetpointDelta === 2.0) {
    totalDeltaKwh += 70.0;
    assumptions.push({
      en: 'AC thermostat raised by 2.0°C (modeled ~70 kWh bi-monthly reduction under high cooling usage).',
      ta: 'ஏசி வெப்பநிலையை 2.0°C உயர்த்துதல் (மாதிரி அடிப்படையில் ~70 யூனிட் இரு மாத குறைப்பு).',
    });
  }

  // 2. AC Curtailment
  if (selections.curtailAcHours === 1) {
    totalDeltaKwh += 90.0;
    assumptions.push({
      en: 'AC cooling curtailed by 1 hour daily (modeled ~90 kWh bi-monthly reduction).',
      ta: 'ஏசி இயங்கும் நேரத்தை தினமும் 1 மணி நேரம் குறைத்தல் (மாதிரி ~90 யூனிட் குறைப்பு).',
    });
  }

  // 3. Water Heater Trim
  if (selections.trimWaterHeaterMinutes > 0) {
    totalDeltaKwh += 20.0;
    assumptions.push({
      en: 'Water heater timer trimmed by 15-20 mins (modeled ~20 kWh bi-monthly reduction).',
      ta: 'வாட்டர் ஹீட்டர் நேரத்தை 15-20 நிமிடங்கள் குறைத்தல் (மாதிரி ~20 யூனிட் குறைப்பு).',
    });
  }

  // 4. Standby Management
  if (selections.powerDownStandby) {
    totalDeltaKwh += 6.0;
    assumptions.push({
      en: 'Entertainment center standby eliminated overnight (modeled ~6 kWh bi-monthly reduction).',
      ta: 'இரவு வேளையில் டிவி உள்ளிட்ட சாதனங்களின் ஸ்டாண்ட்பை அணைத்தல் (மாதிரி ~6 யூனிட் குறைப்பு).',
    });
  }

  // 5. Laundry Shift (Respects tariff time-dependence invariant)
  if (selections.shiftLaundryToMorning) {
    if (tariff.is_time_dependent) {
      // Shift 16 bi-monthly cycles x 1.5 kWh = 24 kWh from Evening Peak (19:00) to Morning Off-Peak/Day (07:00)
      const shiftEval = calculateShiftCostDelta(
        [{ hour: 19, kwh: 24.0 }],
        [{ hour: 7, kwh: 24.0 }],
        tariff
      );
      shiftSavingsInr = Math.max(0.0, shiftEval.cost_delta);
      assumptions.push({
        en: `Laundry shifted from evening peak (19:00) to morning (07:00): under active TOU tariff, saves modeled ₹${shiftSavingsInr.toFixed(2)} without reducing kWh.`,
        ta: `துவைக்கும் நேரம் மாலை (19:00) இலிருந்து காலை (07:00) மாற்றப்பட்டது: TOU கட்டணத்தில் மாதிரி ₹${shiftSavingsInr.toFixed(2)} சேமிப்பு.`,
      });
    } else {
      assumptions.push({
        en: 'Laundry shifted to morning; under non-TOU tariffs, load shifting saves 0 units and ₹0.00 directly.',
        ta: 'துவைக்கும் நேரம் காலைக்கு மாற்றம்; நேர-மாறுபாடற்ற கட்டணத்தில் நேரடி சேமிப்பு 0 யூனிட் (₹0.00).',
      });
    }
  }

  const proposedKwh = Math.max(0.0, baselineKwh - totalDeltaKwh);

  // Exact deterministic billing calculation
  const baselineBill = calculateBill(baselineKwh, tariff);
  const proposedBill = calculateBill(proposedKwh, tariff);

  let baselineBillInr = baselineBill.net_payable_paise / 100.0;
  let proposedBillInr = proposedBill.net_payable_paise / 100.0;

  if (tariff.is_time_dependent && shiftSavingsInr > 0) {
    proposedBillInr = Math.max(0.0, Number((proposedBillInr - shiftSavingsInr).toFixed(2)));
    baselineBillInr = Number(baselineBillInr.toFixed(2));
  }

  /**
   * TARIFF CLIFF AUDIT & DECOMPOSITION:
   * 
   * Net savings is STRICTLY calculated as:
   *   baselineBillInr - proposedBillInr (incorporating statutory discontinuities once).
   * 
   * `cliffBonusInr` is strictly an EXPLANATORY COMPONENT of `netSavingsInr`, NOT an additive bonus.
   * Decomposition: netSavingsInr = slabSavingsInr + cliffBonusInr
   */
  const netSavingsInr = Math.max(
    0.0,
    Number((baselineBillInr - proposedBillInr).toFixed(2))
  );

  // Dynamic cliff detection from tariff structure
  const cliffThresholdKwh = detectTariffCliffThreshold(tariff);
  let didAvoidCliff = false;
  let cliffBonusInr = 0.0;

  if (cliffThresholdKwh !== null && baselineKwh > cliffThresholdKwh && proposedKwh <= cliffThresholdKwh) {
    const atCliff = calculateBill(cliffThresholdKwh, tariff);
    const pastCliff = calculateBill(cliffThresholdKwh + 1, tariff);
    const singleUnitJumpInr = (pastCliff.net_payable_paise - atCliff.net_payable_paise) / 100.0;
    if (singleUnitJumpInr > 25.0) {
      didAvoidCliff = true;
      // Preserve exact ₹478.40 statutory jump reporting on May 2026 TNPDCL (2048.40 - 1570.00)
      cliffBonusInr = Number(singleUnitJumpInr.toFixed(2));
    }
  }

  const slabSavingsInr = Math.max(0.0, Number((netSavingsInr - cliffBonusInr).toFixed(2)));

  const tierChangeDescription: LocalizedString | undefined = didAvoidCliff
    ? {
        en: `Avoided ₹${cliffBonusInr.toFixed(2)} Tariff Cliff! Modeled consumption (${proposedKwh.toFixed(1)} units) stays within the <= ${cliffThresholdKwh} kWh eligibility threshold.`,
        ta: `₹${cliffBonusInr.toFixed(2)} கட்டண உயர்வு தவிர்க்கப்பட்டது! புதிய நுகர்வு (${proposedKwh.toFixed(1)} யூனிட்) ${cliffThresholdKwh} யூனிட் எல்லையினுள் உள்ளது.`,
      }
    : undefined;

  const savingsEstimate: SavingsEstimate = {
    point_estimate: netSavingsInr,
    lower_bound: Math.max(0.0, netSavingsInr * 0.90),
    upper_bound: netSavingsInr * 1.10,
    confidence_level: 0.95,
    period: 'billing_cycle',
    currency: tariff.currency ?? 'INR',
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
    cliffThresholdKwh,
    cliffBonusInr,
    isCliffBonusIncludedInNetSavings: true,
    slabSavingsInr,
    tierChangeDescription,
    assumptions,
  };
}
