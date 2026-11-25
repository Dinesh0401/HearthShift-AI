"""
HearthShift AI — Stage 1 Usability & Safety Comprehension Scoring Suite

Enforces strict pre-scoring schema validation (rejecting coerced strings,
booleans-as-integers, truthiness safety bypasses, duplicate IDs, and out-of-range
scales), handles missing / 'N/A' question-burden entries with explicit denominators,
separates repeated-measures participant summaries from correlated step tallies,
and preserves first-attempt vs. post-debrief safety outcomes.

IMPORTANT: Executing this script against `stage1_synthetic_usability_sessions.json`
produces a synthetic test verification report only — NEVER real household evidence.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

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
PERMITTED_LOCALES = {"en", "ta"}
PERMITTED_DEVICES = {"desktop", "mobile"}
PERMITTED_OUTCOMES = {0, 1, 2}
PERMITTED_TOLERANCE_ANSWERS = {"0", "1", "2-3", "4+"}
TOLERANCE_LOW_VALUES = {"0", "1"}
PERMITTED_DEFECT_SEVERITIES = {"S0", "S1", "S2", "S3"}
NA_STRINGS = {"n/a", "na"}


def _is_strict_int(value: Any) -> bool:
    """True strictly for Python int excluding bool."""
    return isinstance(value, int) and not isinstance(value, bool)


def _is_strict_number(value: Any) -> bool:
    """True strictly for finite int/float excluding bool."""
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _is_missing_na(value: Any) -> bool:
    """True for explicit JSON null (`None`) or `'N/A'` / `'NA'` markers."""
    if value is None:
        return True
    if isinstance(value, str) and value.strip().lower() in NA_STRINGS:
        return True
    return False


def _parse_optional_scale(value: Any, field: str, low: int, high: int, pid: str) -> Optional[float]:
    """Validates optional 1..5 numeric scale (or explicit null/N/A missing value)."""
    if _is_missing_na(value):
        return None
    if not _is_strict_number(value):
        raise ValueError(
            f"Participant {pid}: '{field}' must be a finite number in [{low}, {high}] or null/'N/A', "
            f"got {type(value).__name__} ({value!r})."
        )
    fval = float(value)
    if fval < low or fval > high:
        raise ValueError(f"Participant {pid}: '{field}' out of bounds [{low}, {high}]: {value!r}.")
    return fval


def _parse_optional_tolerance(value: Any, pid: str) -> Optional[str]:
    """Validates optional question-tolerance choice ('0', '1', '2-3', '4+', or null/'N/A')."""
    if _is_missing_na(value):
        return None
    if not isinstance(value, str):
        raise ValueError(
            f"Participant {pid}: 'question_tolerance' must be one of {sorted(PERMITTED_TOLERANCE_ANSWERS)} "
            f"or null/'N/A', got {type(value).__name__} ({value!r})."
        )
    cleaned = value.strip()
    if cleaned not in PERMITTED_TOLERANCE_ANSWERS:
        raise ValueError(
            f"Participant {pid}: invalid 'question_tolerance' value {value!r}; "
            f"expected one of {sorted(PERMITTED_TOLERANCE_ANSWERS)} or 'N/A'."
        )
    return cleaned


def validate_stage1_payload(payload: Any) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Strictly validates the entire Stage 1 session payload before scoring.
    Rejects coerced strings, booleans-as-integers, stringified safety answers,
    missing tasks/probes, duplicate participant IDs, and mixed synthetic/real rows.
    """
    if not isinstance(payload, dict):
        raise ValueError("Stage 1 payload must be a JSON object.")

    sessions = payload.get("sessions")
    if not isinstance(sessions, list) or len(sessions) == 0:
        raise ValueError("Payload 'sessions' must be a non-empty list.")

    seen_ids = set()
    synthetic_flags = set()

    for idx, session in enumerate(sessions):
        if not isinstance(session, dict):
            raise ValueError(f"Session at index {idx} must be a JSON object.")

        pid = session.get("participant_id")
        if not isinstance(pid, str) or not pid.strip():
            raise ValueError(f"Session at index {idx} missing valid non-empty string 'participant_id'.")
        if pid in seen_ids:
            raise ValueError(f"Duplicate 'participant_id' detected: {pid!r}.")
        seen_ids.add(pid)

        is_syn = session.get("is_synthetic")
        if not isinstance(is_syn, bool):
            raise ValueError(
                f"Participant {pid}: 'is_synthetic' must be an actual JSON boolean (true/false), "
                f"got {type(is_syn).__name__} ({is_syn!r})."
            )
        synthetic_flags.add(is_syn)

        locale = session.get("locale")
        if not isinstance(locale, str) or locale not in PERMITTED_LOCALES:
            raise ValueError(
                f"Participant {pid}: 'locale' must be one of {sorted(PERMITTED_LOCALES)}, got {locale!r}."
            )

        device = session.get("device")
        if not isinstance(device, str) or device not in PERMITTED_DEVICES:
            raise ValueError(
                f"Participant {pid}: 'device' must be one of {sorted(PERMITTED_DEVICES)}, got {device!r}."
            )

        outcomes = session.get("task_outcomes")
        if not isinstance(outcomes, list) or len(outcomes) != 10:
            raise ValueError(
                f"Participant {pid}: 'task_outcomes' must be a list of length 10, "
                f"got {len(outcomes) if isinstance(outcomes, list) else type(outcomes).__name__}."
            )
        for step_i, val in enumerate(outcomes):
            if not _is_strict_int(val) or val not in PERMITTED_OUTCOMES:
                raise ValueError(
                    f"Participant {pid}: 'task_outcomes[{step_i}]' must be strictly int in {{0, 1, 2}} "
                    f"(no booleans, floats, or strings), got {type(val).__name__} ({val!r})."
                )

        seconds = session.get("task_seconds")
        if not isinstance(seconds, list) or len(seconds) != 10:
            raise ValueError(
                f"Participant {pid}: 'task_seconds' must be a list of length 10, "
                f"got {len(seconds) if isinstance(seconds, list) else type(seconds).__name__}."
            )
        for step_i, sec in enumerate(seconds):
            if not _is_strict_number(sec) or float(sec) < 0:
                raise ValueError(
                    f"Participant {pid}: 'task_seconds[{step_i}]' must be a finite number >= 0, "
                    f"got {type(sec).__name__} ({sec!r})."
                )

        sus_items = session.get("sus_items")
        if not isinstance(sus_items, list) or len(sus_items) != 10:
            raise ValueError(f"Participant {pid}: 'sus_items' must be a list of exactly 10 integers in [1, 5].")
        for s_i, raw_sus in enumerate(sus_items):
            if not _is_strict_int(raw_sus) or raw_sus < 1 or raw_sus > 5:
                raise ValueError(
                    f"Participant {pid}: 'sus_items[{s_i}]' must be strictly int in [1, 5], "
                    f"got {type(raw_sus).__name__} ({raw_sus!r})."
                )

        for seq_field in ("seq_manual_bill", "seq_csv_import"):
            seq_val = session.get(seq_field)
            if not _is_strict_int(seq_val) or seq_val < 1 or seq_val > 7:
                raise ValueError(
                    f"Participant {pid}: '{seq_field}' must be strictly int in [1, 7], "
                    f"got {type(seq_val).__name__} ({seq_val!r})."
                )

        willing = session.get("willingness_to_try")
        if not _is_strict_int(willing) or willing < 1 or willing > 5:
            raise ValueError(
                f"Participant {pid}: 'willingness_to_try' must be strictly int in [1, 5], "
                f"got {type(willing).__name__} ({willing!r})."
            )

        # Validate optional QB / tolerance values cleanly
        _parse_optional_scale(session.get("qb_1_intrusiveness"), "qb_1_intrusiveness", 1, 5, pid)
        _parse_optional_scale(session.get("qb_2_effort"), "qb_2_effort", 1, 5, pid)
        _parse_optional_tolerance(session.get("question_tolerance"), pid)

        # Require actual JSON booleans for ALL 4 safety probes in both columns
        for col in ("safety_first_attempt", "safety_post_debrief"):
            probe_map = session.get(col)
            if not isinstance(probe_map, dict):
                raise ValueError(f"Participant {pid}: '{col}' must be a dict containing {SAFETY_PROBES}.")
            missing_probes = [p for p in SAFETY_PROBES if p not in probe_map]
            extra_probes = [k for k in probe_map.keys() if k not in SAFETY_PROBES]
            if missing_probes or extra_probes:
                raise ValueError(
                    f"Participant {pid}: '{col}' must contain exact keys {SAFETY_PROBES}; "
                    f"missing={missing_probes}, unexpected={extra_probes}."
                )
            for p in SAFETY_PROBES:
                pval = probe_map[p]
                if not isinstance(pval, bool):
                    raise ValueError(
                        f"Participant {pid}: '{col}[{p!r}]' must be an actual JSON boolean (true/false), "
                        f"NEVER string/int/truthiness-cast, got {type(pval).__name__} ({pval!r})."
                    )

        defects = session.get("defects", [])
        if not isinstance(defects, list):
            raise ValueError(f"Participant {pid}: 'defects' must be a list.")
        for d_i, defect in enumerate(defects):
            if not isinstance(defect, dict):
                raise ValueError(f"Participant {pid}: 'defects[{d_i}]' must be an object.")
            sev = defect.get("severity")
            if sev not in PERMITTED_DEFECT_SEVERITIES:
                raise ValueError(
                    f"Participant {pid}: 'defects[{d_i}].severity' must be in "
                    f"{sorted(PERMITTED_DEFECT_SEVERITIES)}, got {sev!r}."
                )
            d_step = defect.get("step")
            if d_step is not None and (not _is_strict_int(d_step) or d_step < 1 or d_step > 10):
                raise ValueError(
                    f"Participant {pid}: 'defects[{d_i}].step' must be int in [1, 10], got {d_step!r}."
                )

    if len(synthetic_flags) > 1:
        raise ValueError("Cannot mix synthetic (`is_synthetic=true`) and real (`is_synthetic=false`) sessions in one batch.")

    all_sessions_synthetic = next(iter(synthetic_flags))
    fixture_header = str(payload.get("fixture_status", ""))
    if fixture_header.startswith("SYNTHETIC") and not all_sessions_synthetic:
        raise ValueError("Payload 'fixture_status' indicates synthetic fixture, but sessions contain is_synthetic=false.")

    return sessions, all_sessions_synthetic


