"""
HearthShift AI — Phase 2A Baseline Benchmark Suite
Evaluates Baselines B1 to B5 across 5 official random seeds [42, 137, 2026, 777, 9999]
on a cohort of 100 heterogeneous synthetic households under the TNPDCL LT-1A May 10, 2026 tariff.
Computes all 10 quantitative metrics defined in docs/research/EXPERIMENT-PROTOCOL.md.
"""

from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Type

import numpy as np

# Ensure research root is in sys.path for direct script execution
research_dir = Path(__file__).resolve().parent.parent
if str(research_dir) not in sys.path:
    sys.path.insert(0, str(research_dir))

from baselines.base import BaseAdvisor
from baselines.b1_rule_based import RuleBasedAdvisor
from baselines.b2_fixed_survey import FixedSurveyAdvisor
from baselines.b3_entropy import EntropyActiveAdvisor
from baselines.b4_linear_evsi import LinearEVSIAdvisor
from baselines.b5_oracle import OracleAdvisor
from simulator.environment import EvaluationRecord, SimulationEnvironment
from simulator.household import SyntheticHousehold, generate_synthetic_cohort
from simulator.tariffs import TariffPlan, create_tnpdcl_lt1a_may2026_tariff

EVALUATION_SEEDS = [42, 137, 2026, 777, 9999]
COHORT_SIZE = 100


@dataclass
class RunMetrics:
    seed: int
    advisor_name: str
    mean_normalized_regret: float
    mean_savings_inr: float
    comfort_violation_rate: float
    mean_queries_asked: float
    recommendation_acceptance_rate: float
    abstention_rate: float
    cliff_avoidance_success_rate: float
    time_shifting_false_alarm_rate: float
    avg_latency_ms: float
    oracle_normalization_ceiling_pct: float


@dataclass
class AggregatedMetrics:
    advisor_name: str
    # Metric 1: Mean Normalized Decision Regret
    regret_mean: float
    regret_std: float
    # Metric 2: Realized Electricity Bill Savings (INR)
    savings_inr_mean: float
    savings_inr_std: float
    # Metric 3: Comfort Constraint Violation Rate (CVR)
    cvr_mean: float
    cvr_std: float
    # Metric 4: Mean Interaction Query Count
    queries_mean: float
    queries_std: float
    # Metric 5: Recommendation Acceptance Rate (RAR)
    rar_mean: float
    rar_std: float
    # Metric 6: Abstention Rate
    abstention_mean: float
    abstention_std: float
    # Metric 7: Cliff Avoidance Success Rate (CASR)
    casr_mean: float
    casr_std: float
    # Metric 8: Time-Shifting False Alarm Rate under Slab Tariff
    false_alarm_mean: float
    false_alarm_std: float
    # Metric 9: Average Execution Latency per Decision (ms)
    latency_ms_mean: float
    latency_ms_std: float
    # Metric 10: Oracle Normalization Ceiling (%)
    ceiling_mean: float
    ceiling_std: float


