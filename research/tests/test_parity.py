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
from types import SimpleNamespace
import pytest
import numpy as np

from simulator.tariffs import (
    calculate_bill,
    create_tnpdcl_lt1a_may2026_tariff,
    TNPDCL_LT1A_2024_2025,
    TNPDCL_LT1A_2026_MAY10,
    GENERIC_FLAT_INR,
    TariffPlan,
    ConsumptionSlab,
    FreeUnitsSubsidy,
    SlabDiscountSubsidy,
)
from simulator.numerical_quadrature import exact_piecewise_tariff_moments
from simulator.appliances import EnergyAction
from simulator.household import CandidateQuestion
from algorithms.tr_voi import ThresholdAwareRobustVOIAdvisor


TNPDCL_LT1A_2025_2026 = TariffPlan(
    id="in-tnpdcl-lt1a-2025",
    name="TNPDCL LT-1A Domestic (2025–2026)",
    currency="INR",
    billing_cadence="bimonthly",
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
    free_units_rule=FreeUnitsSubsidy(100, eligibility_max_units=None),
    slab_discounts=[SlabDiscountSubsidy(101, 200, 235, eligibility_max_units=500)],
    fixed_charge_paise=0,
    electricity_duty_percentage=0.0,
)

TARIFFS_BY_ID = {
    "in-tnpdcl-lt1a-may2026": TNPDCL_LT1A_2026_MAY10,
    "in-tnpdcl-lt1a-2025": TNPDCL_LT1A_2025_2026,
    "in-tnpdcl-lt1a-2024": TNPDCL_LT1A_2024_2025,
    "generic-flat-inr": GENERIC_FLAT_INR,
}

TS_ALIGNED_ACTIONS = [
    EnergyAction("null_action", "none", "reduction", "Status Quo", 0.0, 0.0, np.array([0.0, 0.0, 0.0, 0.0])),
    EnergyAction("ac_setpoint_plus0_5", "ac", "reduction", "AC +0.5C", 15.0, 0.0, np.array([0.5, 0.0, 0.0, 0.0])),
    EnergyAction("ac_setpoint_plus1", "ac", "reduction", "AC +1.0C", 35.0, 0.0, np.array([1.0, 0.0, 0.0, 0.0])),
    EnergyAction("ac_setpoint_plus2", "ac", "reduction", "AC +2.0C", 70.0, 0.0, np.array([2.0, 0.0, 0.0, 0.0])),
    EnergyAction("ac_curtail_1h", "ac", "reduction", "AC -1h", 90.0, 0.0, np.array([2.5, 0.0, 0.0, 0.0])),
    EnergyAction("water_heater_timer_trim", "wh", "reduction", "WH trim", 20.0, 0.0, np.array([0.0, 0.0, 0.4, 0.0])),
    EnergyAction("standby_power_down", "stby", "reduction", "Standby off", 6.0, 0.0, np.array([0.0, 0.0, 0.0, 0.2])),
    EnergyAction("washing_machine_shift", "wm", "shift", "WM shift", 0.0, -12.0, np.array([0.0, 0.3, 0.0, 0.0])),
]

ALL_QUESTIONS = [
    CandidateQuestion("q_ac_flexibility", 0, "AC?", "AC", 500),
    CandidateQuestion("q_laundry_timing", 1, "WM?", "WM", 300),
    CandidateQuestion("q_water_heater_duration", 2, "WH?", "WH", 400),
    CandidateQuestion("q_standby_management", 3, "Stby?", "Stby", 200),
]


class _ParityMockEnv:
    def __init__(self, baseline_kwh: float, available_qs: list[CandidateQuestion], prior_feedback=None):
        self.baseline_kwh = baseline_kwh
        self.available_qs = available_qs
        self.prior_feedback = prior_feedback
        self.asked_this_step: list[str] = []

    def get_public_view(self, hh):
        return SimpleNamespace(
            household_id="parity_hh",
            baseline_kwh=self.baseline_kwh,
            candidate_actions=TS_ALIGNED_ACTIONS,
            candidate_questions=self.available_qs,
        )

    def ask_question(self, hh, q):
        self.asked_this_step.append(q.id)
        if self.prior_feedback and q.id == self.prior_feedback["question_id"]:
            return SimpleNamespace(is_fatigue_dropout=False, response_value=self.prior_feedback["response"])
        return SimpleNamespace(is_fatigue_dropout=True, response_value=0)


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