def compute_sus_score(items: List[int]) -> float:
    """Computes Brooke (1996) 10-item System Usability Scale (0 to 100)."""
    if len(items) != 10:
        raise ValueError(f"SUS requires exactly 10 items, got {len(items)}")
    total = 0
    for idx, raw in enumerate(items):
        if not _is_strict_int(raw) or raw < 1 or raw > 5:
            raise ValueError(f"SUS item {idx + 1} must be strictly int in [1, 5], got {raw!r}")
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


def _sample_sd(values: List[float], mean_val: float) -> float:
    if len(values) <= 1:
        return 0.0
    return math.sqrt(sum((x - mean_val) ** 2 for x in values) / (len(values) - 1))


def score_stage1_sessions(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates validated Stage 1 sessions with strict participant-level statistical separation."""
    sessions, is_synthetic = validate_stage1_payload(payload)
    n_sessions = len(sessions)

    sus_scores: List[float] = []
    seq_bill: List[float] = []
    seq_csv: List[float] = []
    qb1_vals: List[float] = []
    qb2_vals: List[float] = []
    willingness_vals: List[float] = []
    qb_tolerance_answered_n = 0
    qb_burden_evaluated_n = 0
    low_tol_or_high_burden_count = 0

    # Participant-level task outcomes (each participant contributes 1 cluster of 10 correlated steps)
    participant_task_summaries = []
    participant_unassisted_rates: List[float] = []
    participants_all_10_unassisted = 0

    for s in sessions:
        outcomes = [int(o) for o in s["task_outcomes"]]
        u_p = sum(1 for o in outcomes if o == 2)
        a_p = sum(1 for o in outcomes if o == 1)
        f_p = sum(1 for o in outcomes if o == 0)
        p_rate = u_p / 10.0
        participant_unassisted_rates.append(p_rate)
        if u_p == 10:
            participants_all_10_unassisted += 1
        participant_task_summaries.append(
            {
                "participant_id": s["participant_id"],
                "locale": s["locale"],
                "device": s["device"],
                "unassisted_steps": u_p,
                "assisted_steps": a_p,
                "failed_steps": f_p,
                "unassisted_rate": round(p_rate, 4),
            }
        )

        sus = compute_sus_score(s["sus_items"])
        sus_scores.append(sus)
        seq_bill.append(float(s["seq_manual_bill"]))
        seq_csv.append(float(s["seq_csv_import"]))
        willingness_vals.append(float(s["willingness_to_try"]))

        qb1 = _parse_optional_scale(s.get("qb_1_intrusiveness"), "qb_1_intrusiveness", 1, 5, s["participant_id"])
        qb2 = _parse_optional_scale(s.get("qb_2_effort"), "qb_2_effort", 1, 5, s["participant_id"])
        tol = _parse_optional_tolerance(s.get("question_tolerance"), s["participant_id"])

        if qb1 is not None:
            qb1_vals.append(qb1)
        if qb2 is not None:
            qb2_vals.append(qb2)
        if tol is not None:
            qb_tolerance_answered_n += 1

        if qb1 is not None or tol is not None:
            qb_burden_evaluated_n += 1
            if (tol is not None and tol in TOLERANCE_LOW_VALUES) or (qb1 is not None and qb1 >= 3.0):
                low_tol_or_high_burden_count += 1

    # Per-step statistics (across N independent participants for each step)
    unassisted_total = 0
    assisted_total = 0
    failed_total = 0
    step_breakdown = []
    for step_idx, step_name in enumerate(STEP_NAMES):
        step_outcomes = [int(s["task_outcomes"][step_idx]) for s in sessions]
        times = [float(s["task_seconds"][step_idx]) for s in sessions]
        u_cnt = sum(1 for o in step_outcomes if o == 2)
        a_cnt = sum(1 for o in step_outcomes if o == 1)
        f_cnt = sum(1 for o in step_outcomes if o == 0)
        unassisted_total += u_cnt
        assisted_total += a_cnt
        failed_total += f_cnt
        u_rate = round(u_cnt / n_sessions, 4)
        f_rate = round(f_cnt / n_sessions, 4)
        step_breakdown.append(
            {
                "step_number": step_idx + 1,
                "step_name": step_name,
                "n_independent_participants": n_sessions,
                "unassisted_count": u_cnt,
                "assisted_count": a_cnt,
                "failed_count": f_cnt,
                "unassisted_rate": u_rate,
                "exploratory_unassisted_ci95_across_n": list(clopper_pearson_ci(u_cnt, n_sessions)),
                "failure_rate": f_rate,
                "median_seconds": round(percentile_linear(times, 0.5), 1),
                "iqr_seconds": [
                    round(percentile_linear(times, 0.25), 1),
                    round(percentile_linear(times, 0.75), 1),
                ],
                "exceeds_30pct_failure_threshold": f_rate > 0.30,
            }
        )

    # First-Attempt vs. Post-Debrief Safety Comprehension (preserved strictly separate)
    safety_summary: Dict[str, Any] = {}
    for probe in SAFETY_PROBES:
        init_pass_list = [s["participant_id"] for s in sessions if s["safety_first_attempt"][probe]]
        init_fail_list = [s["participant_id"] for s in sessions if not s["safety_first_attempt"][probe]]
        post_pass_list = [s["participant_id"] for s in sessions if s["safety_post_debrief"][probe]]
        init_pass = len(init_pass_list)
        post_pass = len(post_pass_list)
        safety_summary[probe] = {
            "n_independent_participants": n_sessions,
            "first_attempt_pass_count": init_pass,
            "first_attempt_pass_rate": round(init_pass / n_sessions, 4),
            "exploratory_first_attempt_ci95": list(clopper_pearson_ci(init_pass, n_sessions)),
            "first_attempt_misconception_participants": init_fail_list,
            "post_debrief_pass_count": post_pass,
            "post_debrief_pass_rate": round(post_pass / n_sessions, 4),
            "exploratory_post_debrief_ci95": list(clopper_pearson_ci(post_pass, n_sessions)),
            "initial_misconception_detected": init_pass < n_sessions,
        }

    defect_counts = {"S0": 0, "S1": 0, "S2": 0, "S3": 0}
    all_defects = []
    for s in sessions:
        for d in s.get("defects", []):
            sev = str(d["severity"])
            defect_counts[sev] += 1
            all_defects.append({**d, "participant_id": s["participant_id"]})

    sus_mean = sum(sus_scores) / n_sessions
    sus_sd = _sample_sd(sus_scores, sus_mean)

    part_rate_mean = sum(participant_unassisted_rates) / n_sessions
    part_rate_sd = _sample_sd(participant_unassisted_rates, part_rate_mean)

    low_burden_frac = (
        (low_tol_or_high_burden_count / qb_burden_evaluated_n) if qb_burden_evaluated_n > 0 else 0.0
    )

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
        "participant_mean_unassisted_rate_ge_80pct": part_rate_mean >= 0.80,
        "no_single_task_gt_30pct_failure": not any(
            st["exceeds_30pct_failure_threshold"] for st in step_breakdown
        ),
        "mean_sus_ge_70": sus_mean >= 70.0,
        "c_ask_escalation_triggered": (qb_burden_evaluated_n > 0 and low_burden_frac > 0.25),
    }

    stage2_ready_without_remediation = (
        go_gates["zero_s0_s1_defects"]
        and go_gates["saf1_saf2_first_attempt_100pct_no_copy_remediation_needed"]
        and go_gates["saf3_saf4_post_debrief_ge_90pct"]
        and go_gates["participant_mean_unassisted_rate_ge_80pct"]
        and go_gates["no_single_task_gt_30pct_failure"]
        and go_gates["mean_sus_ge_70"]
    )

    return {
        "report_type": "SYNTHETIC_PRE_STUDY_EXAMPLE_NOT_HUMAN_DATA"
        if is_synthetic
        else "STAGE_1_EXPLORATORY_USABILITY_REPORT",
        "is_synthetic_fixture": is_synthetic,
        "sample_size_n_participants": n_sessions,
        "inferential_epistemic_scope": (
            f"Formative exploratory usability audit across N={n_sessions} independent participants. "
            "Within-participant task completions (10 tasks/participant) are correlated repeated measures "
            "and are summarized at the participant level before step-level breakdowns. Small-N intervals are "
            "exploratory uncertainty bounds only—never population-wide efficacy, tariff certification, or savings claims."
        ),
        "participant_level_task_completion": {
            "n_participants": n_sessions,
            "mean_unassisted_proportion": round(part_rate_mean, 4),
            "sd_unassisted_proportion": round(part_rate_sd, 4),
            "median_unassisted_proportion": round(percentile_linear(participant_unassisted_rates, 0.5), 4),
            "iqr_unassisted_proportion": [
                round(percentile_linear(participant_unassisted_rates, 0.25), 4),
                round(percentile_linear(participant_unassisted_rates, 0.75), 4),
            ],
            "min_unassisted_proportion": round(min(participant_unassisted_rates), 4),
            "max_unassisted_proportion": round(max(participant_unassisted_rates), 4),
            "participants_all_10_unassisted_count": participants_all_10_unassisted,
            "per_participant": participant_task_summaries,
        },
        "pooled_repeated_measures_step_tally": {
            "note": (
                "Descriptive step-attempt sum across correlated within-participant tasks "
                "(NOT independent observations; no pooled binomial CI computed)."
            ),
            "total_participant_step_attempts": n_sessions * 10,
            "unassisted_count": unassisted_total,
            "assisted_count": assisted_total,
            "failed_count": failed_total,
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
            "qb1_answered_n": len(qb1_vals),
            "qb1_missing_na_n": n_sessions - len(qb1_vals),
            "qb1_intrusiveness_mean": round(sum(qb1_vals) / len(qb1_vals), 2) if qb1_vals else None,
            "qb2_answered_n": len(qb2_vals),
            "qb2_missing_na_n": n_sessions - len(qb2_vals),
            "qb2_effort_mean": round(sum(qb2_vals) / len(qb2_vals), 2) if qb2_vals else None,
            "qb_tolerance_answered_n": qb_tolerance_answered_n,
            "qb_tolerance_missing_na_n": n_sessions - qb_tolerance_answered_n,
            "qb_burden_evaluated_n": qb_burden_evaluated_n,
            "low_tolerance_or_high_burden_count": low_tol_or_high_burden_count,
            "low_tolerance_or_high_burden_fraction": round(low_burden_frac, 4),
            "willingness_to_try_median": round(percentile_linear(willingness_vals, 0.5), 2),
        },
        "safety_comprehension": safety_summary,
        "defect_counts": defect_counts,
        "defects": all_defects,
        "go_no_go_gates": go_gates,
        "stage2_go_without_ui_remediation": stage2_ready_without_remediation,
    }


def render_markdown_report(result: Dict[str, Any]) -> str:
    """Formats a transparent Markdown report separating exploratory descriptors from inferential claims."""
    banner = (
        "> [!CAUTION]\n"
        "> **SYNTHETIC PRE-STUDY EXAMPLE — NOT REAL PARTICIPANTS**\n"
        "> Generated solely to verify reproducible scoring and schema validation against "
        "`research/fixtures/stage1_synthetic_usability_sessions.json`. Zero real households have been tested.\n"
        if result["is_synthetic_fixture"]
        else "> [!NOTE]\n> **STAGE 1 EXPLORATORY USABILITY REPORT — ZERO SAVINGS OR EFFICACY CLAIMS**\n"
    )

    n = result["sample_size_n_participants"]
    ptc = result["participant_level_task_completion"]
    tally = result["pooled_repeated_measures_step_tally"]
    sus = result["sus_summary"]
    seq = result["seq_and_burden_summary"]
    gates = result["go_no_go_gates"]

    lines = [
        "# HearthShift AI — Stage 1 Usability & Safety Comprehension Analysis Report",
        "",
        banner,
        "---",
        "",
        "## 1. Cohort Scope & Inferential vs. Exploratory Boundaries",
        f"- **Independent Participants ($N$):** `{n}`",
        f"- **Epistemic Boundary:** {result['inferential_epistemic_scope']}",
        "",
        "## 2. Participant-Level Task Completion (Primary Descriptive Summary across N Independent People)",
        (
            f"- **Participant Unassisted Proportion (`/10` steps):** Mean `{ptc['mean_unassisted_proportion']*100:.1f}%` "
            f"(SD `{ptc['sd_unassisted_proportion']*100:.1f}%`), Median `{ptc['median_unassisted_proportion']*100:.1f}%` "
            f"(IQR `{ptc['iqr_unassisted_proportion'][0]*100:.1f}%–{ptc['iqr_unassisted_proportion'][1]*100:.1f}%`, "
            f"Range `{ptc['min_unassisted_proportion']*100:.1f}%–{ptc['max_unassisted_proportion']*100:.1f}%`)"
        ),
        f"- **Participants Completing All 10/10 Unassisted:** `{ptc['participants_all_10_unassisted_count']}/{n}`",
        "",
        "| Participant | Locale | Device | Unassisted (`2`) | Assisted (`1`) | Failed (`0`) | Rate |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]
    for p in ptc["per_participant"]:
        lines.append(
            f"| `{p['participant_id']}` | `{p['locale']}` | `{p['device']}` | "
            f"{p['unassisted_steps']} | {p['assisted_steps']} | {p['failed_steps']} | `{p['unassisted_rate']*100:.0f}%` |"
        )

    lines.extend(
        [
            "",
            "## 3. Step-by-Step Breakdown & Correlated Tally",
            (
                f"- **Repeated-Measures Attempt Tally (Correlated Within-Participant Steps — No Pooled Binomial CI):** "
                f"`{tally['total_participant_step_attempts']}` attempts — Unassisted (`2`): `{tally['unassisted_count']}`, "
                f"Assisted (`1`): `{tally['assisted_count']}`, Failed (`0`): `{tally['failed_count']}`"
            ),
            "",
            "| Step | Unassisted (`2`) | Assisted (`1`) | Failed (`0`) | Exploratory Unassisted Rate Across N (95% Clopper-Pearson CI) | Median Time (IQR) |",
            "| :--- | :---: | :---: | :---: | :---: | :---: |",
        ]
    )
    for st in tally["per_step"]:
        ci = st["exploratory_unassisted_ci95_across_n"]
        iqr = st["iqr_seconds"]
        lines.append(
            f"| {st['step_name']} | {st['unassisted_count']} | {st['assisted_count']} | "
            f"{st['failed_count']} | `{st['unassisted_rate']*100:.1f}%` "
            f"(`[{ci[0]*100:.1f}%, {ci[1]*100:.1f}%]`) | {st['median_seconds']}s ({iqr[0]}–{iqr[1]}s) |"
        )

    lines.extend(
        [
            "",
            "## 4. First-Attempt vs. Post-Debrief Safety Comprehension (`SAF-1` to `SAF-4`)",
            "*Initial misconceptions BEFORE moderator debriefing are never overwritten or masked.*",
            "",
            "| Probe | First-Attempt Pass (Exploratory 95% CI) | Initial Misconceptions | Post-Debrief Pass (Exploratory 95% CI) | UI Remediation Triggered? |",
            "| :--- | :---: | :---: | :---: | :---: |",
        ]
    )
    for probe, d in result["safety_comprehension"].items():
        c1 = d["exploratory_first_attempt_ci95"]
        c2 = d["exploratory_post_debrief_ci95"]
        flagged_pids = ", ".join(d["first_attempt_misconception_participants"]) or "None"
        lines.append(
            f"| **{probe}** | `{d['first_attempt_pass_count']}/{n}` "
            f"(`{d['first_attempt_pass_rate']*100:.1f}%`, `[{c1[0]*100:.1f}%, {c1[1]*100:.1f}%]`) | "
            f"`{flagged_pids}` | "
            f"`{d['post_debrief_pass_count']}/{n}` "
            f"(`{d['post_debrief_pass_rate']*100:.1f}%`, `[{c2[0]*100:.1f}%, {c2[1]*100:.1f}%]`) | "
            f"{'YES' if d['initial_misconception_detected'] else 'No'} |"
        )

    qb1_str = f"{seq['qb1_intrusiveness_mean']} (n={seq['qb1_answered_n']}/{n})" if seq["qb1_intrusiveness_mean"] is not None else f"N/A (0/{n})"
    qb2_str = f"{seq['qb2_effort_mean']} (n={seq['qb2_answered_n']}/{n})" if seq["qb2_effort_mean"] is not None else f"N/A (0/{n})"

    lines.extend(
        [
            "",
            "## 5. Individual Brooke SUS Scores, SEQ & Question Burden (Explicit Denominators)",
            (
                f"- **SUS Summary (`N={n}`):** Mean `{sus['mean']}` (SD `{sus['sd']}`), Median `{sus['median']}` "
                f"(IQR `{sus['iqr'][0]}–{sus['iqr'][1]}`, Range `{sus['min']}–{sus['max']}`)"
            ),
            f"- **SEQ Median Ease (`1–7`, `n={n}/{n}`):** Manual Bill = `{seq['seq_manual_bill_median']}`, CSV Import = `{seq['seq_csv_import_median']}`",
            (
                f"- **Question Burden (Missing / N/A Excluded from Denominator):** "
                f"`QB-1` Mean `{qb1_str}`, `QB-2` Mean `{qb2_str}`, "
                f"Evaluated `n={seq['qb_burden_evaluated_n']}/{n}`, "
                f"Low-Tolerance / High-Burden = `{seq['low_tolerance_or_high_burden_count']}/{seq['qb_burden_evaluated_n']}` "
                f"(`{seq['low_tolerance_or_high_burden_fraction']*100:.1f}%`, `c_ask` escalation triggered: `{gates['c_ask_escalation_triggered']}`)"
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
            "## 6. Defect Summary & Stage 1 -> Stage 2 Go/No-Go Check",
            f"- **Defects:** `S0={dc['S0']}`, `S1={dc['S1']}`, `S2={dc['S2']}`, `S3={dc['S3']}`",
            f"- **Zero S0/S1 Defects:** `{gates['zero_s0_s1_defects']}`",
            f"- **SAF-1 & SAF-2 First-Attempt 100% (No UI Remediation Required):** `{gates['saf1_saf2_first_attempt_100pct_no_copy_remediation_needed']}`",
            f"- **SAF-1 & SAF-2 Post-Debrief 100%:** `{gates['saf1_saf2_post_debrief_100pct']}`",
            f"- **Participant Mean Unassisted Completion >= 80%:** `{gates['participant_mean_unassisted_rate_ge_80pct']}`",
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
        f"[stage1_usability_scoring] n={scored['sample_size_n_participants']} "
        f"synthetic={scored['is_synthetic_fixture']} "
        f"sus_mean={scored['sus_summary']['mean']} "
        f"part_unassisted_mean={scored['participant_level_task_completion']['mean_unassisted_proportion']} "
        f"saf1_init={scored['safety_comprehension']['SAF-1']['first_attempt_pass_count']}/{scored['sample_size_n_participants']} "
        f"go_without_remediation={scored['stage2_go_without_ui_remediation']}"
    )


if __name__ == "__main__":
    main()
