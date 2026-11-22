/**
 * HearthShift AI — Deterministic Billing Calculator
 * 
 * Pure mathematical functions for exact electricity bill calculations,
 * subsidy deductions, marginal rates, and threshold cliff analysis.
 * 
 * Enforces integer minor currency unit (paise) arithmetic to prevent
 * floating-point drift. Completely deterministic and auditable.
 * 
 * @module core/tariff/calculator
 */

import type {
  TariffPlan,
  ConsumptionSlab,
  BillCalculationResult,
  BillSlabLineItem,
  BillLineItem,
  EligibilityAudit,
  DayOfWeek,
} from './types';

export interface IntervalConsumptionPoint {
  hour: number; // 0-23
  kwh: number;
  day?: DayOfWeek;
}

export interface CalculateBillOptions {
  /** Optional interval points for Time-of-Use tariffs */
  interval_data?: IntervalConsumptionPoint[];
  /** Sanctioned load in kW (used for demand charges if applicable) */
  sanctioned_load_kw?: number;
  /** Internal guard to prevent recursion during marginal rate calculation */
  skip_marginal?: boolean;
}

/**
 * Calculates a complete, auditable electricity bill for a given consumption and tariff plan.
 * Pure function: zero side effects, zero network calls.
 * 
 * @param consumptionKwh - Total electricity consumption in kWh
 * @param tariff - Authoritative TariffPlan object
 * @param options - Optional interval data or demand parameters
 * @returns Fully itemized BillCalculationResult
 */
