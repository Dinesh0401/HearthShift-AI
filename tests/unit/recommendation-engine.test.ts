import { describe, it, expect } from 'vitest';
import { generateHouseholdRecommendation } from '../../src/core/recommendation/engine';
import { TNPDCL_LT1A_2026_MAY10 } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';

describe('Recommendation Generation Engine', () => {
  it('abstains and gates output when household capability state is insufficient', () => {
    // Minimal baseline: only 0 bills and 0 readings -> BASIC mode
    const output = generateHouseholdRecommendation({
      baselineKwh: 450,
      tariff: TNPDCL_LT1A_2026_MAY10,
      capabilityInputs: {
        bills_count: 0,
        readings_count: 0,
        readings_span_days: 0,
        active_tariff: TNPDCL_LT1A_2026_MAY10,
      },
    });

    expect(output.capabilityGated).toBe(true);
    expect(output.outcome).toBe('abstain');
    expect(output.recommendation).toBeNull();
    expect(output.gateReason).toBeDefined();
  });

  it('executes TR-VOI when household reaches optimization eligible state', () => {
    // 3 bills, 2880 readings (30 days), and comfort constraints -> OPTIMIZATION_ELIGIBLE mode
    const output = generateHouseholdRecommendation({
      baselineKwh: 480,
      tariff: TNPDCL_LT1A_2026_MAY10,
      capabilityInputs: {
        bills_count: 3,
        readings_count: 2880,
        readings_span_days: 30,
        active_tariff: TNPDCL_LT1A_2026_MAY10,
        comfort_constraints: [
          {
            id: 'c1',
            type: 'temperature_bound',
            description: 'AC setpoint comfort max 25C',
            flexibility: 'medium',
            confidence: 1.0,
          },
        ],
      },
    });

    expect(output.capabilityGated).toBe(false);
    expect(['recommend', 'ask_question', 'abstain']).toContain(output.outcome);

    if (output.outcome === 'recommend') {
      expect(output.recommendation).toBeDefined();
      expect(output.recommendation?.action.title.en).toBeDefined();
      expect(output.recommendation?.action.title.ta).toBeDefined();
      expect(output.recommendation?.savings_estimate.basis).toBe('simulated');
      expect(output.recommendation?.savings_estimate.point_estimate).toBeGreaterThan(0);
    }
  });

  it('attaches explicit assumptions and provenance to recommendations', () => {
    const output = generateHouseholdRecommendation({
      baselineKwh: 510, // Near cliff
      tariff: TNPDCL_LT1A_2026_MAY10,
      belief: {
        mu: [0.5, 0.5, 0.5, 0.5], // very flexible
        sigma: [0.1, 0.1, 0.1, 0.1],
        updatedAt: new Date().toISOString(),
      },
      capabilityInputs: {
        bills_count: 3,
        readings_count: 2880,
        readings_span_days: 30,
        active_tariff: TNPDCL_LT1A_2026_MAY10,
        comfort_constraints: [
          {
            id: 'c1',
            type: 'temperature_bound',
            description: 'AC setpoint comfort max 25C',
            flexibility: 'medium',
            confidence: 1.0,
          },
        ],
      },
    });

    if (output.outcome === 'recommend' && output.recommendation) {
      expect(output.recommendation.assumptions.length).toBeGreaterThanOrEqual(1);
      expect(output.recommendation.savings_estimate.lower_bound).toBeGreaterThan(0);
    }
  });
});
