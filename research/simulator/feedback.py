"""
Stochastic User Feedback Model with Fatigue and Preference Drift
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
import numpy as np
from simulator.appliances import EnergyAction
from simulator.tariffs import TariffPlan, calculate_bill
from simulator.household import SyntheticHousehold, CandidateQuestion


@dataclass(frozen=True)
class FeedbackObservation:
    action_or_question_id: str
    kind: str  # 'question_response' or 'recommendation_outcome'
    response_value: int  # +1 (accepted/yes), -1 (rejected/no), 0 (indifferent)
    is_fatigue_dropout: bool = False


class UserFeedbackModel:
    """
    Simulates probabilistic household interaction dynamics:
    - Bounded rationality link function for proposal acceptance
    - Hard comfort constraint rejection
    - Survey fatigue (dropout probability increases with query count)
    - Preference drift over time
    """
    def __init__(
        self,
        rationality_gamma: float = 0.0002,  # calibrated inverse temperature over paise (0.02 / INR)
        base_dropout_prob: float = 0.04,
        dropout_escalation_per_query: float = 0.12,
        switching_cost_paise: float = 3000.0,  # ₹30.00 friction for adopting an energy action
        drift_rate_std: float = 0.05,
        rng: Optional[np.random.Generator] = None,
    ):
        self.gamma = rationality_gamma
        self.base_dropout_prob = base_dropout_prob
        self.dropout_escalation = dropout_escalation_per_query
        self.switching_cost_paise = switching_cost_paise
        self.drift_rate_std = drift_rate_std
        self.rng = rng or np.random.default_rng()

    def receive_query(
        self,
        household: SyntheticHousehold,
        question: CandidateQuestion,
        total_queries_asked: int,
    ) -> FeedbackObservation:
        """Simulates household response to an active query with fatigue."""
        # Archetype-dependent fatigue
        base_p = 0.20 if household.archetype == 'noisy_unresponsive' else self.base_dropout_prob
        escalation = 0.25 if household.archetype == 'noisy_unresponsive' else self.dropout_escalation
        p_dropout = min(0.95, base_p + total_queries_asked * escalation)

        if self.rng.random() < p_dropout:
            return FeedbackObservation(
                action_or_question_id=question.id,
                kind='question_response',
                response_value=0,
                is_fatigue_dropout=True,
            )

        resp = household.sample_question_response(question)
        return FeedbackObservation(
            action_or_question_id=question.id,
            kind='question_response',
            response_value=resp,
            is_fatigue_dropout=False,
        )

    def evaluate_recommendation(
        self,
        household: SyntheticHousehold,
        action: EnergyAction,
        realized_kwh: float,
        tariff: TariffPlan,
    ) -> FeedbackObservation:
        """Simulates household decision to accept or reject an energy action."""
        if action.id == 'null_action':
            return FeedbackObservation('null_action', 'recommendation_outcome', 1)

        # 1. Hard constraint check: if action violates maximum tolerable discomfort, strict rejection!
        discomfort_score = float(np.dot(household._theta_star, action.feature_vector))
        if discomfort_score > household.d_max:
            return FeedbackObservation(
                action_or_question_id=action.id,
                kind='recommendation_outcome',
                response_value=-1,
            )

        # 2. Net perceived welfare in paise
        bill_status_quo = calculate_bill(realized_kwh, tariff).net_payable_paise
        bill_with_action = calculate_bill(max(0.0, realized_kwh - action.delta_kwh), tariff).net_payable_paise
        monetary_savings = bill_status_quo - bill_with_action

        discomfort_paise = household.lambda_discomfort_paise * discomfort_score
        net_welfare_paise = monetary_savings - discomfort_paise

        # 3. Logistic probability of acceptance with switching friction
        net_surplus = net_welfare_paise - self.switching_cost_paise
        p_accept = 1.0 / (1.0 + np.exp(-np.clip(self.gamma * net_surplus, -15.0, 15.0)))
        accepted = self.rng.random() < p_accept

        return FeedbackObservation(
            action_or_question_id=action.id,
            kind='recommendation_outcome',
            response_value=1 if accepted else -1,
        )

    def step_preference_drift(self, household: SyntheticHousehold):
        """Simulates seasonal non-stationarity / preference drift."""
        noise = self.rng.normal(0, self.drift_rate_std, size=household._theta_star.shape)
        # Preferences remain positive
        household._theta_star = np.clip(household._theta_star + noise, 0.1, 5.0)
