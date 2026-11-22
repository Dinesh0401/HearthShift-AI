/**
 * HearthShift AI — Progressive Capability Gating Policy
 * 
 * Enforces strict scientific and engineering honesty:
 * Binds analytical and recommendation permissions strictly to the
 * empirical resolution and coverage of available household data.
 * 
 * THREE SYSTEM MODES:
 * 1. BASIC: Manual bills only -> expenditure tracking & slab headroom. FORBIDDEN: hourly curves, load-shifting.
 * 2. INTERVAL: Validated interval readings -> time-series charts, night standby baseline, empirical profiles.
 * 3. OPTIMIZATION_ELIGIBLE: >=7 days interval data, explicit comfort constraints, verified tariff differentials.
 * 
 * CORE TRUTH: Having interval data does NOT entitle the system to recommend load shifting if the tariff is time-independent.
 * 
 * @module core/capabilities/policy
 */

import type { TariffPlan } from '../tariff/types';
import type { EnergyReading, ComfortConstraint } from '../../types/contracts';

export type SystemCapabilityMode = 'BASIC' | 'INTERVAL' | 'OPTIMIZATION_ELIGIBLE';

export interface CapabilityPermissions {
  can_view_bill_history: boolean;
  can_calculate_slab_headroom: boolean;
  can_simulate_duration_reductions: boolean;
  
  // Interval data permissions
  can_view_hourly_timeseries: boolean;
  can_calculate_night_standby_baseline: boolean;
  can_generate_empirical_daily_profiles: boolean;
  
  // Optimization permissions
  can_evaluate_load_shifting: boolean;
  can_generate_sparse_recommendations: boolean;
  can_trigger_evsi_questions: boolean;
  
  // Granular capability permissions (Milestone 1.3 Gate B contracts)
  can_analyze_bills: boolean;
  can_visualize_intervals: boolean;
  can_simulate_reduction: boolean;
  can_simulate_time_shift: boolean;
  can_recommend_action: boolean;

  // Strictly forbidden operations (always false in basic mode)
  forbidden_operations: string[];
}

export interface CapabilityEvaluation {
  mode: SystemCapabilityMode;
  permissions: CapabilityPermissions;
  unlocked_features: string[];
  blocked_features: string[];
  reasons: string[];
  next_step_guidance: string;
}

export interface CapabilityEvaluationInputs {
  bills_count: number;
  readings_count: number;
  readings_span_days?: number;
  readings?: EnergyReading[];
  active_tariff?: TariffPlan;
  comfort_constraints?: ComfortConstraint[];
}

/**
 * Pure deterministic function evaluating the current system capability state.
 */
