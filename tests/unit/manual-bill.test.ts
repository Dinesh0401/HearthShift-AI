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
    expect(result.warnings[0]).toContain('differs from calculated');
    expect(result.warnings[0]).toContain('charge');
  });

  it('rejects impossible calendar dates such as 2026-02-30 without silent rollover', () => {
    const invalidStart = validateManualBill({
      billing_period_start: '2026-02-30',
      billing_period_end: '2026-03-31',
      total_units_kwh: 300,
    });
    expect(invalidStart.is_valid).toBe(false);
    expect(invalidStart.errors.billing_period_start).toContain('Invalid start date format');

    const invalidEnd = validateManualBill({
      billing_period_start: '2026-02-01',
      billing_period_end: '2026-02-30',
      total_units_kwh: 300,
    });
    expect(invalidEnd.is_valid).toBe(false);
    expect(invalidEnd.errors.billing_period_end).toContain('Invalid end date format');
  });

  it('sanitizes HTML/control characters and enforces length cap on bill_reference_no', () => {
    const dirtyInput: ManualBillInput = {
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 250,
      bill_reference_no: '<script>alert(1)</script>CA-04-999\x00\x07-' + 'X'.repeat(80),
    };

    const result = validateManualBill(dirtyInput);

    expect(result.is_valid).toBe(true);
    const cleaned = result.bill_entry?.bill_reference_no;
    expect(cleaned).toBeDefined();
    expect(cleaned).not.toContain('<');
    expect(cleaned).not.toContain('>');
    expect(cleaned).not.toContain('\x00');
    expect(cleaned).not.toContain('\x07');
    expect(cleaned!.length).toBe(64);
  });

  it('uses the selected tariff plan when comparing in-tnpdcl-lt1a-may2026 vs generic-flat-inr', () => {
    const tnpdclResult = validateManualBill({
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 300,
      tariff_id: 'in-tnpdcl-lt1a-may2026',
    });

    const flatResult = validateManualBill({
      billing_period_start: '2026-01-01',
      billing_period_end: '2026-02-28',
      total_units_kwh: 300,
      tariff_id: 'generic-flat-inr',
    });

    expect(tnpdclResult.is_valid).toBe(true);
    expect(tnpdclResult.bill_entry?.tariff_id).toBe('in-tnpdcl-lt1a-may2026');
    // 0-200 free, 201-300 @ ₹4.70 = ₹470.00
    expect(tnpdclResult.calculated_amount).toBe(470.0);

    expect(flatResult.is_valid).toBe(true);
    expect(flatResult.bill_entry?.tariff_id).toBe('generic-flat-inr');
    // 300 * ₹5.00 + ₹50 fixed + 5% duty on ₹1500 (₹75) = ₹1625.00
    expect(flatResult.calculated_amount).toBe(1625.0);
  });
});
