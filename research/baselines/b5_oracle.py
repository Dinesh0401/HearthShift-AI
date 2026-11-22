"""
Baseline B5: Full-Information Oracle Reference
Theoretical performance upper bound.
Zero queries asked (K=0). Evaluates exact loss minimum using true hidden ground truth _theta_star.
"""

from __future__ import annotations
from typing import Any
from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan
from simulator.household import SyntheticHousehold


class OracleAdvisor(BaseAdvisor):
    def __init__(self):
        super().__init__('B5_Oracle')

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Oracle directly evaluates true loss across candidate actions
        best_action = pub.candidate_actions[0]
        min_loss = float('inf')

        for action in pub.candidate_actions:
            loss = household.evaluate_true_loss(action, baseline, tariff)
            if loss < min_loss:
                min_loss = loss
                best_action = action

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=[],
            metadata={'oracle_loss': min_loss},
        )
