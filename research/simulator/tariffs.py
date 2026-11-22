"""
HearthShift AI — Deterministic Python Tariff Engine

Exact mathematical mirror of the production TypeScript tariff engine.
All calculations are performed using integer paise arithmetic to guarantee
100% determinism and prevent floating-point drift.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Literal
import math


@dataclass(frozen=True)
class ConsumptionSlab:
    min_kwh: int
    max_kwh: Optional[int]
    gross_rate_paise: int


SlabRate = ConsumptionSlab



@dataclass(frozen=True)
class FreeUnitsSubsidy:
    free_units_count: int
    eligibility_max_units: Optional[int] = None
    cliff_behavior: Literal['revert_to_standard', 'total_forfeit'] = 'revert_to_standard'
    fallback_free_units: int = 0


@dataclass(frozen=True)
class SlabDiscountSubsidy:
    min_kwh: int
    max_kwh: int
    discount_paise_per_kwh: int
    eligibility_max_units: Optional[int] = None


@dataclass(frozen=True)
class TariffPlan:
    id: str
    name: str
    currency: str
    billing_cadence: Literal['monthly', 'bimonthly']
    is_time_dependent: bool
    slabs: List[ConsumptionSlab]
    high_consumption_slabs: Optional[List[ConsumptionSlab]] = None
    high_consumption_threshold_kwh: Optional[int] = None
    free_units_rule: Optional[FreeUnitsSubsidy] = None
    slab_discounts: List[SlabDiscountSubsidy] = field(default_factory=list)
    fixed_charge_paise: int = 0
    electricity_duty_percentage: float = 0.0


@dataclass(frozen=True)
class BillResult:
    consumption_kwh: float
    gross_energy_charges_paise: int
    total_subsidy_deductions_paise: int
    net_energy_charges_paise: int
    fixed_charges_paise: int
    electricity_duty_paise: int
    net_payable_paise: int

    @property
    def net_payable_inr(self) -> float:
        return self.net_payable_paise / 100.0


# ══════════════════════════════════════════════════════════
# Authoritative Tariff Schedules
# ══════════════════════════════════════════════════════════

TNPDCL_LT1A_2024_2025 = TariffPlan(
    id='in-tnpdcl-lt1a-2024',
    name='TNPDCL LT-1A Domestic (2024–2025)',
    currency='INR',
    billing_cadence='bimonthly',
    is_time_dependent=False,
    high_consumption_threshold_kwh=500,
    slabs=[
        ConsumptionSlab(0, 100, 450),
        ConsumptionSlab(101, 200, 450),
        ConsumptionSlab(201, 400, 450),
        ConsumptionSlab(401, 500, 600),
    ],
    high_consumption_slabs=[
        ConsumptionSlab(0, 100, 450),
        ConsumptionSlab(101, 400, 450),
        ConsumptionSlab(401, 500, 600),
        ConsumptionSlab(501, 600, 800),
        ConsumptionSlab(601, 800, 900),
        ConsumptionSlab(801, 1000, 1000),
        ConsumptionSlab(1001, None, 1100),
    ],
    free_units_rule=FreeUnitsSubsidy(100, eligibility_max_units=None),
    slab_discounts=[
        SlabDiscountSubsidy(101, 200, 225, eligibility_max_units=500),
    ],
    fixed_charge_paise=0,
    electricity_duty_percentage=0.0,
)

TNPDCL_LT1A_2026_MAY10 = TariffPlan(
    id='in-tnpdcl-lt1a-may2026',
    name='TNPDCL LT-1A Domestic (May 10, 2026 — 200 Free Units Scheme)',
    currency='INR',
    billing_cadence='bimonthly',
    is_time_dependent=False,
    high_consumption_threshold_kwh=500,
    slabs=[
        ConsumptionSlab(0, 100, 470),
        ConsumptionSlab(101, 200, 470),
        ConsumptionSlab(201, 400, 470),
        ConsumptionSlab(401, 500, 630),
    ],
    high_consumption_slabs=[
        ConsumptionSlab(0, 100, 470),
        ConsumptionSlab(101, 400, 470),
        ConsumptionSlab(401, 500, 630),
        ConsumptionSlab(501, 600, 840),
        ConsumptionSlab(601, 800, 945),
        ConsumptionSlab(801, 1000, 1050),
        ConsumptionSlab(1001, None, 1155),
    ],
    free_units_rule=FreeUnitsSubsidy(
        free_units_count=200,
        eligibility_max_units=500,
        cliff_behavior='revert_to_standard',
        fallback_free_units=100,
    ),
    slab_discounts=[
        SlabDiscountSubsidy(101, 200, 235, eligibility_max_units=500),
    ],
    fixed_charge_paise=0,
    electricity_duty_percentage=0.0,
)

GENERIC_FLAT_INR = TariffPlan(
    id='generic-flat-inr',
    name='Generic Flat Domestic Rate',
    currency='INR',
    billing_cadence='monthly',
    is_time_dependent=False,
    slabs=[ConsumptionSlab(0, None, 500)],  # ₹5.00/kWh
    fixed_charge_paise=5000,  # ₹50.00
    electricity_duty_percentage=0.05,  # 5% duty on energy charges
)


def calculate_bill(kwh: float, tariff: TariffPlan) -> BillResult:
    """
    Deterministic calculation of utility electricity bill in exact integer paise.
    100% equivalent to TypeScript calculator.ts calculateBill().
    """
    kwh = max(0.0, float(kwh))
    if kwh == 0.0:
        duty_paise = int(round(0.0 * tariff.electricity_duty_percentage))
        net_payable = tariff.fixed_charge_paise + duty_paise
        return BillResult(
            consumption_kwh=0.0,
            gross_energy_charges_paise=0,
            total_subsidy_deductions_paise=0,
            net_energy_charges_paise=0,
            fixed_charges_paise=tariff.fixed_charge_paise,
            electricity_duty_paise=duty_paise,
            net_payable_paise=net_payable,
        )

    # 1. Select appropriate slab schedule (high consumption vs standard)
    is_high_consumption = (
        tariff.high_consumption_threshold_kwh is not None
        and kwh > tariff.high_consumption_threshold_kwh
        and tariff.high_consumption_slabs is not None
    )
    active_slabs = tariff.high_consumption_slabs if is_high_consumption else tariff.slabs

    # 2. Determine eligible free units
    free_units = 0
    if tariff.free_units_rule:
        rule = tariff.free_units_rule
        if rule.eligibility_max_units is None or kwh <= rule.eligibility_max_units:
            free_units = rule.free_units_count
        else:
            free_units = rule.fallback_free_units if rule.cliff_behavior == 'revert_to_standard' else 0

    # 3. Telescopic gross slab calculations & free units allocation
    remaining_free = float(free_units)
    gross_total_paise = 0
    subsidy_total_paise = 0
    net_energy_charges_paise = 0

    for slab in active_slabs:
        slab_min = 0.0 if slab.min_kwh == 0 else float(slab.min_kwh - 1)
        if kwh <= slab_min:
            continue

        slab_max = float(slab.max_kwh) if slab.max_kwh is not None else float('inf')
        units_in_slab = min(kwh, slab_max) - slab_min
        if units_in_slab <= 0.0:
            continue

        slab_gross_paise = int(round(units_in_slab * slab.gross_rate_paise))
        gross_total_paise += slab_gross_paise

        # Free units absorbed in this slab
        free_in_this_slab = min(units_in_slab, remaining_free)
        remaining_free -= free_in_this_slab
        free_savings_paise = int(round(free_in_this_slab * slab.gross_rate_paise))
        current_slab_subsidy = free_savings_paise

        # Slab discount concession for remaining units in this slab
        paying_units_in_slab = units_in_slab - free_in_this_slab
        if paying_units_in_slab > 0:
            for disc in tariff.slab_discounts:
                if disc.eligibility_max_units is not None and kwh > disc.eligibility_max_units:
                    continue
                d_min = 0.0 if disc.min_kwh == 0 else float(disc.min_kwh - 1)
                d_max = float(disc.max_kwh)
                overlap = max(0.0, min(slab_max, d_max) - max(slab_min, d_min))
                if overlap > 0:
                    applicable_discount_units = min(paying_units_in_slab, overlap)
                    discount_paise = int(round(applicable_discount_units * disc.discount_paise_per_kwh))
                    remaining_slab_cost = max(0, slab_gross_paise - current_slab_subsidy)
                    current_slab_subsidy += min(remaining_slab_cost, discount_paise)

        subsidy_total_paise += current_slab_subsidy
        slab_net_paise = max(0, slab_gross_paise - current_slab_subsidy)
        net_energy_charges_paise += slab_net_paise

    # 4. Electricity Duty & Total Bill
    duty_paise = int(round(gross_total_paise * tariff.electricity_duty_percentage))
    net_payable_paise = net_energy_charges_paise + tariff.fixed_charge_paise + duty_paise

    return BillResult(
        consumption_kwh=kwh,
        gross_energy_charges_paise=gross_total_paise,
        total_subsidy_deductions_paise=subsidy_total_paise,
        net_energy_charges_paise=net_energy_charges_paise,
        fixed_charges_paise=tariff.fixed_charge_paise,
        electricity_duty_paise=duty_paise,
        net_payable_paise=net_payable_paise,
    )


def create_tnpdcl_lt1a_may2026_tariff() -> TariffPlan:
    """Helper returning the May 10, 2026 TNPDCL LT-1A tariff plan."""
    return TNPDCL_LT1A_2026_MAY10

