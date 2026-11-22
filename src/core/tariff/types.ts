/**
 * HearthShift AI — Deterministic Tariff & Subsidy Domain Types
 * 
 * Strict TypeScript types separating regulatory gross tariffs from
 * government welfare subsidies, handling bi-monthly and monthly periods,
 * and enforcing integer minor currency units (paise/cents) for exact arithmetic.
 * 
 * @module core/tariff/types
 */

export type BillingCadence = 'monthly' | 'bimonthly';

export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ══════════════════════════════════════════════════════════
// 1. Time of Use (TOU) Definitions
// ══════════════════════════════════════════════════════════

export interface TouTimeBand {
  label: string;
  /** 24h start hour (0-23, inclusive) */
  start_hour: number;
  /** 24h end hour (0-23, exclusive) */
  end_hour: number;
  /** Rate in paise per kWh (e.g. 750 paise = ₹7.50) */
  rate_paise: number;
  /** Days applicable; if omitted, applies daily */
  days?: DayOfWeek[];
}

// ══════════════════════════════════════════════════════════
// 2. Regulatory Gross Tariff Structures
// ══════════════════════════════════════════════════════════

export interface ConsumptionSlab {
  /** Lower bound in kWh (inclusive) */
  min_kwh: number;
  /** Upper bound in kWh (inclusive); null means unbounded infinity */
  max_kwh: number | null;
  /** Gross regulatory rate in paise per kWh (1 Rupee = 100 paise) */
  gross_rate_paise: number;
}

export interface TieredSlabStructure {
  type: 'tiered_slab';
  /**
   * Telescopic: Each slab applies only to consumption within its bounds.
   * Non-telescopic: If total consumption crosses a ceiling, all previous slabs are billed at higher rates.
   */
  is_telescopic: boolean;
  slabs: ConsumptionSlab[];
  /** Optional secondary slabs if consumption exceeds a threshold (e.g., TNPDCL >500 unit category) */
  high_consumption_threshold_kwh?: number;
  high_consumption_slabs?: ConsumptionSlab[];
}

export interface FlatRateStructure {
  type: 'flat';
  rate_paise: number;
}

export interface TouStructure {
  type: 'time_of_use';
  time_bands: TouTimeBand[];
  default_rate_paise: number;
}

export interface HybridTieredTouStructure {
  type: 'hybrid_tiered_tou';
  tiered: TieredSlabStructure;
  tou: TouStructure;
  /** How tier and TOU interact: 'multiplier' or 'peak_additive' */
  interaction_mode: 'multiplier' | 'peak_additive';
}

export type GrossTariffStructure = 
  | FlatRateStructure 
  | TieredSlabStructure 
  | TouStructure 
  | HybridTieredTouStructure;

// ══════════════════════════════════════════════════════════
// 3. Government Welfare Subsidies
// ══════════════════════════════════════════════════════════

export interface FreeUnitsSubsidy {
  type: 'free_units';
  /** Unique label (e.g., 'GoTN Universal 100 Free Units' or 'May 2026 200 Free Units') */
  label: string;
  /** Number of units provided completely free */
  free_units_count: number;
  /** Maximum total consumption eligible for this benefit; null if universal */
  eligibility_max_units: number | null;
  /** If total consumption exceeds eligibility_max_units, does user get 0 free units or fall back to standard? */
  cliff_behavior: 'revert_to_standard' | 'disqualify_entirely';
  /** Fallback free units if disqualified from this tier */
  fallback_free_units?: number;
}

export interface SlabDiscountSubsidy {
  type: 'slab_discount';
  label: string;
  /** Slab range to which this discount applies */
  min_kwh: number;
  max_kwh: number | null;
  /** Discount in paise per kWh deducted from gross regulatory rate */
  discount_paise_per_kwh: number;
  /** Only eligible if total bill consumption is within this limit */
  eligibility_max_units?: number | null;
}

export interface FixedBillRebateSubsidy {
  type: 'fixed_rebate';
  label: string;
  rebate_paise: number;
  eligibility_max_units?: number | null;
}

export type SubsidyRule = 
  | FreeUnitsSubsidy 
  | SlabDiscountSubsidy 
  | FixedBillRebateSubsidy;

export interface SubsidyScheme {
  id: string;
  name: string;
  authority: string; // e.g., 'Government of Tamil Nadu (GoTN)'
  /** Official government notification / order reference */
  subsidy_order_ref: string;
  /** ISO 8601 effective start date of this subsidy scheme */
  effective_from: string;
  /** ISO 8601 expiry date if superseded */
  effective_to?: string;
  rules: SubsidyRule[];
}

// ══════════════════════════════════════════════════════════
// 4. Fixed Charges & Electricity Duty
// ══════════════════════════════════════════════════════════

