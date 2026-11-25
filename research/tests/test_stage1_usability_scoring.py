"""Unit tests verifying Stage 1 SUS scoring, unassisted/assisted separation, safety non-masking, and Clopper-Pearson CIs."""

import json
from pathlib import Path

import pytest

from experiments.stage1_usability_scoring import (
    clopper_pearson_ci,
    compute_sus_score,
    render_markdown_report,
    score_stage1_sessions,
)


def test_brooke_sus_canonical_anchors():
    # Neutral 3 across all 10 items = 50.0
    assert compute_sus_score([3] * 10) == 50.0
    # Ideal alternating 5 (odd), 1 (even) = 100.0
    assert compute_sus_score([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]) == 100.0
    # Worst alternating 1 (odd), 5 (even) = 0.0
    assert compute_sus_score([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]) == 0.0
    # Mixed realistic response: odd=[4,5,4,4,5]->(3+4+3+3+4=17), even=[2,2,2,2,2]->(3*5=15) -> 32*2.5 = 80.0
    assert compute_sus_score([4, 2, 5, 2, 4, 2, 4, 2, 5, 2]) == 80.0


def test_clopper_pearson_exact_small_sample_uncertainty():
    # Even 8/8 = 100% yields a lower 95% bound around 0.6306 — never 100% certainty
    lo, hi = clopper_pearson_ci(8, 8)
    assert hi == 1.0
    assert 0.62 <= lo <= 0.64

    lo0, hi0 = clopper_pearson_ci(0, 8)
    assert lo0 == 0.0
    assert 0.36 <= hi0 <= 0.38


def test_scoring_preserves_unassisted_assisted_and_first_attempt_safety():
    fixture_path = (
        Path(__file__).resolve().parents[1] / "fixtures" / "stage1_synthetic_usability_sessions.json"
    )
    payload = json.loads(fixture_path.read_text(encoding="utf-8"))
    result = score_stage1_sessions(payload)

    assert result["is_synthetic_fixture"] is True
    assert result["sample_size_n"] == 8

    # Must NOT collapse assisted tasks into unassisted tasks
    tc = result["task_completion_summary"]
    assert tc["total_step_attempts"] == 80
    assert tc["unassisted_count"] == 75
    assert tc["assisted_count"] == 4
    assert tc["failed_count"] == 1
    assert tc["overall_unassisted_rate"] == pytest.approx(0.9375, abs=1e-4)

    # First-attempt SAF-1 misconception (7/8) MUST remain visible even when post-debrief hits 8/8
    saf1 = result["safety_comprehension"]["SAF-1"]
    assert saf1["first_attempt_pass_count"] == 7
    assert saf1["post_debrief_pass_count"] == 8
    assert saf1["initial_misconception_detected"] is True
    assert result["go_no_go_gates"]["saf1_saf2_post_debrief_100pct"] is True
    assert result["go_no_go_gates"]["saf1_saf2_first_attempt_100pct_no_copy_remediation_needed"] is False
    assert result["stage2_go_without_ui_remediation"] is False

    # Synthetic P03 ('1') + P06 ('1' and QB-1=3) = 2/8 = 25%, exactly at boundary -> False (> 0.25)
    assert result["seq_and_burden_summary"]["low_tolerance_or_high_burden_fraction"] == pytest.approx(0.25, abs=1e-4)
    assert result["go_no_go_gates"]["c_ask_escalation_triggered"] is False

    md = render_markdown_report(result)
    assert "SYNTHETIC PRE-STUDY EXAMPLE — NOT REAL PARTICIPANTS" in md
    assert "First-Attempt Pass" in md
