/**
 * HearthShift AI — Comprehensive Billing Calculator Unit Tests
 * 
 * Verifies deterministic tariff arithmetic, GoTN welfare subsidies,
 * bi-monthly billing, the May 2026 eligibility cliff, and time-independent load shifting.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateBill,
  calculateShiftCostDelta,
  prorateBillAcrossTariffVersions,
} from '../../src/core/tariff/calculator';
import {
  TNPDCL_LT1A_2024_2025,
  TNPDCL_LT1A_2025_2026,
  TNPDCL_LT1A_MAY_2026_SCHEME,
  GENERIC_FLAT_TARIFF_INR,
  GENERIC_TOU_TARIFF_INR,
} from '../../src/core/tariff/tariffs/tnpdcl-lt1a';

describe('Deterministic Billing Calculator', () => {
  // ══════════════════════════════════════════════════════════
  // 1. Generic Flat Tariff Tests
  // ══════════════════════════════════════════════════════════

  describe('Flat Tariff Calculations', () => {
    it('AT-001: calculates flat rate bill with fixed charge and 5% tax', () => {
      // 300 kWh @ ₹5.00/kWh = ₹1,500
      // Fixed charge = ₹50.00
      // Net energy = ₹1,500, Taxable base = ₹1,500 (tax does not apply to fixed charge in this config)
      // Tax (5% of ₹1,500) = ₹75.00
      // Net payable = ₹1,500 + ₹50 + ₹75 = ₹1,625.00
      const result = calculateBill(300, GENERIC_FLAT_TARIFF_INR);

      expect(result.gross_energy_charges_paise).toBe(150000); // ₹1,500.00
      expect(result.fixed_charges_paise).toBe(5000); // ₹50.00
      expect(result.electricity_duty_paise).toBe(7500); // ₹75.00
      expect(result.net_payable_paise).toBe(162500); // ₹1,625.00
      expect(result.net_payable).toBe(1625.0);
    });

    it('AT-004: handles zero consumption gracefully', () => {
      const result = calculateBill(0, GENERIC_FLAT_TARIFF_INR);

      expect(result.gross_energy_charges_paise).toBe(0);
      expect(result.fixed_charges_paise).toBe(5000); // Fixed charge still applies
      expect(result.electricity_duty_paise).toBe(0); // 5% of 0 is 0
      expect(result.net_payable_paise).toBe(5000); // ₹50.00
      expect(result.net_payable).toBe(50.0);
    });

    it('AT-005: rejects negative consumption with descriptive RangeError', () => {
      expect(() => calculateBill(-25, GENERIC_FLAT_TARIFF_INR)).toThrowError(RangeError);
      expect(() => calculateBill(-0.01, GENERIC_FLAT_TARIFF_INR)).toThrow(
        /Negative consumption rejected/
      );
    });

    it('AT-005b: rejects non-numeric and NaN values with TypeError', () => {
      expect(() => calculateBill(NaN, GENERIC_FLAT_TARIFF_INR)).toThrowError(TypeError);
      expect(() => calculateBill(Infinity, GENERIC_FLAT_TARIFF_INR)).toThrowError(TypeError);
      // @ts-expect-error Testing runtime invalid type
      expect(() => calculateBill('500', GENERIC_FLAT_TARIFF_INR)).toThrowError(TypeError);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 2. TNPDCL LT-1A Domestic Tariff (2024–2025) Tests
  // ══════════════════════════════════════════════════════════

  describe('TNPDCL LT-1A Domestic (2024–2025) Official Rules', () => {
    it('grants 100 free units: 100 kWh consumption produces ₹0.00 bill', () => {
      const result = calculateBill(100, TNPDCL_LT1A_2024_2025);

      expect(result.gross_energy_charges_paise).toBe(45000); // 100 * ₹4.50 = ₹450
      expect(result.total_subsidy_deductions_paise).toBe(45000); // ₹450 subsidized
      expect(result.net_energy_charges_paise).toBe(0);
      expect(result.fixed_charges_paise).toBe(0);
      expect(result.net_payable_paise).toBe(0);
      expect(result.net_payable).toBe(0.0);
    });

    it('calculates 200 kWh correctly with GoTN concessionary subsidy', () => {
      // 0-100 units: Free (100 * ₹4.50 subsidized = ₹0)
      // 101-200 units: 100 units @ (₹4.50 gross - ₹2.25 subsidy) = ₹2.25 * 100 = ₹225.00
      // Total payable = ₹225.00
      const result = calculateBill(200, TNPDCL_LT1A_2024_2025);

      expect(result.net_payable_paise).toBe(22500); // ₹225.00
      expect(result.net_payable).toBe(225.0);
    });

    it('calculates 400 kWh accurately', () => {
      // 0-100: Free (₹0)
      // 101-200: 100 units @ ₹2.25 = ₹225.00
      // 201-400: 200 units @ ₹4.50 = ₹900.00
      // Total payable = ₹225 + ₹900 = ₹1,125.00
      const result = calculateBill(400, TNPDCL_LT1A_2024_2025);

      expect(result.net_payable_paise).toBe(112500); // ₹1,125.00
      expect(result.net_payable).toBe(1125.0);
    });

    it('calculates exactly at the 500 kWh boundary', () => {
      // 0-100: Free (₹0)
      // 101-200: 100 units @ ₹2.25 = ₹225.00
      // 201-400: 200 units @ ₹4.50 = ₹900.00
      // 401-500: 100 units @ ₹6.00 = ₹600.00
      // Total payable = ₹225 + ₹900 + ₹600 = ₹1,725.00
      const result = calculateBill(500, TNPDCL_LT1A_2024_2025);

      expect(result.net_payable_paise).toBe(172500); // ₹1,725.00
      expect(result.net_payable).toBe(1725.0);
    });

    it('handles category jump when consumption exceeds 500 units (501 kWh)', () => {
      // When consumption > 500 units:
      // Category shifts to high consumption slabs!
      // 0-100: Free (₹0)
      // 101-400: 300 units @ ₹4.50 = ₹1,350.00 (loss of 101-200 concessionary subsidy!)
      // 401-500: 100 units @ ₹6.00 = ₹600.00
      // 501-501: 1 unit @ ₹8.00 = ₹8.00
      // Total payable = ₹1,350 + ₹600 + ₹8 = ₹1,958.00
      const bill500 = calculateBill(500, TNPDCL_LT1A_2024_2025);
      const bill501 = calculateBill(501, TNPDCL_LT1A_2024_2025);

      expect(bill500.net_payable).toBe(1725.0);
      expect(bill501.net_payable).toBe(1958.0);

      // Demonstrates the critical threshold jump (₹233 jump for 1 unit!)
      const cliffJump = bill501.net_payable - bill500.net_payable;
      expect(cliffJump).toBe(233.0);
    });

    it('calculates high consumption tiers (600, 800, 1000 kWh)', () => {
      // 600 kWh:
      // 0-100: Free
      // 101-400 (300 units @ ₹4.50) = ₹1,350
      // 401-500 (100 units @ ₹6.00) = ₹600
      // 501-600 (100 units @ ₹8.00) = ₹800
      // Total = ₹1,350 + ₹600 + ₹800 = ₹2,750.00
      const bill600 = calculateBill(600, TNPDCL_LT1A_2024_2025);
      expect(bill600.net_payable).toBe(2750.0);

      // 800 kWh:
      // Units 0-600: ₹2,750
      // 601-800 (200 units @ ₹9.00) = ₹1,800
      // Total = ₹2,750 + ₹1,800 = ₹4,550.00
      const bill800 = calculateBill(800, TNPDCL_LT1A_2024_2025);
      expect(bill800.net_payable).toBe(4550.0);

      // 1000 kWh:
      // Units 0-800: ₹4,550
      // 801-1000 (200 units @ ₹10.00) = ₹2,000
      // Total = ₹4,550 + ₹2,000 = ₹6,550.00
      const bill1000 = calculateBill(1000, TNPDCL_LT1A_2024_2025);
      expect(bill1000.net_payable).toBe(6550.0);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 3. May 2026 Welfare Scheme (200 Free Units <= 500 kWh)
  // ══════════════════════════════════════════════════════════

  describe('TNPDCL May 2026 Welfare Scheme (200 Free Units Boundary)', () => {
    it('grants 200 free units for 200 kWh consumption (₹0.00 payable)', () => {
      const result = calculateBill(200, TNPDCL_LT1A_MAY_2026_SCHEME);

      expect(result.net_payable_paise).toBe(0);
      expect(result.net_payable).toBe(0.0);
      expect(result.subsidy_audit[0].is_eligible).toBe(true);
      expect(result.subsidy_audit[0].reason).toContain('Granted 200 free units');
    });

    it('calculates 499 and 500 kWh with 200 free units applied', () => {
      // At 500 kWh under 2025-2026 rates with 200 free units:
      // 0-200: Free (₹0)
      // 201-400 (200 units @ ₹4.70) = ₹940.00
      // 401-500 (100 units @ ₹6.30) = ₹630.00
      // Total = ₹940 + ₹630 = ₹1,570.00
      const bill500 = calculateBill(500, TNPDCL_LT1A_MAY_2026_SCHEME);
      expect(bill500.net_payable).toBe(1570.0);

      // At 499 kWh:
      // 0-200: Free (₹0)
      // 201-400 (200 units @ ₹4.70) = ₹940.00
      // 401-499 (99 units @ ₹6.30) = ₹623.70
      // Total = ₹940 + ₹623.70 = ₹1,563.70
      const bill499 = calculateBill(499, TNPDCL_LT1A_MAY_2026_SCHEME);
      expect(bill499.net_payable).toBe(1563.7);
    });

    it('CRITICAL TEST: Boundary discontinuity at 500 vs 501 units', () => {
      // At 500 units: Eligible for 200 free units -> ₹1,570.00
      // At 501 units: Exceeds 500 units ceiling!
      // Disqualified from 200 free units, falls back to 100 free units!
      // Category shifts to high-consumption slabs:
      // 0-100: Free (100 units free)
      // 101-400 (300 units @ ₹4.70) = ₹1,410.00
      // 401-500 (100 units @ ₹6.30) = ₹630.00
      // 501-501 (1 unit @ ₹8.40) = ₹8.40
      // Total = ₹1,410 + ₹630 + ₹8.40 = ₹2,048.40!
      const bill500 = calculateBill(500, TNPDCL_LT1A_MAY_2026_SCHEME);
      const bill501 = calculateBill(501, TNPDCL_LT1A_MAY_2026_SCHEME);

      expect(bill500.net_payable).toBe(1570.0);
      expect(bill501.net_payable).toBe(2048.4);

      // The cliff is a dramatic jump of ₹478.40 (47,840 paise) for just 1 single kWh!
      const cliffDeltaPaise = bill501.net_payable_paise - bill500.net_payable_paise;
      expect(cliffDeltaPaise).toBe(47840); // Exact integer paise: ₹478.40
      const cliffDelta = bill501.net_payable - bill500.net_payable;
      expect(cliffDelta).toBeCloseTo(478.4, 2);

      // Audit verifies disqualification was explicitly recorded
      const audit501 = bill501.subsidy_audit.find((a) => a.label.includes('200 Free Units'));
      expect(audit501?.is_eligible).toBe(false);
      expect(audit501?.reason).toContain('exceeded eligibility ceiling of 500 kWh');
    });

    it('reports accurate slab headroom and marginal cliff spike', () => {
      // At 450 kWh, headroom to 500 kWh cliff should be exactly 50 kWh
      const bill450 = calculateBill(450, TNPDCL_LT1A_MAY_2026_SCHEME);
      expect(bill450.units_to_next_threshold).toBe(50);
      expect(bill450.threshold_description).toContain('500 kWh');

      // At exactly 500 kWh, the marginal cost of the next unit (the 501st unit) spikes to ₹478.40!
      const bill500 = calculateBill(500, TNPDCL_LT1A_MAY_2026_SCHEME);
      expect(bill500.marginal_rate_next_unit_paise).toBe(47840);
      expect(bill500.marginal_rate_next_unit).toBe(478.4);
    });

    it('verifies strict monotonicity of the underlying unsubsidized gross tariff', () => {
      // While welfare subsidies create discontinuities, the gross tariff MUST be strictly monotonic
      let previousGross = 0;
      for (let kwh = 0; kwh <= 1000; kwh += 25) {
        const bill = calculateBill(kwh, TNPDCL_LT1A_MAY_2026_SCHEME);
        expect(bill.gross_energy_charges_paise).toBeGreaterThanOrEqual(previousGross);
        previousGross = bill.gross_energy_charges_paise;
      }
    });

    it('handles fractional kilowatt-hour consumption accurately with integer paise rounding', () => {
      // 123.45 kWh under flat tariff (₹5.00/kWh)
      // 123.45 * 500 paise = 61725 paise = ₹617.25
      // Fixed charge = ₹50.00
      // Duty (5%) = Math.round(61725 * 0.05) = 3086 paise = ₹30.86
      // Total = 61725 + 5000 + 3086 = 69811 paise = ₹698.11
      const result = calculateBill(123.45, GENERIC_FLAT_TARIFF_INR);
      expect(result.gross_energy_charges_paise).toBe(61725);
      expect(result.electricity_duty_paise).toBe(3086);
      expect(result.net_payable_paise).toBe(69811);
      expect(result.net_payable).toBe(698.11);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 4. Fundamental Law: Never Invent TOU Savings
  // ══════════════════════════════════════════════════════════

  describe('Load Shifting & Time-Independence Law', () => {
    it('AT-TIME-INDEPENDENT: Shifting load under TNPDCL LT-1A yields IDENTICALLY ₹0.00 savings', () => {
      // Scenario: Washing machine cycle of 1.5 kWh shifted from evening (19:00) to morning (07:00)
      const baselineSchedule = [
        { hour: 19, kwh: 1.5 },
        { hour: 20, kwh: 2.0 },
      ];
      const proposedSchedule = [
        { hour: 7, kwh: 1.5 },
        { hour: 20, kwh: 2.0 },
      ];

      const result = calculateShiftCostDelta(
        baselineSchedule,
        proposedSchedule,
        TNPDCL_LT1A_2024_2025
      );

      // Economic truth: Shifting without rate difference or unit reduction saves ZERO
      expect(result.cost_delta_paise).toBe(0);
      expect(result.cost_delta).toBe(0.0);
      expect(result.is_time_dependent_savings).toBe(false);
      expect(result.explanation).toContain('time-independent');
      expect(result.explanation).toContain('saves ₹0.00');
    });

    it('AT-TOU-SAVINGS: Shifting load under Time-of-Use tariff yields verified positive savings', () => {
      // Scenario: Shift 2.0 kWh from Evening Peak (19:00, ₹10/kWh) to Night Off-Peak (23:00, ₹5/kWh)
      const baselineSchedule = [{ hour: 19, kwh: 2.0 }]; // 2 kWh * ₹10 = ₹20.00
      const proposedSchedule = [{ hour: 23, kwh: 2.0 }]; // 2 kWh * ₹5 = ₹10.00

      const result = calculateShiftCostDelta(
        baselineSchedule,
        proposedSchedule,
        GENERIC_TOU_TARIFF_INR
      );

      // Savings: ₹20 - ₹10 = ₹10.00 (1000 paise)
      expect(result.cost_delta_paise).toBe(1000);
      expect(result.cost_delta).toBe(10.0);
      expect(result.is_time_dependent_savings).toBe(true);
      expect(result.explanation).toContain('yields ₹10.00 savings');
    });
  });

  // ══════════════════════════════════════════════════════════
  // 5. Tariff Versioning & Prorating Tests
  // ══════════════════════════════════════════════════════════

  describe('Tariff Version Transition & Prorating', () => {
    it('prorates consumption across a tariff revision boundary', () => {
      // Total 400 kWh consumed across 60 days: 30 days under 2024 tariff, 30 days under 2025 tariff
      const prorated = prorateBillAcrossTariffVersions(
        400,
        30,
        TNPDCL_LT1A_2024_2025,
        30,
        TNPDCL_LT1A_2025_2026
      );

      expect(prorated.period1_units_kwh).toBe(200);
      expect(prorated.period2_units_kwh).toBe(200);
      expect(prorated.prorated_payable).toBeGreaterThan(0);
      expect(Number.isFinite(prorated.prorated_payable)).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════
  // 6. Arithmetic Determinism Invariant
  // ══════════════════════════════════════════════════════════

  describe('Deterministic Arithmetic Invariance', () => {
    it('produces identical outputs across 1,000 successive runs', () => {
      const firstRun = calculateBill(437.5, TNPDCL_LT1A_2024_2025);
      for (let i = 0; i < 1000; i++) {
        const nextRun = calculateBill(437.5, TNPDCL_LT1A_2024_2025);
        expect(nextRun.net_payable_paise).toBe(firstRun.net_payable_paise);
        expect(nextRun.net_payable).toBe(firstRun.net_payable);
        expect(nextRun.gross_energy_charges_paise).toBe(firstRun.gross_energy_charges_paise);
      }
    });
  });
});
