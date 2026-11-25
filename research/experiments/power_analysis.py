"""
HearthShift AI — Phase 4A Statistical Power Analysis for Field RCT Endpoints

Computes exact finite-sample and asymptotic statistical power, required sample sizes,
attrition-inflated enrollment targets, and Minimum Detectable Effect sizes (MDEs)
for the two primary randomized controlled pilot endpoints:

  Endpoint A (Continuous): Normalized bi-monthly electricity bill / consumption reduction
      - Exact two-sided Student's t-test via non-central t (scipy.stats.nct)
      - Cross-checked against normal z-approximation and ANCOVA baseline-adjustment sensitivity
      - Evaluates d = 0.30 (small), d = 0.50 (conservative realistic), d = 0.80 (large)
      - Evaluates attrition inflation at 15% and 20%
      - Evaluates MDE and achieved power for N = 100 enrolled (50/arm -> ~80-85 completers)
        as well as legacy N = 30 protocol and powered N = 160 / N = 200 targets

  Endpoint B (Binary): 500 kWh statutory tariff-cliff avoidance rate among cliff-adjacent
      households (baseline 450-550 kWh)
      - Exact finite-sample two-sided Pearson chi-square power via full binomial enumeration
      - Standard Fleiss two-proportion z-formula (uncorrected and continuity-corrected)
      - Evaluates p_control vs p_treatment scenarios (25% vs 50%, 30% vs 55%, etc.)
      - Evaluates both Cliff-Enriched N=100 cohorts and Unselected All-Comer cohorts

Outputs machine-verified results to `research/results/power_analysis_phase4a.json`.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import optimize, stats


ALPHA = 0.05
TARGET_POWERS = (0.80, 0.90)
ATTRITION_RATES = (0.0, 0.15, 0.20)
EFFECT_SIZES_D = (0.30, 0.50, 0.80)


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint A: Continuous Two-Arm RCT Power (Exact Non-Central t)
# ─────────────────────────────────────────────────────────────────────────────


def two_sample_t_power(n_ctrl: int, n_trt: int, d: float, alpha: float = ALPHA) -> float:
    """
    Exact two-sided two-sample Student's t-test power using the non-central t distribution.

    Under equal variance, T = (Xbar_trt - Xbar_ctrl) / (s_p * sqrt(1/n_ctrl + 1/n_trt))
    follows nct(df = n_ctrl + n_trt - 2, nc = d * sqrt(n_ctrl * n_trt / (n_ctrl + n_trt))).
    """
    if n_ctrl < 2 or n_trt < 2:
        raise ValueError("Each arm must have at least 2 participants for df >= 2.")
    df = n_ctrl + n_trt - 2
    ncp = abs(d) * math.sqrt((n_ctrl * n_trt) / (n_ctrl + n_trt))
    t_crit = float(stats.t.ppf(1.0 - alpha / 2.0, df=df))
    upper_tail = float(stats.nct.sf(t_crit, df=df, nc=ncp))
    lower_tail = float(stats.nct.cdf(-t_crit, df=df, nc=ncp))

    # Guard against numerical NaN/underflow in SciPy nct at extreme ncp >> t_crit
    if math.isnan(upper_tail):
        cdf_val = float(stats.nct.cdf(t_crit, df=df, nc=ncp))
        upper_tail = 1.0 if (math.isnan(cdf_val) and ncp > t_crit + 6.0) else (1.0 - cdf_val)
    if math.isnan(lower_tail):
        lower_tail = 0.0
    if upper_tail == 0.0 and ncp - t_crit > 10.0:
        upper_tail = 1.0

    return float(min(1.0, max(0.0, upper_tail + lower_tail)))


def normal_approx_n_per_arm(d: float, target_power: float, alpha: float = ALPHA) -> int:
    """Asymptotic normal z-approximation sample size per arm (equal allocation)."""
    z_alpha = float(stats.norm.ppf(1.0 - alpha / 2.0))
    z_beta = float(stats.norm.ppf(target_power))
    return int(math.ceil(2.0 * ((z_alpha + z_beta) / d) ** 2))


def exact_t_n_per_arm(d: float, target_power: float, alpha: float = ALPHA, max_n: int = 5000) -> int:
    """Smallest balanced per-arm completer sample size achieving >= target_power via exact nct."""
    n_start = max(2, normal_approx_n_per_arm(d, target_power, alpha) - 3)
    for n in range(n_start, max_n + 1):
        if two_sample_t_power(n, n, d, alpha) >= target_power:
            return n
    raise RuntimeError(f"Did not reach target power {target_power} within n <= {max_n}.")


def mde_continuous_t(n_ctrl: int, n_trt: int, target_power: float, alpha: float = ALPHA) -> float:
    """Minimum detectable standardized effect size Cohen's d at given sample size and power."""
    if two_sample_t_power(n_ctrl, n_trt, 0.0, alpha) >= target_power:
        return 0.0

    # Tight analytical bracket around asymptotic MDE to stay well inside exact nct domain
    z_alpha = float(stats.norm.ppf(1.0 - alpha / 2.0))
    z_beta = float(stats.norm.ppf(target_power))
    n_eff = (n_ctrl * n_trt) / (n_ctrl + n_trt)
    d_asymp = (z_alpha + z_beta) / math.sqrt(n_eff)
    d_lo = max(1e-4, 0.5 * d_asymp)
    d_hi = min(4.0, 2.0 * d_asymp + 0.5)

    def obj(d_val: float) -> float:
        return two_sample_t_power(n_ctrl, n_trt, d_val, alpha) - target_power

    while obj(d_lo) > 0.0:
        d_lo *= 0.5
    while obj(d_hi) < 0.0:
        d_hi *= 1.5

    return float(optimize.brentq(obj, d_lo, d_hi, xtol=1e-7))


