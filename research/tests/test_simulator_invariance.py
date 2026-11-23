"""
Research Acceptance Tests: Simulator Invariance, Isolation, Physical Bounds, and Gap Handling
Corresponds to RAT-002, RAT-003, RAT-004, RAT-005 in docs/research/PHASE-2A-ACCEPTANCE.md
"""

from __future__ import annotations
import numpy as np
import pytest

from simulator.tariffs import create_tnpdcl_lt1a_may2026_tariff
from simulator.household import SyntheticHousehold, generate_synthetic_cohort
from simulator.appliances import EnergyAction, AirConditioner, WashingMachine, WaterHeater, StandbyPower
from simulator.environment import SimulationEnvironment, HouseholdPublicView
from simulator.power_integration import integrate_power_series
from baselines.b1_rule_based import RuleBasedAdvisor


class TestHiddenGroundTruthIsolation:
    """RAT-002: Hidden Ground Truth Isolation."""

    def test_public_view_does_not_contain_theta_star(self):
        hh = SyntheticHousehold('hh_test', 450.0, np.array([1.2, 0.8, 1.5, 1.0]))
        env = SimulationEnvironment([hh], create_tnpdcl_lt1a_may2026_tariff())
        pub = env.get_public_view(hh)

        # Assert public view is of type HouseholdPublicView
        assert isinstance(pub, HouseholdPublicView)
        # Assert _theta_star does not exist on public view
        assert not hasattr(pub, '_theta_star')
        assert not hasattr(pub, 'theta_star')
        assert not hasattr(pub, 'lambda_discomfort_paise')
        assert not hasattr(pub, 'd_max')

        # Public view must have safe public attributes
        assert pub.household_id == 'hh_test'
        assert pub.baseline_kwh == 450.0
        assert len(pub.candidate_actions) > 0
        assert len(pub.candidate_questions) > 0

    def test_synthetic_household_private_attribute_naming(self):
        hh = SyntheticHousehold('hh_test', 450.0, np.array([1.2, 0.8, 1.5, 1.0]))
        assert hasattr(hh, '_theta_star')
        assert not hasattr(hh, 'theta_star')

    def test_environment_evaluation_isolates_true_loss_and_welfare(self):
        """Environment computes true welfare internally and does not leak _theta_star in public result."""
        tariff = create_tnpdcl_lt1a_may2026_tariff()
        hh = SyntheticHousehold('hh_001', 505.0, np.array([0.5, 0.5, 0.5, 1.0]))
        env = SimulationEnvironment([hh], tariff)

        advisor = RuleBasedAdvisor()
        record = env.run_advisor_trial(advisor).records[0]

        assert not hasattr(record, '_theta_star')
        assert isinstance(record.true_action_welfare_paise, float)
        assert isinstance(record.oracle_welfare_paise, float)

    def test_comfort_violation_rejection_and_realized_welfare_no_clipping(self):
        """When an advisor proposes an intolerable action, household strictly rejects, falls back to null_action."""
        tariff = create_tnpdcl_lt1a_may2026_tariff()
        # Inflexible household where discomfort tolerance is small (d_max = 1.0)
        hh = SyntheticHousehold('hh_rigid', 505.0, np.array([3.0, 3.0, 3.0, 3.0]), d_max=1.0, archetype='inflexible_extreme')
        assert hh.d_max == 1.0
        env = SimulationEnvironment([hh], tariff)

        # Force advisor to propose action that violates d_max (e.g. ac_curtail_afternoon_1h where D = 3.0 * 0.8 = 2.4 > 1.0)
        intolerable_action = next(a for a in hh.candidate_actions if a.id == 'ac_curtail_afternoon_1h')
        record = env.evaluate_decision(hh, chosen_action=intolerable_action, is_abstention=False)

        assert record.is_comfort_violated is True
        assert record.user_accepted is False
        assert record.executed_action_id == 'null_action'
        assert record.monetary_savings_paise == 0.0
        assert record.discomfort_paise == 0.0
        assert record.true_action_welfare_paise == 0.0
        assert record.absolute_regret_paise == record.oracle_welfare_paise
        assert 0.0 <= record.normalized_regret <= 1.0


