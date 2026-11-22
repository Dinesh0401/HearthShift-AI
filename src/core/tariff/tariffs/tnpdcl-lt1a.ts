/**
 * HearthShift AI — Authoritative TNPDCL (Tamil Nadu) Domestic Tariff Schedules
 * 
 * Sources:
 * 1. Tamil Nadu Power Distribution Corporation Limited (TNPDCL, formerly TANGEDCO unbundled 27.06.2024).
 *    Official schedule: https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/
 * 2. TNERC Tariff Order No. 6 of 2025 (Domestic LT I-A).
 * 3. Government of Tamil Nadu (GoTN) Energy Dept Orders under Sec 65 Electricity Act 2003.
 * 4. May 2026 Welfare Scheme: 200 free units bimonthly for eligible households consuming <= 500 units.
 * 
 * @module core/tariff/tariffs/tnpdcl-lt1a
 */

import type { TariffPlan } from '../types';

/**
 * TNPDCL LT-1A Domestic Schedule (2024–2025)
 * Effective: July 1, 2024 to June 30, 2025
 * Bi-monthly billing cadence.
 */
export const TNPDCL_LT1A_2024_2025: TariffPlan = {
  id: 'in-tnpdcl-lt1a-2024',
  name: 'TNPDCL LT-1A Domestic (2024–2025)',
  version: '2024.1.0',
  utility_name: 'Tamil Nadu Power Distribution Corporation Limited (TNPDCL)',
  regulatory_authority: 'Tamil Nadu Electricity Regulatory Commission (TNERC)',
  tariff_order_ref: 'TNERC Tariff Order for TANGEDCO/TNPDCL (Effective 01-07-2024)',
  region: 'Tamil Nadu',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'bimonthly',
  effective_from: '2024-07-01',
  effective_to: '2025-06-30',
  source_url: 'https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/',
  is_time_dependent: false,
  
  gross_tariff: {
    type: 'tiered_slab',
    is_telescopic: true,
    high_consumption_threshold_kwh: 500,
    slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 450 },
      { min_kwh: 101, max_kwh: 200, gross_rate_paise: 450 },
      { min_kwh: 201, max_kwh: 400, gross_rate_paise: 450 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 600 },
    ],
    high_consumption_slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 450 },
      { min_kwh: 101, max_kwh: 400, gross_rate_paise: 450 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 600 },
      { min_kwh: 501, max_kwh: 600, gross_rate_paise: 800 },
      { min_kwh: 601, max_kwh: 800, gross_rate_paise: 900 },
      { min_kwh: 801, max_kwh: 1000, gross_rate_paise: 1000 },
      { min_kwh: 1001, max_kwh: null, gross_rate_paise: 1100 },
    ],
  },

  subsidy_scheme: {
    id: 'gotn-subsidy-2024',
    name: 'GoTN Domestic Tariff Subsidy (2024)',
    authority: 'Government of Tamil Nadu Energy Department',
    rules: [
      {
        type: 'free_units',
        label: 'GoTN Universal 100 Free Units (Bi-monthly)',
        free_units_count: 100,
        eligibility_max_units: null, // Universal for all domestic consumers
        cliff_behavior: 'revert_to_standard',
      },
      {
        type: 'slab_discount',
        label: 'GoTN 101-200 Unit Concessionary Rate',
        min_kwh: 101,
        max_kwh: 200,
        discount_paise_per_kwh: 225, // Reduces 450 paise to 225 paise (₹2.25/unit)
        eligibility_max_units: 500, // Disqualified if total consumption > 500 units
      },
    ],
  },

  fixed_charges: {
    monthly_amount_paise: 0, // GoTN subsidizes domestic fixed charges entirely
  },

  electricity_duty: {
    percentage: 0.0, // Domestic consumers exempt under basic consumption thresholds
    applies_to_fixed_charges: false,
  },
};

/**
 * TNPDCL LT-1A Domestic Schedule (2025–2026)
 * Effective: July 1, 2025 to April 30, 2026
 * Issued under TNERC Tariff Order No. 6 of 2025
 */