def inflate_for_attrition(n_per_arm_completers: int, attrition_rate: float) -> Dict[str, int]:
    """
    Computes balanced per-arm and total enrolled sample sizes accounting for attrition.
    Maintains equal allocation at enrollment: n_enrolled_per_arm = ceil(n_comp / (1 - r)).
    """
    if not (0.0 <= attrition_rate < 1.0):
        raise ValueError("Attrition rate must be in [0, 1).")
    if attrition_rate == 0.0:
        return {
            "per_arm_enrolled": n_per_arm_completers,
            "total_enrolled_balanced": 2 * n_per_arm_completers,
            "total_enrolled_unrounded_ceil": 2 * n_per_arm_completers,
        }
    per_arm_enrolled = int(math.ceil(n_per_arm_completers / (1.0 - attrition_rate)))
    total_unrounded_ceil = int(math.ceil((2 * n_per_arm_completers) / (1.0 - attrition_rate)))
    return {
        "per_arm_enrolled": per_arm_enrolled,
        "total_enrolled_balanced": 2 * per_arm_enrolled,
        "total_enrolled_unrounded_ceil": total_unrounded_ceil,
    }


def compute_ancova_sensitivity(
    n_comp_per_arm_t: int,
    d: float,
    target_power: float,
    rho: float,
    alpha: float = ALPHA,
) -> Dict[str, Any]:
    """
    Approximates required per-arm completers under ANCOVA adjusting for pre-period baseline
    with baseline-to-followup correlation rho: residual SD scales by sqrt(1 - rho^2),
    and residual df loses 1 degree of freedom for the baseline covariate.
    """
    scale = math.sqrt(1.0 - rho ** 2)
    effective_d = d / scale
    # Exact nct with 1 covariate df penalty approximated by solving for n with df = 2n - 3
    for n in range(3, n_comp_per_arm_t + 5):
        df = 2 * n - 3
        ncp = effective_d * math.sqrt(n / 2.0)
        t_crit = float(stats.t.ppf(1.0 - alpha / 2.0, df=df))
        pwr = float(stats.nct.sf(t_crit, df=df, nc=ncp) + stats.nct.cdf(-t_crit, df=df, nc=ncp))
        if pwr >= target_power:
            return {
                "rho": rho,
                "variance_reduction_factor": round(1.0 - rho ** 2, 4),
                "completers_per_arm": n,
                "completers_total": 2 * n,
                "enrolled_total_15pct_attrition": 2 * int(math.ceil(n / 0.85)),
                "enrolled_total_20pct_attrition": 2 * int(math.ceil(n / 0.80)),
                "exact_power_achieved": round(pwr, 6),
            }
    raise RuntimeError("ANCOVA sample size search failed.")


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint B: Binary Two-Proportion RCT Power (Cliff Avoidance Rate)
# ─────────────────────────────────────────────────────────────────────────────


