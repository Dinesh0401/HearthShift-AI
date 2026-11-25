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
 * TNPDCL LT-1A Domestic Schedule (2024–2025 Historical Baseline)
 * Effective: July 1, 2024 to June 30, 2025 (Reflects earlier baseline ₹4.50/₹2.25 schedule retained for historical bill verification).
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
    subsidy_order_ref: 'GoTN Energy Dept Notification under Sec 65 Electricity Act (2024)',
    effective_from: '2024-07-01',
    effective_to: '2025-06-30',
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
    tax_base: 'energy_charges_only',
    applies_to_fixed_charges: false,
  },
};

/**
 * TNPDCL LT-1A Domestic Schedule (2025–2026)
 * Effective: July 1, 2025 to May 9, 2026
 * Issued under TNERC Suo-Motu Tariff Order No. 6 of 2025.
 * Note: Slab rates below encode effective consumer-payable charges after GoTN Sec 65 base-rate subsidy (₹2.35 for 101-200, ₹4.70 for 201-400, ₹6.30 for 401-500, etc.).
 */
export const TNPDCL_LT1A_2025_2026: TariffPlan = {
  id: 'in-tnpdcl-lt1a-2025',
  name: 'TNPDCL LT-1A Domestic (TNERC Order No. 6 of 2025)',
  version: '2025.1.0',
  utility_name: 'Tamil Nadu Power Distribution Corporation Limited (TNPDCL)',
  regulatory_authority: 'Tamil Nadu Electricity Regulatory Commission (TNERC)',
  tariff_order_ref: 'TNERC Suo-Motu Tariff Order No. 6 of 2025 (30-06-2025) & TNERC Order No. 4 of 2026 (27-04-2026, Consumer-Payable Effective Slabs)',
  region: 'Tamil Nadu',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'bimonthly',
  effective_from: '2025-07-01',
  effective_to: '2026-05-09',
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
    subsidy_order_ref: 'GoTN Energy Dept Notification under Sec 65 Electricity Act (2025)',
    effective_from: '2025-07-01',
    effective_to: '2026-05-09',
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
    tax_base: 'energy_charges_only',
    applies_to_fixed_charges: false,
  },
};

/**
 * TNPDCL LT-1A Domestic Schedule (May 2026 Welfare Scheme)
 * Effective: May 10, 2026 onwards
 * Sources:
 * - G.O. (Ms) No. 50, Energy (D3) Department, Government of Tamil Nadu, dated May 10, 2026
 *   (200 Free Units bi-monthly for domestic households consuming <= 500 units).
 * - TNERC Suo-Motu Tariff Order No. 6 of 2025 consumer-payable slab rates (₹4.70 to ₹11.55).
 * 
 * Special feature: 200 Free Units bi-monthly for households consuming <= 500 units bi-monthly.
 * Exceeding 500 units reverts to 100 free units under the high-consumption slab table,
 * creating an abrupt +₹478.40 jump between 500 kWh (₹1,570.00) and 501 kWh (₹2,048.40).
 */