export const TNPDCL_LT1A_2025_2026: TariffPlan = {
  id: 'in-tnpdcl-lt1a-2025',
  name: 'TNPDCL LT-1A Domestic (TNERC Order No. 6 of 2025)',
  version: '2025.1.0',
  utility_name: 'Tamil Nadu Power Distribution Corporation Limited (TNPDCL)',
  regulatory_authority: 'Tamil Nadu Electricity Regulatory Commission (TNERC)',
  tariff_order_ref: 'TNERC Tariff Order No. 6 of 2025 (Domestic LT-1A)',
  region: 'Tamil Nadu',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'bimonthly',
  effective_from: '2025-07-01',
  effective_to: '2026-04-30',
  source_url: 'https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/',
  is_time_dependent: false,

  gross_tariff: {
    type: 'tiered_slab',
    is_telescopic: true,
    high_consumption_threshold_kwh: 500,
    slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 470 },
      { min_kwh: 101, max_kwh: 200, gross_rate_paise: 470 },
      { min_kwh: 201, max_kwh: 400, gross_rate_paise: 470 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 630 },
    ],
    high_consumption_slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 470 },
      { min_kwh: 101, max_kwh: 400, gross_rate_paise: 470 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 630 },
      { min_kwh: 501, max_kwh: 600, gross_rate_paise: 840 },
      { min_kwh: 601, max_kwh: 800, gross_rate_paise: 945 },
      { min_kwh: 801, max_kwh: 1000, gross_rate_paise: 1050 },
      { min_kwh: 1001, max_kwh: null, gross_rate_paise: 1155 },
    ],
  },

  subsidy_scheme: {
    id: 'gotn-subsidy-2025',
    name: 'GoTN Domestic Tariff Subsidy (2025)',
    authority: 'Government of Tamil Nadu Energy Department',
    rules: [
      {
        type: 'free_units',
        label: 'GoTN Universal 100 Free Units (Bi-monthly)',
        free_units_count: 100,
        eligibility_max_units: null,
        cliff_behavior: 'revert_to_standard',
      },
      {
        type: 'slab_discount',
        label: 'GoTN 101-200 Unit Concessionary Rate',
        min_kwh: 101,
        max_kwh: 200,
        discount_paise_per_kwh: 235, // Consumer pays 470 - 235 = 235 paise (₹2.35/unit)
        eligibility_max_units: 500,
      },
    ],
  },

  fixed_charges: {
    monthly_amount_paise: 0,
  },

  electricity_duty: {
    percentage: 0.0,
    applies_to_fixed_charges: false,
  },
};

/**
 * TNPDCL LT-1A Domestic Schedule (May 2026 Welfare Scheme)
 * Effective: May 1, 2026 onwards
 * Special feature: 200 Free Units bi-monthly for households consuming <= 500 units bi-monthly.
 * Introduces a high-stakes economic cliff at 500 vs 501 units!
 */
