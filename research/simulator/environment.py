"""
Simulation Environment & Cohort Evaluation Engine
Manages synthetic household cohorts, stochastic energy realizations,
interaction protocols, and ex-post decision evaluation with exact oracle optimality.
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
    archetype: str
    candidate_actions: List[EnergyAction]
    candidate_questions: List[CandidateQuestion]


@dataclass(frozen=True)
class EvaluationRecord:
    household_id: str
    archetype: str
    baseline_kwh: float
    realized_kwh: float
    chosen_action_id: str
    is_abstention: bool
    queries_asked: int
    true_action_welfare_paise: float
    oracle_action_id: str
    oracle_welfare_paise: float
    status_quo_welfare_paise: float
    absolute_regret_paise: float
    normalized_regret: float
    monetary_savings_paise: float
    discomfort_score: float
    discomfort_paise: float
    is_comfort_violated: bool
    is_abstention_optimal: bool
    user_accepted: bool
    fatigued_out: bool
    executed_action_id: str = 'null_action'


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
    abstention_precision: float
    cliff_avoidance_success_rate: float
    archetype_breakdown: Dict[str, Dict[str, float]] = field(default_factory=dict)
    records: List[EvaluationRecord] = field(default_factory=list)


class SimulationEnvironment:
    """
    Simulation Environment orchestrating interaction between Advisors and Households.
    Enforces the privacy barrier: Advisors CANNOT access _theta_star.
    Supports paired stochastic realizations across policies for identical seed conditions.
    """
    def __init__(
        self,
        cohort: List[SyntheticHousehold],
        tariff: TariffPlan,
        feedback_model: Optional[UserFeedbackModel] = None,
        weather_jitter_std: float = 8.0,  # Realistic kWh jitter around baseline
        rng: Optional[np.random.Generator] = None,
    ):
        self.cohort = cohort
        self.tariff = tariff
        self.weather_jitter_std = weather_jitter_std
        self.rng = rng or np.random.default_rng(42)
        self.feedback_model = feedback_model or UserFeedbackModel(rng=self.rng)

        # Internal tracking per household: household_id -> total queries asked
        self._query_counts: Dict[str, int] = {hh.household_id: 0 for hh in cohort}
        self._asked_question_ids: Dict[str, List[str]] = {hh.household_id: [] for hh in cohort}
        # Paired stochastic realizations across all evaluated advisors
        self._active_realizations: Dict[str, float] = {}

    def generate_paired_realizations(self) -> Dict[str, float]:
        """Pre-computes paired stochastic realized_kwh for all households in the cohort."""
        self._active_realizations = {
            hh.household_id: max(10.0, hh.baseline_kwh + float(self.rng.normal(0, self.weather_jitter_std)))
            for hh in self.cohort
        }
        return dict(self._active_realizations)

    def set_realizations(self, realizations: Dict[str, float]) -> None:
        """Sets external paired realizations (e.g. for multi-seed benchmarks)."""
        self._active_realizations = dict(realizations)

    def get_realized_kwh(self, household_id: str) -> float:
        """Endpoint for Ex-Post Oracle to access realization foresight."""
        if household_id not in self._active_realizations:
            hh = next(h for h in self.cohort if h.household_id == household_id)
            self._active_realizations[household_id] = max(
                10.0, hh.baseline_kwh + float(self.rng.normal(0, self.weather_jitter_std))
            )
        return self._active_realizations[household_id]

    def get_public_view(self, household: SyntheticHousehold) -> HouseholdPublicView:
        """Returns safe public view of household without private parameters."""
        return HouseholdPublicView(
            household_id=household.household_id,
            baseline_kwh=household.baseline_kwh,
            archetype=household.archetype,
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
        realized_kwh: Optional[float] = None,
    ) -> EvaluationRecord:
        """
        Ex-post true evaluation using hidden ground truth _theta_star and d_max.
        Called STRICTLY by the evaluation harness after advisor decision is final.
        """
        hid = household.household_id
        queries_asked = self._query_counts[hid]

        if realized_kwh is None:
            realized_kwh = self.get_realized_kwh(hid)

        # 1. Evaluate Full-Information Constrained Ex-Post Oracle
        # Oracle solves: max_{a in A_feas} U(a, realized_kwh, theta*)
        null_action = next(a for a in household.candidate_actions if a.id == 'null_action')
        best_oracle_action = null_action
        best_oracle_welfare = 0.0  # Status quo welfare is identically 0.0

        for cand in household.candidate_actions:
            welfare = household.evaluate_true_welfare(cand, realized_kwh, self.tariff)
            if welfare > best_oracle_welfare:
                best_oracle_welfare = welfare
                best_oracle_action = cand

        is_abstention_optimal = (best_oracle_action.id == 'null_action')

        # 2. Evaluate Chosen Action True Welfare & Household Rejection Gate
        effective_is_abstention = is_abstention or (chosen_action.id == 'null_action')

        if effective_is_abstention:
            proposed_action = null_action
            executed_action = null_action
            discomfort_score = 0.0
            discomfort_paise = 0.0
            monetary_savings = 0.0
            realized_welfare = 0.0
            is_attempted_comfort_violation = False
            user_accepted = True
            fatigued_out = False
        else:
            proposed_action = chosen_action
            discomfort_score = float(np.dot(household._theta_star, proposed_action.feature_vector))
            is_attempted_comfort_violation = (discomfort_score > household.d_max)

            # Bounded-rational acceptance gate:
            # If comfort is violated, UserFeedbackModel returns -1 (strict rejection).
            feedback = self.feedback_model.evaluate_recommendation(
                household, proposed_action, realized_kwh, self.tariff
            )
            user_accepted = (feedback.response_value == 1)
            fatigued_out = feedback.is_fatigue_dropout

            if user_accepted:
                # Recommendation adopted and executed by the household
                executed_action = proposed_action
                bill_sq = calculate_bill(realized_kwh, self.tariff).net_payable_paise
                bill_act = calculate_bill(max(0.0, realized_kwh - executed_action.delta_kwh), self.tariff).net_payable_paise
                monetary_savings = float(bill_sq - bill_act)
                discomfort_paise = household.lambda_discomfort_paise * discomfort_score
                realized_welfare = monetary_savings - discomfort_paise
            else:
                # Recommendation rejected (due to comfort violation or negative perceived surplus).
                # Household remains in status quo!
                executed_action = null_action
                monetary_savings = 0.0
                discomfort_paise = 0.0
                realized_welfare = 0.0

        # 3. Exact Decision Regret Calculations
        # When chosen action matches the oracle action, regret is bitwise exact zero
        if chosen_action.id == best_oracle_action.id:
            abs_regret = 0.0
            normalized_regret = 0.0
        else:
            abs_regret = max(0.0, best_oracle_welfare - realized_welfare)
            denom = max(100.0, best_oracle_welfare)
            normalized_regret = min(1.0, abs_regret / denom)

        return EvaluationRecord(
            household_id=hid,
            archetype=household.archetype,
            baseline_kwh=household.baseline_kwh,
            realized_kwh=realized_kwh,
            chosen_action_id=proposed_action.id,
            is_abstention=effective_is_abstention,
            queries_asked=queries_asked,
            true_action_welfare_paise=realized_welfare,
            oracle_action_id=best_oracle_action.id,
            oracle_welfare_paise=best_oracle_welfare,
            status_quo_welfare_paise=0.0,
            absolute_regret_paise=abs_regret,
            normalized_regret=normalized_regret,
            monetary_savings_paise=monetary_savings,
            discomfort_score=discomfort_score,
            discomfort_paise=discomfort_paise,
            is_comfort_violated=is_attempted_comfort_violation,
            is_abstention_optimal=is_abstention_optimal,
            user_accepted=user_accepted,
            fatigued_out=fatigued_out,
            executed_action_id=executed_action.id,
        )

    def run_advisor_trial(
        self,
        advisor: Any,  # BaseAdvisor
        realized_kwh_map: Optional[Dict[str, float]] = None,
    ) -> TrialSummary:
        """Runs the advisor over all households in the cohort and aggregates metrics."""
        # Reset query tracking at the start of each advisor trial!
        self._query_counts = {hh.household_id: 0 for hh in self.cohort}
        self._asked_question_ids = {hh.household_id: [] for hh in self.cohort}

        if realized_kwh_map is not None:
            self.set_realizations(realized_kwh_map)
        elif not self._active_realizations:
            self.generate_paired_realizations()

        records: List[EvaluationRecord] = []
        for hh in self.cohort:
            result = advisor.decide(self, hh, self.tariff)
            record = self.evaluate_decision(
                household=hh,
                chosen_action=result.action,
                is_abstention=(result.decision_type == 'abstain'),
                realized_kwh=self.get_realized_kwh(hh.household_id),
            )
            records.append(record)

        n = len(records)
        mean_norm_regret = float(np.mean([r.normalized_regret for r in records]))
        mean_abs_regret = float(np.mean([r.absolute_regret_paise for r in records]))
        mean_savings_inr = float(np.mean([r.monetary_savings_paise / 100.0 for r in records]))
        mean_queries = float(np.mean([r.queries_asked for r in records]))

        non_null_recs = [r for r in records if not r.is_abstention]
        rar = float(np.mean([1.0 if r.user_accepted else 0.0 for r in non_null_recs])) if non_null_recs else 1.0
        cvr = float(np.mean([1.0 if r.is_comfort_violated else 0.0 for r in records]))
        abstention_rate = float(np.mean([1.0 if r.is_abstention else 0.0 for r in records]))

        # Abstention Precision: fraction of abstentions where abstention was objectively optimal
        abstentions = [r for r in records if r.is_abstention]
        if abstentions:
            ap = float(np.mean([1.0 if r.is_abstention_optimal else 0.0 for r in abstentions]))
        else:
            ap = 1.0

        # Cliff Avoidance Success Rate:
        # Evaluated on households near cliff (490 <= X <= 520) where safe avoidance was actually feasible!
        cliff_records = [r for r in records if 490.0 <= r.realized_kwh <= 520.0]
        hh_by_id = {hh.household_id: hh for hh in self.cohort}
        feasible_cliff_avoidance = 0
        successful_cliff_avoidance = 0

        for r in cliff_records:
            hh = hh_by_id.get(r.household_id)
            if not hh:
                continue
            # Can any tolerable action bring household below 500 kWh?
            can_avoid_safely = any(
                (r.realized_kwh - a.delta_kwh <= 500.0) and (np.dot(hh._theta_star, a.feature_vector) <= hh.d_max)
                for a in hh.candidate_actions if a.is_reduction()
            )
            if can_avoid_safely:
                feasible_cliff_avoidance += 1
                cand = next((a for a in hh.candidate_actions if a.id == r.chosen_action_id), None)
                if cand and (r.realized_kwh - cand.delta_kwh <= 500.0) and not r.is_comfort_violated:
                    successful_cliff_avoidance += 1

        casr = (successful_cliff_avoidance / feasible_cliff_avoidance) if feasible_cliff_avoidance > 0 else 1.0

        # Stratified Breakdown by Archetype
        archetypes = sorted(list({r.archetype for r in records}))
        breakdown: Dict[str, Dict[str, float]] = {}
        for arch in archetypes:
            arch_recs = [r for r in records if r.archetype == arch]
            arch_non_null = [r for r in arch_recs if not r.is_abstention]
            breakdown[arch] = {
                'count': float(len(arch_recs)),
                'norm_regret': float(np.mean([r.normalized_regret for r in arch_recs])),
                'savings_inr': float(np.mean([r.monetary_savings_paise / 100.0 for r in arch_recs])),
                'cvr': float(np.mean([1.0 if r.is_comfort_violated else 0.0 for r in arch_recs])),
                'abstention_rate': float(np.mean([1.0 if r.is_abstention else 0.0 for r in arch_recs])),
                'acceptance_rate': float(np.mean([1.0 if r.user_accepted else 0.0 for r in arch_non_null])) if arch_non_null else 1.0,
            }

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
            abstention_precision=ap,
            cliff_avoidance_success_rate=casr,
            archetype_breakdown=breakdown,
            records=records,
        )
