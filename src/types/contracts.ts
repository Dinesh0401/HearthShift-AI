/**
 * HearthShift AI — Core Data Contracts
 * 
 * Strict TypeScript interfaces governing on-device energy data,
 * deterministic tariffs, household preference vectors, and conservative recommendations.
 * 
 * @module contracts
 */

// ══════════════════════════════════════════════════════════
// 1. Energy Data Contracts
// ══════════════════════════════════════════════════════════

export type DataResolution = 
  | 'monthly'
  | 'daily'
  | 'hourly'
  | 'half-hourly'
  | 'quarter-hourly'
  | 'minute'
  | 'sub-minute'; // e.g. REFIT ~8-second sampling

export type DataSource = 
  | 'manual_entry'
  | 'csv_import'
  | 'smart_meter_api'
  | 'synthetic_simulation';

/**
 * Explicit physical measurement semantics to prevent conflating power (Watts) with energy (kWh).
 */
export type MeasurementKind =
  | 'interval_energy_kwh'      // Energy consumed in the interval (e.g. Low Carbon London KWH/hh)
  | 'instantaneous_power_w'    // Active power sampled in Watts (e.g. REFIT Aggregate)
  | 'average_power_w'          // Average power across the interval in Watts
  | 'cumulative_meter_kwh';    // Monotonic meter register in kWh

/**
 * A discrete energy or power measurement point with full physical provenance.
 */
export interface EnergyReading {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Energy consumed during the interval in kilowatt-hours (kWh) */
  value_kwh: number;
  /** Granularity of this observation */
  resolution: DataResolution;
  /** Provenance of the data */
  source: DataSource;
  /** Raw measurement kind from source data */
  measurement_kind?: MeasurementKind;
  /** Original measured value before conversion */
  raw_value?: number;
  /** Original unit of the raw measurement (e.g. 'W', 'kW', 'kWh') */
  raw_unit?: string;
  /** Optional aggregate active power in Watts if available */
  power_watts?: number;
  /** Duration of interval in seconds if known (used for power integration) */
  interval_duration_seconds?: number;
  /** True if reading represents a meter reset or rollover boundary where delta cannot be known */
  is_discontinuity_boundary?: boolean;
}

/**
 * Manual historical utility bill entry.
 */
export interface MonthlyBillEntry {
  /** ISO 8601 start date of billing cycle (inclusive) */
  billing_period_start: string;
  /** ISO 8601 end date of billing cycle (inclusive) */
  billing_period_end: string;
  /** Total billed electricity units in kWh */
  total_units_kwh: number;
  /** Total billed amount in local currency */
  total_amount?: number;
  /** ISO 4217 Currency code (e.g., 'INR', 'USD', 'GBP') */
  currency: string;
  /** Identifier of the regional tariff rule applied */
  tariff_id?: string;
  /** Unique meter reading sequence or bill identifier */
  bill_reference_no?: string;
}

// ══════════════════════════════════════════════════════════
// 2. Deterministic Tariff Domain Model
// ══════════════════════════════════════════════════════════

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface TouPeriod {
  /** Human-readable period descriptor (e.g. 'Peak', 'Solar Off-Peak', 'Normal') */
  label: string;
  /** Start hour in 24h format (0-23, inclusive) */
  start_hour: number;
  /** End hour in 24h format (0-23, exclusive) */
  end_hour: number;
  /** Applicable rate per kWh in local currency */
  rate_per_kwh: number;
  /** Days of the week this period is in effect. If omitted, applies daily. */
  days?: DayOfWeek[];
}

export interface TariffTier {
  /** Upper boundary of consumption in kWh for this slab. Null denotes unbounded infinity. */
  upper_limit_kwh: number | null;
  /** Marginal rate per kWh within this tier */
  rate_per_kwh: number;
  /** Optional fixed charge component incurred if consumption enters this slab */
  slab_fixed_charge?: number;
}

export interface FlatTariff {
  type: 'flat';
  rate_per_kwh: number;
  fixed_monthly_charge?: number;
}

export interface TieredTariff {
  type: 'tiered';
  tiers: TariffTier[];
  fixed_monthly_charge?: number;
  /** Whether slabs reset if total consumption exceeds a threshold (e.g., telescopic vs non-telescopic) */
  is_telescopic: boolean;
}

