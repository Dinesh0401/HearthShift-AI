/**
 * HearthShift AI — Manual Bill Ingestion Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { validateManualBill, type ManualBillInput } from '../../src/core/ingestion/manual-bill';

describe('Manual Bill Validation', () => {
  it('validates a correct bi-monthly bill entry', () => {
    const validBill: ManualBillInput = {
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 450,
      total_amount: 1425.0,
      currency: 'INR',
      tariff_id: 'in-tnpdcl-lt1a-2024',
      bill_reference_no: 'CA-04-129-8472',
    };

    const result = validateManualBill(validBill);

    expect(result.is_valid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
    expect(result.bill_entry).toBeDefined();
    expect(result.bill_entry?.total_units_kwh).toBe(450);
    expect(result.bill_entry?.bill_reference_no).toBe('CA-04-129-8472');
    expect(result.calculated_amount).toBeGreaterThan(0);
  });

  it('rejects end date earlier than start date', () => {
    const invalidDates: ManualBillInput = {
      billing_period_start: '2026-03-01',
      billing_period_end: '2026-02-01',
      total_units_kwh: 200,
    };

    const result = validateManualBill(invalidDates);

    expect(result.is_valid).toBe(false);
    expect(result.errors.billing_period_end).toContain('earlier than start date');
  });

  it('rejects future billing dates', () => {
    const futureDate: ManualBillInput = {
      billing_period_start: '2026-12-01',
      billing_period_end: '2029-01-01',
      total_units_kwh: 300,
    };

    const result = validateManualBill(futureDate);

    expect(result.is_valid).toBe(false);
    expect(result.errors.billing_period_end).toContain('future');
  });

  it('rejects negative consumption', () => {
    const negativeKwh: ManualBillInput = {
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: -50,
    };

    const result = validateManualBill(negativeKwh);

    expect(result.is_valid).toBe(false);
    expect(result.errors.total_units_kwh).toContain('cannot be negative');
  });

  it('warns when user entered bill amount substantially differs from calculated tariff charge', () => {
    const billWithArrears: ManualBillInput = {
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 100, // 100 units under TNPDCL is ₹0 (free units)
      total_amount: 850.0,   // User bill shows ₹850 due to arrears
    };

    const result = validateManualBill(billWithArrears);

    expect(result.is_valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('differs from calculated tariff charge');
  });
});
