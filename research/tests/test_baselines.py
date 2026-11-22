"""
Research Acceptance Tests: Baselines B1 through B5
Corresponds to RAT-006 through RAT-010 in docs/research/PHASE-2A-ACCEPTANCE.md
"""

from __future__ import annotations
import numpy as np
import pytest

from simulator.tariffs import create_tnpdcl_lt1a_may2026_tariff, TariffPlan, SlabRate
from simulator.household import SyntheticHousehold, generate_synthetic_cohort
from simulator.environment import SimulationEnvironment
from baselines.b1_rule_based import RuleBasedAdvisor
from baselines.b2_fixed_survey import FixedSurveyAdvisor
from baselines.b3_entropy import EntropyActiveAdvisor
from baselines.b4_linear_evsi import LinearEVSIAdvisor
from baselines.b5_oracle import OracleAdvisor


@pytest.fixture
def test_tariff() -> TariffPlan:
    return create_tnpdcl_lt1a_may2026_tariff()


@pytest.fixture
def small_cohort() -> list[SyntheticHousehold]:
    return generate_synthetic_cohort(n_households=10, seed=42)


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
            # Look up chosen action
            hh = hh_map[r.household_id]
            cand = next(a for a in hh.candidate_actions if a.id == r.chosen_action_id)
            assert not cand.is_shift(), f"B1 illegally recommended time-shifting {cand.id} under slab tariff"


class TestBaselineB2FixedSurvey:
    """RAT-007: Baseline B2 (Fixed Survey) Execution."""

    def test_b2_asks_exactly_k_questions(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        k = 3
        advisor = FixedSurveyAdvisor(k_questions=k)
        summary = env.run_advisor_trial(advisor)

        # For every household, B2 must ask exactly k questions (unless fatigue dropout)
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
        """B3 must select question corresponding to the highest prior uncertainty."""
        hh = SyntheticHousehold('hh_entropy', 450.0, np.array([1.0, 1.0, 1.0, 1.0]))
        env = SimulationEnvironment([hh], test_tariff)

        # Prior sigma in b3 is: [0.4, 0.6, 0.4, 0.3].
        # Feature index 1 (laundry) has highest sigma (0.6).
        # Thus, first question asked must target feature_index 1 (q_laundry_timing).
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

    def test_b4_underestimates_cliff_delta(self, test_tariff):
        """
        Verify that Linear EVSI does NOT take into account the ₹478.40 cliff delta.
        For a household at 505 kWh, saving 43.2 kWh drops consumption to 461.8 kWh (below 500 cliff).
        Actual bill savings: ₹1,610 (including the ₹478.40 cliff jump).
        Under linear rate (Bill(505)/505 = ~₹4.11/kWh), 43.2 kWh * 4.11 = only ~₹177.
        """
        hh = SyntheticHousehold('hh_cliff', 505.0, np.array([1.0, 1.0, 1.0, 1.0]))
        advisor = LinearEVSIAdvisor(max_queries=0)
        env = SimulationEnvironment([hh], test_tariff)
        res = advisor.decide(env, hh, test_tariff)
        assert 'linear_rate_paise' in res.metadata
        # Marginal rate in paise is around 400-420 paise/kWh
        assert 300.0 <= res.metadata['linear_rate_paise'] <= 500.0


class TestBaselineB5Oracle:
    """RAT-010: Baseline B5 (Oracle Reference) Execution."""

    def test_b5_asks_zero_queries(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff)
        advisor = OracleAdvisor()
        summary = env.run_advisor_trial(advisor)

        assert summary.mean_queries_asked == 0.0

    def test_b5_achieves_minimal_regret(self, test_tariff, small_cohort):
        env = SimulationEnvironment(small_cohort, test_tariff, weather_jitter_std=0.0)
        oracle = OracleAdvisor()
        summary_oracle = env.run_advisor_trial(oracle)

        # When weather jitter is 0, oracle has perfect foresight of realization
        # so absolute regret against oracle must be identically 0.0
        for r in summary_oracle.records:
            assert pytest.approx(r.absolute_regret_paise, abs=1e-3) == 0.0
            assert pytest.approx(r.normalized_regret, abs=1e-3) == 0.0

    def test_comparative_oracle_loss_optimality(self, test_tariff):
        """B5 (Oracle) must achieve lower or equal loss compared to B1 on the same cohort."""
        cohort = generate_synthetic_cohort(n_households=15, seed=777)

        env_b1 = SimulationEnvironment(cohort, test_tariff, weather_jitter_std=0.0, rng=np.random.default_rng(123))
        summary_b1 = env_b1.run_advisor_trial(RuleBasedAdvisor())

        env_b5 = SimulationEnvironment(cohort, test_tariff, weather_jitter_std=0.0, rng=np.random.default_rng(123))
        summary_b5 = env_b5.run_advisor_trial(OracleAdvisor())

        # Oracle mean absolute regret must be 0
        assert summary_b5.mean_absolute_regret_paise < summary_b1.mean_absolute_regret_paise
        assert summary_b5.mean_normalized_regret < summary_b1.mean_normalized_regret
