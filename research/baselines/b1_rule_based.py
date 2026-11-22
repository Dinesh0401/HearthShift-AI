"""
Baseline B1: No-Query Heuristic Rule Advisor
Zero queries (K=0). Applies static rule-of-thumb thresholds without preference awareness.
"""

from __future__ import annotations
from typing import Any
from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan
from simulator.household import SyntheticHousehold


class RuleBasedAdvisor(BaseAdvisor):
    def __init__(self, high_consumption_threshold_kwh: float = 475.0, mid_threshold_kwh: float = 350.0):
        super().__init__('B1_RuleBased')
        self.high_threshold = high_consumption_threshold_kwh
        self.mid_threshold = mid_threshold_kwh

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Invariant: Never recommend load-shifting if tariff has no time-varying rates
        candidate_reductions = [a for a in pub.candidate_actions if a.is_reduction() and a.id != 'null_action']
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')

        if not candidate_reductions:
            return DecisionResult(action=null_action, decision_type='recommend')

        if baseline >= self.high_threshold:
            # Aggressive rule: Pick largest reduction action to avoid high tier/cliff
            best_action = max(candidate_reductions, key=lambda a: a.delta_kwh)
        elif baseline >= self.mid_threshold:
            # Moderate rule: Pick smallest non-zero reduction action
            best_action = min(candidate_reductions, key=lambda a: a.delta_kwh)
        else:
            # Low consumption: Status quo
            best_action = null_action

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=[],
            metadata={'rule_applied': 'threshold_heuristic', 'baseline_kwh': baseline},
        )
