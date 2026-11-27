/**
 * HearthShift AI — Explicit Household Comfort Preference & Capability Loader
 *
 * Scientific & Safety Integrity Invariant:
 * Never infers or fabricates confirmed comfort constraints from smart-meter
 * reading counts (`readings_count >= 168`). Real households must explicitly
 * select and save comfort preferences before comfort-dependent recommendations unlock.
 *
 * @module core/storage/household-preferences
 */

import { db, type StoredBillEntry } from '../../lib/db';
import type { TariffPlan } from '../tariff/types';
import {
  evaluateCapabilityState,
  type CapabilityEvaluation,
} from '../capabilities/policy';
import type {
  ComfortConstraint,
  Flexibility,
  HouseholdPreferences,
} from '../../types/contracts';

export const DEFAULT_HOUSEHOLD_PROFILE_ID = 'default_household';

export interface UserComfortDraft {
  acFlexibility: Flexibility | null;
  waterHeaterFlexible: boolean;
  laundryShiftFlexible: boolean;
  standbyManageable: boolean;
}

export interface DashboardHouseholdSnapshot {
  billsCount: number;
  readingsCount: number;
  readingsSpanDays: number;
  latestBill: StoredBillEntry | null;
  comfortConstraints: ComfortConstraint[];
  evaluation: CapabilityEvaluation;
}

/**
 * Returns only persisted household comfort constraints without inferring defaults.
 */
export function resolveHouseholdComfortConstraints(
  pref?: Pick<HouseholdPreferences, 'comfort_constraints'> | null
): ComfortConstraint[] {
  if (!pref?.comfort_constraints || pref.comfort_constraints.length === 0) {
    return [];
  }
  return [...pref.comfort_constraints];
}

/**
 * Maps explicit user-selected household flexibility options into structured constraints.
 * Returns an empty array if the household has not opted into any flexible category.
 */
export function buildUserConfirmedComfortConstraints(
  draft: UserComfortDraft
): ComfortConstraint[] {
  const constraints: ComfortConstraint[] = [];

  if (draft.acFlexibility && draft.acFlexibility !== 'none') {
    constraints.push({
      id: 'user_ac_comfort',
      type: 'temperature_bound',
      description: 'User-confirmed AC thermostat adjustment comfort limit',
      appliance_category: 'cooling',
      flexibility: draft.acFlexibility,
      confidence: 1.0,
    });
  }

  if (draft.waterHeaterFlexible) {
    constraints.push({
      id: 'user_water_heater_timer',
      type: 'schedule_flexible',
      description: 'User-confirmed water heater duration trim comfort preference',
      appliance_category: 'water_heating',
      flexibility: 'medium',
      confidence: 1.0,
    });
  }

  if (draft.laundryShiftFlexible) {
    constraints.push({
      id: 'user_laundry_schedule',
      type: 'schedule_flexible',
      description: 'User-confirmed laundry morning shift preference',
      appliance_category: 'laundry',
      flexibility: 'medium',
      confidence: 1.0,
    });
  }

  if (draft.standbyManageable) {
    constraints.push({
      id: 'user_standby_power',
      type: 'schedule_flexible',
      description: 'User-confirmed overnight entertainment standby shutoff willingness',
      appliance_category: 'entertainment',
      flexibility: 'high',
      confidence: 1.0,
    });
  }

  return constraints;
}

/**
 * Loads the complete local household snapshot from IndexedDB without inferring missing comfort inputs.
 */
export async function loadDashboardHouseholdSnapshot(
  activeTariff: TariffPlan
): Promise<DashboardHouseholdSnapshot> {
  await db.initialize();
  const billsCount = await db.bills.count();
  const readingsCount = await db.readings.count();

  let readingsSpanDays = 0;
  if (readingsCount > 0) {
    const first = await db.readings.orderBy('timestamp').first();
    const last = await db.readings.orderBy('timestamp').reverse().first();
    if (first && last) {
      const diffMs = new Date(last.timestamp).getTime() - new Date(first.timestamp).getTime();
      readingsSpanDays = Math.max(0.1, diffMs / (1000 * 60 * 60 * 24));
    }
  }

  const latestBill =
    (await db.bills.orderBy('billing_period_start').reverse().first()) ?? null;
  const pref = await db.preferences.get(DEFAULT_HOUSEHOLD_PROFILE_ID);
  const comfortConstraints = resolveHouseholdComfortConstraints(pref);

  const evaluation = evaluateCapabilityState({
    bills_count: billsCount,
    readings_count: readingsCount,
    readings_span_days: readingsSpanDays,
    comfort_constraints: comfortConstraints,
    active_tariff: activeTariff,
  });

  return {
    billsCount,
    readingsCount,
    readingsSpanDays,
    latestBill,
    comfortConstraints,
    evaluation,
  };
}

/**
 * Persists explicitly confirmed user comfort constraints into IndexedDB.
 */
export async function saveConfirmedComfortPreferences(
  draft: UserComfortDraft
): Promise<ComfortConstraint[]> {
  const constraints = buildUserConfirmedComfortConstraints(draft);
  if (constraints.length === 0) {
    throw new Error('Select at least one household comfort option before confirming.');
  }

  await db.initialize();
  const existing = await db.preferences.get(DEFAULT_HOUSEHOLD_PROFILE_ID);
  const now = new Date().toISOString();

  await db.preferences.put({
    id: DEFAULT_HOUSEHOLD_PROFILE_ID,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    comfort_constraints: constraints,
    preference_weights: existing?.preference_weights ?? {
      cost_sensitivity: 0.7,
      comfort_sensitivity: 0.6,
      environmental_concern: 0.4,
      uncertainty_variance: 0.4,
      feedback_count: 0,
      last_updated: now,
    },
  });

  return constraints;
}

/**
 * Clears saved user comfort constraints back to empty `[]`.
 */
export async function clearConfirmedComfortPreferences(): Promise<void> {
  await db.initialize();
  const existing = await db.preferences.get(DEFAULT_HOUSEHOLD_PROFILE_ID);
  const now = new Date().toISOString();

  await db.preferences.put({
    id: DEFAULT_HOUSEHOLD_PROFILE_ID,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    comfort_constraints: [],
    preference_weights: existing?.preference_weights ?? {
      cost_sensitivity: 0.7,
      comfort_sensitivity: 0.6,
      environmental_concern: 0.4,
      uncertainty_variance: 0.5,
      feedback_count: 0,
      last_updated: now,
    },
  });
}
