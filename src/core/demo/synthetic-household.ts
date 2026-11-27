/**
 * HearthShift AI — Safe Synthetic Demo Household Loader
 *
 * Populates IndexedDB with a deterministic synthetic household dataset
 * (3 bi-monthly bills + 192 hourly intervals over 8 days + comfort constraints)
 * and marks localStorage with an explicit SYNTHETIC DEMO flag.
 *
 * Scientific Integrity Invariant:
 * Leaves `db.savings` strictly empty (`[]`) so zero fake verified or
 * user-reported savings are invented during demo mode.
 *
 * @module core/demo/synthetic-household
 */

import { db, type StoredBillEntry, type StoredEnergyReading } from '../../lib/db';
import { calculateBill } from '../tariff/calculator';
import { resolveTnpdclTariffForPeriod } from '../tariff/tariffs/tnpdcl-lt1a';

export const DEMO_MODE_STORAGE_KEY = 'hearthshift_demo_mode';
export const ACTIVE_TARIFF_STORAGE_KEY = 'hearthshift_active_tariff_id';
/** Active tariff used for modern forward-looking counterfactual simulations in Demo Mode */
export const DEMO_TARIFF_ID = 'in-tnpdcl-lt1a-may2026';
export const DEMO_IMPORT_BATCH_ID = 'demo_synthetic_8d';

export interface SyntheticDemoBillSpec {
  billing_period_start: string;
  billing_period_end: string;
  total_units_kwh: number;
  bill_reference_no: string;
}

export const SYNTHETIC_DEMO_BILL_SPECS: readonly SyntheticDemoBillSpec[] = [
  {
    billing_period_start: '2026-01-01',
    billing_period_end: '2026-02-28',
    total_units_kwh: 445,
    bill_reference_no: 'DEMO-SYNTH-2026-01',
  },
  {
    billing_period_start: '2026-03-01',
    billing_period_end: '2026-04-30',
    total_units_kwh: 492,
    bill_reference_no: 'DEMO-SYNTH-2026-02',
  },
  {
    billing_period_start: '2026-05-01',
    billing_period_end: '2026-06-30',
    total_units_kwh: 508,
    bill_reference_no: 'DEMO-SYNTH-2026-03',
  },
];

/**
 * Builds deterministic synthetic bill entries using the historically applicable
 * TNPDCL LT-1A schedule for each dated billing cycle (distinct from the active
 * May 2026 schedule used by counterfactual simulations).
 */
export function buildSyntheticDemoBills(nowIso: string = new Date().toISOString()): StoredBillEntry[] {
  return SYNTHETIC_DEMO_BILL_SPECS.map((spec) => {
    const { plan } = resolveTnpdclTariffForPeriod(
      spec.billing_period_end,
      spec.billing_period_start
    );
    return {
      billing_period_start: spec.billing_period_start,
      billing_period_end: spec.billing_period_end,
      total_units_kwh: spec.total_units_kwh,
      total_amount: calculateBill(spec.total_units_kwh, plan).net_payable,
      currency: plan.currency,
      tariff_id: plan.id,
      bill_reference_no: spec.bill_reference_no,
      created_at: nowIso,
      updated_at: nowIso,
    };
  });
}

/**
 * Deterministic hourly diurnal profile (kWh per hour) for a typical Tamil Nadu household:
 * - Night standby (01:00–05:00): ~0.18 kWh
 * - Morning geyser & kitchen peak (06:00–08:00): up to ~1.12 kWh
 * - Midday baseline (09:00–12:00): ~0.26–0.32 kWh
 * - Afternoon AC cooling (13:00–16:00): ~0.85 kWh
 * - Evening household load (17:00–21:00): ~0.48–0.65 kWh
 * - Night AC cooling (22:00–23:00): ~0.85 kWh
 */
