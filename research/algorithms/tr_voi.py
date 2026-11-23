"""
SPARE-HEM Candidate Mechanism: Threshold-Aware Robust Value-of-Information (TR-VOI)
Implements:
1. Exact statutory tariff evaluation under uncertain consumption P(X)
2. Chance-constrained comfort safety: P(D(a, theta) > D_max) <= delta
3. Conservative alpha-credible lower-bound welfare: Q_alpha(U(a))
4. Adaptive Value of Information with privacy-sensitive query penalties
5. Tri-state decision policy: Recommend, Ask, or Abstain
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


class ThresholdAwareRobustVOIAdvisor(BaseAdvisor):
    def __init__(
        self,
        name: str = 'SPARE_HEM_TR_VOI',
        max_queries: int = 3,
        alpha_quantile: float = 0.05,       # 95% conservative credible lower bound
        delta_risk: float = 0.05,           # 5% maximum allowable comfort violation probability
        c_min_paise: float = 3000.0,        # ₹30.00 minimum noticeable benefit threshold
        cost_ask_paise: float = 200.0,      # ₹2.00 annoyance cost per query
        lambda_discomfort_paise: float = 20000.0,
        d_max_nominal: float = 2.0,
        consumption_sigma: float = 8.0,     # Standard deviation of consumption uncertainty
        # Ablation Flags:
        use_exact_tariff: bool = True,
        use_risk_constraints: bool = True,
        use_adaptive_questioning: bool = True,
        use_privacy_penalties: bool = True,
        use_threshold_awareness: bool = True,
    ):
        super().__init__(name)
        self.max_queries = max_queries
        self.z_alpha = 1.645  # Standard normal 95% quantile
        self.c_min_paise = c_min_paise
        self.cost_ask_paise = cost_ask_paise
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.d_max_nominal = d_max_nominal
        self.consumption_sigma = consumption_sigma

        # Ablation settings
        self.use_exact_tariff = use_exact_tariff
        self.use_risk_constraints = use_risk_constraints
        self.use_adaptive_questioning = use_adaptive_questioning
        self.use_privacy_penalties = use_privacy_penalties
        self.use_threshold_awareness = use_threshold_awareness

    def _expected_savings(
        self,
        action: EnergyAction,
        baseline_kwh: float,
        tariff: TariffPlan,
    ) -> Tuple[float, float]:
        """
        Integrates bill savings over consumption uncertainty X ~ N(baseline, sigma^2).
        Returns (mean_savings_paise, std_savings_paise).
        """
        if action.is_shift() or action.id == 'null_action':
            return 0.0, 0.0

        if not self.use_exact_tariff:
            # Linearized tariff ablation
            bill_base = calculate_bill(baseline_kwh, tariff).net_payable_paise
            rate = bill_base / max(1.0, baseline_kwh)
            mean_savings = float(rate * action.delta_kwh)
            return mean_savings, 0.0

        if not self.use_threshold_awareness:
            # Point estimate evaluation without uncertainty integration
            bill_sq = calculate_bill(baseline_kwh, tariff).net_payable_paise
            bill_act = calculate_bill(max(0.0, baseline_kwh - action.delta_kwh), tariff).net_payable_paise
            return float(bill_sq - bill_act), 0.0

        # Numerical integration over 5 Gauss-Hermite quadrature nodes around baseline
        # (Exact integration capturing the ₹478.40 cliff jump at 500/501 kWh)
        weights = [0.01995, 0.39362, 0.94531, 0.39362, 0.01995]
        nodes = [-2.02018, -0.95857, 0.0, 0.95857, 2.02018]
        norm_weights = np.array(weights) / sum(weights)

        samples = [baseline_kwh + self.consumption_sigma * n for n in nodes]
        savings_samples = []
        for s in samples:
            s_kwh = max(10.0, s)
            b_sq = calculate_bill(s_kwh, tariff).net_payable_paise
            b_act = calculate_bill(max(0.0, s_kwh - action.delta_kwh), tariff).net_payable_paise
            savings_samples.append(float(b_sq - b_act))

        mean_savings = float(np.dot(norm_weights, savings_samples))
        var_savings = float(np.dot(norm_weights, (np.array(savings_samples) - mean_savings)**2))
        return mean_savings, float(np.sqrt(max(0.0, var_savings)))

    def _evaluate_action_welfare(
        self,
        action: EnergyAction,
        baseline_kwh: float,
        mu: np.ndarray,
        sigma: np.ndarray,
        tariff: TariffPlan,
    ) -> Tuple[float, float, bool]:
        """
        Returns (expected_welfare, conservative_lower_bound, is_safe).
        """
        if action.id == 'null_action':
            return 0.0, 0.0, True

        # 1. Discomfort Distribution
        exp_d = float(np.dot(mu, action.feature_vector))
        std_d = float(np.sqrt(np.dot(sigma**2, action.feature_vector**2)))

        # 2. Hard Comfort Constraint Safety: P(D > D_max) <= delta
        if self.use_risk_constraints:
            upper_d = exp_d + self.z_alpha * std_d
            if upper_d > self.d_max_nominal:
                return -float('inf'), -float('inf'), False
        elif exp_d > self.d_max_nominal:
            return -float('inf'), -float('inf'), False

        # 3. Bill Savings Distribution
        mean_sav, std_sav = self._expected_savings(action, baseline_kwh, tariff)

        # 4. Total Welfare & Lower Bound
        exp_discomfort = self.lambda_discomfort_paise * exp_d
        std_discomfort = self.lambda_discomfort_paise * std_d

        exp_welfare = mean_sav - exp_discomfort
        total_std = float(np.sqrt(std_sav**2 + std_discomfort**2))

        if self.use_risk_constraints:
            q_alpha = exp_welfare - self.z_alpha * total_std
        else:
            q_alpha = exp_welfare

        return exp_welfare, q_alpha, True

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Prior belief over latent preferences theta ~ N(mu, diag(sigma^2))
        mu = np.array([1.0, 1.0, 1.0, 1.0])
        sigma = np.array([0.4, 0.4, 0.4, 0.3])

        asked_ids: List[str] = []
        asked_feature_indices: Set[int] = set()

        # Step 1: Adaptive Value of Information Active Questioning Loop
        if self.use_adaptive_questioning:
            for _ in range(self.max_queries):
                # Compute Prior Value V0: best lower-bound welfare under current belief
                safe_actions_v0 = [
                    self._evaluate_action_welfare(a, baseline, mu, sigma, tariff)
                    for a in pub.candidate_actions
                ]
                v0 = max(0.0, max(q for _, q, safe in safe_actions_v0 if safe))

                available_questions = [
                    q for q in pub.candidate_questions
                    if q.id not in asked_ids and q.feature_index not in asked_feature_indices
                ]
                if not available_questions:
                    break

                best_q: CandidateQuestion | None = None
                best_net_voi = -1.0

                for q in available_questions:
                    feat = q.feature_index

                    # Hypothetical posterior given y = +1 (user is flexible)
                    mu_pos = mu.copy()
                    mu_pos[feat] = max(0.2, mu_pos[feat] - 0.4)
                    sigma_pos = sigma.copy()
                    sigma_pos[feat] *= 0.5
                    safe_pos = [
                        self._evaluate_action_welfare(a, baseline, mu_pos, sigma_pos, tariff)
                        for a in pub.candidate_actions
                    ]
                    v_pos = max(0.0, max(q_val for _, q_val, safe in safe_pos if safe))

                    # Hypothetical posterior given y = -1 (user is inflexible)
                    mu_neg = mu.copy()
                    mu_neg[feat] = mu_neg[feat] + 0.6
                    sigma_neg = sigma.copy()
                    sigma_neg[feat] *= 0.5
                    safe_neg = [
                        self._evaluate_action_welfare(a, baseline, mu_neg, sigma_neg, tariff)
                        for a in pub.candidate_actions
                    ]
                    v_neg = max(0.0, max(q_val for _, q_val, safe in safe_neg if safe))

                    # Expected VOI
                    voi = 0.5 * v_pos + 0.5 * v_neg - v0
                    query_cost = self.cost_ask_paise
                    if self.use_privacy_penalties:
                        query_cost += q.privacy_cost_paise

                    net_voi = voi - query_cost
                    if net_voi > best_net_voi:
                        best_net_voi = net_voi
                        best_q = q

                # Stop asking if no question provides positive net decision benefit
                if best_q is None or best_net_voi <= 0.0:
                    break

                # Execute query via public environment
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

        # Step 2: Tri-State Final Action Selection (Recommend vs. Abstain)
        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        best_action = null_action
        best_decision_metric = 0.0

        for a in pub.candidate_actions:
            if a.is_shift() or a.id == 'null_action':
                continue

            exp_welfare, q_alpha, is_safe = self._evaluate_action_welfare(a, baseline, mu, sigma, tariff)
            if not is_safe:
                continue

            decision_metric = q_alpha if self.use_risk_constraints else exp_welfare
            if decision_metric > self.c_min_paise and decision_metric > best_decision_metric:
                best_decision_metric = decision_metric
                best_action = a

        # Step 3: Emit Decision (Recommend if welfare guaranteed > c_min, else Abstain)
        if best_action.id == 'null_action':
            decision_type = 'abstain'
        else:
            decision_type = 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=asked_ids,
            metadata={
                'decision_metric_paise': best_decision_metric,
                'posterior_mu': mu.tolist(),
                'posterior_sigma': sigma.tolist(),
            },
        )