def run_single_benchmark(
    advisor_factory: Type[BaseAdvisor],
    seed: int,
    tariff: TariffPlan,
    n_households: int = COHORT_SIZE,
) -> RunMetrics:
    """Runs a single trial for one advisor on one seed cohort."""
    cohort = generate_synthetic_cohort(n_households=n_households, seed=seed)
    env = SimulationEnvironment(cohort, tariff, rng=np.random.default_rng(seed))
    advisor = advisor_factory()

    records: List[EvaluationRecord] = []
    latencies_ms: List[float] = []
    false_alarms = 0
    hh_map = {hh.household_id: hh for hh in cohort}

    for hh in cohort:
        # Time the decision logic
        t0 = time.perf_counter()
        result = advisor.decide(env, hh, tariff)
        t1 = time.perf_counter()
        latencies_ms.append((t1 - t0) * 1000.0)

        # Check time-shifting false alarms under slab tariff
        chosen_cand = next((a for a in hh.candidate_actions if a.id == result.action.id), None)
        if chosen_cand and chosen_cand.is_shift() and result.decision_type != 'abstain':
            false_alarms += 1

        record = env.evaluate_decision(
            household=hh,
            chosen_action=result.action,
            is_abstention=(result.decision_type == 'abstain'),
        )
        records.append(record)

    # Metric computations
    n = len(records)
    mean_norm_regret = float(np.mean([r.normalized_regret for r in records]))
    mean_savings_inr = float(np.mean([r.monetary_savings_paise / 100.0 for r in records]))
    mean_queries = float(np.mean([r.queries_asked for r in records]))

    non_null_recs = [r for r in records if r.chosen_action_id != 'null_action' and not r.is_abstention]
    rar = float(np.mean([1.0 if r.user_accepted else 0.0 for r in non_null_recs])) if non_null_recs else 1.0
    cvr = float(np.mean([1.0 if r.is_comfort_violated else 0.0 for r in records]))
    abstention_rate = float(np.mean([1.0 if r.is_abstention else 0.0 for r in records]))

    cliff_households = [r for r in records if 490.0 <= r.realized_kwh <= 520.0]
    if cliff_households:
        avoided = 0
        for r in cliff_households:
            hh = hh_map.get(r.household_id)
            cand = next((a for a in hh.candidate_actions if a.id == r.chosen_action_id), None) if hh else None
            delta = cand.delta_kwh if cand else 0.0
            if (r.realized_kwh - delta) <= 500.0:
                avoided += 1
        casr = float(avoided / len(cliff_households))
    else:
        casr = 1.0

    false_alarm_rate = float(false_alarms / n)
    avg_latency = float(np.mean(latencies_ms))
    # Normalization ceiling: 100% * (1.0 - mean_norm_regret)
    oracle_ceiling_pct = float(max(0.0, (1.0 - mean_norm_regret) * 100.0))

    return RunMetrics(
        seed=seed,
        advisor_name=advisor.name,
        mean_normalized_regret=mean_norm_regret,
        mean_savings_inr=mean_savings_inr,
        comfort_violation_rate=cvr,
        mean_queries_asked=mean_queries,
        recommendation_acceptance_rate=rar,
        abstention_rate=abstention_rate,
        cliff_avoidance_success_rate=casr,
        time_shifting_false_alarm_rate=false_alarm_rate,
        avg_latency_ms=avg_latency,
        oracle_normalization_ceiling_pct=oracle_ceiling_pct,
    )