export interface TimeOfUseTariff {
  type: 'time_of_use';
  periods: TouPeriod[];
  fixed_monthly_charge?: number;
}

export interface TieredTimeOfUseTariff {
  type: 'tiered_tou';
  periods: TouPeriod[];
  tiers: TariffTier[];
  fixed_monthly_charge?: number;
  is_telescopic: boolean;
}

export type TariffStructure = 
  | FlatTariff 
  | TieredTariff 
  | TimeOfUseTariff 
  | TieredTimeOfUseTariff;

export interface TariffDefinition {
  /** Unique slug (e.g., 'in-tangedco-lt1a-2024') */
  id: string;
  /** Human-readable title */
  name: string;
  /** Semantic version string */
  version: string;
  /** Jurisdiction name (e.g., 'Tamil Nadu', 'California', 'UK-London') */
  region: string;
  /** ISO 3166-1 alpha-2 country code */
  country_code: string;
  /** ISO 4217 Currency code */
  currency: string;
  /** ISO 8601 effective start date */
  effective_date: string;
  /** ISO 8601 expiry date if superseded */
  expiry_date?: string;
  /** Official regulatory order or utility gazette URL */
  source_url?: string;
  /** Date the rule was manually or programmatically verified */
  source_verified_date: string;
  /** Tariff structure logic */
  structure: TariffStructure;
  /** Additional tax / duty percentage (e.g., 0.05 for 5% electricity tax) */
  tax_percentage?: number;
}

// ══════════════════════════════════════════════════════════
// 3. Analysis Modes & Capability Gating
// ══════════════════════════════════════════════════════════

export type AnalysisMode = 'basic' | 'detailed' | 'realtime';

export interface AnalysisCapabilities {
  mode: AnalysisMode;
  can_identify_hourly_patterns: boolean;
  can_suggest_load_shifting: boolean;
  can_estimate_appliance_breakdown: boolean;
  can_track_realtime_changes: boolean;
  minimum_data_resolution: DataResolution;
  explanation: string;
}

// ══════════════════════════════════════════════════════════
// 4. Household Preferences & Latent Parameter Model
// ══════════════════════════════════════════════════════════

export type ConstraintType = 
  | 'schedule_fixed'
  | 'schedule_flexible'
  | 'duration_fixed'
  | 'temperature_bound'
  | 'always_on';

export type ApplianceCategory = 
  | 'cooling'
  | 'heating'
  | 'laundry'
  | 'cooking'
  | 'lighting'
  | 'refrigeration'
  | 'entertainment'
  | 'computing'
  | 'water_heating'
  | 'other';

export interface TimeWindow {
  start_hour: number;
  end_hour: number;
  days?: DayOfWeek[];
}

export type Flexibility = 'none' | 'low' | 'medium' | 'high';

export interface ComfortConstraint {
  id: string;
  type: ConstraintType;
  description: string;
  appliance_category?: ApplianceCategory;
  time_window?: TimeWindow;
  flexibility: Flexibility;
  /** Confidence score between 0 and 1 */
  confidence: number;
}

export interface PreferenceWeights {
  /** Subjective sensitivity to monetary cost [0, 1] */
  cost_sensitivity: number;
  /** Sensitivity to schedule disruption / discomfort [0, 1] */
  comfort_sensitivity: number;
  /** Environmental / carbon emissions sensitivity [0, 1] */
  environmental_concern: number;
  /** Posterior uncertainty indicator (higher means less certainty) */
  uncertainty_variance: number;
  /** Total feedback responses incorporated */
  feedback_count: number;
  /** ISO 8601 last update timestamp */
  last_updated: string;
}

export interface HouseholdPreferences {
  id: string;
  created_at: string;
  updated_at: string;
  comfort_constraints: ComfortConstraint[];
  preference_weights: PreferenceWeights;
}

// ══════════════════════════════════════════════════════════
// 5. Feedback & Interaction
// ══════════════════════════════════════════════════════════

export type FeedbackResponse = 
  | 'useful'
  | 'impractical'
  | 'tried_it';

export interface FeedbackEntry {
  id: string;
  recommendation_id: string;
  timestamp: string;
  response: FeedbackResponse;
  optional_comment?: string;
}

// ══════════════════════════════════════════════════════════
// 6. Value-of-Information (EVSI) Adaptive Questioning
// ══════════════════════════════════════════════════════════

export interface LocalizedString {
  en: string;
  ta?: string;
  [locale: string]: string | undefined;
}

