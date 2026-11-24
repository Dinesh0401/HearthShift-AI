/**
 * Cross-Language Parity Verification Suite (TypeScript)
 * Validates that the TypeScript implementation matches the Python research engine
 * across identical versioned fixtures from tests/fixtures/cross_language_parity_fixtures.json.
 */

import { describe, it, expect } from 'vitest';
import fixtures from '../fixtures/cross_language_parity_fixtures.json';
import { calculateBill } from '../../src/core/tariff/calculator';
import { TNPDCL_LT1A_2026_MAY10 } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import {
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
});
