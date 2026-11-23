import { describe, it, expect } from 'vitest';
import { calculateScenarioOutcome } from '../../src/core/simulation/scenario-engine';
import { TNPDCL_LT1A_2026_MAY10 } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';

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

    // 6 units in slab 201-400 kWh saved at 4.70 Rs/kWh (0% domestic duty) = 28.20 Rs
    expect(result.netSavingsInr).toBe(28.20);
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
});
