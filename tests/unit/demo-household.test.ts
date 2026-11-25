/**
 * HearthShift AI — Safe Synthetic Demo Household & Historical Tariff Regression Tests
 *
 * Ensures synthetic demo bills dated before May 10, 2026 apply the historically
 * applicable TNPDCL LT-1A schedule (`in-tnpdcl-lt1a-2025`), preserves the 508 kWh
 * cycle, and keeps historical billing distinct from modern counterfactual simulations.
 */

import { describe, it, expect } from 'vitest';
import { calculateBill } from '../../src/core/tariff/calculator';
import {
  getTariffPlanById,
  resolveTnpdclTariffForPeriod,
  TNPDCL_LT1A_2025_2026,
  TNPDCL_LT1A_MAY_2026_SCHEME,
} from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import {
  DEMO_TARIFF_ID,
  SYNTHETIC_DEMO_BILL_SPECS,
  buildSyntheticDemoBills,
} from '../../src/core/demo/synthetic-household';

describe('Safe Demo Household Historical Tariff Integrity', () => {
  it('assigns pre-May-2026 historical schedules to Jan–Apr demo bills and preserves May–Jun 508 kWh', () => {
    const bills = buildSyntheticDemoBills('2026-11-25T00:00:00.000Z');
    expect(bills).toHaveLength(3);
    expect(SYNTHETIC_DEMO_BILL_SPECS.map((b) => b.total_units_kwh)).toEqual([445, 492, 508]);

    // Bill 1: Jan–Feb 2026 (445 kWh) -> historical pre-May-10 tariff (₹1,458.50)
    expect(bills[0]).toMatchObject({
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 445,
      tariff_id: 'in-tnpdcl-lt1a-2025',
      total_amount: 1458.5,
      bill_reference_no: 'DEMO-SYNTH-2026-01',
    });

    // Bill 2: Mar–Apr 2026 (492 kWh) -> historical pre-May-10 tariff (₹1,754.60)
    expect(bills[1]).toMatchObject({
      billing_period_start: '2026-03-01',
      billing_period_end: '2026-04-30',
      total_units_kwh: 492,
      tariff_id: 'in-tnpdcl-lt1a-2025',
      total_amount: 1754.6,
      bill_reference_no: 'DEMO-SYNTH-2026-02',
    });

    // Bill 3: May–Jun 2026 (508 kWh) -> preserves 508 kWh May 2026 schedule (₹2,107.20)
    expect(bills[2]).toMatchObject({
      billing_period_start: '2026-05-01',
      billing_period_end: '2026-06-30',
      total_units_kwh: 508,
      tariff_id: 'in-tnpdcl-lt1a-may2026',
      total_amount: 2107.2,
      bill_reference_no: 'DEMO-SYNTH-2026-03',
    });
  });

  it('matches deterministic calculateBill() outputs in exact paise and separates modern counterfactual schedule', () => {
    const bills = buildSyntheticDemoBills('2026-11-25T00:00:00.000Z');

    for (const bill of bills) {
      const plan = getTariffPlanById(bill.tariff_id);
      const result = calculateBill(bill.total_units_kwh, plan);
      expect(result.net_payable).toBe(bill.total_amount);
    }

    // Modern forward-looking counterfactual simulations remain pinned to May 2026 schedule
    expect(DEMO_TARIFF_ID).toBe(TNPDCL_LT1A_MAY_2026_SCHEME.id);
    // Under the active May 2026 schedule, 445 kWh and 492 kWh model ₹235.00 lower than pre-May receipts
    expect(calculateBill(445, TNPDCL_LT1A_2025_2026).net_payable_paise).toBe(145850);
    expect(calculateBill(445, TNPDCL_LT1A_MAY_2026_SCHEME).net_payable_paise).toBe(122350);
    expect(calculateBill(492, TNPDCL_LT1A_2025_2026).net_payable_paise).toBe(175460);
    expect(calculateBill(492, TNPDCL_LT1A_MAY_2026_SCHEME).net_payable_paise).toBe(151960);
    expect(calculateBill(508, TNPDCL_LT1A_2025_2026).net_payable_paise).toBe(210720);
    expect(calculateBill(508, TNPDCL_LT1A_MAY_2026_SCHEME).net_payable_paise).toBe(210720);
  });

  it('flags billing cycles crossing the May 10, 2026 policy date while keeping pre/post complete cycles unflagged', () => {
    const janFeb = resolveTnpdclTariffForPeriod('2026-02-28', '2026-01-01');
    expect(janFeb.plan.id).toBe('in-tnpdcl-lt1a-2025');
    expect(janFeb.isTransitionBoundaryStraddled).toBe(false);

    const marApr = resolveTnpdclTariffForPeriod('2026-04-30', '2026-03-01');
    expect(marApr.plan.id).toBe('in-tnpdcl-lt1a-2025');
    expect(marApr.isTransitionBoundaryStraddled).toBe(false);

    const mayJun = resolveTnpdclTariffForPeriod('2026-06-30', '2026-05-01');
    expect(mayJun.plan.id).toBe('in-tnpdcl-lt1a-may2026');
    expect(mayJun.isTransitionBoundaryStraddled).toBe(true);

    const julAug = resolveTnpdclTariffForPeriod('2026-08-31', '2026-07-01');
    expect(julAug.plan.id).toBe('in-tnpdcl-lt1a-may2026');
    expect(julAug.isTransitionBoundaryStraddled).toBe(false);
  });
});
