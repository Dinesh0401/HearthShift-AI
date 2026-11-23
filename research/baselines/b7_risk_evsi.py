"""
Risk-Matched Baselines for Fair Pareto Evaluation:
1. B7-Risk (RiskExactEVSIAdvisor): Active EVSI with comfort chance constraint P(D > D_max) <= delta.
2. B7-Risk-Abstain (RiskAbstainExactEVSIAdvisor): Active EVSI with both chance constraint and conservative lower bound Q_alpha > c_min.
"""

from __future__ import annotations
from typing import Any, List, Set, Tuple, Optional
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


class RiskExactEVSIAdvisor(BaseAdvisor):
    """
    Baseline B7-Risk: Exact EVSI with Chance-Constrained Comfort Safety.
    Questions up to max_queries to reduce preference uncertainty.
    Restricts candidate actions to those satisfying P(D(a, theta) > D_max) <= delta.
    Does NOT require a conservative monetary lower bound (unlike TR-VOI).
    """
    def __init__(
        self,
        name: str = 'B7_RiskEVSI',
        max_queries: int = 3,
        cost_ask_paise: float = 200.0,
        lambda_discomfort_paise: float = 20000.0,
        d_max_nominal: float = 1.0,
        z_alpha: float = 1.645,
        enforce_privacy_cost: bool = True,
    ):
        super().__init__(name)
        self.max_queries = max_queries
        self.cost_ask_paise = cost_ask_paise
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.d_max_nominal = d_max_nominal
        self.z_alpha = z_alpha
        self.enforce_privacy_cost = enforce_privacy_cost

    def _evaluate_action(
        self,
        action: EnergyAction,
        baseline_kwh: float,
        mu: np.ndarray,
        sigma: np.ndarray,
        tariff: TariffPlan,
    ) -> Tuple[float, bool]:
        if action.is_shift() or action.id == 'null_action':
            return 0.0, True

        # 1. Chance constraint
        exp_d = float(np.dot(mu, action.feature_vector))
        std_d = float(np.sqrt(np.dot(sigma**2, action.feature_vector**2)))
        upper_d = exp_d + self.z_alpha * std_d
        if upper_d > self.d_max_nominal:
            return -float('inf'), False

        # 2. Exact point-estimate welfare
        post_kwh = max(0.0, baseline_kwh - action.delta_kwh)
        bill_sq = calculate_bill(baseline_kwh, tariff).net_payable_paise
        bill_post = calculate_bill(post_kwh, tariff).net_payable_paise
        savings = bill_sq - bill_post
        discomfort = self.lambda_discomfort_paise * exp_d

        return float(savings - discomfort), True

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        mu = np.array([1.0, 1.0, 1.0, 1.0])
        sigma = np.array([0.4, 0.4, 0.4, 0.3])

        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            safe_v0 = [self._evaluate_action(a, baseline, mu, sigma, tariff) for a in pub.candidate_actions]
            v0 = max(0.0, max(w for w, safe in safe_v0 if safe))

            available_questions = [
                q for q in pub.candidate_questions
                if q.id not in asked_ids and q.feature_index not in asked_feature_indices
            ]
            if not available_questions:
                break

            best_q: Optional[CandidateQuestion] = None
            best_net_evsi = -1.0

            for q in available_questions:
                feat = q.feature_index

                # Branch y = +1
                mu_pos = mu.copy()
                mu_pos[feat] = max(0.2, mu_pos[feat] - 0.4)
                sigma_pos = sigma.copy()
                sigma_pos[feat] *= 0.5
                safe_pos = [self._evaluate_action(a, baseline, mu_pos, sigma_pos, tariff) for a in pub.candidate_actions]
                v_pos = max(0.0, max(w for w, safe in safe_pos if safe))

                # Branch y = -1
                mu_neg = mu.copy()
                mu_neg[feat] = mu_neg[feat] + 0.6
                sigma_neg = sigma.copy()
                sigma_neg[feat] *= 0.5
                safe_neg = [self._evaluate_action(a, baseline, mu_neg, sigma_neg, tariff) for a in pub.candidate_actions]
                v_neg = max(0.0, max(w for w, safe in safe_neg if safe))

                evsi = 0.5 * v_pos + 0.5 * v_neg - v0
                query_cost = self.cost_ask_paise + (q.privacy_cost_paise if self.enforce_privacy_cost else 0.0)
                net_evsi = evsi - query_cost

                if net_evsi > best_net_evsi:
                    best_net_evsi = net_evsi
                    best_q = q

            if best_q is None or best_net_evsi <= 0.0:
                break

            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(best_q.feature_index)

            if obs.is_fatigue_dropout:
                break

            if obs.response_value == 1:
                mu[best_q.feature_index] = max(0.2, mu[best_q.feature_index] - 0.4)
                sigma[best_q.feature_index] *= 0.5
            elif obs.response_value == -1:
                mu[best_q.feature_index] = mu[best_q.feature_index] + 0.6
                sigma[best_q.feature_index] *= 0.5

        # Decision
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        best_action = null_action
        best_welfare = 0.0

        for a in pub.candidate_actions:
            welfare, safe = self._evaluate_action(a, baseline, mu, sigma, tariff)
            if safe and welfare > 0.0 and welfare > best_welfare:
                best_welfare = welfare
                best_action = a

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=asked_ids,
            metadata={'expected_welfare_paise': best_welfare},
        )


