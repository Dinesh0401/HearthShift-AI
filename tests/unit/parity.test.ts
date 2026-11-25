/**
 * Cross-Language Parity Verification Suite (TypeScript)
 * Validates that the TypeScript implementation matches the Python research engine
 * across identical versioned fixtures from tests/fixtures/cross_language_parity_fixtures.json.
 */

import { describe, it, expect } from 'vitest';
import fixtures from '../fixtures/cross_language_parity_fixtures.json';
import { calculateBill } from '../../src/core/tariff/calculator';
import {
  TNPDCL_LT1A_2026_MAY10,
  getTariffPlanById,
} from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import {
  decideTrVoi,
  exactPiecewiseTariffMoments,
  updateBeliefWithFeedback,
  type LatentPreferenceBelief,
} from '../../src/core/optimization/tr-voi';

describe('Cross-Language Parity: Python vs TypeScript', () => {
  describe('Exact Statutory Tariff Calculations', () => {
    it('verifies exact integer-paise parity across all statutory slabs and the ₹478.40 cliff', () => {
      for (const c of fixtures.tariff_bills) {
        const result = calculateBill(c.kwh, TNPDCL_LT1A_2026_MAY10);

        expect(result.gross_energy_charges_paise).toBe(c.gross_energy_charges_paise);
        expect(result.total_subsidy_deductions_paise).toBe(c.total_subsidy_deductions_paise);
        expect(result.net_payable_paise).toBe(c.net_payable_paise);
        expect(result.net_payable).toBeCloseTo(c.net_payable_inr, 2);
      }
    });
  });

  describe('Piecewise Normal Tariff Moments', () => {
    it('verifies exact analytical expectation, variance, and cliff-crossing probability within 0.1% tolerance', () => {
      for (const c of fixtures.piecewise_normal_moments) {
        const result = exactPiecewiseTariffMoments(c.mu, c.sigma, TNPDCL_LT1A_2026_MAY10);

        if (c.mean_bill_paise > 0) {
          const relErrMean = Math.abs(result.meanBillPaise - c.mean_bill_paise) / c.mean_bill_paise;
          expect(relErrMean).toBeLessThan(1e-3);
        } else {
          expect(Math.abs(result.meanBillPaise - c.mean_bill_paise)).toBeLessThan(1.0);
        }

        if (c.std_bill_paise > 1.0) {
          const relErrStd = Math.abs(result.stdBillPaise - c.std_bill_paise) / c.std_bill_paise;
          expect(relErrStd).toBeLessThan(1e-3);
        }

        expect(result.cliffCrossingProb).toBeCloseTo(c.cliff_crossing_prob, 2);
      }
    });
  });

  describe('Bayesian Preference Belief Updates', () => {
    it('verifies exact recursive posterior updates on discrete feedback', () => {
      for (const c of fixtures.bayesian_updates) {
        const initialBelief: LatentPreferenceBelief = {
          mu: [...c.initial_mu],
          sigma: [...c.initial_sigma],
          updatedAt: '2026-05-10T00:00:00.000Z',
        };

        const updated = updateBeliefWithFeedback(
          initialBelief,
          c.feature_index,
          c.response as 1 | -1 | 0
        );

        for (let i = 0; i < 4; i++) {
          expect(updated.mu[i]).toBeCloseTo(c.expected_mu[i], 3);
          expect(updated.sigma[i]).toBeCloseTo(c.expected_sigma[i], 3);
        }
      }
    });
  });

  describe('Multi-Tariff Piecewise Normal Moments Parity', () => {
    it('verifies exact analytical moments across May 2026, 2025, 2024, and generic flat tariffs', () => {
      const seenTariffs = new Set<string>();

      for (const c of fixtures.multi_tariff_piecewise_moments) {
        seenTariffs.add(c.tariff_id);
        const tariff = getTariffPlanById(c.tariff_id);
        expect(tariff.id).toBe(c.tariff_id);

        const result = exactPiecewiseTariffMoments(c.mu, c.sigma, tariff);

        if (c.mean_bill_paise > 0) {
          const relErrMean = Math.abs(result.meanBillPaise - c.mean_bill_paise) / c.mean_bill_paise;
          expect(relErrMean).toBeLessThan(1e-3);
        } else {
          expect(Math.abs(result.meanBillPaise - c.mean_bill_paise)).toBeLessThan(1.0);
        }

        if (c.std_bill_paise > 1.0) {
          const relErrStd = Math.abs(result.stdBillPaise - c.std_bill_paise) / c.std_bill_paise;
          expect(relErrStd).toBeLessThan(1e-3);
        } else {
          expect(Math.abs(result.stdBillPaise - c.std_bill_paise)).toBeLessThanOrEqual(1.0);
        }

        expect(result.cliffCrossingProb).toBeCloseTo(c.cliff_crossing_prob, 2);
      }

      expect(seenTariffs).toEqual(
        new Set(['in-tnpdcl-lt1a-may2026', 'in-tnpdcl-lt1a-2025', 'in-tnpdcl-lt1a-2024', 'generic-flat-inr'])
      );
    });
  });

  describe('End-to-End Tri-State decideTrVoi Decision Parity', () => {
    it('matches Python ThresholdAwareRobustVOIAdvisor across recommend, ask_question, and abstain outcomes', () => {
      const seenOutcomes = new Set<string>();

      for (const c of fixtures.tr_voi_decisions) {
        const tariff = getTariffPlanById(c.tariff_id);
        expect(tariff.id).toBe(c.tariff_id);

        let belief: LatentPreferenceBelief = {
          mu: [...c.initial_mu],
          sigma: [...c.initial_sigma],
          updatedAt: '2026-05-10T00:00:00.000Z',
        };

        if (c.prior_feedback) {
          // Verify first step emits the exact adaptive question before applying feedback
          const step1 = decideTrVoi(c.baseline_kwh, belief, tariff, []);
          expect(step1.outcome).toBe('ask_question');
          expect(step1.candidateQuestion?.id).toBe(c.prior_feedback.question_id);

          belief = updateBeliefWithFeedback(
            belief,
            c.prior_feedback.feature_index,
            c.prior_feedback.response as 1 | -1 | 0
          );
        }

        const result = decideTrVoi(c.baseline_kwh, belief, tariff, c.asked_question_ids);
        seenOutcomes.add(result.outcome);

        expect(result.outcome, `Outcome mismatch for ${c.case_id}`).toBe(c.expected_outcome);

        if (c.expected_outcome === 'recommend') {
          expect(result.recommendedAction?.id, `Action mismatch for ${c.case_id}`).toBe(
            c.expected_action_id
          );
          expect(result.candidateQuestion).toBeUndefined();
          const relErrMetric =
            Math.abs(result.metadata.decisionMetricPaise - c.expected_decision_metric_paise) /
            Math.max(1.0, c.expected_decision_metric_paise);
          expect(relErrMetric).toBeLessThan(1e-3);
        } else if (c.expected_outcome === 'ask_question') {
          expect(result.candidateQuestion?.id, `Question mismatch for ${c.case_id}`).toBe(
            c.expected_question_id
          );
          expect(result.recommendedAction).toBeUndefined();
        } else {
          expect(result.recommendedAction).toBeUndefined();
          expect(result.candidateQuestion).toBeUndefined();
        }
      }

      expect(seenOutcomes).toEqual(new Set(['recommend', 'ask_question', 'abstain']));
    });
  });
});
