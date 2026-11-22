"""
Research Acceptance Tests: Simulator Invariance, Isolation, Physical Bounds, and Gap Handling
Corresponds to RAT-002, RAT-003, RAT-004, RAT-005 in docs/research/PHASE-2A-ACCEPTANCE.md
"""

from __future__ import annotations
import numpy as np
import pytest

from simulator.tariffs import create_tnpdcl_lt1a_may2026_tariff
from simulator.household import SyntheticHousehold, generate_synthetic_cohort
from simulator.appliances import EnergyAction, AirConditioner, WashingMachine, WaterHeater
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

        # Public view must have safe public attributes
        assert pub.household_id == 'hh_test'
        assert pub.baseline_kwh == 450.0
        assert len(pub.candidate_actions) > 0
        assert len(pub.candidate_questions) > 0

    def test_synthetic_household_private_attribute_naming(self):
        hh = SyntheticHousehold('hh_test', 450.0, np.array([1.2, 0.8, 1.5, 1.0]))
        # In Python conventions, private attributes start with '_'
        assert hasattr(hh, '_theta_star')
        assert not hasattr(hh, 'theta_star')

    def test_environment_evaluation_isolates_true_loss(self):
        """Environment computes true loss internally and does not leak _theta_star in public result."""
        tariff = create_tnpdcl_lt1a_may2026_tariff()
        hh = SyntheticHousehold('hh_001', 505.0, np.array([0.5, 0.5, 0.5, 1.0]))
        env = SimulationEnvironment([hh], tariff)

        advisor = RuleBasedAdvisor()
        record = env.run_advisor_trial(advisor).records[0]

        # The record contains loss and regret numbers, but does NOT leak the parameter array _theta_star
        assert not hasattr(record, '_theta_star')
        assert isinstance(record.true_action_loss_paise, float)
        assert isinstance(record.oracle_loss_paise, float)


class TestSeededInvariance:
    """RAT-003: Seeded Invariance and Reproducibility."""

    def test_cohort_generation_is_bitwise_identical_with_same_seed(self):
        cohort_a = generate_synthetic_cohort(n_households=20, seed=42)
        cohort_b = generate_synthetic_cohort(n_households=20, seed=42)

        assert len(cohort_a) == len(cohort_b) == 20
        for ha, hb in zip(cohort_a, cohort_b):
            assert ha.household_id == hb.household_id
            assert ha.baseline_kwh == hb.baseline_kwh
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
            assert r1.true_action_loss_paise == r2.true_action_loss_paise


class TestFeasibleActionPhysicalBounds:
    """RAT-004: Feasible Action Physical Bounds."""

    def test_all_actions_obey_physical_bounds(self):
        hh = SyntheticHousehold('hh_phys', 400.0, np.array([1.0, 1.0, 1.0, 1.0]))
        actions = hh.candidate_actions

        for a in actions:
            # Energy delta must be non-negative (we only model reduction >= 0)
            assert a.delta_kwh >= 0.0, f"Action {a.id} has negative delta_kwh"
            # Time shifts must be bounded within +/- 24 hours
            assert -24.0 <= a.shift_hours <= 24.0, f"Action {a.id} has unreasonable shift hours"
            # Feature vector dimensions
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
                # Load shifting MUST have zero net energy reduction
                assert a.delta_kwh == 0.0
                assert a.shift_hours != 0.0

    def test_appliance_nominal_powers(self):
        ac = AirConditioner('ac_test')
        wm = WashingMachine('wm_test')
        wh = WaterHeater('wh_test')

        assert 500.0 <= ac.nominal_power_w <= 3000.0
        assert 300.0 <= wm.nominal_power_w <= 2500.0
        assert 1000.0 <= wh.nominal_power_w <= 4000.0


class TestDynamicGapHandling:
    """RAT-005: Dynamic Source-Aware Gap Handling in Power Integration."""

    def test_uniform_15min_power_series_exact_integration(self):
        # 1000W steady power for 1 hour (4 samples, 900s interval)
        # 1000W * 3600s = 3.6 MJ = 1.0 kWh
        ts = np.array([0, 900, 1800, 2700, 3600], dtype=float)
        pw = np.array([1000.0, 1000.0, 1000.0, 1000.0, 1000.0], dtype=float)

        kwh, segments, gaps = integrate_power_series(ts, pw)
        assert pytest.approx(kwh, 1e-4) == 1.0
        assert segments == 4
        assert gaps == 0

    def test_uniform_30min_power_series_exact_integration(self):
        # 2000W steady power for 2 hours (1800s interval)
        # 2000W * 7200s = 14.4 MJ = 4.0 kWh
        ts = np.array([0, 1800, 3600, 5400, 7200], dtype=float)
        pw = np.array([2000.0, 2000.0, 2000.0, 2000.0, 2000.0], dtype=float)

        kwh, segments, gaps = integrate_power_series(ts, pw)
        assert pytest.approx(kwh, 1e-4) == 4.0
        assert segments == 4
        assert gaps == 0

    def test_abnormal_gap_omission(self):
        # Normal 15-min interval, but there is a 4-hour blackout/gap between sample 2 and 3
        # Timestamps: 0, 900, 1800, 1800 + 14400 (16200), 17100
        ts = np.array([0, 900, 1800, 16200, 17100], dtype=float)
        pw = np.array([1000.0, 1000.0, 1000.0, 1000.0, 1000.0], dtype=float)

        # Nominal dt is 900s. Gap threshold is max(300, 900 * 3) = 2700s.
        # dt = 14400s > 2700s, so this gap should be omitted.
        kwh, segments, gaps = integrate_power_series(ts, pw)

        # Expected integrated energy:
        # segment 1 (0 to 900s): 1000 * 900 / 3.6e6 = 0.25 kWh
        # segment 2 (900 to 1800s): 1000 * 900 / 3.6e6 = 0.25 kWh
        # segment 3 (gap 1800 to 16200s): omitted!
        # segment 4 (16200 to 17100s): 1000 * 900 / 3.6e6 = 0.25 kWh
        # Total = 0.75 kWh (NOT 4.75 kWh if gap was interpolated)
        assert pytest.approx(kwh, 1e-4) == 0.75
        assert segments == 3
        assert gaps == 1

    def test_non_monotonic_timestamps_raise_value_error(self):
        ts = [0, 900, 500, 1800]
        pw = [1000, 1000, 1000, 1000]
        with pytest.raises(ValueError, match="strictly monotonically increasing"):
            integrate_power_series(ts, pw)
