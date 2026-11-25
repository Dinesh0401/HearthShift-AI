"""
HearthShift AI — Stage 1 Usability & Safety Comprehension Scoring Suite

Computes standardized human-factors summary statistics for the N = 5 to 10
Stage 1 pre-pilot usability study without conflating unassisted completion with
assisted prompts, without masking first-attempt safety misconceptions under
post-debrief corrections, and with exact Clopper-Pearson 95% binomial intervals
highlighting small-sample statistical uncertainty.

IMPORTANT: Executing this script against `stage1_synthetic_usability_sessions.json`
produces a synthetic test verification report only — NEVER real household evidence.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Tuple

from scipy.stats import beta

STEP_NAMES = [
    "Step 1: Onboarding & Advisory Disclaimer Check",
    "Step 2: Language Toggle & Capability Inspection",
    "Step 3: Manual Historical Bill Entry",
    "Step 4: Tariff Headroom & 500 kWh Cliff Interpretation",
    "Step 5: Interval CSV Import & Worker Feedback",
    "Step 6: Interval Chart & Standby Baseload Review",
    "Step 7: Counterfactual Scenario Exploration",
    "Step 8: Recommendation & Q0.05 Bound Audit",
    "Step 9: Adaptive EVSI Modal & Provenance Ledger",
    "Step 10: Privacy Export, Feedback Review & Wipe",
]

SAFETY_PROBES = ["SAF-1", "SAF-2", "SAF-3", "SAF-4"]
TOLERANCE_LOW_VALUES = {"0", "1"}


def compute_sus_score(items: List[int]) -> float:
    """Computes Brooke (1996) 10-item System Usability Scale (0 to 100)."""
    if len(items) != 10:
        raise ValueError(f"SUS requires exactly 10 items, got {len(items)}")
    total = 0
    for idx, raw in enumerate(items):
        if raw < 1 or raw > 5:
            raise ValueError(f"SUS item {idx + 1} must be in [1, 5], got {raw}")
        # 0-based index: even indices are odd-numbered items (1,3,5,7,9 -> positive)
        if idx % 2 == 0:
            total += raw - 1
        else:
            total += 5 - raw
    return total * 2.5


def clopper_pearson_ci(successes: int, n: int, alpha: float = 0.05) -> Tuple[float, float]:
    """Exact two-sided (1 - alpha) Clopper-Pearson binomial confidence interval."""
    if n <= 0:
        return (0.0, 0.0)
    if successes < 0 or successes > n:
        raise ValueError(f"Invalid successes={successes} for n={n}")
    lower = 0.0 if successes == 0 else float(beta.ppf(alpha / 2.0, successes, n - successes + 1))
    upper = 1.0 if successes == n else float(beta.ppf(1.0 - alpha / 2.0, successes + 1, n - successes))
    return (round(lower, 4), round(upper, 4))


def percentile_linear(values: List[float], q: float) -> float:
    """Linear-interpolated sample quantile matching NumPy default."""
    if not values:
        return 0.0
    xs = sorted(values)
    if len(xs) == 1:
        return float(xs[0])
    pos = q * (len(xs) - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return float(xs[lo])
    frac = pos - lo
    return float(xs[lo] * (1.0 - frac) + xs[hi] * frac)


def score_stage1_sessions(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates Stage 1 sessions, preserving separation across all scientific gates."""
    sessions: List[Dict[str, Any]] = payload.get("sessions", [])
    n_sessions = len(sessions)
    if n_sessions == 0:
        raise ValueError("Sessions list must not be empty.")

    is_synthetic = all(bool(s.get("is_synthetic", False)) for s in sessions) or str(
        payload.get("fixture_status", "")
    ).startswith("SYNTHETIC")

    # 1. Per-session SUS & outcome aggregation
    sus_scores: List[float] = []
    seq_bill: List[float] = []
    seq_csv: List[float] = []
    qb1_vals: List[float] = []
    qb2_vals: List[float] = []
    willingness_vals: List[float] = []
    low_tol_or_high_burden_count = 0

    unassisted_total = 0
    assisted_total = 0
    failed_total = 0
    total_step_attempts = n_sessions * 10

    step_breakdown = []
    for step_idx, step_name in enumerate(STEP_NAMES):
        outcomes = [int(s["task_outcomes"][step_idx]) for s in sessions]
        times = [float(s["task_seconds"][step_idx]) for s in sessions]
        u_cnt = sum(1 for o in outcomes if o == 2)
        a_cnt = sum(1 for o in outcomes if o == 1)
        f_cnt = sum(1 for o in outcomes if o == 0)
        unassisted_total += u_cnt
        assisted_total += a_cnt
        failed_total += f_cnt
        u_rate = round(u_cnt / n_sessions, 4)
        f_rate = round(f_cnt / n_sessions, 4)
        step_breakdown.append(
            {
                "step_number": step_idx + 1,
                "step_name": step_name,
                "unassisted_count": u_cnt,
                "assisted_count": a_cnt,
                "failed_count": f_cnt,
                "unassisted_rate": u_rate,
                "unassisted_ci95": list(clopper_pearson_ci(u_cnt, n_sessions)),
                "failure_rate": f_rate,
                "median_seconds": round(percentile_linear(times, 0.5), 1),
                "iqr_seconds": [
                    round(percentile_linear(times, 0.25), 1),
                    round(percentile_linear(times, 0.75), 1),
                ],
                "exceeds_30pct_failure_threshold": f_rate > 0.30,
            }
        )

    for s in sessions:
        if len(s["task_outcomes"]) != 10 or len(s["task_seconds"]) != 10:
            raise ValueError(f"Participant {s.get('participant_id')} missing 10 task entries.")
        sus = compute_sus_score(s["sus_items"])
        sus_scores.append(sus)
        seq_bill.append(float(s["seq_manual_bill"]))
        seq_csv.append(float(s["seq_csv_import"]))
        qb1 = float(s["qb_1_intrusiveness"])
        qb2 = float(s["qb_2_effort"])
        qb1_vals.append(qb1)
        qb2_vals.append(qb2)
        willingness_vals.append(float(s["willingness_to_try"]))
        tol = str(s["question_tolerance"])
        if tol in TOLERANCE_LOW_VALUES or qb1 >= 3.0:
            low_tol_or_high_burden_count += 1

    # 2. Separate First-Attempt vs Post-Debrief Safety Comprehension
    safety_summary: Dict[str, Any] = {}
    for probe in SAFETY_PROBES:
        init_pass = sum(1 for s in sessions if bool(s["safety_first_attempt"][probe]))
        post_pass = sum(1 for s in sessions if bool(s["safety_post_debrief"][probe]))
        safety_summary[probe] = {
            "first_attempt_pass_count": init_pass,
            "first_attempt_pass_rate": round(init_pass / n_sessions, 4),
            "first_attempt_ci95": list(clopper_pearson_ci(init_pass, n_sessions)),
            "post_debrief_pass_count": post_pass,
            "post_debrief_pass_rate": round(post_pass / n_sessions, 4),
            "post_debrief_ci95": list(clopper_pearson_ci(post_pass, n_sessions)),
            "initial_misconception_detected": init_pass < n_sessions,
        }

    # 3. Defect Register Severity Tally
    defect_counts = {"S0": 0, "S1": 0, "S2": 0, "S3": 0}
    all_defects = []
    for s in sessions:
        for d in s.get("defects", []):
            sev = str(d["severity"])
            if sev in defect_counts:
                defect_counts[sev] += 1
            all_defects.append({**d, "participant_id": s["participant_id"]})

    # 4. Descriptive SUS & Burden Aggregates
    sus_mean = sum(sus_scores) / n_sessions
    sus_sd = (
        math.sqrt(sum((x - sus_mean) ** 2 for x in sus_scores) / max(1, n_sessions - 1))
        if n_sessions > 1
        else 0.0
    )

    overall_unassisted_rate = unassisted_total / total_step_attempts
    low_burden_frac = low_tol_or_high_burden_count / n_sessions

    saf1_post_ok = safety_summary["SAF-1"]["post_debrief_pass_rate"] == 1.0
    saf2_post_ok = safety_summary["SAF-2"]["post_debrief_pass_rate"] == 1.0
    saf1_init_ok = safety_summary["SAF-1"]["first_attempt_pass_rate"] == 1.0
    saf2_init_ok = safety_summary["SAF-2"]["first_attempt_pass_rate"] == 1.0
    saf3_ok = safety_summary["SAF-3"]["post_debrief_pass_rate"] >= 0.90
    saf4_ok = safety_summary["SAF-4"]["post_debrief_pass_rate"] >= 0.90

    go_gates = {
        "zero_s0_s1_defects": defect_counts["S0"] == 0 and defect_counts["S1"] == 0,
        "saf1_saf2_post_debrief_100pct": saf1_post_ok and saf2_post_ok,
        "saf1_saf2_first_attempt_100pct_no_copy_remediation_needed": saf1_init_ok and saf2_init_ok,
        "saf3_saf4_post_debrief_ge_90pct": saf3_ok and saf4_ok,
        "unassisted_completion_ge_80pct": overall_unassisted_rate >= 0.80,
        "no_single_task_gt_30pct_failure": not any(
            st["exceeds_30pct_failure_threshold"] for st in step_breakdown
        ),
        "mean_sus_ge_70": sus_mean >= 70.0,
        "c_ask_escalation_triggered": low_burden_frac > 0.25,
    }

    stage2_ready_without_remediation = (
        go_gates["zero_s0_s1_defects"]
        and go_gates["saf1_saf2_first_attempt_100pct_no_copy_remediation_needed"]
        and go_gates["saf3_saf4_post_debrief_ge_90pct"]
        and go_gates["unassisted_completion_ge_80pct"]
        and go_gates["no_single_task_gt_30pct_failure"]
        and go_gates["mean_sus_ge_70"]
    )

    return {
        "report_type": "SYNTHETIC_SAMPLE_OUTPUT_NOT_HUMAN_DATA"
        if is_synthetic
        else "STAGE_1_USABILITY_ANALYSIS",
        "is_synthetic_fixture": is_synthetic,
        "sample_size_n": n_sessions,
        "small_sample_epistemic_note": (
            f"Cohort N={n_sessions} is strictly formative usability testing. "
            "Small-N metrics cannot establish population-wide statistical efficacy, "
            "bill reduction, or energy savings; inspect individual sessions and 95% Clopper-Pearson intervals."
        ),
        "task_completion_summary": {
            "total_step_attempts": total_step_attempts,
            "unassisted_count": unassisted_total,
            "assisted_count": assisted_total,
            "failed_count": failed_total,
            "overall_unassisted_rate": round(overall_unassisted_rate, 4),
            "per_step": step_breakdown,
        },
        "sus_summary": {
            "per_participant": [
                {
                    "participant_id": s["participant_id"],
                    "locale": s["locale"],
                    "device": s["device"],
                    "sus_score": sus_scores[i],
                }
                for i, s in enumerate(sessions)
            ],
            "mean": round(sus_mean, 2),
            "sd": round(sus_sd, 2),
            "median": round(percentile_linear(sus_scores, 0.5), 2),
            "iqr": [
                round(percentile_linear(sus_scores, 0.25), 2),
                round(percentile_linear(sus_scores, 0.75), 2),
            ],
            "min": min(sus_scores),
            "max": max(sus_scores),
        },
        "seq_and_burden_summary": {
            "seq_manual_bill_median": round(percentile_linear(seq_bill, 0.5), 2),
            "seq_csv_import_median": round(percentile_linear(seq_csv, 0.5), 2),
            "qb1_intrusiveness_mean": round(sum(qb1_vals) / n_sessions, 2),
            "qb2_effort_mean": round(sum(qb2_vals) / n_sessions, 2),
            "willingness_to_try_median": round(percentile_linear(willingness_vals, 0.5), 2),
            "low_tolerance_or_high_burden_fraction": round(low_burden_frac, 4),
        },
        "safety_comprehension": safety_summary,
        "defect_counts": defect_counts,
        "defects": all_defects,
        "go_no_go_gates": go_gates,
        "stage2_go_without_ui_remediation": stage2_ready_without_remediation,
    }


