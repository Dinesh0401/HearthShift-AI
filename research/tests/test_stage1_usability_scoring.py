"""
Unit & negative validation tests for Stage 1 usability scoring (`stage1_usability_scoring.py`).
Covers Gate 1 (strict schema, rejection of truthiness/bool/string/missing/duplicate/out-of-range inputs,
explicit N/A denominators) and Gate 2 (participant-level non-independence + unmasked first-attempt safety).
"""

import copy
import json
from pathlib import Path

import pytest

from experiments.stage1_usability_scoring import (
    clopper_pearson_ci,
    compute_sus_score,
    render_markdown_report,
    score_stage1_sessions,
)


def _load_fixture():
    fixture_path = (
        Path(__file__).resolve().parents[1] / "fixtures" / "stage1_synthetic_usability_sessions.json"
    )
    return json.loads(fixture_path.read_text(encoding="utf-8"))


def test_brooke_sus_canonical_anchors():
    assert compute_sus_score([3] * 10) == 50.0
    assert compute_sus_score([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) == 100.0
    assert compute_sus_score([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]) == 0.0
    assert compute_sus_score([4, 2, 5, 2, 4, 2, 4, 2, 5, 2]) == 80.0


def test_clopper_pearson_exact_small_sample_uncertainty():
    lo, hi = clopper_pearson_ci(8, 8)
    assert hi == 1.0
    assert 0.62 <= lo <= 0.64

    lo0, hi0 = clopper_pearson_ci(0, 8)
    assert lo0 == 0.0
    assert 0.36 <= hi0 <= 0.38


def test_participant_level_aggregation_and_first_attempt_safety():
    payload = _load_fixture()
    result = score_stage1_sessions(payload)

    assert result["is_synthetic_fixture"] is True
    assert result["report_type"] == "SYNTHETIC_PRE_STUDY_EXAMPLE_NOT_HUMAN_DATA"
    assert result["sample_size_n_participants"] == 8

    # Participant-level descriptive summaries across N=8 independent participants
    ptc = result["participant_level_task_completion"]
    assert ptc["n_participants"] == 8
    assert ptc["participants_all_10_unassisted_count"] == 4
    assert ptc["mean_unassisted_proportion"] == pytest.approx(0.9375, abs=1e-4)

    # Correlated pooled tally explicitly separated without pooled binomial CI
    tally = result["pooled_repeated_measures_step_tally"]
    assert tally["total_participant_step_attempts"] == 80
    assert tally["unassisted_count"] == 75
    assert tally["assisted_count"] == 4
    assert tally["failed_count"] == 1
    assert "pooled_ci" not in tally

    # First-attempt SAF-1 misconception MUST stay preserved even though post-debrief is 8/8
    saf1 = result["safety_comprehension"]["SAF-1"]
    assert saf1["first_attempt_pass_count"] == 7
    assert saf1["first_attempt_misconception_participants"] == ["SYN-P04"]
    assert saf1["post_debrief_pass_count"] == 8
    assert saf1["initial_misconception_detected"] is True
    assert result["go_no_go_gates"]["saf1_saf2_post_debrief_100pct"] is True
    assert result["go_no_go_gates"]["saf1_saf2_first_attempt_100pct_no_copy_remediation_needed"] is False
    assert result["stage2_go_without_ui_remediation"] is False

    md = render_markdown_report(result)
    assert "SYNTHETIC PRE-STUDY EXAMPLE — NOT REAL PARTICIPANTS" in md
    assert "Participant-Level Task Completion" in md
    assert "SYN-P04" in md


def test_handles_na_question_burden_with_explicit_denominators():
    payload = _load_fixture()
    payload["sessions"][0]["qb_1_intrusiveness"] = "N/A"
    payload["sessions"][0]["qb_2_effort"] = None
    payload["sessions"][0]["question_tolerance"] = "N/A"
    payload["sessions"][1]["qb_1_intrusiveness"] = "na"
    payload["sessions"][1]["question_tolerance"] = None

    result = score_stage1_sessions(payload)
    seq = result["seq_and_burden_summary"]
    assert seq["qb1_answered_n"] == 6
    assert seq["qb1_missing_na_n"] == 2
    assert seq["qb2_answered_n"] == 7
    assert seq["qb_tolerance_answered_n"] == 6
    # SYN-P01 has all N/A -> excluded from qb_burden_evaluated_n (n=7, SYN-P02 kept via numeric qb1? No, P02 qb1='na' and tol=None -> also excluded -> n=6)
    assert seq["qb_burden_evaluated_n"] == 6
    # SYN-P03 & SYN-P06 low tolerance/high burden out of 6 evaluated = 2/6 = 0.3333 (>0.25 -> triggers escalation!)
    assert seq["low_tolerance_or_high_burden_fraction"] == pytest.approx(2.0 / 6.0, abs=1e-4)
    assert result["go_no_go_gates"]["c_ask_escalation_triggered"] is True


def test_all_na_question_burden_avoids_zero_division():
    payload = _load_fixture()
    for s in payload["sessions"]:
        s["qb_1_intrusiveness"] = "N/A"
        s["qb_2_effort"] = "N/A"
        s["question_tolerance"] = None
    result = score_stage1_sessions(payload)
    seq = result["seq_and_burden_summary"]
    assert seq["qb1_answered_n"] == 0
    assert seq["qb1_intrusiveness_mean"] is None
    assert seq["qb_burden_evaluated_n"] == 0
    assert result["go_no_go_gates"]["c_ask_escalation_triggered"] is False


# ── Negative Schema Validation Tests (Gate 1) ─────────────────────────────


@pytest.mark.parametrize("bad_safety", ["FAIL", "FALSE", "true", "false", 1, 0, None, "PASS"])
def test_rejects_non_boolean_safety_values(bad_safety):
    payload = _load_fixture()
    payload["sessions"][0]["safety_first_attempt"]["SAF-1"] = bad_safety
    with pytest.raises(ValueError, match="actual JSON boolean"):
        score_stage1_sessions(payload)


@pytest.mark.parametrize("bad_outcome", [True, False, 2.0, "2", "PASS", -1, 3, None])
def test_rejects_invalid_task_outcomes_no_bool_float_or_string(bad_outcome):
    payload = _load_fixture()
    payload["sessions"][0]["task_outcomes"][0] = bad_outcome
    with pytest.raises(ValueError, match="task_outcomes"):
        score_stage1_sessions(payload)


def test_rejects_wrong_length_or_missing_probe_keys():
    p_short = _load_fixture()
    p_short["sessions"][0]["task_outcomes"] = p_short["sessions"][0]["task_outcomes"][:9]
    with pytest.raises(ValueError, match="length 10"):
        score_stage1_sessions(p_short)

    p_missing_probe = _load_fixture()
    del p_missing_probe["sessions"][0]["safety_post_debrief"]["SAF-4"]
    with pytest.raises(ValueError, match="missing=\\['SAF-4'\\]"):
        score_stage1_sessions(p_missing_probe)


def test_rejects_duplicate_participant_id_and_invalid_locale_device():
    p_dup = _load_fixture()
    p_dup["sessions"][1]["participant_id"] = "SYN-P01"
    with pytest.raises(ValueError, match="Duplicate"):
        score_stage1_sessions(p_dup)

    p_loc = _load_fixture()
    p_loc["sessions"][0]["locale"] = "fr"
    with pytest.raises(ValueError, match="locale"):
        score_stage1_sessions(p_loc)

    p_dev = _load_fixture()
    p_dev["sessions"][0]["device"] = "tablet"
    with pytest.raises(ValueError, match="device"):
        score_stage1_sessions(p_dev)


def test_rejects_out_of_range_scales_and_invalid_qb_and_mixed_synthetic():
    p_sus = _load_fixture()
    p_sus["sessions"][0]["sus_items"][2] = 6
    with pytest.raises(ValueError, match="sus_items"):
        score_stage1_sessions(p_sus)

    p_seq = _load_fixture()
    p_seq["sessions"][0]["seq_manual_bill"] = 8
    with pytest.raises(ValueError, match="seq_manual_bill"):
        score_stage1_sessions(p_seq)

    p_qb = _load_fixture()
    p_qb["sessions"][0]["qb_1_intrusiveness"] = "bad_text"
    with pytest.raises(ValueError, match="qb_1_intrusiveness"):
        score_stage1_sessions(p_qb)

    p_sec = _load_fixture()
    p_sec["sessions"][0]["task_seconds"][0] = -5
    with pytest.raises(ValueError, match="task_seconds"):
        score_stage1_sessions(p_sec)

    p_mix = _load_fixture()
    p_mix["sessions"][0]["is_synthetic"] = False
    with pytest.raises(ValueError, match="mix synthetic"):
        score_stage1_sessions(p_mix)
