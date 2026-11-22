"""
Unit Tests for Python Tariff Engine Equivalence

Asserts 100% mathematical equivalence between Python research tariffs
and the TypeScript deterministic billing calculator.
"""

import pytest
from simulator.tariffs import (
    calculate_bill,
    TNPDCL_LT1A_2024_2025,
    TNPDCL_LT1A_2026_MAY10,
    GENERIC_FLAT_INR,
)


def test_generic_flat_tariff():
    bill = calculate_bill(300.0, GENERIC_FLAT_INR)
    # Energy: 300 * 500 = 150,000 paise (₹1,500.00)
    # Fixed: 5,000 paise (₹50.00)
    # Duty: 5% of 150,000 = 7,500 paise (₹75.00)
    # Total: 162,500 paise (₹1,625.00)
    assert bill.gross_energy_charges_paise == 150000
    assert bill.fixed_charges_paise == 5000
    assert bill.electricity_duty_paise == 7500
    assert bill.net_payable_paise == 162500
    assert bill.net_payable_inr == 1625.00


def test_tnpdcl_2024_2025_at_400_kwh():
    bill = calculate_bill(400.0, TNPDCL_LT1A_2024_2025)
    # 0-100: Free (₹0)
    # 101-200: 100 * 2.25 = ₹225.00
    # 201-400: 200 * 4.50 = ₹900.00
    # Net: ₹1,125.00 (112,500 paise)
    assert bill.net_payable_paise == 112500
    assert bill.net_payable_inr == 1125.00


def test_tnpdcl_2024_2025_discontinuity_cliff():
    bill_500 = calculate_bill(500.0, TNPDCL_LT1A_2024_2025)
    bill_501 = calculate_bill(501.0, TNPDCL_LT1A_2024_2025)

    assert bill_500.net_payable_paise == 172500  # ₹1,725.00
    assert bill_501.net_payable_paise == 195800  # ₹1,958.00
    assert bill_501.net_payable_paise - bill_500.net_payable_paise == 23300  # ₹233.00 cliff


def test_tnpdcl_may_2026_welfare_scheme_cliff():
    bill_500 = calculate_bill(500.0, TNPDCL_LT1A_2026_MAY10)
    bill_501 = calculate_bill(501.0, TNPDCL_LT1A_2026_MAY10)

    # 500 kWh: 200 free units -> ₹1,570.00
    assert bill_500.net_payable_paise == 157000
    assert bill_500.net_payable_inr == 1570.00

    # 501 kWh: Reverts to 100 free units -> ₹2,048.40
    assert bill_501.net_payable_paise == 204840
    assert bill_501.net_payable_inr == 2048.40

    # Exactly ₹478.40 cliff jump for 1 single kWh!
    assert bill_501.net_payable_paise - bill_500.net_payable_paise == 47840


def test_zero_consumption_edge_case():
    bill_flat = calculate_bill(0.0, GENERIC_FLAT_INR)
    assert bill_flat.net_payable_paise == 5000  # Only fixed charge

    bill_tnpdcl = calculate_bill(0.0, TNPDCL_LT1A_2024_2025)
    assert bill_tnpdcl.net_payable_paise == 0
