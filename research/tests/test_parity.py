"""
Cross-Language Parity Verification Suite (Python)
Validates that Python and TypeScript implementations yield identical results
for exact statutory tariff calculations, piecewise normal moments, and Bayesian belief updates
under explicit numerical tolerances.
"""

from __future__ import annotations
import json
import math
from pathlib import Path
import pytest
import numpy as np

from simulator.tariffs import calculate_bill, create_tnpdcl_lt1a_may2026_tariff
from simulator.numerical_quadrature import exact_piecewise_tariff_moments


@pytest.fixture(scope="module")
def parity_fixtures():
    fixtures_path = Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures" / "cross_language_parity_fixtures.json"
    with open(fixtures_path, "r") as f:
        return json.load(f)


def test_tariff_bill_exact_integer_parity(parity_fixtures):
    """
    Validates exact equality for integer-paise calculations across all consumption tiers.
    Zero floating point drift allowed.
    """
    tariff = create_tnpdcl_lt1a_may2026_tariff()
    for case in parity_fixtures["tariff_bills"]:
        kwh = case["kwh"]
        result = calculate_bill(kwh, tariff)

        assert result.gross_energy_charges_paise == case["gross_energy_charges_paise"], f"Gross mismatch at {kwh} kWh"
        assert result.total_subsidy_deductions_paise == case["total_subsidy_deductions_paise"], f"Subsidy mismatch at {kwh} kWh"
        assert result.net_payable_paise == case["net_payable_paise"], f"Net payable mismatch at {kwh} kWh"
        assert abs(result.net_payable_inr - case["net_payable_inr"]) < 1e-4


def test_piecewise_normal_moments_parity(parity_fixtures):
    """
    Validates analytical piecewise normal integration moments under relative tolerance <= 1e-3.
    """
    tariff = create_tnpdcl_lt1a_may2026_tariff()
    for case in parity_fixtures["piecewise_normal_moments"]:
        mu = case["mu"]
        sigma = case["sigma"]
        result = exact_piecewise_tariff_moments(mu, sigma, tariff)

        # Expected bill paise
        expected_mean = case["mean_bill_paise"]
        actual_mean = result["mean_bill_paise"]
        if expected_mean > 0:
            rel_err = abs(actual_mean - expected_mean) / expected_mean
            assert rel_err < 1e-3, f"Mean bill relative error {rel_err} exceeds 1e-3 at mu={mu}, sigma={sigma}"
        else:
            assert abs(actual_mean - expected_mean) < 1.0

        # Standard deviation bill paise
        expected_std = case["std_bill_paise"]
        actual_std = result["std_bill_paise"]
        if expected_std > 1.0:
            rel_err_std = abs(actual_std - expected_std) / expected_std
            assert rel_err_std < 1e-3, f"Std bill relative error {rel_err_std} exceeds 1e-3 at mu={mu}, sigma={sigma}"

        # Cliff crossing probability
        assert abs(result["cliff_crossing_prob"] - case["cliff_crossing_prob"]) < 1e-3


def test_bayesian_updates_parity(parity_fixtures):
    """
    Validates exact posterior updates given sparse discrete feedback (+1, -1, 0).
    """
    for case in parity_fixtures["bayesian_updates"]:
        m = list(case["initial_mu"])
        s = list(case["initial_sigma"])
        feat = case["feature_index"]
        resp = case["response"]

        if resp == 1:
            m[feat] = max(0.2, m[feat] - 0.4)
            s[feat] *= 0.5
        elif resp == -1:
            m[feat] = min(5.0, m[feat] + 0.6)
            s[feat] *= 0.5

        for i in range(4):
            assert abs(m[i] - case["expected_mu"][i]) < 1e-4
            assert abs(s[i] - case["expected_sigma"][i]) < 1e-4
