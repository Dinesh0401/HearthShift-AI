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
        lambda_discomfort_paise: float = 1000.0,
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

        # Prior belief over theta: N(mu, diag(sigma^2))
        mu = np.array([1.0, 1.0, 1.0, 1.0])
        # Intentionally heterogeneous prior uncertainty to observe greedy entropy selection
        # (e.g. laundry feature variance is high, tempting entropy-based active query)
        sigma = np.array([0.4, 0.6, 0.4, 0.3])

        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            # Evaluate differential entropy H = 0.5 * ln(2 * pi * e * sigma_j^2)
            # Find candidate question targeting the feature with the largest uncertainty/entropy
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
                # Uncertainty sufficiently collapsed
                break

            # Execute active query via environment
            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(feat_idx)

            if obs.is_fatigue_dropout:
                # Household dropped out due to interaction fatigue
                break

            if obs.response_value == 1:
                mu[feat_idx] = max(0.2, mu[feat_idx] - 0.4)
                sigma[feat_idx] *= 0.5
            elif obs.response_value == -1:
                mu[feat_idx] = mu[feat_idx] + 0.6
                sigma[feat_idx] *= 0.5

        # After active queries, optimize expected loss under posterior mean mu
        candidate_actions = pub.candidate_actions
        best_action = candidate_actions[0]
        min_loss = float('inf')

        for action in candidate_actions:
            if action.is_shift():
                # Under time-independent tariff, shifting saves 0
                continue

            post_kwh = max(0.0, baseline - action.delta_kwh)
            bill = calculate_bill(post_kwh, tariff).net_payable_paise
            discomfort = self.lambda_discomfort_paise * float(np.dot(mu, action.feature_vector))
            loss = bill + discomfort

            if loss < min_loss:
                min_loss = loss
                best_action = action

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=asked_ids,
            metadata={'posterior_mu': mu.tolist(), 'posterior_sigma': sigma.tolist()},
        )
