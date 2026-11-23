"""
Baseline B7: Exact-Tariff Bayesian EVSI with Standard Preference Learning
Computes Expected Value of Sample Information using the EXACT statutory piecewise tariff T(X),
capturing threshold discontinuities and tariff cliffs.
"""

from __future__ import annotations
from typing import Any, List, Set
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


class ExactEVSIAdvisor(BaseAdvisor):
    def __init__(
        self,
        max_queries: int = 3,
        cost_ask_paise: float = 200.0,  # ₹2.00 annoyance cost per query
        lambda_discomfort_paise: float = 20000.0,
        enforce_privacy_cost: bool = True,
    ):
        super().__init__('B7_ExactEVSI')
        self.max_queries = max_queries
        self.cost_ask_paise = cost_ask_paise
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.enforce_privacy_cost = enforce_privacy_cost

    def _expected_exact_welfare(
        self,
        action: EnergyAction,
        baseline_kwh: float,
        mu: np.ndarray,
        tariff: TariffPlan,
    ) -> float:
        if action.is_shift() or action.id == 'null_action':
            return 0.0

        post_kwh = max(0.0, baseline_kwh - action.delta_kwh)
        bill_sq = calculate_bill(baseline_kwh, tariff).net_payable_paise
        bill_post = calculate_bill(post_kwh, tariff).net_payable_paise
        savings = bill_sq - bill_post

        discomfort = self.lambda_discomfort_paise * float(np.dot(mu, action.feature_vector))
        return float(savings - discomfort)

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        mu = np.array([1.0, 1.0, 1.0, 1.0])
        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            # Prior value with status quo option
            v0 = max(0.0, max(self._expected_exact_welfare(a, baseline, mu, tariff) for a in pub.candidate_actions))

            available_questions = [
                q for q in pub.candidate_questions
                if q.id not in asked_ids and q.feature_index not in asked_feature_indices
            ]
            if not available_questions:
                break

            best_q: CandidateQuestion | None = None
            best_net_evsi = -1.0

            for q in available_questions:
                feat = q.feature_index
                mu_pos = mu.copy()
                mu_pos[feat] = max(0.2, mu_pos[feat] - 0.4)
                v_pos = max(0.0, max(self._expected_exact_welfare(a, baseline, mu_pos, tariff) for a in pub.candidate_actions))

                mu_neg = mu.copy()
                mu_neg[feat] = mu_neg[feat] + 0.6
                v_neg = max(0.0, max(self._expected_exact_welfare(a, baseline, mu_neg, tariff) for a in pub.candidate_actions))

                evsi = 0.5 * v_pos + 0.5 * v_neg - v0
                query_cost = self.cost_ask_paise + (q.privacy_cost_paise if self.enforce_privacy_cost else 0.0)
                net_evsi = evsi - query_cost

                if net_evsi > best_net_evsi:
                    best_net_evsi = net_evsi
                    best_q = q

            # Stopping rule: only query if net EVSI is positive
            if best_q is None or best_net_evsi <= 0.0:
                break

            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(best_q.feature_index)

            if obs.is_fatigue_dropout:
                break

            if obs.response_value == 1:
                mu[best_q.feature_index] = max(0.2, mu[best_q.feature_index] - 0.4)
            elif obs.response_value == -1:
                mu[best_q.feature_index] = mu[best_q.feature_index] + 0.6

        # Optimize expected welfare under final posterior
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        best_action = null_action
        max_welfare = 0.0

        for a in pub.candidate_actions:
            welfare = self._expected_exact_welfare(a, baseline, mu, tariff)
            if welfare > max_welfare:
                max_welfare = welfare
                best_action = a

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=asked_ids,
            metadata={'posterior_mu': mu.tolist(), 'max_expected_welfare_paise': max_welfare},
        )
