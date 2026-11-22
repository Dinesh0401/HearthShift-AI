/**
 * HearthShift AI — Capability Policy Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { evaluateCapabilityState } from '../../src/core/capabilities/policy';
import {
  TNPDCL_LT1A_2024_2025,
  GENERIC_TOU_TARIFF_INR,
} from '../../src/core/tariff/tariffs/tnpdcl-lt1a';
import type { ComfortConstraint } from '../../src/types/contracts';

describe('Progressive Capability Gating Policy', () => {
  it('locks reduction simulations and bill analysis when zero baseline data exists (bills_count === 0, readings_count === 0)', () => {
    const evaluation = evaluateCapabilityState({
      bills_count: 0,
      readings_count: 0,
      active_tariff: TNPDCL_LT1A_2024_2025,
    });

    expect(evaluation.mode).toBe('BASIC');
    expect(evaluation.permissions.can_analyze_bills).toBe(false);
    expect(evaluation.permissions.can_simulate_reduction).toBe(false);
    expect(evaluation.permissions.can_visualize_intervals).toBe(false);
    expect(evaluation.permissions.can_simulate_time_shift).toBe(false);
    expect(evaluation.permissions.can_recommend_action).toBe(false);
  });

  it('enforces BASIC mode when only monthly bills are available (readings_count === 0)', () => {
    const evaluation = evaluateCapabilityState({
      bills_count: 6,
      readings_count: 0,
      active_tariff: TNPDCL_LT1A_2024_2025,
    });

    expect(evaluation.mode).toBe('BASIC');
    expect(evaluation.permissions.can_view_bill_history).toBe(true);
    expect(evaluation.permissions.can_calculate_slab_headroom).toBe(true);
    expect(evaluation.permissions.can_simulate_duration_reductions).toBe(true);

    // Gate B Canonical Permissions in BASIC mode:
    expect(evaluation.permissions.can_analyze_bills).toBe(true);
    expect(evaluation.permissions.can_simulate_reduction).toBe(true);
    expect(evaluation.permissions.can_visualize_intervals).toBe(false);
    expect(evaluation.permissions.can_simulate_time_shift).toBe(false);
    expect(evaluation.permissions.can_recommend_action).toBe(false);

    // Strictly forbidden operations
    expect(evaluation.permissions.can_view_hourly_timeseries).toBe(false);
    expect(evaluation.permissions.can_evaluate_load_shifting).toBe(false);
    expect(evaluation.permissions.can_generate_sparse_recommendations).toBe(false);
    expect(evaluation.permissions.forbidden_operations).toContain(
      'Synthetic hourly curve reconstruction'
    );
    expect(evaluation.permissions.forbidden_operations).toContain(
      'Time-of-day load shifting advice'
    );
  });

  it('transitions to INTERVAL mode when interval readings are imported (< 7 days)', () => {
    const evaluation = evaluateCapabilityState({
      bills_count: 3,
      readings_count: 72, // 3 days of hourly
      readings_span_days: 3.0,
      active_tariff: TNPDCL_LT1A_2024_2025,
    });

    expect(evaluation.mode).toBe('INTERVAL');
    expect(evaluation.permissions.can_view_hourly_timeseries).toBe(true);
    expect(evaluation.permissions.can_calculate_night_standby_baseline).toBe(true);
    expect(evaluation.permissions.can_generate_empirical_daily_profiles).toBe(true);

    // Gate B Canonical Permissions in INTERVAL mode:
    expect(evaluation.permissions.can_analyze_bills).toBe(true);
    expect(evaluation.permissions.can_visualize_intervals).toBe(true);
    expect(evaluation.permissions.can_simulate_reduction).toBe(true);
    expect(evaluation.permissions.can_simulate_time_shift).toBe(false);
    expect(evaluation.permissions.can_recommend_action).toBe(false);

    // Optimization not eligible yet (<7 days and no comfort constraints)
    expect(evaluation.permissions.can_evaluate_load_shifting).toBe(false);
    expect(evaluation.permissions.can_generate_sparse_recommendations).toBe(false);
    expect(evaluation.blocked_features.some((f) => f.includes('7 days'))).toBe(true);
    expect(evaluation.reasons.some((r) => r.includes('< 7 days'))).toBe(true);
  });

  it('CRITICAL TEST: Does NOT unlock load shifting even with 14 days of interval data if tariff is time-independent', () => {
    const sampleConstraint: ComfortConstraint = {
      id: 'c1',
      type: 'schedule_flexible',
      description: 'Can run washing machine in morning',
      flexibility: 'high',
      confidence: 1.0,
    };

    const evaluation = evaluateCapabilityState({
      bills_count: 6,
      readings_count: 336, // 14 days of hourly
      readings_span_days: 14.0,
      active_tariff: TNPDCL_LT1A_2024_2025, // Time-independent domestic slab tariff!
      comfort_constraints: [sampleConstraint],
    });

    // Optimization is eligible for consumption/tier management
    expect(evaluation.mode).toBe('OPTIMIZATION_ELIGIBLE');
    // But load shifting remains FALSE because tariff is time-independent!
    expect(evaluation.permissions.can_evaluate_load_shifting).toBe(false);
    expect(evaluation.permissions.can_simulate_time_shift).toBe(false);
    expect(evaluation.permissions.can_recommend_action).toBe(true);
  });

  it('unlocks full load-shifting optimization when interval data >= 7 days AND tariff is time-dependent (TOU)', () => {
    const sampleConstraint: ComfortConstraint = {
      id: 'c1',
      type: 'schedule_flexible',
      description: 'Washing machine shiftable',
      flexibility: 'high',
      confidence: 1.0,
    };

    const evaluation = evaluateCapabilityState({
      bills_count: 6,
      readings_count: 336, // 14 days
      readings_span_days: 14.0,
      active_tariff: GENERIC_TOU_TARIFF_INR, // Time-dependent TOU tariff!
      comfort_constraints: [sampleConstraint],
    });

    expect(evaluation.mode).toBe('OPTIMIZATION_ELIGIBLE');
    expect(evaluation.permissions.can_evaluate_load_shifting).toBe(true);
    expect(evaluation.permissions.can_simulate_time_shift).toBe(true);
    expect(evaluation.permissions.can_recommend_action).toBe(true);
    expect(evaluation.permissions.can_generate_sparse_recommendations).toBe(true);
    expect(evaluation.permissions.can_trigger_evsi_questions).toBe(true);
  });
});
