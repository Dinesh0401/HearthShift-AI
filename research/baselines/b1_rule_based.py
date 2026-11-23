"""
Baseline B1: No-Query Heuristic Rule Advisor
Zero queries (K=0). Applies static rule-of-thumb thresholds without preference awareness.
"""

from __future__ import annotations
from typing import Any
import numpy as np
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

        candidate_reductions = [a for a in pub.candidate_actions if a.is_reduction() and a.id != 'null_action']
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')

        if not candidate_reductions or baseline < self.mid_threshold:
            # Low consumption: Abstain / Status Quo
            return DecisionResult(
                action=null_action,
                decision_type='abstain',
                questions_asked=[],
                metadata={'rule_applied': 'below_threshold_abstain', 'baseline_kwh': baseline},
            )

        if baseline >= self.high_threshold:
            # Aggressive rule: Pick largest reduction action to avoid high tier/cliff
            best_action = max(candidate_reductions, key=lambda a: a.delta_kwh)
        else:
            # Moderate rule: Pick smallest non-zero reduction action
            best_action = min(candidate_reductions, key=lambda a: a.delta_kwh)

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=[],
            metadata={'rule_applied': 'threshold_heuristic', 'baseline_kwh': baseline},
        )


class SafeRuleBasedAdvisor(BaseAdvisor):
    """
    Baseline B1-Safe: Rule-Based Advisor with Strict Discomfort Bounds.
    Only recommends actions with discomfort feature vector <= 1.0, ensuring zero comfort
    violations across all synthetic archetypes including inflexible_extreme.
    """
    def __init__(self, high_consumption_threshold_kwh: float = 475.0, mid_threshold_kwh: float = 350.0):
        super().__init__('B1_Safe')
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

        # Filter strictly safe micro-actions (feature vector <= 0.3 ensures D <= 0.90 even for extreme theta=3.0)
        safe_reductions = [
            a for a in pub.candidate_actions
            if a.is_reduction() and a.id != 'null_action' and float(np.max(a.feature_vector)) <= 0.3
        ]
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')

        if not safe_reductions or baseline < self.mid_threshold:
            return DecisionResult(
                action=null_action,
                decision_type='abstain',
                questions_asked=[],
                metadata={'rule_applied': 'safe_abstain', 'baseline_kwh': baseline},
            )

        best_action = max(safe_reductions, key=lambda a: a.delta_kwh)

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=[],
            metadata={'rule_applied': 'safe_rule_recommend', 'baseline_kwh': baseline},
        )
