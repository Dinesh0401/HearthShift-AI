"""
Baseline B4: Standard Linear EVSI Advisor
Classical Expected Value of Sample Information under a simplified linear tariff rate.
Misses nonlinear tariff cliffs (e.g. 500 kWh cliff) by assuming constant marginal pricing.
"""

from __future__ import annotations
from typing import Any, List, Set
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


class LinearEVSIAdvisor(BaseAdvisor):
    def __init__(
        self,
        max_queries: int = 3,
        cost_ask_paise: float = 200.0,  # ₹2.00 annoyance cost per query
        lambda_discomfort_paise: float = 1000.0,
    ):
        super().__init__('B4_LinearEVSI')
        self.max_queries = max_queries
        self.cost_ask_paise = cost_ask_paise
        self.lambda_discomfort_paise = lambda_discomfort_paise

    def _expected_linear_surplus(
        self,
        action: EnergyAction,
        mu: np.ndarray,
        marginal_rate_paise_per_kwh: float,
    ) -> float:
        """Surplus = Linear Bill Savings - Discomfort."""
        if action.is_shift():
            return 0.0
        monetary_savings = marginal_rate_paise_per_kwh * action.delta_kwh
        discomfort = self.lambda_discomfort_paise * float(np.dot(mu, action.feature_vector))
        return float(monetary_savings - discomfort)

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Linear marginal rate: Bill(baseline) / baseline (average price per kWh)
        bill_base = calculate_bill(baseline, tariff).net_payable_paise
        linear_rate = bill_base / max(1.0, baseline)

        # Prior belief over preferences
        mu = np.array([1.0, 1.0, 1.0, 1.0])
        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            # Compute Prior Value V0 under linear pricing
            v0 = max(self._expected_linear_surplus(a, mu, linear_rate) for a in pub.candidate_actions)

            # Evaluate linear EVSI for each unasked question
            available_questions = [
                q for q in pub.candidate_questions
                if q.id not in asked_ids and q.feature_index not in asked_feature_indices
            ]
            if not available_questions:
                break

            best_q: CandidateQuestion | None = None
            best_evsi = -1.0

            for q in available_questions:
                feat = q.feature_index
                # Hypothetical posterior given y = +1 (user is flexible)
                mu_pos = mu.copy()
                mu_pos[feat] = max(0.2, mu_pos[feat] - 0.4)
                v_pos = max(self._expected_linear_surplus(a, mu_pos, linear_rate) for a in pub.candidate_actions)

                # Hypothetical posterior given y = -1 (user is inflexible)
                mu_neg = mu.copy()
                mu_neg[feat] = mu_neg[feat] + 0.6
                v_neg = max(self._expected_linear_surplus(a, mu_neg, linear_rate) for a in pub.candidate_actions)

                # Expected posterior value assuming 50/50 prior response probability
                evsi_linear = 0.5 * v_pos + 0.5 * v_neg - v0

                if evsi_linear > best_evsi:
                    best_evsi = evsi_linear
                    best_q = q

            # Stopping condition: EVSI must exceed query cost
            if best_q is None or best_evsi <= self.cost_ask_paise:
                break

            # Execute query
            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(best_q.feature_index)

            if obs.is_fatigue_dropout:
                break

            if obs.response_value == 1:
                mu[best_q.feature_index] = max(0.2, mu[best_q.feature_index] - 0.4)
            elif obs.response_value == -1:
                mu[best_q.feature_index] = mu[best_q.feature_index] + 0.6

        # Pick action maximizing linear expected surplus
        best_action = max(
            pub.candidate_actions,
            key=lambda a: self._expected_linear_surplus(a, mu, linear_rate),
        )

        return DecisionResult(
            action=best_action,
            decision_type='recommend',
            questions_asked=asked_ids,
            metadata={'linear_rate_paise': linear_rate, 'posterior_mu': mu.tolist()},
        )