export function calculateBill(
  consumptionKwh: number,
  tariff: TariffPlan,
  options: CalculateBillOptions = {}
): BillCalculationResult {
  // 1. Rigorous input validation
  if (typeof consumptionKwh !== 'number' || isNaN(consumptionKwh) || !isFinite(consumptionKwh)) {
    throw new TypeError(`Invalid consumption: expected finite number, received ${consumptionKwh}`);
  }
  if (consumptionKwh < 0) {
    throw new RangeError(`Negative consumption rejected: ${consumptionKwh} kWh is invalid`);
  }

  const { gross_tariff, subsidy_scheme, fixed_charges, electricity_duty } = tariff;
  const slabBreakdown: BillSlabLineItem[] = [];
  const subsidyAudits: EligibilityAudit[] = [];
  const lineItems: BillLineItem[] = [];

  let grossEnergyChargesPaise = 0;
  let totalSubsidyDeductionsPaise = 0;

  // ══════════════════════════════════════════════════════════
  // 2. Gross Tariff Evaluation
  // ══════════════════════════════════════════════════════════

  if (gross_tariff.type === 'flat') {
    const costPaise = Math.round(consumptionKwh * gross_tariff.rate_paise);
    grossEnergyChargesPaise = costPaise;

    slabBreakdown.push({
      slab_label: `Flat Rate (${(gross_tariff.rate_paise / 100).toFixed(2)} / kWh)`,
      units_in_slab: consumptionKwh,
      gross_rate_paise: gross_tariff.rate_paise,
      gross_cost_paise: costPaise,
      subsidy_discount_paise: 0,
      net_rate_paise: gross_tariff.rate_paise,
      net_cost_paise: costPaise,
    });
  } else if (gross_tariff.type === 'tiered_slab') {
    // Determine active slab set (e.g. check for >500 high-consumption category)
    let activeSlabs: ConsumptionSlab[] = gross_tariff.slabs;
    if (
      gross_tariff.high_consumption_threshold_kwh !== undefined &&
      gross_tariff.high_consumption_slabs &&
      consumptionKwh > gross_tariff.high_consumption_threshold_kwh
    ) {
      activeSlabs = gross_tariff.high_consumption_slabs;
    }

    if (gross_tariff.is_telescopic) {
      // Telescopic: each slab fills up sequentially
      for (const slab of activeSlabs) {
        const slabMin = slab.min_kwh === 0 ? 0 : slab.min_kwh - 1; // 0-100 is 100 units, 101-200 is 100 units
        const slabMax = slab.max_kwh ?? Infinity;

        if (consumptionKwh <= slabMin) {
          continue;
        }

        const unitsInSlab = Math.min(consumptionKwh, slabMax) - slabMin;
        if (unitsInSlab <= 0) continue;

        const grossCostPaise = Math.round(unitsInSlab * slab.gross_rate_paise);
        grossEnergyChargesPaise += grossCostPaise;

        const maxLabel = slab.max_kwh !== null ? `${slab.max_kwh}` : 'above';
        slabBreakdown.push({
          slab_label: `Units ${slab.min_kwh} to ${maxLabel}`,
          units_in_slab: unitsInSlab,
          gross_rate_paise: slab.gross_rate_paise,
          gross_cost_paise: grossCostPaise,
          subsidy_discount_paise: 0, // populated during subsidy phase
          net_rate_paise: slab.gross_rate_paise,
          net_cost_paise: grossCostPaise,
        });
      }
    } else {
      // Non-telescopic: all units billed at the single tier matching total consumption
      const matchingSlab = activeSlabs.find(
        (s) => consumptionKwh >= s.min_kwh && (s.max_kwh === null || consumptionKwh <= s.max_kwh)
      ) ?? activeSlabs[activeSlabs.length - 1];

      const grossCostPaise = Math.round(consumptionKwh * matchingSlab.gross_rate_paise);
      grossEnergyChargesPaise = grossCostPaise;

      slabBreakdown.push({
        slab_label: `Non-Telescopic Slab (${matchingSlab.min_kwh}-${matchingSlab.max_kwh ?? 'above'})`,
        units_in_slab: consumptionKwh,
        gross_rate_paise: matchingSlab.gross_rate_paise,
        gross_cost_paise: grossCostPaise,
        subsidy_discount_paise: 0,
        net_rate_paise: matchingSlab.gross_rate_paise,
        net_cost_paise: grossCostPaise,
      });
    }
  } else if (gross_tariff.type === 'time_of_use') {
    if (options.interval_data && options.interval_data.length > 0) {
      // Evaluate interval points against TOU windows
      for (const pt of options.interval_data) {
        const matchingBand = gross_tariff.time_bands.find((b) => {
          if (b.start_hour <= b.end_hour) {
            return pt.hour >= b.start_hour && pt.hour < b.end_hour;
          } else {
            // Spans midnight (e.g. 22:00 to 06:00)
            return pt.hour >= b.start_hour || pt.hour < b.end_hour;
          }
        });

        const ratePaise = matchingBand ? matchingBand.rate_paise : gross_tariff.default_rate_paise;
        const ptCostPaise = Math.round(pt.kwh * ratePaise);
        grossEnergyChargesPaise += ptCostPaise;
      }

      slabBreakdown.push({
        slab_label: `Time-of-Use (${options.interval_data.length} interval points)`,
        units_in_slab: consumptionKwh,
        gross_rate_paise: Math.round(grossEnergyChargesPaise / (consumptionKwh || 1)),
        gross_cost_paise: grossEnergyChargesPaise,
        subsidy_discount_paise: 0,
        net_rate_paise: Math.round(grossEnergyChargesPaise / (consumptionKwh || 1)),
        net_cost_paise: grossEnergyChargesPaise,
      });
    } else {
      // Fallback: evaluate aggregate kWh at default rate
      const costPaise = Math.round(consumptionKwh * gross_tariff.default_rate_paise);
      grossEnergyChargesPaise = costPaise;

      slabBreakdown.push({
        slab_label: `TOU Default Baseline (${(gross_tariff.default_rate_paise / 100).toFixed(2)}/kWh)`,
        units_in_slab: consumptionKwh,
        gross_rate_paise: gross_tariff.default_rate_paise,
        gross_cost_paise: costPaise,
        subsidy_discount_paise: 0,
        net_rate_paise: gross_tariff.default_rate_paise,
        net_cost_paise: costPaise,
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3. Government Welfare Subsidies Application
  // ══════════════════════════════════════════════════════════

  if (subsidy_scheme && subsidy_scheme.rules.length > 0) {
    for (const rule of subsidy_scheme.rules) {
      if (rule.type === 'free_units') {
        let isEligible = true;
        let effectiveFreeUnits = rule.free_units_count;
        let reason = `Granted ${rule.free_units_count} free units under ${rule.label}.`;

        if (rule.eligibility_max_units !== null && consumptionKwh > rule.eligibility_max_units) {
          isEligible = false;
          if (rule.cliff_behavior === 'revert_to_standard') {
            effectiveFreeUnits = rule.fallback_free_units ?? 0;
            reason = `Consumption of ${consumptionKwh} kWh exceeded eligibility ceiling of ${rule.eligibility_max_units} kWh. Reverted to standard ${effectiveFreeUnits} free units.`;
          } else {
            effectiveFreeUnits = 0;
            reason = `Disqualified: Consumption of ${consumptionKwh} kWh exceeds eligibility limit of ${rule.eligibility_max_units} kWh. 0 free units granted.`;
          }
        }

        // Apply free units to wipe out charges in the lowest slabs
        let unitsToWipe = effectiveFreeUnits;
        let totalFreeSubsidyPaise = 0;

        for (const slabItem of slabBreakdown) {
          if (unitsToWipe <= 0) break;
          const unitsDiscounted = Math.min(slabItem.units_in_slab, unitsToWipe);
          const discountPaise = Math.round(unitsDiscounted * slabItem.gross_rate_paise);
          
          slabItem.subsidy_discount_paise += discountPaise;
          slabItem.net_cost_paise -= discountPaise;
          slabItem.net_rate_paise = slabItem.units_in_slab > 0
            ? Math.round(slabItem.net_cost_paise / slabItem.units_in_slab)
            : 0;

          totalFreeSubsidyPaise += discountPaise;
          unitsToWipe -= unitsDiscounted;
        }

        totalSubsidyDeductionsPaise += totalFreeSubsidyPaise;

        subsidyAudits.push({
          subsidy_id: rule.label,
          label: rule.label,
          is_eligible: isEligible,
          reason,
          headroom_to_cliff_kwh: rule.eligibility_max_units !== null
            ? Math.max(0, rule.eligibility_max_units - consumptionKwh)
            : undefined,
        });
      } else if (rule.type === 'slab_discount') {
        let isEligible = true;
        let reason = `Applied concessionary discount of ₹${(rule.discount_paise_per_kwh / 100).toFixed(2)}/kWh under ${rule.label}.`;

        if (rule.eligibility_max_units !== null && rule.eligibility_max_units !== undefined) {
          if (consumptionKwh > rule.eligibility_max_units) {
            isEligible = false;
            reason = `Disqualified: Total consumption of ${consumptionKwh} kWh exceeds ${rule.eligibility_max_units} kWh limit for slab discount.`;
          }
        }

        if (isEligible) {
          // Find matching slab in breakdown
          for (const slabItem of slabBreakdown) {
            // Check if this slab corresponds to the discounted range (e.g. 101 to 200)
            const matchesRange = slabItem.slab_label.includes(`${rule.min_kwh}`);
            if (matchesRange && slabItem.net_cost_paise > 0) {
              const maxDiscountPossible = Math.max(0, slabItem.net_cost_paise);
              const calculatedDiscount = Math.round(slabItem.units_in_slab * rule.discount_paise_per_kwh);
              const discountPaise = Math.min(maxDiscountPossible, calculatedDiscount);

              if (discountPaise > 0) {
                slabItem.subsidy_discount_paise += discountPaise;
                slabItem.net_cost_paise -= discountPaise;
                slabItem.net_rate_paise = slabItem.units_in_slab > 0
                  ? Math.round(slabItem.net_cost_paise / slabItem.units_in_slab)
                  : 0;

                totalSubsidyDeductionsPaise += discountPaise;
              }
            }
          }
        }

        subsidyAudits.push({
          subsidy_id: rule.label,
          label: rule.label,
          is_eligible: isEligible,
          reason,
          headroom_to_cliff_kwh: rule.eligibility_max_units !== null && rule.eligibility_max_units !== undefined
            ? Math.max(0, rule.eligibility_max_units - consumptionKwh)
            : undefined,
        });
      }
    }
  }

  const netEnergyChargesPaise = Math.max(0, grossEnergyChargesPaise - totalSubsidyDeductionsPaise);

  // ══════════════════════════════════════════════════════════
  // 4. Fixed Charges & Electricity Duty
  // ══════════════════════════════════════════════════════════

  let fixedChargesPaise = 0;
  if (fixed_charges) {
    let multiplier = 1;
    if (tariff.billing_cadence === 'bimonthly') {
      multiplier = 2; // 2 months in bi-monthly cycle
    }

    if (fixed_charges.waived_below_kwh === undefined || consumptionKwh > fixed_charges.waived_below_kwh) {
      fixedChargesPaise = fixed_charges.monthly_amount_paise * multiplier;
      if (fixed_charges.per_kw_demand_paise && options.sanctioned_load_kw) {
        fixedChargesPaise += Math.round(fixed_charges.per_kw_demand_paise * options.sanctioned_load_kw * multiplier);
      }
    }
  }

  let electricityDutyPaise = 0;
  if (electricity_duty) {
    const isExempt = electricity_duty.exemption_threshold_kwh !== undefined &&
      consumptionKwh <= electricity_duty.exemption_threshold_kwh;

    if (!isExempt) {
      if (electricity_duty.percentage) {
        const taxableBase = electricity_duty.applies_to_fixed_charges
          ? netEnergyChargesPaise + fixedChargesPaise
          : netEnergyChargesPaise;
        electricityDutyPaise = Math.round(taxableBase * electricity_duty.percentage);
      }
      if (electricity_duty.per_unit_paise) {
        electricityDutyPaise += Math.round(consumptionKwh * electricity_duty.per_unit_paise);
      }
    }
  }

  const netPayablePaise = netEnergyChargesPaise + fixedChargesPaise + electricityDutyPaise;

  // ══════════════════════════════════════════════════════════
  // 5. Build Human-Auditable Line Items
  // ══════════════════════════════════════════════════════════

  lineItems.push({
    category: 'energy',
    description: `Gross Energy Consumption Charges (${consumptionKwh.toFixed(1)} kWh)`,
    amount_paise: grossEnergyChargesPaise,
    formatted_amount: `₹${(grossEnergyChargesPaise / 100).toFixed(2)}`,
  });

  if (totalSubsidyDeductionsPaise > 0) {
    lineItems.push({
      category: 'subsidy',
      description: `Government Tariff Subsidies & Free Units`,
      amount_paise: -totalSubsidyDeductionsPaise,
      formatted_amount: `-₹${(totalSubsidyDeductionsPaise / 100).toFixed(2)}`,
    });
  }

  if (fixedChargesPaise > 0) {
    lineItems.push({
      category: 'fixed_charge',
      description: `Fixed Monthly Charges (${tariff.billing_cadence})`,
      amount_paise: fixedChargesPaise,
      formatted_amount: `₹${(fixedChargesPaise / 100).toFixed(2)}`,
    });
  }

  if (electricityDutyPaise > 0) {
    lineItems.push({
      category: 'duty',
      description: `Electricity Duty / Tax`,
      amount_paise: electricityDutyPaise,
      formatted_amount: `₹${(electricityDutyPaise / 100).toFixed(2)}`,
    });
  }

  // ══════════════════════════════════════════════════════════
  // 6. Marginal Cost & Cliff Analysis
  // ══════════════════════════════════════════════════════════

  let marginalRateNextUnitPaise = 0;
  if (!options.skip_marginal) {
    const marginalNextUnitBill = calculateBillInternal(consumptionKwh + 1, tariff, {
      ...options,
      skip_marginal: true,
    });
    marginalRateNextUnitPaise = Math.max(0, marginalNextUnitBill - netPayablePaise);
  }

  // Compute nearest cliff or slab boundary
  let unitsToNextThreshold: number | null = null;
  let thresholdDescription: string | undefined = undefined;

  // Check subsidy eligibility limits first (critical cliff)
  if (subsidy_scheme) {
    for (const rule of subsidy_scheme.rules) {
      if (rule.eligibility_max_units !== null && rule.eligibility_max_units !== undefined) {
        if (consumptionKwh < rule.eligibility_max_units) {
          const headroom = rule.eligibility_max_units - consumptionKwh;
          if (unitsToNextThreshold === null || headroom < unitsToNextThreshold) {
            unitsToNextThreshold = headroom;
            thresholdDescription = `${rule.label} Eligibility Limit (${rule.eligibility_max_units} kWh)`;
          }
        }
      }
    }
  }

  // Check slab boundaries
  if (gross_tariff.type === 'tiered_slab') {
    const activeSlabs = (gross_tariff.high_consumption_threshold_kwh && consumptionKwh > gross_tariff.high_consumption_threshold_kwh)
      ? (gross_tariff.high_consumption_slabs ?? gross_tariff.slabs)
      : gross_tariff.slabs;

    for (const slab of activeSlabs) {
      if (slab.max_kwh !== null && consumptionKwh < slab.max_kwh) {
        const headroom = slab.max_kwh - consumptionKwh;
        if (unitsToNextThreshold === null || headroom < unitsToNextThreshold) {
          unitsToNextThreshold = headroom;
          thresholdDescription = `Upper Slab Boundary (${slab.max_kwh} kWh)`;
        }
      }
    }
  }

  return {
    tariff_plan_id: tariff.id,
    tariff_version: tariff.version,
    billing_cadence: tariff.billing_cadence,
    total_consumption_kwh: consumptionKwh,

    gross_energy_charges_paise: grossEnergyChargesPaise,
    total_subsidy_deductions_paise: totalSubsidyDeductionsPaise,
    net_energy_charges_paise: netEnergyChargesPaise,
    fixed_charges_paise: fixedChargesPaise,
    electricity_duty_paise: electricityDutyPaise,
    net_payable_paise: netPayablePaise,

    gross_energy_charges: grossEnergyChargesPaise / 100,
    total_subsidy_deductions: totalSubsidyDeductionsPaise / 100,
    net_energy_charges: netEnergyChargesPaise / 100,
    fixed_charges: fixedChargesPaise / 100,
    electricity_duty: electricityDutyPaise / 100,
    net_payable: netPayablePaise / 100,
    currency: tariff.currency,

    slab_breakdown: slabBreakdown,
    subsidy_audit: subsidyAudits,
    line_items: lineItems,

    marginal_rate_next_unit_paise: marginalRateNextUnitPaise,
    marginal_rate_next_unit: marginalRateNextUnitPaise / 100,

    units_to_next_threshold: unitsToNextThreshold,
    threshold_description: thresholdDescription,

    calculated_at: new Date().toISOString(),
  };
}

/**
 * Lightweight internal bill calculator returning net payable in paise (used for marginal calculations).
 */
function calculateBillInternal(
  kwh: number,
  tariff: TariffPlan,
  options: CalculateBillOptions
): number {
  return calculateBill(kwh, tariff, options).net_payable_paise;
}

/**
 * Evaluates the cost delta between two interval load schedules (baseline vs proposed).
 * 
 * CORE SCIENTIFIC INVARIANT:
 * If the tariff is time-independent (flat or domestic tiered slab), merely shifting
 * an unchanged load from one hour to another yields IDENTICALLY ZERO SAVINGS (₹0.00).
 * This function enforces this physical and economic law.
 */
export function calculateShiftCostDelta(
  baselineSchedule: IntervalConsumptionPoint[],
  proposedSchedule: IntervalConsumptionPoint[],
  tariff: TariffPlan
): {
  cost_delta_paise: number;
  cost_delta: number;
  baseline_cost: number;
  proposed_cost: number;
  is_time_dependent_savings: boolean;
  explanation: string;
} {
  const baselineTotalKwh = baselineSchedule.reduce((acc, p) => acc + p.kwh, 0);
  const proposedTotalKwh = proposedSchedule.reduce((acc, p) => acc + p.kwh, 0);

  // If tariff is not time-dependent:
  if (!tariff.is_time_dependent) {
    // If consumption is unchanged (pure load shift):
    if (Math.abs(baselineTotalKwh - proposedTotalKwh) < 1e-6) {
      const bill = calculateBill(baselineTotalKwh, tariff);
      return {
        cost_delta_paise: 0,
        cost_delta: 0.0,
        baseline_cost: bill.net_payable,
        proposed_cost: bill.net_payable,
        is_time_dependent_savings: false,
        explanation: `Tariff '${tariff.name}' is time-independent. Moving unchanged electricity usage (${baselineTotalKwh.toFixed(1)} kWh) across hours saves ₹0.00.`,
      };
    }
  }

  // If tariff IS time-dependent (TOU):
  const baselineBill = calculateBill(baselineTotalKwh, tariff, { interval_data: baselineSchedule });
  const proposedBill = calculateBill(proposedTotalKwh, tariff, { interval_data: proposedSchedule });

  const deltaPaise = baselineBill.net_payable_paise - proposedBill.net_payable_paise;

  return {
    cost_delta_paise: deltaPaise,
    cost_delta: deltaPaise / 100,
    baseline_cost: baselineBill.net_payable,
    proposed_cost: proposedBill.net_payable,
    is_time_dependent_savings: tariff.is_time_dependent,
    explanation: deltaPaise > 0
      ? `Shifting consumption yields ₹${(deltaPaise / 100).toFixed(2)} savings under ${tariff.name}.`
      : deltaPaise < 0
      ? `Proposed shift increases costs by ₹${(Math.abs(deltaPaise) / 100).toFixed(2)}.`
      : `No cost difference between schedules.`,
  };
}

/**
 * Prorates a billing calculation across a tariff transition boundary.
 * 
 * @param totalKwh - Total consumption across full cycle
 * @param daysInPeriod1 - Days billed under old tariff version
 * @param tariff1 - Old tariff plan
 * @param daysInPeriod2 - Days billed under new tariff version
 * @param tariff2 - New tariff plan
 */
export function prorateBillAcrossTariffVersions(
  totalKwh: number,
  daysInPeriod1: number,
  tariff1: TariffPlan,
  daysInPeriod2: number,
  tariff2: TariffPlan
): {
  prorated_payable_paise: number;
  prorated_payable: number;
  period1_portion_paise: number;
  period2_portion_paise: number;
  period1_units_kwh: number;
  period2_units_kwh: number;
} {
  const totalDays = daysInPeriod1 + daysInPeriod2;
  if (totalDays <= 0) {
    throw new Error('Total days in prorating periods must be greater than 0');
  }

  // Pro-rate consumption by calendar days
  const unitsPeriod1 = (totalKwh * daysInPeriod1) / totalDays;
  const unitsPeriod2 = (totalKwh * daysInPeriod2) / totalDays;

  const bill1 = calculateBill(unitsPeriod1, tariff1);
  const bill2 = calculateBill(unitsPeriod2, tariff2);

  // Pro-rate payable amounts
  const period1PortionPaise = Math.round(bill1.net_payable_paise * (daysInPeriod1 / totalDays));
  const period2PortionPaise = Math.round(bill2.net_payable_paise * (daysInPeriod2 / totalDays));
  const proratedPayablePaise = period1PortionPaise + period2PortionPaise;

  return {
    prorated_payable_paise: proratedPayablePaise,
    prorated_payable: proratedPayablePaise / 100,
    period1_portion_paise: period1PortionPaise,
    period2_portion_paise: period2PortionPaise,
    period1_units_kwh: unitsPeriod1,
    period2_units_kwh: unitsPeriod2,
  };
}
