"""
Baseline B3: Entropy / Information-Gain Active Learning (LICA Proxy)
Proxy implementation of the active preference elicitation framework from LICA (2026).
Greedily selects queries that maximize parameter Shannon entropy reduction,
independent of tariff structure or economic consequence.
"""

from __future__ import annotations
from typing import Any, List, Set
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


class EntropyActiveAdvisor(BaseAdvisor):
    def __init__(
        self,
        max_queries: int = 3,
        min_entropy_threshold: float = 0.05,
        lambda_discomfort_paise: float = 20000.0,
    ):
        super().__init__('B3_EntropyLICA')
        self.max_queries = max_queries
        self.min_entropy_threshold = min_entropy_threshold
        self.lambda_discomfort_paise = lambda_discomfort_paise

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        mu = np.array([1.0, 1.0, 1.0, 1.0])
        # Higher prior uncertainty on laundry feature to reflect greedy entropy selection
        sigma = np.array([0.4, 0.6, 0.4, 0.3])

        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            available_questions = [
                q for q in pub.candidate_questions
                if q.id not in asked_ids and q.feature_index not in asked_feature_indices
            ]
            if not available_questions:
                break

            # B3 selects purely based on maximum parameter variance / entropy
            best_q = max(available_questions, key=lambda q: sigma[q.feature_index])
            feat_idx = best_q.feature_index

            if sigma[feat_idx] < self.min_entropy_threshold:
                break

            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(feat_idx)

            if obs.is_fatigue_dropout:
                break

            if obs.response_value == 1:
                mu[feat_idx] = max(0.2, mu[feat_idx] - 0.4)
                sigma[feat_idx] *= 0.5
            elif obs.response_value == -1:
                mu[feat_idx] = mu[feat_idx] + 0.6
                sigma[feat_idx] *= 0.5

        # After active queries, optimize expected welfare under posterior mean mu
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
            questions_asked=asked_ids,
            metadata={'posterior_mu': mu.tolist(), 'posterior_sigma': sigma.tolist()},
        )