def run_all_benchmarks() -> Dict[str, Any]:
    tariff = create_tnpdcl_lt1a_may2026_tariff()
    advisor_factories = [
        RuleBasedAdvisor,
        FixedSurveyAdvisor,
        EntropyActiveAdvisor,
        LinearEVSIAdvisor,
        OracleAdvisor,
    ]

    all_run_metrics: List[RunMetrics] = []
    aggregated_results: List[AggregatedMetrics] = []

    print("=" * 80)
    print("HEARTHSHIFT AI — PHASE 2A BASELINE BENCHMARK SUITE")
    print(f"Tariff: TNPDCL LT-1A (May 10, 2026) | Seeds: {EVALUATION_SEEDS} | Households: {COHORT_SIZE}")
    print("=" * 80)

    for factory in advisor_factories:
        runs_for_adv: List[RunMetrics] = []
        adv_name = factory().name
        print(f"\nEvaluating Baseline: {adv_name} ...")

        for seed in EVALUATION_SEEDS:
            run = run_single_benchmark(factory, seed, tariff)
            runs_for_adv.append(run)
            all_run_metrics.append(run)
            print(
                f"  Seed {seed:5d} -> Regret: {run.mean_normalized_regret:.4f} | "
                f"Savings: ₹{run.mean_savings_inr:6.2f} | CVR: {run.comfort_violation_rate * 100:4.1f}% | "
                f"Queries: {run.mean_queries_asked:.2f} | Latency: {run.avg_latency_ms:.3f} ms"
            )

        # Aggregate across seeds
        agg = AggregatedMetrics(
            advisor_name=adv_name,
            regret_mean=float(np.mean([r.mean_normalized_regret for r in runs_for_adv])),
            regret_std=float(np.std([r.mean_normalized_regret for r in runs_for_adv])),
            savings_inr_mean=float(np.mean([r.mean_savings_inr for r in runs_for_adv])),
            savings_inr_std=float(np.std([r.mean_savings_inr for r in runs_for_adv])),
            cvr_mean=float(np.mean([r.comfort_violation_rate for r in runs_for_adv])),
            cvr_std=float(np.std([r.comfort_violation_rate for r in runs_for_adv])),
            queries_mean=float(np.mean([r.mean_queries_asked for r in runs_for_adv])),
            queries_std=float(np.std([r.mean_queries_asked for r in runs_for_adv])),
            rar_mean=float(np.mean([r.recommendation_acceptance_rate for r in runs_for_adv])),
            rar_std=float(np.std([r.recommendation_acceptance_rate for r in runs_for_adv])),
            abstention_mean=float(np.mean([r.abstention_rate for r in runs_for_adv])),
            abstention_std=float(np.std([r.abstention_rate for r in runs_for_adv])),
            casr_mean=float(np.mean([r.cliff_avoidance_success_rate for r in runs_for_adv])),
            casr_std=float(np.std([r.cliff_avoidance_success_rate for r in runs_for_adv])),
            false_alarm_mean=float(np.mean([r.time_shifting_false_alarm_rate for r in runs_for_adv])),
            false_alarm_std=float(np.std([r.time_shifting_false_alarm_rate for r in runs_for_adv])),
            latency_ms_mean=float(np.mean([r.avg_latency_ms for r in runs_for_adv])),
            latency_ms_std=float(np.std([r.avg_latency_ms for r in runs_for_adv])),
            ceiling_mean=float(np.mean([r.oracle_normalization_ceiling_pct for r in runs_for_adv])),
            ceiling_std=float(np.std([r.oracle_normalization_ceiling_pct for r in runs_for_adv])),
        )
        aggregated_results.append(agg)

    # Print Summary Performance Matrix Table
    print("\n" + "=" * 120)
    print("PHASE 2A EMPIRICAL PERFORMANCE MATRIX (Mean ± Std over 5 Seeds)")
    print("=" * 120)
    header = (
        f"{'Baseline':<18} | {'Regret':<14} | {'Savings (INR)':<16} | {'CVR':<12} | "
        f"{'Queries':<10} | {'RAR':<10} | {'Abstain':<8} | {'CASR':<8} | {'Shift FA':<8} | "
        f"{'Latency (ms)':<14} | {'Oracle Ceil':<12}"
    )
    print(header)
    print("-" * 120)
    for a in aggregated_results:
        row = (
            f"{a.advisor_name:<18} | "
            f"{a.regret_mean:.4f}±{a.regret_std:.4f} | "
            f"₹{a.savings_inr_mean:6.2f}±{a.savings_inr_std:<5.2f} | "
            f"{a.cvr_mean * 100:4.1f}±{a.cvr_std * 100:<3.1f}% | "
            f"{a.queries_mean:4.2f}±{a.queries_std:<4.2f} | "
            f"{a.rar_mean * 100:4.1f}%   | "
            f"{a.abstention_mean * 100:4.1f}%   | "
            f"{a.casr_mean * 100:4.1f}%   | "
            f"{a.false_alarm_mean * 100:4.1f}%   | "
            f"{a.latency_ms_mean:5.3f}±{a.latency_ms_std:<5.3f} ms | "
            f"{a.ceiling_mean:5.2f}%"
        )
        print(row)
    print("=" * 120)

    # Save to research/results/benchmark_phase2a.json
    results_dir = research_dir / 'results'
    results_dir.mkdir(parents=True, exist_ok=True)
    output_path = results_dir / 'benchmark_phase2a.json'

    payload = {
        'metadata': {
            'tariff': 'TNPDCL_LT1A_2026_MAY10',
            'evaluation_seeds': EVALUATION_SEEDS,
            'n_households_per_seed': COHORT_SIZE,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
        },
        'aggregated': [asdict(a) for a in aggregated_results],
        'runs': [asdict(r) for r in all_run_metrics],
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)
    print(f"\n[OK] Full benchmark output saved to: {output_path}")

    return payload


if __name__ == '__main__':
    run_all_benchmarks()