def fleiss_two_proportion_n_per_arm(
    p0: float, p1: float, target_power: float, alpha: float = ALPHA
) -> Dict[str, int]:
    """
    Standard Fleiss / Kelsey two-proportion sample size per arm (equal allocation),
    both uncorrected and with Fleiss continuity correction.
    """
    if abs(p1 - p0) < 1e-9:
        raise ValueError("p0 and p1 must differ.")
    z_alpha = float(stats.norm.ppf(1.0 - alpha / 2.0))
    z_beta = float(stats.norm.ppf(target_power))
    p_bar = 0.5 * (p0 + p1)
    num = (
        z_alpha * math.sqrt(2.0 * p_bar * (1.0 - p_bar))
        + z_beta * math.sqrt(p0 * (1.0 - p0) + p1 * (1.0 - p1))
    ) ** 2
    n_uncorr_float = num / ((p1 - p0) ** 2)
    n_cc_float = (n_uncorr_float / 4.0) * (
        1.0 + math.sqrt(1.0 + 4.0 / (n_uncorr_float * abs(p1 - p0)))
    ) ** 2
    return {
        "n_per_arm_uncorrected": int(math.ceil(n_uncorr_float)),
        "n_per_arm_continuity_corrected": int(math.ceil(n_cc_float)),
        "n_float_uncorrected": n_uncorr_float,
    }


def normal_two_proportion_power(
    n_ctrl: int, n_trt: int, p0: float, p1: float, alpha: float = ALPHA
) -> float:
    """Asymptotic two-sided pooled-SE normal approximation power for two proportions."""
    p_bar = (n_ctrl * p0 + n_trt * p1) / (n_ctrl + n_trt)
    se_null = math.sqrt(p_bar * (1.0 - p_bar) * (1.0 / n_ctrl + 1.0 / n_trt))
    se_alt = math.sqrt((p0 * (1.0 - p0)) / n_ctrl + (p1 * (1.0 - p1)) / n_trt)
    if se_null <= 0.0 or se_alt <= 0.0:
        return 0.0
    z_alpha = float(stats.norm.ppf(1.0 - alpha / 2.0))
    diff = abs(p1 - p0)
    z_upper = (diff - z_alpha * se_null) / se_alt
    z_lower = (-diff - z_alpha * se_null) / se_alt
    return float(stats.norm.cdf(z_upper) + stats.norm.cdf(z_lower))


def exact_binomial_pearson_power(
    n_ctrl: int, n_trt: int, p0: float, p1: float, alpha: float = ALPHA
) -> float:
    """
    Exact finite-sample power of the two-sided Pearson chi-square test (df=1)
    by full enumeration over the product Binomial(n_ctrl, p0) x Binomial(n_trt, p1) PMF.
    """
    k0 = np.arange(0, n_ctrl + 1)[:, None]  # shape (n_ctrl+1, 1)
    k1 = np.arange(0, n_trt + 1)[None, :]   # shape (1, n_trt+1)
    n_tot = float(n_ctrl + n_trt)

    pmf0 = stats.binom.pmf(np.arange(0, n_ctrl + 1), n_ctrl, p0)[:, None]
    pmf1 = stats.binom.pmf(np.arange(0, n_trt + 1), n_trt, p1)[None, :]
    joint_pmf = pmf0 * pmf1

    # Verify numerical probability conservation
    total_mass = float(np.sum(joint_pmf))
    if abs(total_mass - 1.0) > 1e-9:
        raise AssertionError(f"Joint binomial PMF failed conservation: {total_mass}")

    total_succ = k0 + k1
    p_pool = total_succ / n_tot
    denom = p_pool * (1.0 - p_pool) * (1.0 / n_ctrl + 1.0 / n_trt)

    phat0 = k0 / n_ctrl
    phat1 = k1 / n_trt

    with np.errstate(divide="ignore", invalid="ignore"):
        z_sq = np.where(denom > 0.0, ((phat1 - phat0) ** 2) / denom, 0.0)

    chi2_crit = float(stats.chi2.ppf(1.0 - alpha, df=1))
    reject_mask = z_sq >= chi2_crit
    return float(np.sum(joint_pmf[reject_mask]))


