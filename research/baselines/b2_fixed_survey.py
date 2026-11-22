"""
Baseline B2: Fixed Upfront Survey Advisor
Asks a fixed battery of K onboarding questions upfront, computes a point estimate MAP,
and minimizes expected decision loss.
"""

from __future__ import annotations
from typing import Any, List
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold


class FixedSurveyAdvisor(BaseAdvisor):
    def __init__(self, k_questions: int = 3, lambda_discomfort_paise: float = 1000.0):
        super().__init__('B2_FixedSurvey')
        self.k_questions = k_questions
        self.lambda_discomfort_paise = lambda_discomfort_paise

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        questions_to_ask = pub.candidate_questions[: self.k_questions]
        asked_ids: List[str] = []

        # Prior belief over theta: mean = 1.0, std = 0.5
        mu = np.array([1.0, 1.0, 1.0, 1.0])

        for q in questions_to_ask:
            obs = env.ask_question(household, q)
            asked_ids.append(q.id)
            if not obs.is_fatigue_dropout and obs.response_value != 0:
                feat_idx = q.feature_index
                if obs.response_value == 1:
                    # Flexible user -> decrease discomfort sensitivity
                    mu[feat_idx] = max(0.2, mu[feat_idx] - 0.4)
                elif obs.response_value == -1:
                    # Inflexible user -> increase discomfort sensitivity
                    mu[feat_idx] = mu[feat_idx] + 0.6

        # Optimize expected loss using point estimate mu
        baseline = pub.baseline_kwh
        best_action = pub.candidate_actions[0]
        min_expected_loss = float('inf')

        for action in pub.candidate_actions:
            # Physical invariant: Under time-independent tariff, shifting saves 0
            if action.is_shift():
                continue

            post_kwh = max(0.0, baseline - action.delta_kwh)
            bill = calculate_bill(post_kwh, tariff).net_payable_paise
            discomfort = self.lambda_discomfort_paise * float(np.dot(mu, action.feature_vector))
            loss = bill + discomfort

            if loss < min_expected_loss:
                min_expected_loss = loss
                best_action = action

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=asked_ids,
            metadata={'theta_map': mu.tolist()},
        )
