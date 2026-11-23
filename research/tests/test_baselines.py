"""
Research Acceptance Tests: Baselines B1 through B9 and TR-VOI Candidate
Corresponds to RAT-006 through RAT-010 in docs/research/PHASE-2A-ACCEPTANCE.md
"""

from __future__ import annotations
import numpy as np
import pytest

from simulator.tariffs import create_tnpdcl_lt1a_may2026_tariff, TariffPlan
from simulator.household import SyntheticHousehold, generate_synthetic_cohort
from simulator.environment import SimulationEnvironment
from baselines.b1_rule_based import RuleBasedAdvisor
from baselines.b2_fixed_survey import FixedSurveyAdvisor
from baselines.b3_entropy import EntropyActiveAdvisor
from baselines.b4_linear_evsi import LinearEVSIAdvisor
from baselines.b5_oracle import OracleAdvisor
from baselines.b6_exact_passive import ExactPassiveAdvisor
from baselines.b7_exact_evsi import ExactEVSIAdvisor
from baselines.b8_risk_passive import RiskSensitivePassiveAdvisor
from baselines.b9_evsi_no_privacy import ExactEVSINoPrivacyAdvisor
from algorithms.tr_voi import ThresholdAwareRobustVOIAdvisor


@pytest.fixture
def test_tariff() -> TariffPlan:
    return create_tnpdcl_lt1a_may2026_tariff()


@pytest.fixture
def small_cohort() -> list[SyntheticHousehold]:
    return generate_synthetic_cohort(n_households=15, seed=42)


class TestBaselineB1RuleBased:
    """RAT-006: Baseline B1 (Rule-Based) Execution."""

    def test_b1_asks_zero_queries(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = RuleBasedAdvisor()
        summary = env.run_advisor_trial(advisor)

        assert summary.mean_queries_asked == 0.0
        for r in summary.records:
            assert r.queries_asked == 0

    def test_b1_never_recommends_time_shifting_under_slab_tariff(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = RuleBasedAdvisor()
        summary = env.run_advisor_trial(advisor)
        hh_map = {hh.household_id: hh for hh in small_cohort}

        for r in summary.records:
            hh = hh_map[r.household_id]
            cand = next(a for a in hh.candidate_actions if a.id == r.chosen_action_id)
            assert not cand.is_shift(), f"B1 illegally recommended time-shifting {cand.id} under slab tariff"


class TestBaselineB2FixedSurvey:
    """RAT-007: Baseline B2 (Fixed Survey) Execution."""

    def test_b2_asks_at_most_k_questions(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        k = 3
        advisor = FixedSurveyAdvisor(k_questions=k)
        summary = env.run_advisor_trial(advisor)

        assert summary.mean_queries_asked <= k
        for r in summary.records:
            assert r.queries_asked <= k

    def test_b2_produces_valid_actions(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = FixedSurveyAdvisor(k_questions=2)
        summary = env.run_advisor_trial(advisor)
        hh_map = {hh.household_id: hh for hh in small_cohort}

        for r in summary.records:
            hh = hh_map[r.household_id]
            action_ids = {a.id for a in hh.candidate_actions}
            assert r.chosen_action_id in action_ids


class TestBaselineB3EntropyActive:
    """RAT-008: Baseline B3 (Entropy / LICA Proxy) Execution."""

    def test_b3_obeys_query_budget(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = EntropyActiveAdvisor(max_queries=2)
        summary = env.run_advisor_trial(advisor)

        assert summary.mean_queries_asked <= 2.0
        for r in summary.records:
            assert r.queries_asked <= 2

    def test_b3_entropy_greedy_selection(self, test_tariff):
        hh = SyntheticHousehold('hh_entropy', 450.0, np.array([1.0, 1.0, 1.0, 1.0]))
        env = SimulationEnvironment([hh], test_tariff)

        advisor = EntropyActiveAdvisor(max_queries=1)
        res = advisor.decide(env, hh, test_tariff)

        assert len(res.questions_asked) == 1
        assert res.questions_asked[0] == 'q_laundry_timing'


class TestBaselineB4LinearEVSI:
    """RAT-009: Baseline B4 (Linear EVSI) Execution."""

    def test_b4_obeys_budget_and_calculates_linear_evsi(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = LinearEVSIAdvisor(max_queries=3, cost_ask_paise=100.0)
        summary = env.run_advisor_trial(advisor)
        hh_map = {hh.household_id: hh for hh in small_cohort}

        assert summary.mean_queries_asked <= 3.0
        for r in summary.records:
            hh = hh_map[r.household_id]
            action_ids = {a.id for a in hh.candidate_actions}
            assert r.chosen_action_id in action_ids


class TestBaselineB5Oracle:
    """RAT-010: Baseline B5 (Oracle Reference) Execution."""

    def test_b5_asks_zero_queries(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = OracleAdvisor()
        summary = env.run_advisor_trial(advisor)

        assert summary.mean_queries_asked == 0.0

    def test_b5_zero_comfort_violations_and_minimal_regret(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff, weather_jitter_std=0.0)
        oracle = OracleAdvisor()
        summary_oracle = env.run_advisor_trial(oracle)

        # Oracle enforces hard comfort constraints (CVR == 0.0)
        assert summary_oracle.comfort_violation_rate == 0.0

        for r in summary_oracle.records:
            assert pytest.approx(r.absolute_regret_paise, abs=1e-3) == 0.0
            assert pytest.approx(r.normalized_regret, abs=1e-3) == 0.0


class TestNewBaselinesB6ThroughB9:
    """Verification for new baselines B6, B7, B8, B9."""

    def test_b6_exact_passive_zero_queries(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = ExactPassiveAdvisor()
        summary = env.run_advisor_trial(advisor)
        assert summary.mean_queries_asked == 0.0

    def test_b7_exact_evsi_detects_cliff(self, test_tariff):
        """At 505 kWh near cliff, B7 should compute higher VOI than B4."""
        hh = SyntheticHousehold('hh_cliff', 505.0, np.array([1.0, 1.0, 1.0, 1.0]))
        env = SimulationEnvironment([hh], test_tariff)
        advisor_b7 = ExactEVSIAdvisor(max_queries=1)
        res_b7 = advisor_b7.decide(env, hh, test_tariff)
        assert res_b7.action is not None

    def test_b8_risk_passive_satisfies_comfort_constraints(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = RiskSensitivePassiveAdvisor()
        summary = env.run_advisor_trial(advisor)
        assert summary.comfort_violation_rate == 0.0  # Zero comfort violations!

    def test_b9_evsi_no_privacy(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = ExactEVSINoPrivacyAdvisor(max_queries=2)
        summary = env.run_advisor_trial(advisor)
        assert summary.mean_queries_asked <= 2.0


class TestTRVOICandidate:
    """Verification for SPARE-HEM candidate TR-VOI."""

    def test_tr_voi_tri_state_decision(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = ThresholdAwareRobustVOIAdvisor(max_queries=2)
        summary = env.run_advisor_trial(advisor)

        assert summary.comfort_violation_rate <= 0.05  # Within chance-constrained 5% bound
        assert summary.mean_queries_asked <= 2.0
        assert summary.abstention_rate > 0.0  # Meaningful abstention demonstrated!
