import { describe, it, expect } from 'vitest';
import { calculateScenarioOutcome } from '../../src/core/simulation/scenario-engine';
import {
  TNPDCL_LT1A_2026_MAY10,
  TNPDCL_LT1A_2024_2025,
  GENERIC_TOU_TARIFF_INR,
} from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import type { TariffPlan } from '../../src/core/tariff/types';

describe('Scenario Engine', () => {
  it('detects cliff avoidance when reducing consumption below 500 kWh', () => {
    // Baseline: 505 kWh (just above cliff, forfeits 200 free units)
    // Selection: AC raised by 0.5°C (-15 kWh) -> 490 kWh (reclaims 200 free units!)
    const result = calculateScenarioOutcome(
      505,
      {
        acSetpointDelta: 0.5,
        curtailAcHours: 0,
        trimWaterHeaterMinutes: 0,
        powerDownStandby: false,
        shiftLaundryToMorning: false,
      },
      TNPDCL_LT1A_2026_MAY10
    );

    expect(result.baselineKwh).toBe(505);
    expect(result.totalReductionKwh).toBe(15);
    expect(result.proposedKwh).toBe(490);
    expect(result.didAvoidCliff).toBe(true);
    expect(result.cliffBonusInr).toBe(478.40);
    expect(result.tierChangeDescription).toBeDefined();

    // Baseline bill at 505 units:
    // 0-100 free: 0, 101-400 @ 4.70 = 1410, 401-500 @ 6.30 = 630, 501-505 @ 8.40 = 42 -> 2082.00
    // Proposed bill at 490 units:
    // 0-200 free (subsidy reclaimed!), 201-400 @ 4.70 = 940, 401-490 @ 6.30 = 567 -> 1507.00
    // Net savings = 2082.00 - 1507.00 = 575.00 Rs (which includes the 478.40 cliff bonus!)
    expect(result.netSavingsInr).toBe(575.0);
    expect(result.netSavingsInr).toBeGreaterThan(478.40);
    expect(result.baselineBillInr).toBe(2082.0);
    expect(result.proposedBillInr).toBe(1507.0);
    expect(result.baselineBillInr).toBeGreaterThan(result.proposedBillInr);

    // Provenance & decomposition assertions
    expect(result.isCliffBonusIncludedInNetSavings).toBe(true);
    expect(result.slabSavingsInr).toBe(96.60);
    expect(Number((result.slabSavingsInr + result.cliffBonusInr).toFixed(2))).toBe(result.netSavingsInr);

    // Strict no double counting assertion: net savings MUST equal bill difference, not bill difference + bonus
    expect(result.netSavingsInr).toBe(Number((result.baselineBillInr - result.proposedBillInr).toFixed(2)));
    expect(result.netSavingsInr).not.toBe(Number((result.baselineBillInr - result.proposedBillInr + result.cliffBonusInr).toFixed(2)));
  });

  it('calculates standard slab reduction without cliff crossing', () => {
    // Baseline: 380 kWh
    // Selection: Standby elimination (-6 kWh) -> 374 kWh
    const result = calculateScenarioOutcome(
      380,
      {
        acSetpointDelta: 0,
        curtailAcHours: 0,
        trimWaterHeaterMinutes: 0,
        powerDownStandby: true,
        shiftLaundryToMorning: false,
      },
      TNPDCL_LT1A_2026_MAY10
    );

    expect(result.baselineKwh).toBe(380);
    expect(result.totalReductionKwh).toBe(6);
    expect(result.proposedKwh).toBe(374);
    expect(result.didAvoidCliff).toBe(false);
    expect(result.cliffBonusInr).toBe(0);
    expect(result.isCliffBonusIncludedInNetSavings).toBe(true);
    expect(result.slabSavingsInr).toBe(result.netSavingsInr);

    // 6 units in slab 201-400 kWh saved at 4.70 Rs/kWh (0% domestic duty) = 28.20 Rs
    expect(result.netSavingsInr).toBe(28.20);
  });

  it('strictly prevents double counting of tariff cliff bonus in net savings decomposition', () => {
    // Exact cliff boundary edge case: 506 kWh to 500 kWh (-6 kWh via standby power)
    // 506 kWh -> baseline bill: 100 free, 300 @ 4.70 = 1410, 100 @ 6.30 = 630, 6 @ 8.40 = 50.40 -> 2090.40 Rs
    // 500 kWh -> proposed bill: 200 free, 200 @ 4.70 = 940, 100 @ 6.30 = 630 -> 1570.00 Rs
    // Exact bill difference = 2090.40 - 1570.00 = 520.40 Rs
    // Cliff bonus = 478.40 Rs
    // Base slab savings = 520.40 - 478.40 = 42.00 Rs (6 units saved in 501-600 slab @ 8.40 minus cliff base difference)
    const result = calculateScenarioOutcome(
      506,
      {
        acSetpointDelta: 0,
        curtailAcHours: 0,
        trimWaterHeaterMinutes: 0,
        powerDownStandby: true,
        shiftLaundryToMorning: false,
      },
      TNPDCL_LT1A_2026_MAY10
    );

    expect(result.baselineKwh).toBe(506);
    expect(result.proposedKwh).toBe(500);
    expect(result.didAvoidCliff).toBe(true);
    expect(result.cliffBonusInr).toBe(478.40);
    expect(result.isCliffBonusIncludedInNetSavings).toBe(true);

    // netSavingsInr is STRICTLY (baselineBill - proposedBill)
    const exactBillDiff = Number((result.baselineBillInr - result.proposedBillInr).toFixed(2));
    expect(result.netSavingsInr).toBe(exactBillDiff);
    expect(result.netSavingsInr).toBe(520.40);

    // Decomposition: netSavingsInr = slabSavingsInr + cliffBonusInr
    expect(result.slabSavingsInr).toBe(42.00);
    expect(Number((result.slabSavingsInr + result.cliffBonusInr).toFixed(2))).toBe(result.netSavingsInr);

    // Strict non-additive assertion: double-counted savings (520.40 + 478.40 = 998.80) is REJECTED
    expect(result.netSavingsInr).not.toBe(exactBillDiff + result.cliffBonusInr);
    expect(result.netSavingsInr).toBeLessThan(exactBillDiff + result.cliffBonusInr);
  });

  it('reports zero reduction and zero monetary savings for load shifting under flat/tiered tariff', () => {
    const result = calculateScenarioOutcome(
      350,
      {
        acSetpointDelta: 0,
        curtailAcHours: 0,
        trimWaterHeaterMinutes: 0,
        powerDownStandby: false,
        shiftLaundryToMorning: true,
      },
      TNPDCL_LT1A_2026_MAY10
    );

    expect(result.totalReductionKwh).toBe(0);
    expect(result.proposedKwh).toBe(350);
    expect(result.netSavingsInr).toBe(0);
    expect(result.assumptions.some((a) => a.en.includes('non-TOU'))).toBe(true);
  });

  it('aggregates multiple concurrent actions accurately', () => {
    const result = calculateScenarioOutcome(
      520,
      {
        acSetpointDelta: 1.0,           // 35 kWh
        curtailAcHours: 1,              // 90 kWh
        trimWaterHeaterMinutes: 20,     // 20 kWh
        powerDownStandby: true,         // 6 kWh
        shiftLaundryToMorning: true,    // 0 kWh
      },
      TNPDCL_LT1A_2026_MAY10
    );

    // Total = 35 + 90 + 20 + 6 = 151 kWh
    expect(result.totalReductionKwh).toBe(151);
    expect(result.proposedKwh).toBe(520 - 151); // 369 kWh
    expect(result.didAvoidCliff).toBe(true);
  });

  it('evaluates TOU load shift dynamically vs zero non-TOU shift savings', () => {
    const laundryOnly = {
      acSetpointDelta: 0 as const,
      curtailAcHours: 0 as const,
      trimWaterHeaterMinutes: 0 as const,
      powerDownStandby: false,
      shiftLaundryToMorning: true,
    };

    // 1. Non-TOU tariff (TNPDCL_LT1A_2026_MAY10) strictly returns zero savings
    const nonTou = calculateScenarioOutcome(350, laundryOnly, TNPDCL_LT1A_2026_MAY10);
    expect(nonTou.totalReductionKwh).toBe(0);
    expect(nonTou.netSavingsInr).toBe(0);
    expect(nonTou.assumptions.some((a) => a.en.includes('non-TOU'))).toBe(true);

    // 2. GENERIC_TOU_TARIFF_INR enters active TOU evaluation (07:00 is Morning Peak @ ₹10 == 19:00 Evening Peak @ ₹10 -> ₹0 delta)
    const genericTou = calculateScenarioOutcome(350, laundryOnly, GENERIC_TOU_TARIFF_INR);
    expect(genericTou.totalReductionKwh).toBe(0);
    expect(genericTou.proposedKwh).toBe(350);
    expect(genericTou.netSavingsInr).toBe(0);
    expect(genericTou.assumptions.some((a) => a.en.includes('under active TOU tariff'))).toBe(true);

    // 3. Time-of-Use schedule with Morning Off-Peak (06:00-10:00 @ ₹5/kWh vs Evening Peak 18:00-22:00 @ ₹10/kWh)
    // Shifting 24 kWh from 19:00 to 07:00 saves 24 * (10 - 5) = ₹120.00 with 0 kWh reduction
    const morningOffPeakTou: TariffPlan = {
      ...GENERIC_TOU_TARIFF_INR,
      id: 'generic-tou-morning-offpeak-inr',
      gross_tariff: {
        type: 'time_of_use',
        default_rate_paise: 700,
        time_bands: [
          { label: 'Morning Off-Peak', start_hour: 6, end_hour: 10, rate_paise: 500 },
          { label: 'Normal Day', start_hour: 10, end_hour: 18, rate_paise: 700 },
          { label: 'Evening Peak', start_hour: 18, end_hour: 22, rate_paise: 1000 },
          { label: 'Night Off-Peak', start_hour: 22, end_hour: 6, rate_paise: 500 },
        ],
      },
    };

    const dynamicTou = calculateScenarioOutcome(350, laundryOnly, morningOffPeakTou);
    expect(dynamicTou.totalReductionKwh).toBe(0);
    expect(dynamicTou.proposedKwh).toBe(350);
    expect(dynamicTou.netSavingsInr).toBe(120.0);
    expect(dynamicTou.proposedBillInr).toBe(Number((dynamicTou.baselineBillInr - 120.0).toFixed(2)));
    expect(dynamicTou.assumptions.some((a) => a.en.includes('active TOU tariff') && a.en.includes('120.00'))).toBe(true);
  });

  it('dynamically detects historical 2024 tariff cliff (₹233.00, not ₹478.40)', () => {
    const result = calculateScenarioOutcome(
      505,
      {
        acSetpointDelta: 0.5, // -15 kWh -> 490 kWh
        curtailAcHours: 0,
        trimWaterHeaterMinutes: 0,
        powerDownStandby: false,
        shiftLaundryToMorning: false,
      },
      TNPDCL_LT1A_2024_2025
    );

    expect(result.didAvoidCliff).toBe(true);
    expect(result.cliffThresholdKwh).toBe(500);
    expect(result.cliffBonusInr).toBe(233.0);
    expect(result.cliffBonusInr).not.toBe(478.4);
    expect(result.baselineBillInr).toBe(1990.0);
    expect(result.proposedBillInr).toBe(1665.0);
    expect(result.netSavingsInr).toBe(325.0);
    expect(result.slabSavingsInr).toBe(92.0);
    expect(result.tierChangeDescription?.en).toContain('233.00');
    expect(result.tierChangeDescription?.en).not.toContain('478.40');
  });
});