def exact_binomial_n_per_arm(
    p0: float, p1: float, target_power: float, alpha: float = ALPHA, max_n: int = 350
) -> Tuple[int, float]:
    """Smallest equal per-arm n achieving >= target_power under exact binomial Pearson chi2."""
    approx = fleiss_two_proportion_n_per_arm(p0, p1, target_power, alpha)["n_per_arm_uncorrected"]
    start = max(5, approx - 8)
    for n in range(start, max_n + 1):
        pwr = exact_binomial_pearson_power(n, n, p0, p1, alpha)
        if pwr >= target_power:
            return n, pwr
    raise RuntimeError(f"Exact binomial search failed within n <= {max_n}.")


def mde_treatment_proportion(
    n_ctrl: int,
    n_trt: int,
    p0: float,
    target_power: float,
    alpha: float = ALPHA,
) -> Dict[str, float]:
    """
    Minimum detectable treatment rate p1 > p0 (and delta = p1 - p0) at fixed n_ctrl, n_trt
    under both exact finite-sample Pearson chi-square and asymptotic normal formulas.
    """
    def obj_exact(p1_val: float) -> float:
        return exact_binomial_pearson_power(n_ctrl, n_trt, p0, p1_val, alpha) - target_power

    def obj_normal(p1_val: float) -> float:
        return normal_two_proportion_power(n_ctrl, n_trt, p0, p1_val, alpha) - target_power

    p1_exact = float("nan")
    if obj_exact(0.999) >= 0.0:
        p1_exact = float(optimize.brentq(obj_exact, p0 + 1e-4, 0.999, xtol=1e-5))

    p1_normal = float("nan")
    if obj_normal(0.999) >= 0.0:
        p1_normal = float(optimize.brentq(obj_normal, p0 + 1e-4, 0.999, xtol=1e-5))

    return {
        "p0_control": p0,
        "mde_p1_exact_chi2": round(p1_exact, 4) if not math.isnan(p1_exact) else None,
        "mde_delta_pp_exact_chi2": round((p1_exact - p0) * 100.0, 2) if not math.isnan(p1_exact) else None,
        "mde_p1_normal": round(p1_normal, 4) if not math.isnan(p1_normal) else None,
        "mde_delta_pp_normal": round((p1_normal - p0) * 100.0, 2) if not math.isnan(p1_normal) else None,
    }


def cohens_h(p0: float, p1: float) -> float:
    return float(2.0 * math.asin(math.sqrt(p1)) - 2.0 * math.asin(math.sqrt(p0)))


# ─────────────────────────────────────────────────────────────────────────────
# Main Analysis Driver
# ─────────────────────────────────────────────────────────────────────────────


