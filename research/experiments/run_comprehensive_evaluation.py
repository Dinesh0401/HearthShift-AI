"""
Comprehensive Scientific Evaluation & Ablation Harness
Evaluates:
- Baselines B1 to B9 + Full TR-VOI Candidate
- 5 Controlled Ablation Conditions of TR-VOI
- Across 5 seeds [42, 137, 2026, 777, 9999] on N=100 stratified households (500 trials per policy)
- Computes Mean, Std, and 95% Confidence Intervals
- Computes Stratified Performance across Archetypes
"""

from __future__ import annotations
import sys
import json
import time
from pathlib import Path

# Add research directory to sys.path
research_dir = Path(__file__).resolve().parent.parent
if str(research_dir) not in sys.path:
    sys.path.insert(0, str(research_dir))

from typing import Dict, List, Any, Tuple
import numpy as np

from simulator.tariffs import create_tnpdcl_lt1a_may2026_tariff
from simulator.household import generate_synthetic_cohort
from simulator.environment import SimulationEnvironment
from baselines.b1_rule_based import RuleBasedAdvisor, SafeRuleBasedAdvisor
from baselines.b2_fixed_survey import FixedSurveyAdvisor
from baselines.b3_entropy import EntropyActiveAdvisor
from baselines.b4_linear_evsi import LinearEVSIAdvisor
from baselines.b5_oracle import OracleAdvisor
from baselines.b6_exact_passive import ExactPassiveAdvisor
from baselines.b7_exact_evsi import ExactEVSIAdvisor
from baselines.b7_risk_evsi import RiskExactEVSIAdvisor, RiskAbstainExactEVSIAdvisor
from baselines.b8_risk_passive import RiskSensitivePassiveAdvisor
from baselines.b9_evsi_no_privacy import ExactEVSINoPrivacyAdvisor
from algorithms.tr_voi import ThresholdAwareRobustVOIAdvisor


SEEDS = [42, 137, 2026, 777, 9999]
N_HOUSEHOLDS = 100


def build_policy_suite() -> Dict[str, Any]:
    policies: Dict[str, Any] = {
        'B1_RuleBased': RuleBasedAdvisor(),
        'B1_Safe': SafeRuleBasedAdvisor(),
        'B2_FixedSurvey': FixedSurveyAdvisor(k_questions=3),
        'B3_EntropyLICA': EntropyActiveAdvisor(max_queries=3),
        'B4_LinearEVSI': LinearEVSIAdvisor(max_queries=3),
        'B5_Oracle': OracleAdvisor(),
        'B6_ExactPassive': ExactPassiveAdvisor(),
        'B7_ExactEVSI': ExactEVSIAdvisor(max_queries=3),
        'B7_RiskEVSI': RiskExactEVSIAdvisor(max_queries=3),
        'B7_RiskAbstainEVSI': RiskAbstainExactEVSIAdvisor(max_queries=3),
        'B8_RiskPassive': RiskSensitivePassiveAdvisor(),
        'B9_EVSINoPrivacy': ExactEVSINoPrivacyAdvisor(max_queries=3),
        'TR_VOI_Full': ThresholdAwareRobustVOIAdvisor(max_queries=3),
        # Controlled Ablations of TR-VOI:
        'TR_VOI_Ablation_NoThreshold': ThresholdAwareRobustVOIAdvisor(
            name='TR_VOI_NoThreshold', max_queries=3, use_threshold_awareness=False
        ),
        'TR_VOI_Ablation_NoRiskConstraints': ThresholdAwareRobustVOIAdvisor(
            name='TR_VOI_NoRiskConstraints', max_queries=3, use_risk_constraints=False
        ),
        'TR_VOI_Ablation_NoQuestioning': ThresholdAwareRobustVOIAdvisor(
            name='TR_VOI_NoQuestioning', max_queries=0, use_adaptive_questioning=False
        ),
        'TR_VOI_Ablation_NoPrivacyCost': ThresholdAwareRobustVOIAdvisor(
            name='TR_VOI_NoPrivacyCost', max_queries=3, use_privacy_penalties=False
        ),
        'TR_VOI_Ablation_LinearTariff': ThresholdAwareRobustVOIAdvisor(
            name='TR_VOI_LinearTariff', max_queries=3, use_exact_tariff=False
        ),
    }
    return policies