export function evaluateCapabilityState(
  inputs: CapabilityEvaluationInputs
): CapabilityEvaluation {
  const {
    bills_count,
    readings_count,
    readings_span_days = 0,
    active_tariff,
    comfort_constraints = [],
  } = inputs;

  const forbiddenOperations: string[] = [];
  const reasons: string[] = [];
  const unlockedFeatures: string[] = [];
  const blockedFeatures: string[] = [];

  // ══════════════════════════════════════════════════════════
  // Case 1: BASIC Mode (Only manual bills, or zero interval data)
  // ══════════════════════════════════════════════════════════
  if (readings_count === 0) {
    forbiddenOperations.push(
      'Synthetic hourly curve reconstruction',
      'Appliance-level consumption attribution',
      'Time-of-day load shifting advice'
    );

    reasons.push(
      'Only monthly/bi-monthly bill totals are available.',
      'Aggregated monthly kWh contains zero physical information about when electricity was consumed during the day.'
    );

    unlockedFeatures.push(
      'Historical electricity expenditure tracking',
      'Tariff slab & welfare subsidy boundary warnings',
      'Appliance duration reduction what-if scenarios (e.g. 1 hour less AC per day)'
    );

    blockedFeatures.push(
      'Hourly energy charts (forbidden under basic mode)',
      'Load shifting recommendations (requires interval data)',
      'Standby power baseline measurement'
    );

    const permissions: CapabilityPermissions = {
      can_view_bill_history: bills_count > 0,
      can_calculate_slab_headroom: bills_count > 0,
      can_simulate_duration_reductions: true,
      can_view_hourly_timeseries: false,
      can_calculate_night_standby_baseline: false,
      can_generate_empirical_daily_profiles: false,
      can_evaluate_load_shifting: false,
      can_generate_sparse_recommendations: false,
      can_trigger_evsi_questions: false,
      can_analyze_bills: bills_count > 0,
      can_visualize_intervals: false,
      can_simulate_reduction: true,
      can_simulate_time_shift: false,
      can_recommend_action: false,
      forbidden_operations: forbiddenOperations,
    };

    return {
      mode: 'BASIC',
      permissions,
      unlocked_features: unlockedFeatures,
      blocked_features: blockedFeatures,
      reasons,
      next_step_guidance:
        'Import a smart-meter CSV file (at 15m, 30m, or 1h resolution) to unlock time-series load profiling.',
    };
  }

  // ══════════════════════════════════════════════════════════
  // Case 2: INTERVAL vs OPTIMIZATION_ELIGIBLE
  // ══════════════════════════════════════════════════════════

  // Interval capabilities unlocked
  unlockedFeatures.push(
    'Historical electricity expenditure tracking',
    'Hourly and sub-hourly time-series visualization',
    'Night-time standby power baseline measurement',
    'Empirical daily and weekly load curve profiling'
  );

  const hasAdequateCoverage = readings_span_days >= 7 && readings_count >= 168; // at least 7 days of hourly (168) or 336 half-hourly
  const hasConstraints = comfort_constraints.length > 0;
  const isTariffActionable = active_tariff?.is_time_dependent || (active_tariff?.gross_tariff.type === 'tiered_slab');

  const optimizationEligible = hasAdequateCoverage && hasConstraints && isTariffActionable;

  if (optimizationEligible) {
    unlockedFeatures.push(
      'Conservative load-shifting recommendations',
      'Value-of-Information (EVSI) adaptive questioning',
      'Risk-bounded savings estimates with credible lower bounds'
    );

    reasons.push(
      `Adequate interval data verified (${readings_span_days.toFixed(1)} days of observations).`,
      `Household comfort constraints defined (${comfort_constraints.length} active constraints).`,
      `Actionable tariff plan selected ('${active_tariff?.name}').`
    );

    const permissions: CapabilityPermissions = {
      can_view_bill_history: true,
      can_calculate_slab_headroom: true,
      can_simulate_duration_reductions: true,
      can_view_hourly_timeseries: true,
      can_calculate_night_standby_baseline: true,
      can_generate_empirical_daily_profiles: true,
      can_evaluate_load_shifting: Boolean(active_tariff?.is_time_dependent),
      can_generate_sparse_recommendations: true,
      can_trigger_evsi_questions: true,
      can_analyze_bills: true,
      can_visualize_intervals: true,
      can_simulate_reduction: true,
      can_simulate_time_shift: Boolean(active_tariff?.is_time_dependent),
      can_recommend_action: true,
      forbidden_operations: [],
    };

    return {
      mode: 'OPTIMIZATION_ELIGIBLE',
      permissions,
      unlocked_features: unlockedFeatures,
      blocked_features: [],
      reasons,
      next_step_guidance:
        'System is fully calibrated to generate evidence-bounded energy recommendations with minimal interaction.',
    };
  }

  // Still in INTERVAL mode (prerequisites for optimization not yet met)
  if (!hasAdequateCoverage) {
    blockedFeatures.push('SPARE-HEM optimization (requires at least 7 days of interval data to avoid sampling bias)');
    reasons.push(`Interval coverage is currently ${readings_span_days.toFixed(1)} days (< 7 days required).`);
  }
  if (!hasConstraints) {
    blockedFeatures.push('Comfort-aware scheduling (requires at least 1 comfort constraint or routine preference)');
    reasons.push('No household comfort constraints defined yet.');
  }
  if (!isTariffActionable) {
    blockedFeatures.push('Load shifting optimization (tariff has no time-dependent rates or slab differentials)');
    reasons.push('Active tariff does not offer time-of-use differentials.');
  }

  const permissions: CapabilityPermissions = {
    can_view_bill_history: true,
    can_calculate_slab_headroom: true,
    can_simulate_duration_reductions: true,
    can_view_hourly_timeseries: true,
    can_calculate_night_standby_baseline: true,
    can_generate_empirical_daily_profiles: true,
    can_evaluate_load_shifting: false,
    can_generate_sparse_recommendations: false,
    can_trigger_evsi_questions: false,
    can_analyze_bills: true,
    can_visualize_intervals: true,
    can_simulate_reduction: true,
    can_simulate_time_shift: false,
    can_recommend_action: false,
    forbidden_operations: [
      'Premature load-shifting recommendation before comfort constraints are established',
    ],
  };

  return {
    mode: 'INTERVAL',
    permissions,
    unlocked_features: unlockedFeatures,
    blocked_features: blockedFeatures,
    reasons,
    next_step_guidance: !hasAdequateCoverage
      ? 'Import at least 7 consecutive days of interval data.'
      : 'Set at least one routine constraint (e.g., laundry flexibility or AC preference) to unlock personalized optimization.',
  };
}