export interface FixedChargeRule {
  /** Monthly fixed charge in paise */
  monthly_amount_paise: number;
  /** Optional demand charge per kW of sanctioned load in paise */
  per_kw_demand_paise?: number;
  /** If consumption is zero or below threshold, fixed charge may be waived */
  waived_below_kwh?: number;
}

export type DutyTaxBase = 
  | 'energy_charges_only' 
  | 'energy_plus_fixed' 
  | 'gross_energy_charges';

export interface ElectricityDutyRule {
  /** Percentage of energy charges (e.g., 0.05 for 5% electricity tax) */
  percentage?: number;
  /** Per-unit duty in paise per kWh (e.g., 5 paise/kWh) */
  per_unit_paise?: number;
  /** Explicit statutory tax base for duty assessment */
  tax_base: DutyTaxBase;
  /** Backwards compatibility alias for tax_base === 'energy_plus_fixed' */
  applies_to_fixed_charges?: boolean;
  /** Exempt if total consumption is below this threshold */
  exemption_threshold_kwh?: number;
}

// ══════════════════════════════════════════════════════════
// 5. Complete Consumer Tariff Plan
// ══════════════════════════════════════════════════════════

export type MidCycleTransitionPolicy = 
  | 'prorate'                      // Calendar-day linear prorating across tariff versions
  | 'meter_reading_date_after'     // Applies new scheme if billing cycle ends on or after effective date
  | 'strict_start_date';           // Applies new scheme only if billing cycle starts on or after effective date

export interface TariffPlan {
  id: string;
  name: string;
  version: string;
  /** Distribution utility name (e.g., 'TNPDCL') */
  utility_name: string;
  /** Regulatory authority (e.g., 'TNERC') */
  regulatory_authority: string;
  /** Regulatory Tariff Order reference (e.g., 'TNERC Tariff Order No. 6 of 2025') */
  tariff_order_ref: string;
  region: string;
  country_code: string;
  currency: CurrencyCode;
  billing_cadence: BillingCadence;
  /** ISO 8601 start date of this regulatory gross tariff schedule */
  effective_from: string;
  /** ISO 8601 expiry date if superseded */
  effective_to?: string;
  source_url: string;
  /** How mid-cycle tariff/subsidy changes are officially billed */
  mid_cycle_transition_policy?: MidCycleTransitionPolicy;
  /** Gross regulatory rate schedule */
  gross_tariff: GrossTariffStructure;
  /** Government subsidies applied to consumer bill */
  subsidy_scheme?: SubsidyScheme;
  fixed_charges?: FixedChargeRule;
  electricity_duty?: ElectricityDutyRule;
  /** Whether tariff has any time-dependent pricing */
  is_time_dependent: boolean;
}

// ══════════════════════════════════════════════════════════
// 6. Calculation Breakdown & Line Items
// ══════════════════════════════════════════════════════════

export interface BillSlabLineItem {
  slab_label: string;
  units_in_slab: number;
  gross_rate_paise: number;
  gross_cost_paise: number;
  subsidy_discount_paise: number;
  net_rate_paise: number;
  net_cost_paise: number;
}

export interface SubsidyLineItem {
  subsidy_label: string;
  applied: boolean;
  explanation: string;
  savings_paise: number;
}

export interface BillLineItem {
  category: 'energy' | 'fixed_charge' | 'subsidy' | 'duty' | 'adjustment';
  description: string;
  amount_paise: number; // Positive for charges, negative for discounts
  formatted_amount: string;
}

export interface EligibilityAudit {
  subsidy_id: string;
  label: string;
  is_eligible: boolean;
  reason: string;
  headroom_to_cliff_kwh?: number; // How many units before losing this benefit
}

export interface BillCalculationResult {
  tariff_plan_id: string;
  tariff_version: string;
  billing_cadence: BillingCadence;
  total_consumption_kwh: number;
  
  // Integer arithmetic (paise)
  gross_energy_charges_paise: number;
  total_subsidy_deductions_paise: number;
  net_energy_charges_paise: number;
  fixed_charges_paise: number;
  electricity_duty_paise: number;
  net_payable_paise: number;

  // Formatted floating representations (for UI display only)
  gross_energy_charges: number;
  total_subsidy_deductions: number;
  net_energy_charges: number;
  fixed_charges: number;
  electricity_duty: number;
  net_payable: number;
  currency: CurrencyCode;
  
  // Line items & audit trail
  slab_breakdown: BillSlabLineItem[];
  subsidy_audit: EligibilityAudit[];
  line_items: BillLineItem[];
  
  // Marginal pricing intelligence
  marginal_rate_next_unit_paise: number;
  marginal_rate_next_unit: number;
  
  /** Units remaining until the next slab or subsidy eligibility cliff */
  units_to_next_threshold: number | null;
  threshold_description?: string;
  
  calculated_at: string;
}
