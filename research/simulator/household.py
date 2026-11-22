"""
Household Profile Models with Isolated Hidden Ground Truth
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Optional
import numpy as np
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.appliances import Appliance, EnergyAction, AirConditioner, WashingMachine, WaterHeater


@dataclass(frozen=True)
class CandidateQuestion:
    id: str
    feature_index: int
    text: str
    target_appliance: str
    privacy_cost_paise: int = 500  # ₹5.00 privacy penalty


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
        lambda_discomfort_paise: float = 1000.0,  # 1 unit discomfort = ₹10.00 (1000 paise)
        appliances: Optional[List[Appliance]] = None,
        rng: Optional[np.random.Generator] = None,
    ):
        self.household_id = household_id
        self.baseline_kwh = baseline_kwh
        self._theta_star = np.array(theta_star, dtype=float)  # PRIVATE: Evaluator/Oracle only!
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.rng = rng or np.random.default_rng()

        if appliances is None:
            self.appliances = [
                AirConditioner(f'{household_id}_ac'),
                WashingMachine(f'{household_id}_wm'),
                WaterHeater(f'{household_id}_wh'),
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
            ),
            CandidateQuestion(
                id='q_laundry_timing',
                feature_index=1,
                text='Can laundry cycles be scheduled in the morning (07:00) instead of evening?',
                target_appliance='Washing Machine',
            ),
            CandidateQuestion(
                id='q_water_heater_duration',
                feature_index=2,
                text='Can the water heater duration be trimmed by 20 minutes with timer control?',
                target_appliance='Water Heater',
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

    def evaluate_true_loss(
        self,
        action: EnergyAction,
        realized_kwh: float,
        tariff: TariffPlan,
    ) -> float:
        """
        Evaluates true decision loss using hidden ground truth _theta_star.
        Called STRICTLY by evaluators / oracle benchmarks, NEVER by the agent algorithm.
        Loss = TariffBill(E - deltaE) + lambda * Discomfort(action, theta*)
        """
        post_action_kwh = max(0.0, realized_kwh - action.delta_kwh)
        bill = calculate_bill(post_action_kwh, tariff)
        bill_paise = bill.net_payable_paise

        discomfort_score = float(np.dot(self._theta_star, action.feature_vector))
        discomfort_paise = self.lambda_discomfort_paise * discomfort_score

        return float(bill_paise + discomfort_paise)

    def sample_question_response(
        self,
        question: CandidateQuestion,
        noise_std: float = 0.2,
    ) -> int:
        """
        Generates user answer y in {-1, +1} to question q based on true preference.
        Low theta (high flexibility) -> +1 (Yes/Comfortable).
        High theta (low flexibility) -> -1 (No/Uncomfortable).
        """
        true_sensitivity = self._theta_star[question.feature_index]
        # Threshold: if sensitivity < 1.0, user is flexible (answer +1)
        latent_response = -(true_sensitivity - 1.0) + self.rng.normal(0, noise_std)
        return 1 if latent_response >= 0 else -1


def generate_synthetic_cohort(
    n_households: int = 100,
    seed: int = 42,
    cliff_fraction: float = 0.4,
) -> List[SyntheticHousehold]:
    """
    Generates a diverse, reproducible cohort of synthetic households.
    Enforces cliff_fraction households to have baseline consumption near the 500 kWh cliff (480-520 kWh).
    """
    rng = np.random.default_rng(seed)
    cohort: List[SyntheticHousehold] = []

    for i in range(n_households):
        hid = f'hh_{i+1:03d}'
        if rng.random() < cliff_fraction:
            # Critical cliff region: 475 to 515 kWh
            baseline = float(rng.uniform(475.0, 515.0))
        else:
            # Broad domestic consumption distribution (200 to 600 kWh)
            baseline = float(rng.uniform(220.0, 580.0))

        # Latent sensitivity parameters: [AC, Laundry, Water, CostSensitivity]
        # Drawn from log-normal distributions to reflect realistic right-skewed comfort thresholds
        theta_ac = float(rng.lognormal(mean=0.0, sigma=0.4))
        theta_wm = float(rng.lognormal(mean=0.0, sigma=0.5))
        theta_wh = float(rng.lognormal(mean=0.0, sigma=0.4))
        theta_cost = float(rng.uniform(0.5, 1.5))

        theta_star = np.array([theta_ac, theta_wm, theta_wh, theta_cost])
        cohort.append(SyntheticHousehold(hid, baseline, theta_star, rng=rng))

    return cohort
