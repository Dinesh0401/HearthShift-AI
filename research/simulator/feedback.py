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
    - Survey fatigue (dropout probability increases with query count)
    - Preference drift over time
    """
    def __init__(
        self,
        rationality_gamma: float = 0.002,  # inverse temperature over paise
        base_dropout_prob: float = 0.05,
        dropout_escalation_per_query: float = 0.15,
        drift_rate_std: float = 0.05,
        rng: Optional[np.random.Generator] = None,
    ):
        self.gamma = rationality_gamma
        self.base_dropout_prob = base_dropout_prob
        self.dropout_escalation = dropout_escalation_per_query
        self.drift_rate_std = drift_rate_std
        self.rng = rng or np.random.default_rng()

    def receive_query(
        self,
        household: SyntheticHousehold,
        question: CandidateQuestion,
        total_queries_asked: int,
    ) -> FeedbackObservation:
        """Simulates household response to an active query."""
        p_dropout = min(0.9, self.base_dropout_prob + total_queries_asked * self.dropout_escalation)
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
            return FeedbackObservation('null_action', 'recommendation_outcome', 0)

        # Net perceived benefit in paise
        bill_status_quo = calculate_bill(realized_kwh, tariff).net_payable_paise
        bill_with_action = calculate_bill(realized_kwh - action.delta_kwh, tariff).net_payable_paise
        monetary_savings = bill_status_quo - bill_with_action

        discomfort_paise = household.lambda_discomfort_paise * float(
            np.dot(household._theta_star, action.feature_vector)
        )
        net_surplus_paise = monetary_savings - discomfort_paise

        # Logistic probability of acceptance: P(accept) = 1 / (1 + exp(-gamma * surplus))
        p_accept = 1.0 / (1.0 + np.exp(-np.clip(self.gamma * net_surplus_paise, -20.0, 20.0)))
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
