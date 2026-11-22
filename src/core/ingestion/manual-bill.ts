/**
 * HearthShift AI — Manual Electricity Bill Ingestion Module
 * 
 * Validates manual utility bill entries, verifies date ranges,
 * checks against tariff definitions, and provides safe defaults.
 * Stores records strictly on-device in IndexedDB.
 * 
 * @module core/ingestion/manual-bill
 */

import type { MonthlyBillEntry } from '../../types/contracts';
import { db, type StoredBillEntry } from '../../lib/db';
import { calculateBill } from '../tariff/calculator';
import { TNPDCL_LT1A_2024_2025 } from '../tariff/tariffs/tnpdcl-lt1a';

export interface ManualBillInput {
  billing_period_start: string; // ISO 8601 date YYYY-MM-DD
  billing_period_end: string;   // ISO 8601 date YYYY-MM-DD
  total_units_kwh: number;
  total_amount?: number;        // Optional user-entered actual bill amount
  currency?: string;            // Default: 'INR'
  tariff_id?: string;           // Selected tariff plan ID
  bill_reference_no?: string;   // Optional consumer reference (stored locally only)
}

export interface BillValidationResult {
  is_valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  calculated_amount?: number;
  amount_discrepancy?: number;
  bill_entry?: MonthlyBillEntry;
}

/**
 * Validates a manual bill entry with comprehensive domain integrity checks.
 * Pure function: no database writes or side effects.
 */
export function validateManualBill(input: ManualBillInput): BillValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Date Validation
  if (!input.billing_period_start) {
    errors.billing_period_start = 'Billing period start date is required.';
  }
  if (!input.billing_period_end) {
    errors.billing_period_end = 'Billing period end date is required.';
  }

  const startDate = new Date(input.billing_period_start);
  const endDate = new Date(input.billing_period_end);
  const now = new Date();

  if (isNaN(startDate.getTime())) {
    errors.billing_period_start = 'Invalid start date format. Expected YYYY-MM-DD.';
  }
  if (isNaN(endDate.getTime())) {
    errors.billing_period_end = 'Invalid end date format. Expected YYYY-MM-DD.';
  }

  if (!errors.billing_period_start && !errors.billing_period_end) {
    if (startDate > endDate) {
      errors.billing_period_end = 'End date cannot be earlier than start date.';
    }
    if (endDate > now) {
      errors.billing_period_end = 'Billing period end date cannot be in the future.';
    }

    const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (durationDays < 15) {
      warnings.push(`Billing period is unusually short (${durationDays} days). Standard residential cycles are 30 or 60 days.`);
    } else if (durationDays > 95) {
      warnings.push(`Billing period is unusually long (${durationDays} days). Please verify meter reading dates.`);
    }
  }

  // 2. Consumption Validation
  if (typeof input.total_units_kwh !== 'number' || isNaN(input.total_units_kwh)) {
    errors.total_units_kwh = 'Consumption must be a valid number.';
  } else if (input.total_units_kwh < 0) {
    errors.total_units_kwh = 'Consumption cannot be negative.';
  } else if (input.total_units_kwh > 50000) {
    warnings.push('Consumption exceeds 50,000 kWh. Please confirm this is a domestic household reading.');
  }

  // 3. Amount Validation (if provided)
  if (input.total_amount !== undefined) {
    if (typeof input.total_amount !== 'number' || isNaN(input.total_amount)) {
      errors.total_amount = 'Bill amount must be a valid number.';
    } else if (input.total_amount < 0) {
      errors.total_amount = 'Bill amount cannot be negative.';
    }
  }

  let calculatedAmount: number | undefined = undefined;
  let amountDiscrepancy: number | undefined = undefined;

  // 4. Tariff comparison (if valid)
  if (Object.keys(errors).length === 0) {
    try {
      // Use default tariff for verification
      const tariff = TNPDCL_LT1A_2024_2025;
      const calculation = calculateBill(input.total_units_kwh, tariff);
      calculatedAmount = calculation.net_payable;

      if (input.total_amount !== undefined) {
        amountDiscrepancy = Math.round((input.total_amount - calculatedAmount) * 100) / 100;
        if (Math.abs(amountDiscrepancy) > 50) {
          warnings.push(
            `Entered bill amount (₹${input.total_amount.toFixed(2)}) differs from calculated tariff charge (₹${calculatedAmount.toFixed(2)}) by ₹${Math.abs(amountDiscrepancy).toFixed(2)}. This may be due to arrears, delayed payment surcharges, or adjustments.`
          );
        }
      }
    } catch {
      // Tariff calculation failure should not block bill entry
    }
  }

  const isValid = Object.keys(errors).length === 0;

  const billEntry: MonthlyBillEntry | undefined = isValid
    ? {
        billing_period_start: input.billing_period_start,
        billing_period_end: input.billing_period_end,
        total_units_kwh: input.total_units_kwh,
        total_amount: input.total_amount,
        currency: input.currency ?? 'INR',
        tariff_id: input.tariff_id ?? 'in-tnpdcl-lt1a-2024',
        bill_reference_no: input.bill_reference_no?.trim(),
      }
    : undefined;

  return {
    is_valid: isValid,
    errors,
    warnings,
    calculated_amount: calculatedAmount,
    amount_discrepancy: amountDiscrepancy,
    bill_entry: billEntry,
  };
}

/**
 * Saves a validated manual bill to local IndexedDB.
 */
export async function saveManualBill(entry: MonthlyBillEntry): Promise<number> {
  const now = new Date().toISOString();
  const storedEntry: StoredBillEntry = {
    ...entry,
    created_at: now,
    updated_at: now,
  };

  const id = await db.bills.add(storedEntry);
  return id;
}

/**
 * Retrieves all stored manual bills ordered chronologically.
 */
export async function getStoredBills(): Promise<StoredBillEntry[]> {
  return db.bills.orderBy('billing_period_start').reverse().toArray();
}

/**
 * Deletes a manual bill by ID.
 */
export async function deleteStoredBill(id: number): Promise<void> {
  await db.bills.delete(id);
}
