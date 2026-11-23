"""
Baseline B2: Fixed Upfront Survey Advisor
Asks a fixed battery of K onboarding questions upfront, computes a point estimate MAP,
and maximizes expected net welfare under exact tariffs.
"""

from __future__ import annotations
from typing import Any, List
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold


class FixedSurveyAdvisor(BaseAdvisor):
    def __init__(self, k_questions: int = 3, lambda_discomfort_paise: float = 20000.0):
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

        # Prior belief over theta: mean = 1.0
        mu = np.array([1.0, 1.0, 1.0, 1.0])

        for q in questions_to_ask:
            obs = env.ask_question(household, q)
            asked_ids.append(q.id)
            if not obs.is_fatigue_dropout and obs.response_value != 0:
                feat_idx = q.feature_index
                if obs.response_value == 1:
                    mu[feat_idx] = max(0.2, mu[feat_idx] - 0.4)
                elif obs.response_value == -1:
                    mu[feat_idx] = mu[feat_idx] + 0.6

        # Optimize expected welfare
        baseline = pub.baseline_kwh
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        bill_sq = calculate_bill(baseline, tariff).net_payable_paise

        best_action = null_action
        max_expected_welfare = 0.0  # Status quo welfare is 0

        for action in pub.candidate_actions:
            if action.is_shift():
                continue

            post_kwh = max(0.0, baseline - action.delta_kwh)
            bill_act = calculate_bill(post_kwh, tariff).net_payable_paise
            savings = bill_sq - bill_act
            discomfort = self.lambda_discomfort_paise * float(np.dot(mu, action.feature_vector))
            welfare = savings - discomfort

            if welfare > max_expected_welfare:
                max_expected_welfare = welfare
                best_action = action

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=asked_ids,
            metadata={'theta_map': mu.tolist(), 'expected_welfare_paise': max_expected_welfare},
        )