export const TNPDCL_LT1A_MAY_2026_SCHEME: TariffPlan = {
  id: 'in-tnpdcl-lt1a-may2026',
  name: 'TNPDCL LT-1A Domestic (May 2026 — 200 Free Units Scheme)',
  version: '2026.2.0',
  utility_name: 'Tamil Nadu Power Distribution Corporation Limited (TNPDCL)',
  regulatory_authority: 'Tamil Nadu Electricity Regulatory Commission (TNERC)',
  tariff_order_ref: 'GoTN May 2026 Domestic Welfare Notification & TNERC Order',
  region: 'Tamil Nadu',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'bimonthly',
  effective_from: '2026-05-01',
  source_url: 'https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/',
  is_time_dependent: false,

  gross_tariff: {
    type: 'tiered_slab',
    is_telescopic: true,
    high_consumption_threshold_kwh: 500,
    slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 470 },
      { min_kwh: 101, max_kwh: 200, gross_rate_paise: 470 },
      { min_kwh: 201, max_kwh: 400, gross_rate_paise: 470 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 630 },
    ],
    high_consumption_slabs: [
      { min_kwh: 0, max_kwh: 100, gross_rate_paise: 470 },
      { min_kwh: 101, max_kwh: 400, gross_rate_paise: 470 },
      { min_kwh: 401, max_kwh: 500, gross_rate_paise: 630 },
      { min_kwh: 501, max_kwh: 600, gross_rate_paise: 840 },
      { min_kwh: 601, max_kwh: 800, gross_rate_paise: 945 },
      { min_kwh: 801, max_kwh: 1000, gross_rate_paise: 1050 },
      { min_kwh: 1001, max_kwh: null, gross_rate_paise: 1155 },
    ],
  },

  subsidy_scheme: {
    id: 'gotn-subsidy-may2026-200free',
    name: 'GoTN 200 Free Units Welfare Scheme (May 2026)',
    authority: 'Government of Tamil Nadu Energy Department',
    rules: [
      {
        type: 'free_units',
        label: 'May 2026 200 Free Units Scheme (<=500 Units)',
        free_units_count: 200,
        eligibility_max_units: 500, // Explicit boundary: consuming 501 units forfeits the 200 free units!
        cliff_behavior: 'revert_to_standard',
        fallback_free_units: 100, // Reverts to universal 100 free units if >500 units consumed
      },
      {
        type: 'slab_discount',
        label: 'GoTN 101-200 Unit Concessionary Rate (for standard tier)',
        min_kwh: 101,
        max_kwh: 200,
        discount_paise_per_kwh: 235,
        eligibility_max_units: 500,
      },
    ],
  },

  fixed_charges: {
    monthly_amount_paise: 0,
  },

  electricity_duty: {
    percentage: 0.0,
    applies_to_fixed_charges: false,
  },
};

/**
 * Standard Flat Tariff for comparative testing and benchmarks.
 */
export const GENERIC_FLAT_TARIFF_INR: TariffPlan = {
  id: 'generic-flat-inr',
  name: 'Standard Flat Rate Domestic Tariff',
  version: '1.0.0',
  utility_name: 'Generic Utility',
  regulatory_authority: 'State Commission',
  tariff_order_ref: 'Order 2024-FLAT',
  region: 'India-General',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'monthly',
  effective_from: '2024-01-01',
  source_url: 'https://example.org/tariff/flat',
  is_time_dependent: false,

  gross_tariff: {
    type: 'flat',
    rate_paise: 500, // ₹5.00/kWh
  },

  fixed_charges: {
    monthly_amount_paise: 5000, // ₹50.00/month
  },

  electricity_duty: {
    percentage: 0.05, // 5% tax
    applies_to_fixed_charges: false,
  },
};

/**
 * Multi-period Time-of-Use (TOU) Tariff for load-shifting validation.
 */
export const GENERIC_TOU_TARIFF_INR: TariffPlan = {
  id: 'generic-tou-inr',
  name: 'Time-of-Use Commercial / Residential TOU Tariff',
  version: '1.0.0',
  utility_name: 'Generic Power Grid',
  regulatory_authority: 'Electricity Commission',
  tariff_order_ref: 'Order 2024-TOU',
  region: 'National Grid',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'monthly',
  effective_from: '2024-01-01',
  source_url: 'https://example.org/tariff/tou',
  is_time_dependent: true,

  gross_tariff: {
    type: 'time_of_use',
    default_rate_paise: 700, // Normal ₹7.00
    time_bands: [
      {
        label: 'Morning Peak',
        start_hour: 6,
        end_hour: 10,
        rate_paise: 1000, // ₹10.00/kWh
      },
      {
        label: 'Evening Peak',
        start_hour: 18,
        end_hour: 22,
        rate_paise: 1000, // ₹10.00/kWh
      },
      {
        label: 'Normal Day',
        start_hour: 10,
        end_hour: 18,
        rate_paise: 700, // ₹7.00/kWh
      },
      {
        label: 'Night Off-Peak',
        start_hour: 22,
        end_hour: 6,
        rate_paise: 500, // ₹5.00/kWh
      },
    ],
  },

  fixed_charges: {
    monthly_amount_paise: 0,
  },
};