def render_markdown_report(result: Dict[str, Any]) -> str:
    """Formats a transparent Markdown report preserving first-attempt & small-N honesty."""
    banner = (
        "> [!CAUTION]\n"
        "> **SYNTHETIC PRE-STUDY EXAMPLE — NOT REAL PARTICIPANTS**\n"
        "> Generated solely to verify reproducible scoring and statistical uncertainty calculations "
        "from `research/fixtures/stage1_synthetic_usability_sessions.json`. Zero real households have been tested.\n"
        if result["is_synthetic_fixture"]
        else "> [!NOTE]\n> **OBSERVED STAGE 1 USABILITY REPORT — ZERO SAVINGS EFFICACY CLAIMS**\n"
    )

    tc = result["task_completion_summary"]
    sus = result["sus_summary"]
    seq = result["seq_and_burden_summary"]
    gates = result["go_no_go_gates"]

    lines = [
        "# HearthShift AI — Stage 1 Usability & Safety Comprehension Analysis Report",
        "",
        banner,
        "---",
        "",
        "## 1. Cohort Scope & Small-Sample Uncertainty Warning",
        f"- **Cohort Size ($N$):** `{result['sample_size_n']}` sessions",
        f"- **Statistical Scope:** {result['small_sample_epistemic_note']}",
        "",
        "## 2. 10-Step Task Outcomes (Strictly Separated: Unassisted vs. Assisted vs. Failed)",
        (
            f"- **Aggregate Step Attempts:** `{tc['total_step_attempts']}` — "
            f"Unassisted (`2`): `{tc['unassisted_count']}` (`{tc['overall_unassisted_rate']*100:.1f}%`), "
            f"Assisted (`1`): `{tc['assisted_count']}`, "
            f"Failed (`0`): `{tc['failed_count']}`"
        ),
        "",
        "| Step | Unassisted (`2`) | Assisted (`1`) | Failed (`0`) | Unassisted Rate (95% Clopper-Pearson CI) | Median Time (IQR) |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |",
    ]
    for st in tc["per_step"]:
        ci = st["unassisted_ci95"]
        iqr = st["iqr_seconds"]
        lines.append(
            f"| {st['step_name']} | {st['unassisted_count']} | {st['assisted_count']} | "
            f"{st['failed_count']} | `{st['unassisted_rate']*100:.1f}%` "
            f"(`[{ci[0]*100:.1f}%, {ci[1]*100:.1f}%]`) | {st['median_seconds']}s ({iqr[0]}–{iqr[1]}s) |"
        )

    lines.extend(
        [
            "",
            "## 3. First-Attempt vs. Post-Debrief Safety Comprehension (`SAF-1` to `SAF-4`)",
            "*Initial misconceptions are logged BEFORE moderator explanation so UI copy flaws are never hidden.*",
            "",
            "| Probe | First-Attempt Pass (95% CI) | Post-Debrief Pass (95% CI) | Initial Misconception Flagged? |",
            "| :--- | :---: | :---: | :---: |",
        ]
    )
    for probe, d in result["safety_comprehension"].items():
        c1 = d["first_attempt_ci95"]
        c2 = d["post_debrief_ci95"]
        lines.append(
            f"| **{probe}** | `{d['first_attempt_pass_count']}/{result['sample_size_n']}` "
            f"(`{d['first_attempt_pass_rate']*100:.1f}%`, `[{c1[0]*100:.1f}%, {c1[1]*100:.1f}%]`) | "
            f"`{d['post_debrief_pass_count']}/{result['sample_size_n']}` "
            f"(`{d['post_debrief_pass_rate']*100:.1f}%`, `[{c2[0]*100:.1f}%, {c2[1]*100:.1f}%]`) | "
            f"{'YES (Remediation Triggered)' if d['initial_misconception_detected'] else 'No'} |"
        )

    lines.extend(
        [
            "",
            "## 4. Individual Participant Scores (Brooke SUS, SEQ, Question Burden)",
            (
                f"- **SUS Summary:** Mean `{sus['mean']}` (SD `{sus['sd']}`), Median `{sus['median']}` "
                f"(IQR `{sus['iqr'][0]}–{sus['iqr'][1]}`, Range `{sus['min']}–{sus['max']}`)"
            ),
            f"- **SEQ Median Ease (`1–7`):** Manual Bill = `{seq['seq_manual_bill_median']}`, CSV Import = `{seq['seq_csv_import_median']}`",
            (
                f"- **Question Burden:** `QB-1` Mean `{seq['qb1_intrusiveness_mean']}`, `QB-2` Mean `{seq['qb2_effort_mean']}`, "
                f"Low-Tolerance / High-Burden Share = `{seq['low_tolerance_or_high_burden_fraction']*100:.1f}%` "
                f"(`c_ask` escalation triggered: `{gates['c_ask_escalation_triggered']}`)"
            ),
            "",
            "| Participant ID | Locale | Device | SUS Score |",
            "| :--- | :---: | :---: | :---: |",
        ]
    )
    for row in sus["per_participant"]:
        lines.append(f"| `{row['participant_id']}` | `{row['locale']}` | `{row['device']}` | `{row['sus_score']:.1f}` |")

    dc = result["defect_counts"]
    lines.extend(
        [
            "",
            "## 5. Defect Summary & Stage 1 -> Stage 2 Go/No-Go Check",
            f"- **Defects:** `S0={dc['S0']}`, `S1={dc['S1']}`, `S2={dc['S2']}`, `S3={dc['S3']}`",
            f"- **Zero S0/S1 Defects:** `{gates['zero_s0_s1_defects']}`",
            f"- **SAF-1 & SAF-2 First-Attempt 100% (No UI Remediation Required):** `{gates['saf1_saf2_first_attempt_100pct_no_copy_remediation_needed']}`",
            f"- **SAF-1 & SAF-2 Post-Debrief 100%:** `{gates['saf1_saf2_post_debrief_100pct']}`",
            f"- **Unassisted Completion >= 80%:** `{gates['unassisted_completion_ge_80pct']}`",
            f"- **Mean SUS >= 70:** `{gates['mean_sus_ge_70']}`",
            f"- **Stage 2 Go Without Pre-RCT Copy Remediation:** `{result['stage2_go_without_ui_remediation']}`",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Score Stage 1 usability & safety comprehension sessions.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "fixtures" / "stage1_synthetic_usability_sessions.json",
    )
    parser.add_argument("--json-out", type=Path, default=None)
    parser.add_argument("--md-out", type=Path, default=None)
    args = parser.parse_args()

    payload = json.loads(args.input.read_text(encoding="utf-8"))
    scored = score_stage1_sessions(payload)
    md_text = render_markdown_report(scored)

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(scored, indent=2), encoding="utf-8")
    if args.md_out:
        args.md_out.parent.mkdir(parents=True, exist_ok=True)
        args.md_out.write_text(md_text, encoding="utf-8")

    print(
        f"[stage1_usability_scoring] n={scored['sample_size_n']} "
        f"synthetic={scored['is_synthetic_fixture']} "
        f"sus_mean={scored['sus_summary']['mean']} "
        f"unassisted_rate={scored['task_completion_summary']['overall_unassisted_rate']} "
        f"saf1_init={scored['safety_comprehension']['SAF-1']['first_attempt_pass_count']}/{scored['sample_size_n']} "
        f"go_without_remediation={scored['stage2_go_without_ui_remediation']}"
    )


if __name__ == "__main__":
    main()