export const TNPDCL_LT1A_MAY_2026_SCHEME: TariffPlan = {
  id: 'in-tnpdcl-lt1a-may2026',
  name: 'TNPDCL LT-1A Domestic (May 10, 2026 — 200 Free Units Scheme)',
  version: '2026.2.0',
  utility_name: 'Tamil Nadu Power Distribution Corporation Limited (TNPDCL)',
  regulatory_authority: 'Tamil Nadu Electricity Regulatory Commission (TNERC)',
  tariff_order_ref: 'GoTN G.O. (Ms) No. 50 (10-05-2026), TNERC Order No. 5 of 2026 (26-05-2026) & Order No. 6 of 2025 (Consumer-Payable Slabs)',
  region: 'Tamil Nadu',
  country_code: 'IN',
  currency: 'INR',
  billing_cadence: 'bimonthly',
  effective_from: '2025-07-01', // Underlying TNERC Tariff Order No. 6 of 2025 base rates
  source_url: 'https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/',
  is_time_dependent: false,
  mid_cycle_transition_policy: 'meter_reading_date_after',

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
    name: 'GoTN 200 Free Units Welfare Scheme (Effective May 10, 2026)',
    authority: 'Government of Tamil Nadu Energy (D3) Department',
    subsidy_order_ref: 'GoTN G.O. (Ms) No. 50 (10-05-2026), Lr. No. 2800/D3/2026 & TNERC Order No. 5 of 2026 (26-05-2026)',
    effective_from: '2026-05-10', // Explicitly May 10, 2026 per G.O. (Ms) No. 50
    rules: [
      {
        type: 'free_units',
        label: 'May 10, 2026 200 Free Units Scheme (<=500 Units)',
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
    tax_base: 'energy_charges_only',
    applies_to_fixed_charges: false,
  },
};

/** Alias for TNPDCL May 10, 2026 Scheme */
export const TNPDCL_LT1A_2026_MAY10 = TNPDCL_LT1A_MAY_2026_SCHEME;

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
    percentage: 0.05, // 5% tax explicitly on energy charges
    tax_base: 'energy_charges_only', // Explicit statutory base: 5% of ₹1,500 = ₹75.00 (Total ₹1,625.00)
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

export interface SupportedTariffCatalogEntry {
  plan: TariffPlan;
  regionLabel: { en: string; ta: string };
  verificationStatus: 'statutory_consumer_payable' | 'historical_baseline' | 'generic_reference';
  regulatoryNote: { en: string; ta: string };
}

export const SUPPORTED_TARIFF_CATALOG: SupportedTariffCatalogEntry[] = [
  {
    plan: TNPDCL_LT1A_MAY_2026_SCHEME,
    regionLabel: {
      en: 'Tamil Nadu (TNPDCL) — Domestic LT-1A (May 2026 Scheme)',
      ta: 'தமிழ்நாடு (TNPDCL) — வீட்டு உபயோகம் LT-1A (மே 2026 திட்டம்)',
    },
    verificationStatus: 'statutory_consumer_payable',
    regulatoryNote: {
      en: 'Effective May 10, 2026 under GoTN G.O. (Ms) No. 50 & TNERC Order No. 6 of 2025 consumer-payable slabs (200 free units <= 500 kWh; ₹478.40 subsidy cliff at 501 kWh).',
      ta: 'மே 10, 2026 முதல் அரசாணை G.O.(Ms) எண் 50 & TNERC ஆணை எண் 6/2025 படி (<= 500 யூனிட்களுக்கு 200 இலவச யூனிட்; 501 யூனிட்டில் ₹478.40 மானிய இழப்பு எல்லை).',
    },
  },
  {
    plan: TNPDCL_LT1A_2025_2026,
    regionLabel: {
      en: 'Tamil Nadu (TNPDCL) — Domestic LT-1A (2025–2026 Order)',
      ta: 'தமிழ்நாடு (TNPDCL) — வீட்டு உபயோகம் LT-1A (2025–2026 ஆணை)',
    },
    verificationStatus: 'statutory_consumer_payable',
    regulatoryNote: {
      en: 'Effective July 1, 2025 – May 9, 2026 under TNERC Order No. 6 of 2025 consumer-payable slabs (100 free units universal + 101–200 @ ₹2.35/kWh up to 500 kWh).',
      ta: 'ஜூலை 1, 2025 – மே 9, 2026 வரை TNERC ஆணை எண் 6/2025 படி (100 இலவச யூனிட் + 101–200 யூனிட்கள் ₹2.35/kWh).',
    },
  },
  {
    plan: TNPDCL_LT1A_2024_2025,
    regionLabel: {
      en: 'Tamil Nadu (TNPDCL) — Historical Baseline (2024–2025 Ref)',
      ta: 'தமிழ்நாடு (TNPDCL) — முந்தைய அடிப்படை அட்டவணை (2024–2025)',
    },
    verificationStatus: 'historical_baseline',
    regulatoryNote: {
      en: 'Historical baseline model (₹4.50/₹2.25 slabs, 100 free units, ₹233.00 jump at 501 kWh) retained for retrospective historical bill checks.',
      ta: 'முந்தைய ஆண்டு மின்கட்டணங்களைச் சரிபார்க்க உதவும் அடிப்படை அட்டவணை (₹4.50/₹2.25).',
    },
  },
  {
    plan: GENERIC_FLAT_TARIFF_INR,
    regionLabel: {
      en: 'India General — Standard Flat Rate Reference (₹5.00/kWh)',
      ta: 'இந்தியா பொது — நிலையான கட்டண மாதிரி (₹5.00/kWh)',
    },
    verificationStatus: 'generic_reference',
    regulatoryNote: {
      en: 'Illustrative flat monthly tariff (₹5.00/kWh + ₹50/mo fixed + 5% duty, no TOU or subsidy cliff) for regions outside Tamil Nadu.',
      ta: 'தமிழ்நாட்டிற்கு வெளியேயான பகுதிகளுக்கான பொது நிலையான கட்டண மாதிரி (₹5.00/kWh + ₹50 நிலைக்கட்டணம் + 5% வரி).',
    },
  },
  {
    plan: GENERIC_TOU_TARIFF_INR,
    regionLabel: {
      en: 'Pilot Reference — Time-of-Use (Peak ₹10 / Off-Peak ₹5)',
      ta: 'முன்னோட்ட மாதிரி — நேர அடிப்படையிலான கட்டணம் (Peak ₹10 / Off-Peak ₹5)',
    },
    verificationStatus: 'generic_reference',
    regulatoryNote: {
      en: 'Reference Time-of-Use (TOU) tariff enabling genuine monetary savings from shifting flexible loads from evening peak (18:00–22:00) to off-peak hours.',
      ta: 'நேர அடிப்படையிலான (TOU) கட்டண மாதிரி; மாலை நேர உச்ச கட்டணத்திலிருந்து காலை/இரவு நேரத்திற்கு மாற்றுவதால் சேமிப்பு கிடைக்கும்.',
    },
  },
];

/**
 * Resolves a supported TariffPlan by ID, defaulting safely to the active TNPDCL May 2026 schedule.
 */
export function getTariffPlanById(tariffId?: string): TariffPlan {
  if (!tariffId) return TNPDCL_LT1A_MAY_2026_SCHEME;
  const found = SUPPORTED_TARIFF_CATALOG.find((entry) => entry.plan.id === tariffId);
  return found ? found.plan : TNPDCL_LT1A_MAY_2026_SCHEME;
}
