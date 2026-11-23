"""
Baseline B6: Exact Nonlinear Tariff Optimization without Queries (Passive Exact Tariff)
Evaluates action choices under the exact statutory tariff T(X) using prior beliefs,
without asking any clarifying questions (K=0).
"""

from __future__ import annotations
from typing import Any
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold


class ExactPassiveAdvisor(BaseAdvisor):
    def __init__(self, lambda_discomfort_paise: float = 20000.0):
        super().__init__('B6_ExactPassive')
        self.lambda_discomfort_paise = lambda_discomfort_paise

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Prior belief
        mu = np.array([1.0, 1.0, 1.0, 1.0])

        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        bill_sq = calculate_bill(baseline, tariff).net_payable_paise
        best_action = null_action
        max_expected_welfare = 0.0

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
            questions_asked=[],
            metadata={'expected_welfare_paise': max_expected_welfare},
        )
