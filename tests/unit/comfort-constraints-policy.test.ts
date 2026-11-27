/**
 * HearthShift AI — Comfort Constraint Safety & Honesty Regression Tests
 *
 * Verifies three distinct household states:
 * 1. Real user with >= 168 interval readings and NO confirmed comfort constraints -> stays in INTERVAL mode & recommendations remain gated.
 * 2. Real user explicitly confirming comfort constraints -> unlocks OPTIMIZATION_ELIGIBLE & TR-VOI recommendations.
 * 3. Synthetic demo household -> explicitly attaches [Synthetic sample] labeled constraints, cleared cleanly on exit.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Dexie from 'dexie';
import { db } from '../../src/lib/db';
import { evaluateCapabilityState } from '../../src/core/capabilities/policy';
import { generateHouseholdRecommendation } from '../../src/core/recommendation/engine';
import { TNPDCL_LT1A_MAY_2026_SCHEME } from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import {
  buildUserConfirmedComfortConstraints,
  clearConfirmedComfortPreferences,
  resolveHouseholdComfortConstraints,
  saveConfirmedComfortPreferences,
} from '../../src/core/storage/household-preferences';
import {
  clearDemoDataset,
  loadSyntheticDemoHousehold,
} from '../../src/core/demo/synthetic-household';
import type { HouseholdPreferences } from '../../src/types/contracts';

describe('Comfort Constraint Safety & No-Inference Policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never infers confirmed comfort constraints for a real user with >= 168 readings and blocks recommendations until set', () => {
    expect(resolveHouseholdComfortConstraints(undefined)).toEqual([]);
    expect(
      resolveHouseholdComfortConstraints({
        comfort_constraints: [],
      })
    ).toEqual([]);

    const resolvedEmpty = resolveHouseholdComfortConstraints({ comfort_constraints: [] });
    const evalState = evaluateCapabilityState({
      bills_count: 1,
      readings_count: 192,
      readings_span_days: 8.0,
      comfort_constraints: resolvedEmpty,
      active_tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
    });

    expect(evalState.mode).toBe('INTERVAL');
    expect(evalState.permissions.can_visualize_intervals).toBe(true);
    expect(evalState.permissions.can_recommend_action).toBe(false);
    expect(evalState.permissions.can_generate_sparse_recommendations).toBe(false);
    expect(evalState.reasons).toContain('No household comfort constraints defined yet.');

    const recOutput = generateHouseholdRecommendation({
      baselineKwh: 512,
      tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
      capabilityInputs: {
        bills_count: 1,
        readings_count: 192,
        readings_span_days: 8.0,
        comfort_constraints: resolvedEmpty,
        active_tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
      },
    });

    expect(recOutput.capabilityGated).toBe(true);
    expect(recOutput.recommendation).toBeNull();
    expect(recOutput.outcome).toBe('abstain');
    expect(recOutput.gateReason).toContain('No household comfort constraints');
  });

  it('rejects empty confirmation drafts and unlocks recommendations only after genuine user-confirmed constraints', async () => {
    expect(
      buildUserConfirmedComfortConstraints({
        acFlexibility: null,
        waterHeaterFlexible: false,
        laundryShiftFlexible: false,
        standbyManageable: false,
      })
    ).toEqual([]);

    let storedPref: HouseholdPreferences | undefined;
    vi.spyOn(db, 'initialize').mockResolvedValue(undefined);
    vi.spyOn(db.preferences, 'get').mockImplementation(() => Dexie.Promise.resolve(storedPref));
    vi.spyOn(db.preferences, 'put').mockImplementation((pref) => {
      storedPref = pref;
      return Dexie.Promise.resolve(pref.id);
    });

    await expect(
      saveConfirmedComfortPreferences({
        acFlexibility: null,
        waterHeaterFlexible: false,
        laundryShiftFlexible: false,
        standbyManageable: false,
      })
    ).rejects.toThrow(/Select at least one household comfort option/i);

    const saved = await saveConfirmedComfortPreferences({
      acFlexibility: 'medium',
      waterHeaterFlexible: true,
      laundryShiftFlexible: false,
      standbyManageable: true,
    });

    expect(saved.map((c) => c.id)).toEqual([
      'user_ac_comfort',
      'user_water_heater_timer',
      'user_standby_power',
    ]);
    expect(saved.every((c) => !c.id.includes('default_c'))).toBe(true);

    const resolved = resolveHouseholdComfortConstraints(storedPref);
    const evalState = evaluateCapabilityState({
      bills_count: 1,
      readings_count: 192,
      readings_span_days: 8.0,
      comfort_constraints: resolved,
      active_tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
    });
    expect(evalState.mode).toBe('OPTIMIZATION_ELIGIBLE');
    expect(evalState.permissions.can_recommend_action).toBe(true);

    const recOutput = generateHouseholdRecommendation({
      baselineKwh: 512,
      tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
      capabilityInputs: {
        bills_count: 1,
        readings_count: 192,
        readings_span_days: 8.0,
        comfort_constraints: resolved,
        active_tariff: TNPDCL_LT1A_MAY_2026_SCHEME,
      },
    });
    expect(recOutput.capabilityGated).toBe(false);
    expect(['recommend', 'ask_question', 'abstain']).toContain(recOutput.outcome);

    await clearConfirmedComfortPreferences();
    expect(resolveHouseholdComfortConstraints(storedPref)).toEqual([]);
  });

  describe('Synthetic Demo Mode constraints isolation', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('tags synthetic demo constraints explicitly as [Synthetic sample] and wipes them on exit', async () => {
      let storedDemoPref: HouseholdPreferences | undefined;
      vi.spyOn(db, 'initialize').mockResolvedValue(undefined);
      vi.spyOn(db, 'deleteAllUserData').mockImplementation(async () => {
        storedDemoPref = undefined;
      });
      vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        return Dexie.Promise.resolve(callback());
      }) as typeof db.transaction);
      vi.spyOn(db.bills, 'bulkAdd').mockImplementation(() => Dexie.Promise.resolve(3));
      vi.spyOn(db.readings, 'bulkAdd').mockImplementation(() => Dexie.Promise.resolve(192));
      vi.spyOn(db.savings, 'clear').mockImplementation(() => Dexie.Promise.resolve(undefined));
      vi.spyOn(db.preferences, 'put').mockImplementation((pref) => {
        storedDemoPref = pref;
        return Dexie.Promise.resolve(pref.id);
      });

      await loadSyntheticDemoHousehold();

      expect(storedDemoPref?.comfort_constraints.length).toBe(2);
      for (const c of storedDemoPref!.comfort_constraints) {
        expect(c.id.startsWith('demo_')).toBe(true);
        expect(c.description).toContain('[Synthetic sample]');
      }

      await clearDemoDataset();
      expect(storedDemoPref).toBeUndefined();
    });
  });
});