export interface QuestionOption {
  value: string;
  label: LocalizedString;
  /** Impact on preference constraints */
  implied_flexibility: Flexibility;
}

export interface AdaptiveQuestion {
  id: string;
  text: LocalizedString;
  category: ApplianceCategory;
  /** Expected Value of Sample Information in currency units */
  evsi_score: number;
  /** Cognitive burden score in [0, 1] */
  burden_score: number;
  /** Privacy sensitivity penalty in [0, 1] */
  privacy_score: number;
  /** Net acquisition value: EVSI - alpha*burden - beta*privacy */
  net_value: number;
  options: QuestionOption[];
  related_recommendation_ids: string[];
}

// ══════════════════════════════════════════════════════════
// 7. Conservative Recommendation Engine
// ══════════════════════════════════════════════════════════

export type RecommendationType = 
  | 'load_shift'
  | 'usage_reduction'
  | 'standby_reduction'
  | 'setting_change'
  | 'tier_avoidance';

export type SavingsBasis = 
  | 'simulated'
  | 'user_reported'
  | 'measured';

export type ConfidenceLevel = 
  | 'high'
  | 'medium'
  | 'low'
  | 'insufficient';

export type DecisionOutcome = 
  | 'recommend'
  | 'ask_question'
  | 'abstain';

export interface RecommendedAction {
  title: LocalizedString;
  description: LocalizedString;
  appliance_category?: ApplianceCategory;
  current_schedule?: TimeWindow;
  proposed_schedule?: TimeWindow;
  estimated_effort: 'minimal' | 'moderate' | 'significant';
}

export interface SavingsEstimate {
  /** Expected mean savings in local currency */
  point_estimate: number;
  /** Conservative lower bound Q_alpha (e.g. 5th percentile) */
  lower_bound: number;
  /** Optimistic upper bound Q_(1-alpha) (e.g. 95th percentile) */
  upper_bound: number;
  /** Statistical confidence level (e.g. 0.95) */
  confidence_level: number;
  /** Billing duration basis */
  period: 'billing_cycle' | 'monthly' | 'yearly';
  /** Currency code */
  currency: string;
  /** Provenance basis of the savings claim */
  basis: SavingsBasis;
}

export interface Recommendation {
  id: string;
  created_at: string;
  type: RecommendationType;
  action: RecommendedAction;
  savings_estimate: SavingsEstimate;
  assumptions: LocalizedString[];
  confidence_level: ConfidenceLevel;
  decision_outcome: DecisionOutcome;
  candidate_question?: AdaptiveQuestion;
  explanation: LocalizedString;
}

// ══════════════════════════════════════════════════════════
// 8. Scenario Simulator Contracts
// ══════════════════════════════════════════════════════════

export interface ScheduleChange {
  appliance_category: ApplianceCategory;
  original_window: TimeWindow;
  target_window: TimeWindow;
  cycle_energy_kwh: number;
  cycles_per_week: number;
}

export interface UsageChange {
  appliance_category: ApplianceCategory;
  change_type: 'reduce_duration' | 'adjust_thermostat' | 'eliminate_standby';
  estimated_reduction_kwh_per_month: number;
}

export interface ScenarioConfig {
  schedule_changes: ScheduleChange[];
  usage_changes: UsageChange[];
  tariff_id: string;
}

export interface ScenarioResult {
  baseline_cost: number;
  proposed_cost: number;
  savings: SavingsEstimate;
  tier_change_description?: LocalizedString;
  comfort_impact_assessment: LocalizedString;
  assumptions: LocalizedString[];
}

export interface Scenario {
  id: string;
  name: LocalizedString;
  description: LocalizedString;
  config: ScenarioConfig;
  result?: ScenarioResult;
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════════
// 9. Savings Evidence Tracker
// ══════════════════════════════════════════════════════════

export interface SavingsRecord {
  id: string;
  recommendation_id: string;
  period_start: string;
  period_end: string;
  estimated_savings: number;
  verified_actual_savings?: number;
  basis: SavingsBasis;
  verified: boolean;
  notes?: string;
}

// ══════════════════════════════════════════════════════════
// 10. Database Metadata & Versioning
// ══════════════════════════════════════════════════════════

export interface DatabaseMeta {
  schema_version: number;
  created_at: string;
  last_migration: string;
  app_version: string;
}
