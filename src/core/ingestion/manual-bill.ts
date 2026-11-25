/**
 * HearthShift AI — Manual Electricity Bill Ingestion Module
 * 
 * Validates manual utility bill entries, verifies date ranges,
 * checks against the selected tariff definition, and provides safe defaults.
 * Stores records strictly on-device in IndexedDB.
 * 
 * @module core/ingestion/manual-bill
 */

import type { MonthlyBillEntry } from '../../types/contracts';
import { db, type StoredBillEntry } from '../../lib/db';
import { calculateBill } from '../tariff/calculator';
import { getTariffPlanById, TNPDCL_LT1A_2026_MAY10 } from '../tariff/tariffs/tnpdcl-lt1a';

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

const MAX_PLAUSIBLE_HOUSEHOLD_KWH = 100000;
const MAX_BILL_AMOUNT_INR = 2000000;
const MAX_REFERENCE_LENGTH = 64;

/**
 * Strips angle brackets and ASCII control characters from optional text fields
 * to maintain clean storage and prevent CSV/HTML injection in exports.
 */
export function sanitizePlainTextInput(raw: string, maxLength: number): string {
  const cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x20 && code !== 0x7f && ch !== '<' && ch !== '>';
    })
    .join('')
    .trim();
  return cleaned.slice(0, maxLength);
}

/**
 * Validates strict YYYY-MM-DD calendar dates without silent rollover (e.g. rejects 2026-02-30).
 */
function parseStrictIsoDate(dateStr: string): Date | null {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
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

  const startDate = input.billing_period_start ? parseStrictIsoDate(input.billing_period_start) : null;
  const endDate = input.billing_period_end ? parseStrictIsoDate(input.billing_period_end) : null;
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

  if (input.billing_period_start && !startDate) {
    errors.billing_period_start = 'Invalid start date format. Expected valid calendar YYYY-MM-DD.';
  }
  if (input.billing_period_end && !endDate) {
    errors.billing_period_end = 'Invalid end date format. Expected valid calendar YYYY-MM-DD.';
  }

  if (startDate && endDate && !errors.billing_period_start && !errors.billing_period_end) {
    if (startDate > endDate) {
      errors.billing_period_end = 'End date cannot be earlier than start date.';
    }
    if (endDate > todayUtc) {
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
  if (typeof input.total_units_kwh !== 'number' || isNaN(input.total_units_kwh) || !isFinite(input.total_units_kwh)) {
    errors.total_units_kwh = 'Consumption must be a valid finite number.';
  } else if (input.total_units_kwh < 0) {
    errors.total_units_kwh = 'Consumption cannot be negative.';
  } else if (input.total_units_kwh > MAX_PLAUSIBLE_HOUSEHOLD_KWH) {
    errors.total_units_kwh = `Consumption cannot exceed ${MAX_PLAUSIBLE_HOUSEHOLD_KWH.toLocaleString()} kWh for a residential meter.`;
  } else if (input.total_units_kwh > 50000) {
    warnings.push('Consumption exceeds 50,000 kWh. Please confirm this is a domestic household reading.');
  }

  // 3. Amount Validation (if provided)
  if (input.total_amount !== undefined) {
    if (typeof input.total_amount !== 'number' || isNaN(input.total_amount) || !isFinite(input.total_amount)) {
      errors.total_amount = 'Bill amount must be a valid finite number.';
    } else if (input.total_amount < 0) {
      errors.total_amount = 'Bill amount cannot be negative.';
    } else if (input.total_amount > MAX_BILL_AMOUNT_INR) {
      errors.total_amount = `Bill amount exceeds residential sanity limit (₹${MAX_BILL_AMOUNT_INR.toLocaleString()}).`;
    }
  }

  // 4. Resolve Authoritative Tariff Plan
  const resolvedTariffId = input.tariff_id ?? TNPDCL_LT1A_2026_MAY10.id;
  const tariff = getTariffPlanById(resolvedTariffId);

  let calculatedAmount: number | undefined = undefined;
  let amountDiscrepancy: number | undefined = undefined;

  if (Object.keys(errors).length === 0) {
    try {
      const calculation = calculateBill(input.total_units_kwh, tariff);
      calculatedAmount = calculation.net_payable;

      if (input.total_amount !== undefined) {
        amountDiscrepancy = Math.round((input.total_amount - calculatedAmount) * 100) / 100;
        if (Math.abs(amountDiscrepancy) > 50) {
          warnings.push(
            `Entered bill amount (₹${input.total_amount.toFixed(2)}) differs from calculated '${tariff.name}' charge (₹${calculatedAmount.toFixed(2)}) by ₹${Math.abs(amountDiscrepancy).toFixed(2)}. This may be due to arrears, delayed payment surcharges, or adjustments.`
          );
        }
      }
    } catch {
      // Tariff calculation failure should not block bill entry
    }
  }

  const isValid = Object.keys(errors).length === 0;
  const sanitizedRef = input.bill_reference_no
    ? sanitizePlainTextInput(input.bill_reference_no, MAX_REFERENCE_LENGTH)
    : undefined;

  const billEntry: MonthlyBillEntry | undefined = isValid
    ? {
        billing_period_start: input.billing_period_start.trim(),
        billing_period_end: input.billing_period_end.trim(),
        total_units_kwh: input.total_units_kwh,
        total_amount: input.total_amount,
        currency: tariff.currency ?? input.currency ?? 'INR',
        tariff_id: tariff.id,
        bill_reference_no: sanitizedRef || undefined,
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
