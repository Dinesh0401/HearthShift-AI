"""
Baseline B8: Risk-Sensitive Optimization without Active Questioning
Zero queries (K=0). Employs conservative lower bound Q_alpha(U(a)) and chance-constrained
comfort safety to prevent harmful recommendations without asking questions.
"""

from __future__ import annotations
from typing import Any
import numpy as np

from baselines.base import BaseAdvisor, DecisionResult
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold


class RiskSensitivePassiveAdvisor(BaseAdvisor):
    def __init__(
        self,
        alpha_quantile: float = 0.05,  # 95% conservative lower bound (z ~ 1.645)
        c_min_paise: float = 3000.0,   # Minimum noticeable benefit: ₹30.00
        lambda_discomfort_paise: float = 20000.0,
        d_max_conservative: float = 1.8,
    ):
        super().__init__('B8_RiskPassive')
        self.z_alpha = 1.645
        self.c_min_paise = c_min_paise
        self.lambda_discomfort_paise = lambda_discomfort_paise
        self.d_max_conservative = d_max_conservative

    def decide(
        self,
        env: Any,
        household: SyntheticHousehold,
        tariff: TariffPlan,
    ) -> DecisionResult:
        pub = env.get_public_view(household)
        baseline = pub.baseline_kwh

        # Prior distribution over theta: mean = 1.0, std = 0.4
        mu = np.array([1.0, 1.0, 1.0, 1.0])
        sigma = np.array([0.4, 0.4, 0.4, 0.3])

        null_action = next(a for a in pub.candidate_actions if a.id == 'null_action')
        bill_sq = calculate_bill(baseline, tariff).net_payable_paise

        best_action = null_action
        best_lower_bound = 0.0

        for a in pub.candidate_actions:
            if a.is_shift() or a.id == 'null_action':
                continue

            # 1. Chance-constrained comfort check: P(D > D_max) <= 0.05
            expected_d = float(np.dot(mu, a.feature_vector))
            std_d = float(np.sqrt(np.dot(sigma**2, a.feature_vector**2)))
            upper_d = expected_d + self.z_alpha * std_d
            if upper_d > self.d_max_conservative:
                continue  # Reject unsafe action

            # 2. Conservative lower bound on welfare
            post_kwh = max(0.0, baseline - a.delta_kwh)
            savings = bill_sq - calculate_bill(post_kwh, tariff).net_payable_paise

            expected_discomfort_paise = self.lambda_discomfort_paise * expected_d
            std_discomfort_paise = self.lambda_discomfort_paise * std_d

            expected_welfare = savings - expected_discomfort_paise
            q_alpha_welfare = expected_welfare - self.z_alpha * std_discomfort_paise

            # Must satisfy minimum threshold
            if q_alpha_welfare > self.c_min_paise and q_alpha_welfare > best_lower_bound:
                best_lower_bound = q_alpha_welfare
                best_action = a

        decision_type = 'abstain' if best_action.id == 'null_action' else 'recommend'

        return DecisionResult(
            action=best_action,
            decision_type=decision_type,
            questions_asked=[],
            metadata={'q_alpha_welfare_paise': best_lower_bound},
        )