class RiskAbstainExactEVSIAdvisor(RiskExactEVSIAdvisor):
    """
    Baseline B7-Risk-Abstain: Exact EVSI with Chance Constraints AND Minimum Conservative Lower Bound.
    Identical to TR-VOI except for: evaluates at point-estimate baseline instead of integrating over P(X).
    Isolates the EXACT pure value of threshold-aware uncertainty integration.
    """
    def __init__(
        self,
        name: str = 'B7_RiskAbstainEVSI',
        max_queries: int = 3,
        c_min_paise: float = 3000.0,  # ₹30.00
        cost_ask_paise: float = 200.0,
        lambda_discomfort_paise: float = 20000.0,
        d_max_nominal: float = 1.0,
        z_alpha: float = 1.645,
        enforce_privacy_cost: bool = True,
    ):
        super().__init__(
            name=name,
            max_queries=max_queries,
            cost_ask_paise=cost_ask_paise,
            lambda_discomfort_paise=lambda_discomfort_paise,
            d_max_nominal=d_max_nominal,
            z_alpha=z_alpha,
            enforce_privacy_cost=enforce_privacy_cost,
        )
        self.c_min_paise = c_min_paise

    def _evaluate_action_with_lower_bound(
        self,
        action: EnergyAction,
        baseline_kwh: float,
        mu: np.ndarray,
        sigma: np.ndarray,
        tariff: TariffPlan,
    ) -> Tuple[float, float, bool]:
        if action.is_shift() or action.id == 'null_action':
            return 0.0, 0.0, True

        exp_d = float(np.dot(mu, action.feature_vector))
        std_d = float(np.sqrt(np.dot(sigma**2, action.feature_vector**2)))
        upper_d = exp_d + self.z_alpha * std_d
        if upper_d > self.d_max_nominal:
            return -float('inf'), -float('inf'), False

        post_kwh = max(0.0, baseline_kwh - action.delta_kwh)
        bill_sq = calculate_bill(baseline_kwh, tariff).net_payable_paise
        bill_post = calculate_bill(post_kwh, tariff).net_payable_paise
        savings = bill_sq - bill_post

        exp_discomfort = self.lambda_discomfort_paise * exp_d
        std_discomfort = self.lambda_discomfort_paise * std_d

        exp_welfare = savings - exp_discomfort
        # Conservative lower bound without tariff uncertainty (sigma_sav = 0)
        q_alpha = exp_welfare - self.z_alpha * std_discomfort

        return exp_welfare, q_alpha, True

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        mu = np.array([1.0, 1.0, 1.0, 1.0])
        sigma = np.array([0.4, 0.4, 0.4, 0.3])

        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        for _ in range(self.max_queries):
            safe_v0 = [self._evaluate_action_with_lower_bound(a, baseline, mu, sigma, tariff) for a in pub.candidate_actions]
            v0 = max(0.0, max(q for _, q, safe in safe_v0 if safe))

            available_questions = [
                q for q in pub.candidate_questions
                if q.id not in asked_ids and q.feature_index not in asked_feature_indices
            ]
            if not available_questions:
                break

            best_q: Optional[CandidateQuestion] = None
            best_net_evsi = -1.0

            for q in available_questions:
                feat = q.feature_index

                mu_pos = mu.copy()
                mu_pos[feat] = max(0.2, mu_pos[feat] - 0.4)
                sigma_pos = sigma.copy()
                sigma_pos[feat] *= 0.5
                safe_pos = [self._evaluate_action_with_lower_bound(a, baseline, mu_pos, sigma_pos, tariff) for a in pub.candidate_actions]
                v_pos = max(0.0, max(q_val for _, q_val, safe in safe_pos if safe))

                mu_neg = mu.copy()
                mu_neg[feat] = mu_neg[feat] + 0.6
                sigma_neg = sigma.copy()
                sigma_neg[feat] *= 0.5
                safe_neg = [self._evaluate_action_with_lower_bound(a, baseline, mu_neg, sigma_neg, tariff) for a in pub.candidate_actions]
                v_neg = max(0.0, max(q_val for _, q_val, safe in safe_neg if safe))

                evsi = 0.5 * v_pos + 0.5 * v_neg - v0
                query_cost = self.cost_ask_paise + (q.privacy_cost_paise if self.enforce_privacy_cost else 0.0)
                net_evsi = evsi - query_cost

                if net_evsi > best_net_evsi:
                    best_net_evsi = net_evsi
                    best_q = q

            if best_q is None or best_net_evsi <= 0.0:
                break

            obs = env.ask_question(household, best_q)
            asked_ids.append(best_q.id)
            asked_feature_indices.add(best_q.feature_index)

            if obs.is_fatigue_dropout:
                break

            if obs.response_value == 1:
                mu[best_q.feature_index] = max(0.2, mu[best_q.feature_index] - 0.4)
                sigma[best_q.feature_index] *= 0.5
            elif obs.response_value == -1:
                mu[best_q.feature_index] = mu[best_q.feature_index] + 0.6
                sigma[best_q.feature_index] *= 0.5

        # Final decision requires Q_alpha > c_min
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        best_action = null_action
        best_metric = 0.0

        for a in pub.candidate_actions:
            if a.is_shift() or a.id == 'null_action':
                continue
            exp_w, q_alpha, safe = self._evaluate_action_with_lower_bound(a, baseline, mu, sigma, tariff)
            if safe and q_alpha > self.c_min_paise and q_alpha > best_metric:
                best_metric = q_alpha
                best_action = a

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=asked_ids,
            metadata={'q_alpha_paise': best_metric},
        )
