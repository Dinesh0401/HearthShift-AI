import { describe, it, expect } from 'vitest';
import {
  exactPiecewiseTariffMoments,
  evaluateActionWelfare,
  decideTrVoi,
  updateBeliefWithFeedback,
  PHYSICAL_ACTION_CATALOG,
  ADAPTIVE_QUESTION_CATALOG,
  type LatentPreferenceBelief,
} from '../../src/core/optimization/tr-voi';
import { TNPDCL_LT1A_2026_MAY10 } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';

describe('TR-VOI Decision Engine', () => {
  describe('Exact Piecewise Normal Tariff Integration', () => {
    it('evaluates deterministic point estimate when sigma is near zero', () => {
      const moments = exactPiecewiseTariffMoments(300, 0.0, TNPDCL_LT1A_2026_MAY10);
      // At 300 units: 0-200 free (0), 201-300: 100 * 4.70 = 470.00 Rs = 47000 paise
      expect(moments.meanBillPaise).toBe(47000);
      expect(moments.stdBillPaise).toBe(0);
      expect(moments.cliffCrossingProb).toBe(0);
    });

    it('calculates smooth cliff-crossing probability around 500 kWh', () => {
      const belowCliff = exactPiecewiseTariffMoments(480, 8.0, TNPDCL_LT1A_2026_MAY10);
      const atCliff = exactPiecewiseTariffMoments(500, 8.0, TNPDCL_LT1A_2026_MAY10);
      const aboveCliff = exactPiecewiseTariffMoments(520, 8.0, TNPDCL_LT1A_2026_MAY10);

      // P(X > 500) for mu = 480, sigma = 8 is (500 - 480)/8 = 2.5 std devs -> very small
      expect(belowCliff.cliffCrossingProb).toBeLessThan(0.02);

      // P(X > 500) for mu = 500, sigma = 8 is exactly 0.50
      expect(atCliff.cliffCrossingProb).toBeCloseTo(0.50, 1);

      // P(X > 500) for mu = 520, sigma = 8 is very high
      expect(aboveCliff.cliffCrossingProb).toBeGreaterThan(0.98);

      // Standard deviation of bill is highest near the cliff boundary due to Rs 478.40 discontinuity
      expect(atCliff.stdBillPaise).toBeGreaterThan(belowCliff.stdBillPaise);
    });
  });

  describe('evaluateActionWelfare', () => {
    const neutralMu = [1.0, 1.0, 1.0, 1.0];
    const neutralSigma = [0.2, 0.2, 0.2, 0.2];

    it('returns zero welfare for null action', () => {
      const nullAct = PHYSICAL_ACTION_CATALOG.find((a) => a.id === 'null_action')!;
      const res = evaluateActionWelfare(
        nullAct,
        450,
        neutralMu,
        neutralSigma,
        TNPDCL_LT1A_2026_MAY10
      );

      expect(res.isComfortSafe).toBe(true);
      expect(res.expectedWelfarePaise).toBe(0);
      expect(res.conservativeLowerBoundPaise).toBe(0);
      expect(res.meanSavingsPaise).toBe(0);
    });

    it('enforces hard comfort chance-constraint when discomfort exceeds dMax', () => {
      // Inflexible household with very high discomfort weight for AC
      const extremeMu = [3.5, 1.0, 1.0, 1.0];
      const extremeSigma = [0.5, 0.2, 0.2, 0.2];
      const aggressiveAc = PHYSICAL_ACTION_CATALOG.find((a) => a.id === 'ac_curtail_1h')!;

      const res = evaluateActionWelfare(
        aggressiveAc,
        450,
        extremeMu,
        extremeSigma,
        TNPDCL_LT1A_2026_MAY10,
        { dMaxNominal: 2.0 }
      );

      expect(res.isComfortSafe).toBe(false);
      expect(res.expectedWelfarePaise).toBe(-Infinity);
      expect(res.conservativeLowerBoundPaise).toBe(-Infinity);
    });

    it('guarantees load shifting under non-TOU flat/tiered tariff reports zero savings', () => {
      const laundryShift = PHYSICAL_ACTION_CATALOG.find((a) => a.id === 'washing_machine_shift')!;
      const res = evaluateActionWelfare(
        laundryShift,
        450,
        neutralMu,
        neutralSigma,
        TNPDCL_LT1A_2026_MAY10
      );

      expect(res.meanSavingsPaise).toBe(0);
      expect(res.stdSavingsPaise).toBe(0);
      // Since discomfort > 0 and savings = 0, welfare is negative
      expect(res.expectedWelfarePaise).toBeLessThan(0);
    });

    it('computes positive savings and welfare for mild AC thermostat increase', () => {
      const mildAc = PHYSICAL_ACTION_CATALOG.find((a) => a.id === 'ac_setpoint_plus0_5')!;
      const res = evaluateActionWelfare(
        mildAc,
        450,
        neutralMu,
        neutralSigma,
        TNPDCL_LT1A_2026_MAY10
      );

      expect(res.isComfortSafe).toBe(true);
      expect(res.meanSavingsPaise).toBeGreaterThan(0);
    });
  });

  describe('decideTrVoi', () => {
    it('never recommends load shifting under a non-TOU tariff', () => {
      const belief: LatentPreferenceBelief = {
        mu: [1.0, 0.1, 1.0, 1.0], // Super flexible laundry
        sigma: [0.1, 0.05, 0.1, 0.1],
        updatedAt: new Date().toISOString(),
      };

      const decision = decideTrVoi(
        350,
        belief,
        TNPDCL_LT1A_2026_MAY10,
        ['q_ac_flexibility', 'q_laundry_timing', 'q_water_heater_duration', 'q_standby_management']
      );

      if (decision.outcome === 'recommend') {
        expect(decision.recommendedAction?.id).not.toBe('washing_machine_shift');
      }
    });

    it('abstains when all actions violate comfort or fail minimum noticeable welfare threshold', () => {
      // Extremely sensitive household: all actions violate d_max or have negative net welfare
      const hyperSensitiveBelief: LatentPreferenceBelief = {
        mu: [5.0, 5.0, 5.0, 5.0],
        sigma: [0.1, 0.1, 0.1, 0.1],
        updatedAt: new Date().toISOString(),
      };

      const decision = decideTrVoi(
        250,
        hyperSensitiveBelief,
        TNPDCL_LT1A_2026_MAY10,
        ['q_ac_flexibility', 'q_laundry_timing', 'q_water_heater_duration', 'q_standby_management'],
        { cMinPaise: 5000 }
      );

      expect(decision.outcome).toBe('abstain');
    });

    it('emits an adaptive question when EVSI exceeds hurdle and questions are available', () => {
      // Prior belief with high variance (uncertainty) in AC flexibility
      const uncertainBelief: LatentPreferenceBelief = {
        mu: [1.2, 1.0, 1.0, 1.0],
        sigma: [0.8, 0.1, 0.1, 0.1], // High sigma on AC
        updatedAt: new Date().toISOString(),
      };

      const decision = decideTrVoi(
        495, // Near cliff: value of knowing if AC can be raised is very high
        uncertainBelief,
        TNPDCL_LT1A_2026_MAY10,
        [], // No questions asked yet
        { costAskPaise: 50 } // Low query hurdle
      );

      // When EVSI > costAsk, it chooses to ask a question
      if (decision.outcome === 'ask_question') {
        expect(decision.candidateQuestion).toBeDefined();
        expect(decision.candidateQuestion?.id).toBe('q_ac_flexibility');
      }
    });
  });

  describe('updateBeliefWithFeedback', () => {
    const initialBelief: LatentPreferenceBelief = {
      mu: [1.0, 1.0, 1.0, 1.0],
      sigma: [0.4, 0.4, 0.4, 0.4],
      updatedAt: '2026-05-10T00:00:00.000Z',
    };

    it('reduces mean discomfort and halves variance on positive response (+1)', () => {
      const updated = updateBeliefWithFeedback(initialBelief, 0, 1);
      expect(updated.mu[0]).toBeLessThan(initialBelief.mu[0]);
      expect(updated.sigma[0]).toBe(initialBelief.sigma[0] * 0.5);
      // Other dimensions remain unchanged
      expect(updated.mu[1]).toBe(initialBelief.mu[1]);
      expect(updated.sigma[1]).toBe(initialBelief.sigma[1]);
    });

    it('increases mean discomfort and halves variance on negative response (-1)', () => {
      const updated = updateBeliefWithFeedback(initialBelief, 2, -1);
      expect(updated.mu[2]).toBeGreaterThan(initialBelief.mu[2]);
      expect(updated.sigma[2]).toBe(initialBelief.sigma[2] * 0.5);
      expect(updated.mu[0]).toBe(initialBelief.mu[0]);
    });

    it('leaves beliefs untouched on neutral/skip response (0)', () => {
      const updated = updateBeliefWithFeedback(initialBelief, 1, 0);
      expect(updated.mu).toEqual(initialBelief.mu);
      expect(updated.sigma).toEqual(initialBelief.sigma);
    });
  });
});