def run_power_analysis() -> Dict[str, Any]:
    results: Dict[str, Any] = {
        "metadata": {
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "alpha_two_sided": ALPHA,
            "target_powers": list(TARGET_POWERS),
            "attrition_rates": list(ATTRITION_RATES),
            "scipy_version": stats.scipy.__version__ if hasattr(stats, "scipy") else __import__("scipy").__version__,
            "numpy_version": np.__version__,
            "statistical_methods": {
                "endpoint_a_continuous": "Exact two-sided two-sample Student's t-test via non-central t (scipy.stats.nct), cross-checked with normal z-approx and ANCOVA variance reduction.",
                "endpoint_b_binary": "Exact finite-sample two-sided Pearson chi-square power via product-binomial enumeration, paired with Fleiss uncorrected and continuity-corrected normal approximations.",
            },
        },
        "endpoint_a_continuous": {
            "sample_size_requirements": [],
            "fixed_n_evaluation": [],
            "ancova_sensitivity_d050": [],
            "parametric_unit_translations": [],
        },
        "endpoint_b_binary_cliff_avoidance": {
            "sample_size_requirements": [],
            "fixed_n100_cliff_enriched": [],
            "fixed_n100_unselected_cohort": [],
            "mde_cliff_enriched_n100": [],
        },
    }

    # 1. Endpoint A: Sample size requirements across d = 0.30, 0.50, 0.80 and power = 0.80, 0.90
    d_labels = {
        0.30: "Small (d=0.30)",
        0.50: "Conservative realistic (d=0.50)",
        0.80: "Large (d=0.80)",
    }
    for d in EFFECT_SIZES_D:
        for pwr_target in TARGET_POWERS:
            n_exact = exact_t_n_per_arm(d, pwr_target)
            n_norm = normal_approx_n_per_arm(d, pwr_target)
            achieved_exact = two_sample_t_power(n_exact, n_exact, d)
            attrition_map = {}
            for r in ATTRITION_RATES:
                key = f"attrition_{int(round(r * 100))}pct"
                attrition_map[key] = inflate_for_attrition(n_exact, r)
            results["endpoint_a_continuous"]["sample_size_requirements"].append({
                "label": d_labels[d],
                "cohens_d": d,
                "target_power": pwr_target,
                "completers_per_arm_exact_t": n_exact,
                "completers_total_exact_t": 2 * n_exact,
                "completers_per_arm_normal_approx": n_norm,
                "exact_power_at_completers": round(achieved_exact, 6),
                "enrollment_by_attrition": attrition_map,
            })

    # 2. Endpoint A: Fixed N evaluations (Legacy N=30, N=100 under 0/15/20% attrition, Powered N=160, N=200)
    fixed_scenarios = [
        ("Legacy unpowered N=30 (0% attrition)", 15, 15, 30, 0.0),
        ("Legacy unpowered N=30 (20% attrition)", 12, 12, 30, 0.20),
        ("Candidate Pilot N=100 (0% attrition)", 50, 50, 100, 0.0),
        ("Candidate Pilot N=100 (15% attrition, balanced n=42/arm)", 42, 42, 100, 0.15),
        ("Candidate Pilot N=100 (15% attrition, N=85 asymmetric 42/43)", 42, 43, 100, 0.15),
        ("Candidate Pilot N=100 (20% attrition, n=40/arm)", 40, 40, 100, 0.20),
        ("Powered Stage 2 Target N=160 (20% attrition -> N=128)", 64, 64, 160, 0.20),
        ("Powered Stage 2 Target N=152 (15% attrition -> N=128)", 64, 64, 152, 0.15),
        ("High-Power Target N=200 (20% attrition -> N=160)", 80, 80, 200, 0.20),
    ]
    for desc, n_c, n_t, n_enr, att in fixed_scenarios:
        power_by_d = {
            f"d_{d:.2f}": round(two_sample_t_power(n_c, n_t, d), 6)
            for d in EFFECT_SIZES_D
        }
        mde_80 = mde_continuous_t(n_c, n_t, 0.80)
        mde_90 = mde_continuous_t(n_c, n_t, 0.90)
        results["endpoint_a_continuous"]["fixed_n_evaluation"].append({
            "scenario": desc,
            "enrolled_total": n_enr,
            "assumed_attrition_rate": att,
            "completers_control": n_c,
            "completers_treatment": n_t,
            "completers_total": n_c + n_t,
            "achieved_power": power_by_d,
            "mde_d_at_80pct_power": round(mde_80, 4),
            "mde_d_at_90pct_power": round(mde_90, 4),
        })

    # 3. Endpoint A: ANCOVA baseline-adjustment sensitivity for d=0.50
    n_d50_80 = exact_t_n_per_arm(0.50, 0.80)
    n_d50_90 = exact_t_n_per_arm(0.50, 0.90)
    for pwr_target, n_base in [(0.80, n_d50_80), (0.90, n_d50_90)]:
        for rho in (0.0, 0.50, 0.70):
            entry = compute_ancova_sensitivity(n_base, 0.50, pwr_target, rho)
            entry["target_power"] = pwr_target
            entry["cohens_d_unadjusted"] = 0.50
            results["endpoint_a_continuous"]["ancova_sensitivity_d050"].append(entry)

    # 4. Endpoint A: Illustrative physical/monetary translations (explicit parametric assumptions)
    for sigma_kwh, sigma_inr in [(30.0, 250.0), (45.0, 375.0), (60.0, 500.0)]:
        translations = {}
        for d in EFFECT_SIZES_D:
            translations[f"d_{d:.2f}"] = {
                "delta_kwh_per_bimonthly_cycle": round(d * sigma_kwh, 2),
                "delta_inr_per_bimonthly_cycle": round(d * sigma_inr, 2),
            }
        # Also evaluate N=100 (20% attrition -> n=40/arm, MDE=0.6341)
        mde_n80 = mde_continuous_t(40, 40, 0.80)
        translations["mde_n100_20pct_attrition_80pct_power"] = {
            "mde_d": round(mde_n80, 4),
            "delta_kwh_per_bimonthly_cycle": round(mde_n80 * sigma_kwh, 2),
            "delta_inr_per_bimonthly_cycle": round(mde_n80 * sigma_inr, 2),
        }
        results["endpoint_a_continuous"]["parametric_unit_translations"].append({
            "assumed_residual_sd_kwh": sigma_kwh,
            "assumed_residual_sd_inr": sigma_inr,
            "translations": translations,
        })

    # 5. Endpoint B: Binary 500 kWh cliff avoidance rate sample sizes
    proportion_pairs = [
        ("Conservative (+20 pp: 25% -> 45%)", 0.25, 0.45),
        ("Conservative (+20 pp: 30% -> 50%)", 0.30, 0.50),
        ("Primary Realistic (+25 pp: 25% -> 50%)", 0.25, 0.50),
        ("Primary Realistic (+25 pp: 30% -> 55%)", 0.30, 0.55),
        ("Optimistic (+30 pp: 20% -> 50%)", 0.20, 0.50),
        ("Large (+35 pp: 25% -> 60%)", 0.25, 0.60),
    ]
    for label, p0, p1 in proportion_pairs:
        h = cohens_h(p0, p1)
        for pwr_target in TARGET_POWERS:
            fleiss = fleiss_two_proportion_n_per_arm(p0, p1, pwr_target)
            n_exact_b, pwr_exact_b = exact_binomial_n_per_arm(p0, p1, pwr_target)
            results["endpoint_b_binary_cliff_avoidance"]["sample_size_requirements"].append({
                "scenario": label,
                "p_control": p0,
                "p_treatment": p1,
                "absolute_lift_pp": round((p1 - p0) * 100.0, 1),
                "cohens_h": round(h, 4),
                "target_power": pwr_target,
                "completers_per_arm_fleiss_uncorr": fleiss["n_per_arm_uncorrected"],
                "completers_total_fleiss_uncorr": 2 * fleiss["n_per_arm_uncorrected"],
                "completers_per_arm_fleiss_cc": fleiss["n_per_arm_continuity_corrected"],
                "completers_total_fleiss_cc": 2 * fleiss["n_per_arm_continuity_corrected"],
                "completers_per_arm_exact_binom_chi2": n_exact_b,
                "completers_total_exact_binom_chi2": 2 * n_exact_b,
                "exact_power_at_exact_n": round(pwr_exact_b, 6),
                "enrollment_by_attrition_exact_chi2": {
                    f"attrition_{int(round(r * 100))}pct": inflate_for_attrition(n_exact_b, r)
                    for r in ATTRITION_RATES
                },
                "enrollment_by_attrition_fleiss_cc": {
                    f"attrition_{int(round(r * 100))}pct": inflate_for_attrition(
                        fleiss["n_per_arm_continuity_corrected"], r
                    )
                    for r in ATTRITION_RATES
                },
            })

    # 6. Endpoint B: Fixed N=100 Cliff-Enriched evaluation (100% cliff-adjacent)
    enriched_n100_cases = [
        ("Enriched N=100 (0% attrition, n=50/arm)", 50, 50),
        ("Enriched N=100 (15% attrition, balanced n=42/arm)", 42, 42),
        ("Enriched N=100 (15% attrition, N=85 asymmetric 42/43)", 42, 43),
        ("Enriched N=100 (20% attrition, n=40/arm)", 40, 40),
    ]
    for desc, n_c, n_t in enriched_n100_cases:
        pair_powers = []
        for label, p0, p1 in proportion_pairs:
            p_exact = exact_binomial_pearson_power(n_c, n_t, p0, p1)
            p_norm = normal_two_proportion_power(n_c, n_t, p0, p1)
            pair_powers.append({
                "scenario": label,
                "p_control": p0,
                "p_treatment": p1,
                "exact_binom_chi2_power": round(p_exact, 6),
                "normal_approx_power": round(p_norm, 6),
            })
        results["endpoint_b_binary_cliff_avoidance"]["fixed_n100_cliff_enriched"].append({
            "cohort": desc,
            "completers_control": n_c,
            "completers_treatment": n_t,
            "completers_total": n_c + n_t,
            "power_by_pair": pair_powers,
        })

    # 7. Endpoint B: Fixed N=100 Unselected All-Comer RCT (only 25% or 40% cliff-adjacent)
    unselected_cases = [
        ("Unselected N=100, 25% cliff-adjacent, 20% attrition (n=10/arm)", 10, 10, 0.25, 0.20),
        ("Unselected N=100, 25% cliff-adjacent, 15% attrition (n=11/arm)", 11, 11, 0.25, 0.15),
        ("Unselected N=100, 40% cliff-adjacent, 20% attrition (n=16/arm)", 16, 16, 0.40, 0.20),
        ("Unselected N=100, 40% cliff-adjacent, 15% attrition (n=17/arm)", 17, 17, 0.40, 0.15),
    ]
    for desc, n_c, n_t, share, att in unselected_cases:
        sub_powers = []
        for label, p0, p1 in [
            ("Primary Realistic (+25 pp: 25% -> 50%)", 0.25, 0.50),
            ("Primary Realistic (+25 pp: 30% -> 55%)", 0.30, 0.55),
            ("Large (+35 pp: 25% -> 60%)", 0.25, 0.60),
        ]:
            sub_powers.append({
                "scenario": label,
                "p_control": p0,
                "p_treatment": p1,
                "exact_binom_chi2_power": round(exact_binomial_pearson_power(n_c, n_t, p0, p1), 6),
                "normal_approx_power": round(normal_two_proportion_power(n_c, n_t, p0, p1), 6),
            })
        results["endpoint_b_binary_cliff_avoidance"]["fixed_n100_unselected_cohort"].append({
            "cohort": desc,
            "cliff_adjacent_share": share,
            "attrition_rate": att,
            "effective_cliff_completers_per_arm": n_c,
            "effective_cliff_completers_total": n_c + n_t,
            "power_by_pair": sub_powers,
        })

    # 8. Endpoint B: MDE at N=100 Cliff-Enriched (40, 42, 50 per arm)
    for desc, n_c, n_t in enriched_n100_cases:
        for p0 in (0.25, 0.30):
            for pwr_target in TARGET_POWERS:
                mde_info = mde_treatment_proportion(n_c, n_t, p0, pwr_target)
                results["endpoint_b_binary_cliff_avoidance"]["mde_cliff_enriched_n100"].append({
                    "cohort": desc,
                    "completers_control": n_c,
                    "completers_treatment": n_t,
                    "target_power": pwr_target,
                    **mde_info,
                })

    # Save JSON
    out_path = Path(__file__).resolve().parent.parent / "results" / "power_analysis_phase4a.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Print formatted executive summary tables
    print("=" * 98)
    print("HEARTHSHIFT AI — PHASE 4A STATISTICAL POWER ANALYSIS (alpha = 0.05, two-sided)")
    print("=" * 98)

    print("\n[ENDPOINT A] Continuous Normalized Bill / kWh Reduction (Exact Non-Central t)")
    print(f"{'Effect Size':<32} | {'Power':<5} | {'Comp/Arm':<8} | {'Comp Tot':<8} | {'Enr(15%)':<8} | {'Enr(20%)':<8}")
    print("-" * 98)
    for row in results["endpoint_a_continuous"]["sample_size_requirements"]:
        e15 = row["enrollment_by_attrition"]["attrition_15pct"]["total_enrolled_balanced"]
        e20 = row["enrollment_by_attrition"]["attrition_20pct"]["total_enrolled_balanced"]
        print(
            f"{row['label']:<32} | {row['target_power']:<5.2f} | "
            f"{row['completers_per_arm_exact_t']:<8d} | {row['completers_total_exact_t']:<8d} | "
            f"{e15:<8d} | {e20:<8d}"
        )

    print("\n[ENDPOINT A] Fixed N Capabilities & Minimum Detectable Effect Sizes (MDE d)")
    print(f"{'Scenario':<54} | {'Comp':<5} | {'P(d=.3)':<7} | {'P(d=.5)':<7} | {'P(d=.8)':<7} | {'MDE80':<6} | {'MDE90':<6}")
    print("-" * 108)
    for row in results["endpoint_a_continuous"]["fixed_n_evaluation"]:
        p = row["achieved_power"]
        print(
            f"{row['scenario']:<54} | {row['completers_total']:<5d} | "
            f"{p['d_0.30']:<7.3f} | {p['d_0.50']:<7.3f} | {p['d_0.80']:<7.3f} | "
            f"{row['mde_d_at_80pct_power']:<6.3f} | {row['mde_d_at_90pct_power']:<6.3f}"
        )

    print("\n[ENDPOINT B] Binary 500 kWh Cliff Avoidance Rate — Required Sample Size")
    print(f"{'Pair (Ctrl -> Trt)':<38} | {'Power':<5} | {'Exact/Arm':<9} | {'ExactTot':<8} | {'CC Tot':<7} | {'Enr15%(Ex)':<10} | {'Enr20%(Ex)':<10}")
    print("-" * 108)
    for row in results["endpoint_b_binary_cliff_avoidance"]["sample_size_requirements"]:
        e15 = row["enrollment_by_attrition_exact_chi2"]["attrition_15pct"]["total_enrolled_balanced"]
        e20 = row["enrollment_by_attrition_exact_chi2"]["attrition_20pct"]["total_enrolled_balanced"]
        print(
            f"{row['scenario']:<38} | {row['target_power']:<5.2f} | "
            f"{row['completers_per_arm_exact_binom_chi2']:<9d} | {row['completers_total_exact_binom_chi2']:<8d} | "
            f"{row['completers_total_fleiss_cc']:<7d} | {e15:<10d} | {e20:<10d}"
        )

    print("\n[ENDPOINT B] Fixed N=100 Cliff-Enriched Power & MDE")
    for cohort in results["endpoint_b_binary_cliff_avoidance"]["fixed_n100_cliff_enriched"]:
        print(f"  {cohort['cohort']} (Total completers = {cohort['completers_total']}):")
        for pp in cohort["power_by_pair"]:
            print(
                f"    - {pp['scenario']:<38}: Exact chi2 power = {pp['exact_binom_chi2_power']:.3f} "
                f"(Normal approx = {pp['normal_approx_power']:.3f})"
            )

    print("\n[ENDPOINT B] Fixed N=100 Unselected All-Comer Power (Cliff Subgroup)")
    for cohort in results["endpoint_b_binary_cliff_avoidance"]["fixed_n100_unselected_cohort"]:
        print(f"  {cohort['cohort']}:")
        for pp in cohort["power_by_pair"]:
            print(
                f"    - {pp['scenario']:<38}: Exact chi2 power = {pp['exact_binom_chi2_power']:.3f} "
                f"(Normal approx = {pp['normal_approx_power']:.3f})"
            )

    print(f"\nSaved verified JSON results to: {out_path}")
    return results


if __name__ == "__main__":
    run_power_analysis()
