"""
Baseline B5: Full-Information Constrained Oracle Reference
Theoretical performance ceiling.
Zero queries asked (K=0). Evaluates exact constrained welfare maximum using true hidden ground truth _theta_star.
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
        realized_kwh: Optional[float] = None,
    ) -> DecisionResult:
        # Ex-post oracle has perfect foresight of the true realized consumption
        if realized_kwh is None and hasattr(env, 'get_realized_kwh'):
            realized_kwh = env.get_realized_kwh(household.household_id)

        if realized_kwh is None:
            pub = env.get_public_view(household)
            realized_kwh = pub.baseline_kwh

        null_action = next(a for a in household.candidate_actions if a.id == 'null_action')
        best_action = null_action
        best_welfare = 0.0

        for action in household.candidate_actions:
            welfare = household.evaluate_true_welfare(action, realized_kwh, tariff)
            if welfare > best_welfare:
                best_welfare = welfare
                best_action = action

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=[],
            metadata={'oracle_welfare_paise': best_welfare, 'realized_kwh': realized_kwh},
        )
