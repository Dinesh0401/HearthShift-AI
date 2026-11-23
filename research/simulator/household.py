"""
Household Profile Models with Isolated Hidden Ground Truth and Stratified Archetypes
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Optional, Literal
import numpy as np
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.appliances import Appliance, EnergyAction, AirConditioner, WashingMachine, WaterHeater, StandbyPower


@dataclass(frozen=True)
class CandidateQuestion:
    id: str
    feature_index: int
    text: str
    target_appliance: str
    privacy_cost_paise: int = 400  # ₹4.00 privacy penalty


class SyntheticHousehold:
    """
    Synthetic Household with strictly isolated ground-truth preferences.
    Ground truth `_theta_star` is NEVER exposed to algorithms directly.
    """
    def __init__(
        self,
        household_id: str,
        baseline_kwh: float,
        theta_star: np.ndarray,
        lambda_discomfort_paise: float = 20000.0,  # 1 unit discomfort = ₹200.00 (20,000 paise)
        d_max: float = 2.2,  # Hard comfort tolerance limit
        archetype: str = 'standard_flexible',
        appliances: Optional[List[Appliance]] = None,
        rng: Optional[np.random.Generator] = None,
    ):
        self.household_id = household_id
        self.baseline_kwh = baseline_kwh
        self._theta_star = np.array(theta_star, dtype=float)  # PRIVATE: Evaluator/Oracle only!
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.d_max = d_max
        self.archetype = archetype
        self.rng = rng or np.random.default_rng()

        if appliances is None:
            self.appliances = [
                AirConditioner(f'{household_id}_ac'),
                WashingMachine(f'{household_id}_wm'),
                WaterHeater(f'{household_id}_wh'),
                StandbyPower(f'{household_id}_stby'),
            ]
        else:
            self.appliances = appliances

        self._candidate_actions = self._build_candidate_actions()
        self._candidate_questions = self._build_candidate_questions()

    def _build_candidate_actions(self) -> List[EnergyAction]:
        actions: List[EnergyAction] = [
            EnergyAction(
                id='null_action',
                appliance_id='none',
                action_type='reduction',
                description='Status Quo (no change)',
                delta_kwh=0.0,
                shift_hours=0.0,
                feature_vector=np.zeros(4),
            )
        ]
        for app in self.appliances:
            actions.extend(app.get_candidate_actions())
        return actions

    def _build_candidate_questions(self) -> List[CandidateQuestion]:
        return [
            CandidateQuestion(
                id='q_ac_flexibility',
                feature_index=0,
                text='Are you comfortable setting the AC 1°C to 2°C higher on warm afternoons?',
                target_appliance='Air Conditioner',
                privacy_cost_paise=500,
            ),
            CandidateQuestion(
                id='q_laundry_timing',
                feature_index=1,
                text='Can laundry cycles be scheduled in the morning (07:00) instead of evening?',
                target_appliance='Washing Machine',
                privacy_cost_paise=300,
            ),
            CandidateQuestion(
                id='q_water_heater_duration',
                feature_index=2,
                text='Can the water heater duration be trimmed by 20 minutes with timer control?',
                target_appliance='Water Heater',
                privacy_cost_paise=400,
            ),
            CandidateQuestion(
                id='q_standby_management',
                feature_index=3,
                text='Are you willing to turn off entertainment center standby power overnight?',
                target_appliance='Standby & Lighting',
                privacy_cost_paise=200,
            ),
        ]

    @property
    def candidate_actions(self) -> List[EnergyAction]:
        """Public list of candidate actions available to the agent."""
        return list(self._candidate_actions)

    @property
    def candidate_questions(self) -> List[CandidateQuestion]:
        """Public list of candidate clarifying questions available to the agent."""
        return list(self._candidate_questions)

    def evaluate_true_welfare(
        self,
        action: EnergyAction,
        realized_kwh: float,
        tariff: TariffPlan,
    ) -> float:
        """
        Evaluates true economic welfare in integer paise.
        Welfare = BillSavings - DiscomfortCost if D <= D_max, else -infinity (hard violation).
        Status quo (null_action) yields exactly 0.0 welfare.
        """
        if action.id == 'null_action':
            return 0.0

        discomfort_score = float(np.dot(self._theta_star, action.feature_vector))
        if discomfort_score > self.d_max:
            return -float('inf')  # Hard constraint violation

        post_kwh = max(0.0, realized_kwh - action.delta_kwh)
        bill_sq = calculate_bill(realized_kwh, tariff).net_payable_paise
        bill_post = calculate_bill(post_kwh, tariff).net_payable_paise
        savings_paise = bill_sq - bill_post

        discomfort_paise = self.lambda_discomfort_paise * discomfort_score
        return float(savings_paise - discomfort_paise)

    def evaluate_true_loss(
        self,
        action: EnergyAction,
        realized_kwh: float,
        tariff: TariffPlan,
    ) -> float:
        """
        Decision loss combining utility bill and discomfort penalty.
        If hard constraint is breached, loss is heavily penalized.
        """
        post_action_kwh = max(0.0, realized_kwh - action.delta_kwh)
        bill = calculate_bill(post_action_kwh, tariff)
        bill_paise = bill.net_payable_paise

        discomfort_score = float(np.dot(self._theta_star, action.feature_vector))
        if discomfort_score > self.d_max:
            # Massive penalty for hard constraint violation
            return float(bill_paise + 500_000)

        discomfort_paise = self.lambda_discomfort_paise * discomfort_score
        return float(bill_paise + discomfort_paise)

    def sample_question_response(
        self,
        question: CandidateQuestion,
        noise_std: float = 0.4,
    ) -> int:
        """
        Generates noisy user answer y in {-1, 0, +1} to question q based on true preference.
        Low theta (high flexibility) -> +1 (Yes/Comfortable).
        High theta (low flexibility) -> -1 (No/Uncomfortable).
        Near boundary -> 0 (Indifferent/Unsure).
        """
        true_sensitivity = self._theta_star[question.feature_index]
        latent = -(true_sensitivity - 1.0) + self.rng.normal(0, noise_std)
        if abs(latent) < 0.15:
            return 0  # Indifferent / uncertain response
        return 1 if latent > 0 else -1


def generate_synthetic_cohort(
    n_households: int = 100,
    seed: int = 42,
) -> List[SyntheticHousehold]:
    """
    Generates a stratified, representative synthetic household cohort covering 5 distinct archetypes:
    1. Cliff Edge Critical (25%): Baseline consumption tightly distributed around 495–510 kWh.
    2. Standard Flexible (35%): Typical domestic consumption (260–440 kWh) with moderate flexibility.
    3. Inflexible Extreme (15%): High discomfort sensitivity, low D_max (abstention optimal).
    4. Inelastic Constrained (15%): Low baseline consumption (160–220 kWh), no AC (abstention optimal).
    5. Noisy / Unresponsive (10%): High preference noise and fatigue propensity.
    """
    rng = np.random.default_rng(seed)
    cohort: List[SyntheticHousehold] = []

    # Proportions: 25 cliff, 35 standard, 15 inflexible, 15 inelastic, 10 noisy
    n_cliff = int(round(n_households * 0.25))
    n_inflex = int(round(n_households * 0.15))
    n_inelastic = int(round(n_households * 0.15))
    n_noisy = int(round(n_households * 0.10))
    n_standard = n_households - (n_cliff + n_inflex + n_inelastic + n_noisy)

    idx = 1

    # 1. Cliff Edge Critical
    cliff_exact_points = [495.0, 498.0, 499.0, 500.0, 501.0, 502.0, 505.0, 508.0]
    for i in range(n_cliff):
        hid = f'hh_{idx:03d}'
        idx += 1
        base = float(cliff_exact_points[i % len(cliff_exact_points)] + rng.uniform(-1.0, 1.0))
        theta = np.array([
            float(rng.lognormal(0.0, 0.35)),
            float(rng.lognormal(0.0, 0.40)),
            float(rng.lognormal(0.0, 0.35)),
            float(rng.uniform(0.6, 1.4)),
        ])
        cohort.append(SyntheticHousehold(
            household_id=hid,
            baseline_kwh=base,
            theta_star=theta,
            lambda_discomfort_paise=20000.0,
            d_max=2.2,
            archetype='cliff_critical',
            rng=rng,
        ))

    # 2. Standard Flexible
    for i in range(n_standard):
        hid = f'hh_{idx:03d}'
        idx += 1
        base = float(rng.uniform(260.0, 440.0))
        theta = np.array([
            float(rng.lognormal(0.0, 0.30)),
            float(rng.lognormal(0.0, 0.35)),
            float(rng.lognormal(0.0, 0.30)),
            float(rng.uniform(0.8, 1.2)),
        ])
        cohort.append(SyntheticHousehold(
            household_id=hid,
            baseline_kwh=base,
            theta_star=theta,
            lambda_discomfort_paise=20000.0,
            d_max=2.5,
            archetype='standard_flexible',
            rng=rng,
        ))

    # 3. Inflexible Extreme (High sensitivity, low D_max -> Abstention optimal)
    for i in range(n_inflex):
        hid = f'hh_{idx:03d}'
        idx += 1
        base = float(rng.uniform(320.0, 540.0))
        # High discomfort sensitivity
        theta = np.array([
            float(rng.uniform(2.5, 4.5)),
            float(rng.uniform(2.0, 3.5)),
            float(rng.uniform(2.0, 4.0)),
            float(rng.uniform(0.4, 0.8)),
        ])
        cohort.append(SyntheticHousehold(
            household_id=hid,
            baseline_kwh=base,
            theta_star=theta,
            lambda_discomfort_paise=25000.0,
            d_max=1.0,  # Very low threshold: virtually any curtailment is intolerable
            archetype='inflexible_extreme',
            rng=rng,
        ))

    # 4. Inelastic Constrained (Low consumption, minimal appliances -> Abstention optimal)
    for i in range(n_inelastic):
        hid = f'hh_{idx:03d}'
        idx += 1
        base = float(rng.uniform(140.0, 220.0))
        theta = np.array([
            float(rng.uniform(1.0, 2.0)),
            float(rng.uniform(1.0, 2.0)),
            float(rng.uniform(1.0, 2.0)),
            float(rng.uniform(0.5, 1.5)),
        ])
        # Only lighting/standby and washing machine, no AC
        appliances = [
            WashingMachine(f'{hid}_wm'),
            WaterHeater(f'{hid}_wh'),
            StandbyPower(f'{hid}_stby'),
        ]
        cohort.append(SyntheticHousehold(
            household_id=hid,
            baseline_kwh=base,
            theta_star=theta,
            lambda_discomfort_paise=20000.0,
            d_max=1.8,
            archetype='inelastic_constrained',
            appliances=appliances,
            rng=rng,
        ))

    # 5. Noisy / Unresponsive
    for i in range(n_noisy):
        hid = f'hh_{idx:03d}'
        idx += 1
        base = float(rng.uniform(350.0, 520.0))
        theta = np.array([
            float(rng.lognormal(0.0, 0.6)),
            float(rng.lognormal(0.0, 0.6)),
            float(rng.lognormal(0.0, 0.6)),
            float(rng.uniform(0.5, 1.5)),
        ])
        cohort.append(SyntheticHousehold(
            household_id=hid,
            baseline_kwh=base,
            theta_star=theta,
            lambda_discomfort_paise=20000.0,
            d_max=2.0,
            archetype='noisy_unresponsive',
            rng=rng,
        ))

    return cohort