class TestSeededInvariance:
    """RAT-003: Seeded Invariance and Reproducibility."""

    def test_cohort_generation_is_bitwise_identical_with_same_seed(self):
        cohort_a = generate_synthetic_cohort(n_households=20, seed=42)
        cohort_b = generate_synthetic_cohort(n_households=20, seed=42)

        assert len(cohort_a) == len(cohort_b) == 20
        for ha, hb in zip(cohort_a, cohort_b):
            assert ha.household_id == hb.household_id
            assert ha.baseline_kwh == hb.baseline_kwh
            assert ha.archetype == hb.archetype
            np.testing.assert_array_equal(ha._theta_star, hb._theta_star)

    def test_different_seeds_produce_distinct_cohorts(self):
        cohort_42 = generate_synthetic_cohort(n_households=10, seed=42)
        cohort_99 = generate_synthetic_cohort(n_households=10, seed=99)

        baselines_42 = [h.baseline_kwh for h in cohort_42]
        baselines_99 = [h.baseline_kwh for h in cohort_99]
        assert baselines_42 != baselines_99

    def test_simulation_trial_reproducibility(self):
        tariff = create_tnpdcl_lt1a_may2026_tariff()

        cohort_1 = generate_synthetic_cohort(n_households=15, seed=137)
        env_1 = SimulationEnvironment(cohort_1, tariff, rng=np.random.default_rng(2026))
        summary_1 = env_1.run_advisor_trial(RuleBasedAdvisor())

        cohort_2 = generate_synthetic_cohort(n_households=15, seed=137)
        env_2 = SimulationEnvironment(cohort_2, tariff, rng=np.random.default_rng(2026))
        summary_2 = env_2.run_advisor_trial(RuleBasedAdvisor())

        assert summary_1.mean_normalized_regret == summary_2.mean_normalized_regret
        assert summary_1.mean_monetary_savings_inr == summary_2.mean_monetary_savings_inr
        for r1, r2 in zip(summary_1.records, summary_2.records):
            assert r1.chosen_action_id == r2.chosen_action_id
            assert r1.realized_kwh == r2.realized_kwh
            assert r1.true_action_welfare_paise == r2.true_action_welfare_paise


class TestFeasibleActionPhysicalBounds:
    """RAT-004: Feasible Action Physical Bounds."""

    def test_all_actions_obey_physical_bounds(self):
        hh = SyntheticHousehold('hh_phys', 400.0, np.array([1.0, 1.0, 1.0, 1.0]))
        actions = hh.candidate_actions

        for a in actions:
            assert a.delta_kwh >= 0.0, f"Action {a.id} has negative delta_kwh"
            assert -24.0 <= a.shift_hours <= 24.0, f"Action {a.id} has unreasonable shift hours"
            assert len(a.feature_vector) == 4
            assert np.all(a.feature_vector >= 0.0), f"Action {a.id} has negative feature values"

            if a.is_reduction():
                if a.id == 'null_action':
                    assert a.delta_kwh == 0.0
                    assert a.shift_hours == 0.0
                else:
                    assert a.delta_kwh > 0.0
                    assert a.shift_hours == 0.0

            if a.is_shift():
                assert a.delta_kwh == 0.0
                assert a.shift_hours != 0.0

    def test_appliance_nominal_powers(self):
        ac = AirConditioner('ac_test')
        wm = WashingMachine('wm_test')
        wh = WaterHeater('wh_test')
        stby = StandbyPower('stby_test')

        assert 500.0 <= ac.nominal_power_w <= 3000.0
        assert 300.0 <= wm.nominal_power_w <= 2500.0
        assert 1000.0 <= wh.nominal_power_w <= 4000.0
        assert 50.0 <= stby.nominal_power_w <= 500.0


class TestDynamicGapHandling:
    """RAT-005: Dynamic Source-Aware Gap Handling in Power Integration."""

    def test_uniform_15min_power_series_exact_integration(self):
        ts = np.array([0, 900, 1800, 2700, 3600], dtype=float)
        pw = np.array([1000.0, 1000.0, 1000.0, 1000.0, 1000.0], dtype=float)

        kwh, segments, gaps = integrate_power_series(ts, pw)
        assert pytest.approx(kwh, 1e-4) == 1.0
        assert segments == 4
        assert gaps == 0

    def test_uniform_30min_power_series_exact_integration(self):
        ts = np.array([0, 1800, 3600, 5400, 7200], dtype=float)
        pw = np.array([2000.0, 2000.0, 2000.0, 2000.0, 2000.0], dtype=float)

        kwh, segments, gaps = integrate_power_series(ts, pw)
        assert pytest.approx(kwh, 1e-4) == 4.0
        assert segments == 4
        assert gaps == 0

    def test_abnormal_gap_omission(self):
        ts = np.array([0, 900, 1800, 16200, 17100], dtype=float)
        pw = np.array([1000.0, 1000.0, 1000.0, 1000.0, 1000.0], dtype=float)

        kwh, segments, gaps = integrate_power_series(ts, pw)
        assert pytest.approx(kwh, 1e-4) == 0.75
        assert segments == 3
        assert gaps == 1

    def test_non_monotonic_timestamps_raise_value_error(self):
        ts = [0, 900, 500, 1800]
        pw = [1000, 1000, 1000, 1000]
        with pytest.raises(ValueError, match="strictly monotonically increasing"):
            integrate_power_series(ts, pw)