const DIURNAL_BASE_KWH: readonly number[] = [
  0.24, // 00:00 — AC off / transition to standby
  0.18, // 01:00 — Night standby
  0.17, // 02:00 — Night standby
  0.18, // 03:00 — Night standby
  0.18, // 04:00 — Night standby
  0.19, // 05:00 — Early morning standby
  0.62, // 06:00 — Morning geyser start
  1.12, // 07:00 — Morning geyser & breakfast peak
  0.58, // 08:00 — Morning routine tail
  0.30, // 09:00 — Daytime baseline
  0.28, // 10:00 — Daytime baseline
  0.26, // 11:00 — Daytime baseline
  0.32, // 12:00 — Midday appliances
  0.84, // 13:00 — Afternoon AC
  0.88, // 14:00 — Afternoon AC peak
  0.86, // 15:00 — Afternoon AC
  0.82, // 16:00 — Afternoon AC
  0.48, // 17:00 — Late afternoon
  0.58, // 18:00 — Evening lighting & kitchen
  0.66, // 19:00 — Evening peak
  0.62, // 20:00 — Evening appliances
  0.54, // 21:00 — Pre-sleep wind-down
  0.86, // 22:00 — Night AC
  0.84, // 23:00 — Night AC
];

/**
 * Checks whether synthetic demo mode is currently flagged in browser localStorage.
 */
export function isSyntheticDemoMode(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
}

/**
 * Clears the synthetic demo mode flag from localStorage without touching database state.
 */
export function clearDemoModeFlag(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  }
}

/**
 * Loads the safe synthetic household dataset into IndexedDB and sets the demo flag.
 */
export async function loadSyntheticDemoHousehold(): Promise<void> {
  await db.initialize();
  await db.deleteAllUserData();

  const now = new Date().toISOString();
  const billsToInsert: StoredBillEntry[] = buildSyntheticDemoBills(now);

  const startMs = Date.parse('2026-05-01T00:00:00Z');
  const readingsToInsert: StoredEnergyReading[] = [];

  for (let h = 0; h < 192; h++) {
    const dayIndex = Math.floor(h / 24);
    const hourOfDay = h % 24;
    const baseKwh = DIURNAL_BASE_KWH[hourOfDay];
    // Deterministic subtle day-to-day variation (+/- 0.02 kWh) keeping standby & AC realistic
    const dayOffset = ((dayIndex % 3) - 1) * 0.015;
    const valueKwh = Math.max(0.12, Math.round((baseKwh + dayOffset) * 1000) / 1000);

    readingsToInsert.push({
      timestamp: new Date(startMs + h * 3600 * 1000).toISOString(),
      value_kwh: valueKwh,
      resolution: 'hourly',
      source: 'synthetic_simulation',
      measurement_kind: 'interval_energy_kwh',
      raw_value: valueKwh,
      raw_unit: 'kWh',
      power_watts: Math.round(valueKwh * 1000),
      interval_duration_seconds: 3600,
      import_batch_id: DEMO_IMPORT_BATCH_ID,
      created_at: now,
    });
  }

  await db.transaction(
    'rw',
    [db.bills, db.readings, db.preferences, db.savings],
    async () => {
      await db.bills.bulkAdd(billsToInsert);
      await db.readings.bulkAdd(readingsToInsert);
      await db.preferences.put({
        id: 'default_household',
        created_at: now,
        updated_at: now,
        comfort_constraints: [
          {
            id: 'demo_ac_comfort',
            type: 'temperature_bound',
            description:
              '[Synthetic sample] Maintain bedroom AC comfort bounds (23°C–25°C overnight)',
            appliance_category: 'cooling',
            time_window: { start_hour: 22, end_hour: 6 },
            flexibility: 'medium',
            confidence: 0.9,
          },
          {
            id: 'demo_geyser_schedule',
            type: 'schedule_flexible',
            description:
              '[Synthetic sample] Morning geyser timer adjustable within 15–20 minutes',
            appliance_category: 'water_heating',
            time_window: { start_hour: 6, end_hour: 9 },
            flexibility: 'medium',
            confidence: 0.85,
          },
        ],
        preference_weights: {
          cost_sensitivity: 0.75,
          comfort_sensitivity: 0.55,
          environmental_concern: 0.45,
          uncertainty_variance: 0.4,
          feedback_count: 0,
          last_updated: now,
        },
      });
      // Explicitly guarantee db.savings stays empty — never invent synthetic verified savings
      await db.savings.clear();
    }
  );

  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
    window.localStorage.setItem(ACTIVE_TARIFF_STORAGE_KEY, DEMO_TARIFF_ID);
  }
}

/**
 * Exits synthetic demo mode and clears all demo records from IndexedDB and localStorage.
 */
export async function clearDemoDataset(): Promise<void> {
  clearDemoModeFlag();
  await db.initialize();
  await db.deleteAllUserData();
}
