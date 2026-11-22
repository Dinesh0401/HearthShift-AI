"""
Simulation Environment & Cohort Evaluation Engine
Manages synthetic household cohorts, stochastic energy realizations,
interaction protocols, and ex-post decision evaluation.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

from simulator.tariffs import TariffPlan, calculate_bill
from simulator.appliances import EnergyAction
from simulator.household import SyntheticHousehold, CandidateQuestion
from simulator.feedback import UserFeedbackModel, FeedbackObservation


@dataclass(frozen=True)
class HouseholdPublicView:
    """Public read-only view of household. Ground truth _theta_star is strictly isolated."""
    household_id: str
    baseline_kwh: float
    candidate_actions: List[EnergyAction]
    candidate_questions: List[CandidateQuestion]


@dataclass(frozen=True)
class EvaluationRecord:
    household_id: str
    baseline_kwh: float
    realized_kwh: float
    chosen_action_id: str
    is_abstention: bool
    queries_asked: int
    true_action_loss_paise: float
    oracle_action_id: str
    oracle_loss_paise: float
    status_quo_loss_paise: float
    absolute_regret_paise: float
    normalized_regret: float
    monetary_savings_paise: float
    discomfort_score: float
    discomfort_paise: float
    is_comfort_violated: bool
    user_accepted: bool
    fatigued_out: bool


@dataclass
class TrialSummary:
    advisor_name: str
    n_households: int
    mean_normalized_regret: float
    mean_absolute_regret_paise: float
    mean_monetary_savings_inr: float
    mean_queries_asked: float
    recommendation_acceptance_rate: float
    comfort_violation_rate: float
    abstention_rate: float
    cliff_avoidance_success_rate: float
    records: List[EvaluationRecord] = field(default_factory=list)


class SimulationEnvironment:
    """
    Simulation Environment orchestrating interaction between Advisors and Households.
    Enforces the privacy barrier: Advisors CANNOT access _theta_star.
    """
    def __init__(
        self,
        cohort: List[SyntheticHousehold],
        tariff: TariffPlan,
        feedback_model: Optional[UserFeedbackModel] = None,
        weather_jitter_std: float = 12.0,  # kWh jitter around baseline
        discomfort_max_threshold: float = 2.5,
        rng: Optional[np.random.Generator] = None,
    ):
        self.cohort = cohort
        self.tariff = tariff
        self.feedback_model = feedback_model or UserFeedbackModel()
        self.weather_jitter_std = weather_jitter_std
        self.discomfort_max_threshold = discomfort_max_threshold
        self.rng = rng or np.random.default_rng(42)

        # Internal tracking per household: household_id -> total queries asked
        self._query_counts: Dict[str, int] = {hh.household_id: 0 for hh in cohort}
        self._asked_question_ids: Dict[str, List[str]] = {hh.household_id: [] for hh in cohort}

    def get_public_view(self, household: SyntheticHousehold) -> HouseholdPublicView:
        """Returns safe public view of household without private parameters."""
        return HouseholdPublicView(
            household_id=household.household_id,
            baseline_kwh=household.baseline_kwh,
            candidate_actions=household.candidate_actions,
            candidate_questions=household.candidate_questions,
        )

    def ask_question(
        self,
        household: SyntheticHousehold,
        question: CandidateQuestion,
    ) -> FeedbackObservation:
        """
        Interactive query endpoint.
        Calls the stochastic feedback model with fatigue tracking.
        """
        hid = household.household_id
        current_queries = self._query_counts[hid]
        observation = self.feedback_model.receive_query(household, question, current_queries)
        self._query_counts[hid] = current_queries + 1
        self._asked_question_ids[hid].append(question.id)
        return observation

    def evaluate_decision(
        self,
        household: SyntheticHousehold,
        chosen_action: EnergyAction,
        is_abstention: bool = False,
    ) -> EvaluationRecord:
        """
        Ex-post true evaluation using hidden ground truth _theta_star.
        Called STRICTLY by the evaluation harness after advisor decision is final.
        """
        hid = household.household_id
        queries_asked = self._query_counts[hid]

        # Realize stochastic consumption: E = baseline + weather jitter
        jitter = float(self.rng.normal(0, self.weather_jitter_std))
        realized_kwh = max(10.0, household.baseline_kwh + jitter)

        # 1. Evaluate Chosen Action True Loss
        if is_abstention or chosen_action.id == 'null_action':
            effective_action = next(a for a in household.candidate_actions if a.id == 'null_action')
            chosen_loss = household.evaluate_true_loss(effective_action, realized_kwh, self.tariff)
            monetary_savings = 0.0
            discomfort_score = 0.0
            discomfort_paise = 0.0
            is_comfort_violated = False
            user_accepted = True  # Status quo is inherently accepted
            fatigued_out = False
        else:
            effective_action = chosen_action
            chosen_loss = household.evaluate_true_loss(effective_action, realized_kwh, self.tariff)
            
            # Monetary bill savings: Bill(E) - Bill(E - deltaE)
            bill_sq = calculate_bill(realized_kwh, self.tariff).net_payable_paise
            bill_act = calculate_bill(max(0.0, realized_kwh - effective_action.delta_kwh), self.tariff).net_payable_paise
            monetary_savings = float(bill_sq - bill_act)

            discomfort_score = float(np.dot(household._theta_star, effective_action.feature_vector))
            discomfort_paise = household.lambda_discomfort_paise * discomfort_score
            is_comfort_violated = discomfort_score > self.discomfort_max_threshold

            # Evaluate user acceptance feedback
            feedback = self.feedback_model.evaluate_recommendation(
                household, effective_action, realized_kwh, self.tariff
            )
            user_accepted = (feedback.response_value == 1)
            fatigued_out = feedback.is_fatigue_dropout

        # 2. Evaluate Status Quo (Null Action) Loss
        null_action = next(a for a in household.candidate_actions if a.id == 'null_action')
        sq_loss = household.evaluate_true_loss(null_action, realized_kwh, self.tariff)

        # 3. Evaluate Full-Information Oracle Action Loss
        best_oracle_action = null_action
        best_oracle_loss = sq_loss
        for cand in household.candidate_actions:
            loss = household.evaluate_true_loss(cand, realized_kwh, self.tariff)
            if loss < best_oracle_loss:
                best_oracle_loss = loss
                best_oracle_action = cand

        # 4. Regret Calculations
        abs_regret = max(0.0, chosen_loss - best_oracle_loss)
        max_possible_regret = max(1e-6, sq_loss - best_oracle_loss)
        normalized_regret = min(1.0, abs_regret / max_possible_regret) if max_possible_regret > 1e-6 else 0.0

        return EvaluationRecord(
            household_id=hid,
            baseline_kwh=household.baseline_kwh,
            realized_kwh=realized_kwh,
            chosen_action_id=effective_action.id,
            is_abstention=is_abstention,
            queries_asked=queries_asked,
            true_action_loss_paise=chosen_loss,
            oracle_action_id=best_oracle_action.id,
            oracle_loss_paise=best_oracle_loss,
            status_quo_loss_paise=sq_loss,
            absolute_regret_paise=abs_regret,
            normalized_regret=normalized_regret,
            monetary_savings_paise=monetary_savings,
            discomfort_score=discomfort_score,
            discomfort_paise=discomfort_paise,
            is_comfort_violated=is_comfort_violated,
            user_accepted=user_accepted,
            fatigued_out=fatigued_out,
        )

    def run_advisor_trial(
        self,
        advisor: Any,  # BaseAdvisor
    ) -> TrialSummary:
        """Runs the advisor over all households in the cohort and aggregates metrics."""
        records: List[EvaluationRecord] = []
        for hh in self.cohort:
            # Advisor decides using the public view and environment query interface
            result = advisor.decide(self, hh, self.tariff)
            record = self.evaluate_decision(
                household=hh,
                chosen_action=result.action,
                is_abstention=(result.decision_type == 'abstain'),
            )
            records.append(record)

        # Compute aggregate metrics
        n = len(records)
        mean_norm_regret = float(np.mean([r.normalized_regret for r in records]))
        mean_abs_regret = float(np.mean([r.absolute_regret_paise for r in records]))
        mean_savings_inr = float(np.mean([r.monetary_savings_paise / 100.0 for r in records]))
        mean_queries = float(np.mean([r.queries_asked for r in records]))
        
        non_null_recs = [r for r in records if r.chosen_action_id != 'null_action' and not r.is_abstention]
        rar = float(np.mean([1.0 if r.user_accepted else 0.0 for r in non_null_recs])) if non_null_recs else 1.0
        cvr = float(np.mean([1.0 if r.is_comfort_violated else 0.0 for r in records]))
        abstention_rate = float(np.mean([1.0 if r.is_abstention else 0.0 for r in records]))

        # Cliff Avoidance Success Rate: for households starting in [490, 520] kWh,
        # what fraction ended up <= 500 kWh with their action?
        cliff_households = [r for r in records if 490.0 <= r.realized_kwh <= 520.0]
        hh_by_id = {hh.household_id: hh for hh in self.cohort}
        if cliff_households:
            avoided = 0
            for r in cliff_households:
                hh = hh_by_id.get(r.household_id)
                cand = next((a for a in hh.candidate_actions if a.id == r.chosen_action_id), None) if hh else None
                delta = cand.delta_kwh if cand else 0.0
                if (r.realized_kwh - delta) <= 500.0:
                    avoided += 1
            casr = avoided / len(cliff_households)
        else:
            casr = 1.0

        return TrialSummary(
            advisor_name=advisor.name,
            n_households=n,
            mean_normalized_regret=mean_norm_regret,
            mean_absolute_regret_paise=mean_abs_regret,
            mean_monetary_savings_inr=mean_savings_inr,
            mean_queries_asked=mean_queries,
            recommendation_acceptance_rate=rar,
            comfort_violation_rate=cvr,
            abstention_rate=abstention_rate,
            cliff_avoidance_success_rate=casr,
            records=records,
        )