def compute_ci95(values: List[float]) -> Tuple[float, float, float]:
    arr = np.array(values, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
    # t-value for df=4 at 95% two-sided is 2.776
    ci95 = float(2.776 * (std / np.sqrt(len(arr)))) if len(arr) > 1 else 0.0
    return mean, std, ci95


def run_comprehensive_benchmark():
    print(f"Starting Comprehensive Evaluation across {len(SEEDS)} seeds x {N_HOUSEHOLDS} households...")
    tariff = create_tnpdcl_lt1a_may2026_tariff()
    policies = build_policy_suite()

    # Raw results collection: policy_name -> list of seed metrics
    policy_metrics: Dict[str, Dict[str, List[float]]] = {
        pname: {
            'norm_regret': [],
            'abs_regret_paise': [],
            'savings_inr': [],
            'queries': [],
            'cvr': [],
            'rar': [],
            'abstention_rate': [],
            'abstention_precision': [],
            'casr': [],
            'false_alarms': [],
            'latency_ms': [],
        }
        for pname in policies
    }

    archetype_stats: Dict[str, Dict[str, Dict[str, List[float]]]] = {
        pname: {} for pname in policies
    }

    start_all = time.perf_counter()

    # Track raw paired trial vectors across all 500 household runs
    raw_paired_regret: Dict[str, List[float]] = {pname: [] for pname in policies}
    raw_paired_cvr: Dict[str, List[float]] = {pname: [] for pname in policies}

    for seed in SEEDS:
        print(f"\n--- Running Seed {seed} ---")
        cohort = generate_synthetic_cohort(n_households=N_HOUSEHOLDS, seed=seed)
        env = SimulationEnvironment(cohort, tariff, rng=np.random.default_rng(seed))
        paired_realizations = env.generate_paired_realizations()

        for pname, policy in policies.items():
            t0 = time.perf_counter()
            summary = env.run_advisor_trial(policy, realized_kwh_map=paired_realizations)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0 / N_HOUSEHOLDS

            policy_metrics[pname]['norm_regret'].append(summary.mean_normalized_regret)
            policy_metrics[pname]['abs_regret_paise'].append(summary.mean_absolute_regret_paise)
            policy_metrics[pname]['savings_inr'].append(summary.mean_monetary_savings_inr)
            policy_metrics[pname]['queries'].append(summary.mean_queries_asked)
            policy_metrics[pname]['cvr'].append(summary.comfort_violation_rate)
            policy_metrics[pname]['rar'].append(summary.recommendation_acceptance_rate)
            policy_metrics[pname]['abstention_rate'].append(summary.abstention_rate)
            policy_metrics[pname]['abstention_precision'].append(summary.abstention_precision)
            policy_metrics[pname]['casr'].append(summary.cliff_avoidance_success_rate)
            policy_metrics[pname]['latency_ms'].append(elapsed_ms)

            # Raw paired vectors
            raw_paired_regret[pname].extend([r.normalized_regret for r in summary.records])
            raw_paired_cvr[pname].extend([1.0 if r.is_comfort_violated else 0.0 for r in summary.records])

            # False alarms: count load shift actions
            hh_map = {h.household_id: h for h in cohort}
            shift_count = 0
            for r in summary.records:
                hh = hh_map[r.household_id]
                cand = next((a for a in hh.candidate_actions if a.id == r.chosen_action_id), None)
                if cand and cand.is_shift():
                    shift_count += 1
            false_alarm_rate = shift_count / float(N_HOUSEHOLDS)
            policy_metrics[pname]['false_alarms'].append(false_alarm_rate)

            # Archetype breakdown
            for arch, vals in summary.archetype_breakdown.items():
                if arch not in archetype_stats[pname]:
                    archetype_stats[pname][arch] = {'norm_regret': [], 'cvr': [], 'abstention_rate': [], 'savings_inr': []}
                for k in ['norm_regret', 'cvr', 'abstention_rate', 'savings_inr']:
                    archetype_stats[pname][arch][k].append(vals[k])

            print(f"  [{pname:28s}] Regret: {summary.mean_normalized_regret:.4f} | Queries: {summary.mean_queries_asked:.2f} | CVR: {summary.comfort_violation_rate*100:4.1f}% | Abstain: {summary.abstention_rate*100:4.1f}% | Savings: ₹{summary.mean_monetary_savings_inr:6.2f}")

    total_time = time.perf_counter() - start_all
    print(f"\nAll experiments completed in {total_time:.2f} seconds.")

    # Aggregate summaries with 95% Confidence Intervals
    summary_report: Dict[str, Any] = {'policies': {}, 'archetypes': {}}
    for pname, metrics in policy_metrics.items():
        summary_report['policies'][pname] = {}
        for mname, vals in metrics.items():
            mean, std, ci95 = compute_ci95(vals)
            summary_report['policies'][pname][mname] = {
                'mean': round(mean, 5),
                'std': round(std, 5),
                'ci95': round(ci95, 5),
            }

    # Archetype summaries
    for pname, archs in archetype_stats.items():
        summary_report['archetypes'][pname] = {}
        for arch, metrics in archs.items():
            summary_report['archetypes'][pname][arch] = {}
            for mname, vals in metrics.items():
                mean, std, ci95 = compute_ci95(vals)
                summary_report['archetypes'][pname][arch][mname] = {
                    'mean': round(mean, 5),
                    'std': round(std, 5),
                    'ci95': round(ci95, 5),
                }

    # Paired Statistical Hypothesis Testing against TR_VOI_Full across N=500 trials
    from scipy import stats
    tr_regret = np.array(raw_paired_regret['TR_VOI_Full'])
    paired_tests: Dict[str, Any] = {}

    for pname in policies:
        if pname == 'TR_VOI_Full':
            continue
        other_regret = np.array(raw_paired_regret[pname])
        diff = other_regret - tr_regret  # Positive if other policy has higher regret than TR_VOI
        mean_diff = float(np.mean(diff))

        # Paired t-test
        t_stat, p_val_t = stats.ttest_rel(other_regret, tr_regret)

        # Wilcoxon signed-rank test (handles non-normal/bimodal regret differences)
        try:
            w_stat, p_val_w = stats.wilcoxon(other_regret, tr_regret)
        except Exception:
            w_stat, p_val_w = 0.0, 1.0

        paired_tests[pname] = {
            'mean_regret_diff': round(mean_diff, 5),
            't_statistic': round(float(t_stat), 4) if not np.isnan(t_stat) else 0.0,
            'p_value_ttest': float(p_val_t) if not np.isnan(p_val_t) else 1.0,
            'wilcoxon_stat': float(w_stat),
            'p_value_wilcoxon': float(p_val_w),
            'statistically_significant_005': bool(p_val_t < 0.05) if not np.isnan(p_val_t) else False,
        }

    summary_report['paired_statistical_tests'] = paired_tests

    out_path = Path('research/results/comprehensive_evaluation.json')
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(summary_report, f, indent=2)

    print(f"\nResults saved to {out_path}")
    return summary_report


if __name__ == '__main__':
    run_comprehensive_benchmark()