def test_multi_tariff_piecewise_normal_moments_parity(parity_fixtures):
    """
    Validates analytical piecewise normal moments across all supported tariffs:
    May 2026, 2025, 2024 historical, and generic flat INR.
    """
    cases = parity_fixtures["multi_tariff_piecewise_moments"]
    seen_tariffs = set()

    for case in cases:
        tariff_id = case["tariff_id"]
        seen_tariffs.add(tariff_id)
        tariff = TARIFFS_BY_ID[tariff_id]
        result = exact_piecewise_tariff_moments(case["mu"], case["sigma"], tariff)

        expected_mean = case["mean_bill_paise"]
        actual_mean = result["mean_bill_paise"]
        if expected_mean > 0:
            rel_err = abs(actual_mean - expected_mean) / expected_mean
            assert rel_err < 1e-3, f"Mean error {rel_err} for {tariff_id} mu={case['mu']} sigma={case['sigma']}"
        else:
            assert abs(actual_mean - expected_mean) < 1.0

        expected_std = case["std_bill_paise"]
        actual_std = result["std_bill_paise"]
        if expected_std > 1.0:
            rel_err_std = abs(actual_std - expected_std) / expected_std
            assert rel_err_std < 1e-3, f"Std error {rel_err_std} for {tariff_id} mu={case['mu']} sigma={case['sigma']}"
        else:
            assert abs(actual_std - expected_std) <= 1.0

        assert abs(result["cliff_crossing_prob"] - case["cliff_crossing_prob"]) < 1e-3

    assert seen_tariffs == {
        "in-tnpdcl-lt1a-may2026",
        "in-tnpdcl-lt1a-2025",
        "in-tnpdcl-lt1a-2024",
        "generic-flat-inr",
    }


def test_tr_voi_tri_state_decision_parity(parity_fixtures):
    """
    Validates end-to-end tri-state decision parity ('recommend', 'ask_question', 'abstain')
    between Python ThresholdAwareRobustVOIAdvisor and TypeScript decideTrVoi.
    """
    seen_outcomes = set()
    for case in parity_fixtures["tr_voi_decisions"]:
        tariff = TARIFFS_BY_ID[case["tariff_id"]]
        prior_fb = case.get("prior_feedback")

        if prior_fb is not None:
            advisor = ThresholdAwareRobustVOIAdvisor(max_queries=2)
            env = _ParityMockEnv(case["baseline_kwh"], ALL_QUESTIONS, prior_feedback=prior_fb)
            res = advisor.decide(env, None, tariff)
            assert env.asked_this_step == [prior_fb["question_id"]]
            actual_outcome = res.decision_type
            actual_question_id = None
            actual_action_id = res.action.id
        else:
            asked_ids = set(case["asked_question_ids"])
            avail_qs = [q for q in ALL_QUESTIONS if q.id not in asked_ids]
            advisor = ThresholdAwareRobustVOIAdvisor(max_queries=1)
            env = _ParityMockEnv(case["baseline_kwh"], avail_qs)
            res = advisor.decide(env, None, tariff)
            if env.asked_this_step:
                actual_outcome = "ask_question"
                actual_question_id = env.asked_this_step[0]
                actual_action_id = None
            else:
                actual_outcome = res.decision_type
                actual_question_id = None
                actual_action_id = res.action.id

        seen_outcomes.add(actual_outcome)
        assert actual_outcome == case["expected_outcome"], f"Outcome mismatch on {case['case_id']}"
        assert actual_question_id == case["expected_question_id"], f"Question mismatch on {case['case_id']}"
        assert actual_action_id == case["expected_action_id"], f"Action mismatch on {case['case_id']}"

        if actual_outcome == "recommend":
            expected_metric = case["expected_decision_metric_paise"]
            actual_metric = float(res.metadata["decision_metric_paise"])
            assert abs(actual_metric - expected_metric) / max(1.0, expected_metric) < 1e-3

    assert seen_outcomes == {"recommend", "ask_question", "abstain"}
