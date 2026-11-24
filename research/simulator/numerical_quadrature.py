"""
Numerical Quadrature & Exact Piecewise Integration Engine
Performs rigorous numerical audits of:
1. Closed-form exact piecewise normal integration of TNPDCL LT-1A tariff.
2. 5-point and 11-point Gauss-Hermite numerical quadrature.
3. High-resolution Monte Carlo integration (20,000 draws).
4. Analysis of quantile distortion (Gaussian approximation vs empirical quantiles).
"""

from __future__ import annotations
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import numpy as np

# Ensure research root is in sys.path
research_dir = Path(__file__).resolve().parent.parent
if str(research_dir) not in sys.path:
    sys.path.insert(0, str(research_dir))

from simulator.tariffs import TariffPlan, calculate_bill, create_tnpdcl_lt1a_may2026_tariff
from simulator.appliances import EnergyAction


def standard_normal_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def standard_normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def truncated_normal_segment_moments(
    mu: float,
    sigma: float,
    a: float,
    b: float,
    slope: float,
    intercept: float,
) -> Tuple[float, float, float]:
    """
    Computes exact integral of (slope * X + intercept) and its square over [a, b] under X ~ N(mu, sigma^2).
    Returns (weight_prob, integral_value, integral_square_value).
    """
    if a >= b or sigma <= 1e-9:
        return 0.0, 0.0, 0.0

    alpha = (a - mu) / sigma
    beta = (b - mu) / sigma

    phi_alpha = standard_normal_pdf(alpha)
    phi_beta = standard_normal_pdf(beta)

    phi_diff = phi_alpha - phi_beta
    cdf_alpha = standard_normal_cdf(alpha)
    cdf_beta = standard_normal_cdf(beta)
    prob = max(0.0, cdf_beta - cdf_alpha)

    if prob <= 1e-15:
        return 0.0, 0.0, 0.0

    # First raw moment of X on [a, b]
    # int_a^b X phi(X) dX = mu * prob + sigma * (phi_alpha - phi_beta)
    int_x = mu * prob + sigma * phi_diff
    val = slope * int_x + intercept * prob

    # Second raw moment: int_a^b X^2 phi(X) dX
    # = (mu^2 + sigma^2) * prob + sigma * ( (a + mu)*phi_alpha - (b + mu)*phi_beta )
    term_second = (mu * mu + sigma * sigma) * prob + sigma * ((a + mu) * phi_alpha - (b + mu) * phi_beta)
    val_sq = (slope * slope) * term_second + 2.0 * slope * intercept * int_x + (intercept * intercept) * prob

    return prob, val, val_sq


def get_tnpdcl_may2026_linear_segments() -> List[Dict[str, float]]:
    """
    Returns exact linear pieces [a, b, slope, intercept] in paise for TNPDCL LT-1A May 2026.
    T(X) = slope * X + intercept.
    Cliff occurs at X = 500.0.
    """
    return [
        {'min': 0.0, 'max': 100.0, 'slope': 0.0, 'intercept': 0.0},
        {'min': 100.0, 'max': 200.0, 'slope': 0.0, 'intercept': 0.0},
        {'min': 200.0, 'max': 400.0, 'slope': 470.0, 'intercept': -94000.0},
        {'min': 400.0, 'max': 500.0, 'slope': 630.0, 'intercept': -158000.0},
        # CLIFF AT 500.0: JUMP OF +47,000 paise at 500.0001
        {'min': 500.0, 'max': 600.0, 'slope': 840.0, 'intercept': -216000.0},
        {'min': 600.0, 'max': 800.0, 'slope': 945.0, 'intercept': -279000.0},
        {'min': 800.0, 'max': 1000.0, 'slope': 1050.0, 'intercept': -363000.0},
        {'min': 1000.0, 'max': 3000.0, 'slope': 1155.0, 'intercept': -468000.0},
    ]


def exact_piecewise_tariff_moments(
    mu: float,
    sigma: float,
    tariff: Optional[TariffPlan] = None,
) -> Dict[str, float]:
    """
    Computes exact analytic expectation and variance of electricity bill under X ~ N(mu, sigma^2).
    Zero quadrature error.
    """
    if sigma <= 1e-4:
        from simulator.tariffs import calculate_bill, create_tnpdcl_lt1a_may2026_tariff
        t_plan = tariff or create_tnpdcl_lt1a_may2026_tariff()
        bill = calculate_bill(mu, t_plan)
        return {
            'mean_bill_paise': float(bill.net_payable_paise),
            'mean_bill_inr': float(bill.net_payable_paise / 100.0),
            'std_bill_paise': 0.0,
            'std_bill_inr': 0.0,
            'cliff_crossing_prob': 1.0 if mu > 500.0 else 0.0,
            'coverage_prob': 1.0,
        }

    segments = get_tnpdcl_may2026_linear_segments()

    total_mean_paise = 0.0
    total_second_moment_paise2 = 0.0
    total_prob = 0.0
    cliff_cross_prob = max(0.0, 1.0 - standard_normal_cdf((500.0 - mu) / sigma))

    for seg in segments:
        prob, val, val_sq = truncated_normal_segment_moments(
            mu, sigma, seg['min'], seg['max'], seg['slope'], seg['intercept']
        )
        total_prob += prob
        total_mean_paise += val
        total_second_moment_paise2 += val_sq

    variance_paise2 = max(0.0, total_second_moment_paise2 - (total_mean_paise * total_mean_paise))
    std_paise = math.sqrt(variance_paise2)

    return {
        'mean_bill_paise': total_mean_paise,
        'mean_bill_inr': total_mean_paise / 100.0,
        'std_bill_paise': std_paise,
        'std_bill_inr': std_paise / 100.0,
        'cliff_crossing_prob': cliff_cross_prob,
        'coverage_prob': total_prob,
    }


def gauss_hermite_tariff_expectation(
    mu: float,
    sigma: float,
    tariff: TariffPlan,
    n_points: int = 5,
) -> Dict[str, float]:
    """
    Standard Gauss-Hermite numerical quadrature over N nodes.
    """
    if n_points == 5:
        weights = np.array([0.0199532420567659, 0.3936193231522412, 0.9453087204829419, 0.3936193231522412, 0.0199532420567659])
        nodes = np.array([-2.0201828704560856, -0.9585724646138185, 0.0, 0.9585724646138185, 2.0201828704560856])
    elif n_points == 11:
        # Standard Hermite nodes & weights
        nodes, weights = np.polynomial.hermite.hermgauss(11)
        # Scaled to standard normal: x_i = sqrt(2)*node_i, weight_i = weight_i / sqrt(pi)
        nodes = nodes * math.sqrt(2.0)
        weights = weights / math.sqrt(math.pi)
    else:
        raise ValueError(f"Unsupported n_points: {n_points}")

    norm_weights = weights / np.sum(weights)
    samples = mu + sigma * nodes

    bills = np.array([calculate_bill(max(0.0, s), tariff).net_payable_paise for s in samples], dtype=float)
    mean_paise = float(np.dot(norm_weights, bills))
    var_paise = float(np.dot(norm_weights, (bills - mean_paise)**2))
    std_paise = math.sqrt(max(0.0, var_paise))

    # GH estimated cliff crossing probability
    cross_weight = float(np.sum(norm_weights[samples > 500.0]))

    return {
        'mean_bill_paise': mean_paise,
        'mean_bill_inr': mean_paise / 100.0,
        'std_bill_paise': std_paise,
        'std_bill_inr': std_paise / 100.0,
        'cliff_crossing_prob': cross_weight,
    }


def monte_carlo_tariff_moments(
    mu: float,
    sigma: float,
    tariff: TariffPlan,
    n_samples: int = 20000,
    rng: Optional[np.random.Generator] = None,
) -> Dict[str, float]:
    """
    High-resolution Monte Carlo integration with empirical quantiles.
    """
    rng = rng or np.random.default_rng(42)
    samples = np.maximum(0.0, rng.normal(mu, sigma, size=n_samples))
    bills = np.array([calculate_bill(s, tariff).net_payable_paise for s in samples], dtype=float)

    mean_paise = float(np.mean(bills))
    std_paise = float(np.std(bills, ddof=1))

    q01 = float(np.percentile(bills, 1))
    q05 = float(np.percentile(bills, 5))
    q10 = float(np.percentile(bills, 10))
    q50 = float(np.percentile(bills, 50))
    q95 = float(np.percentile(bills, 95))

    cross_rate = float(np.mean(samples > 500.0))

    return {
        'mean_bill_paise': mean_paise,
        'mean_bill_inr': mean_paise / 100.0,
        'std_bill_paise': std_paise,
        'std_bill_inr': std_paise / 100.0,
        'q01_paise': q01,
        'q05_paise': q05,
        'q10_paise': q10,
        'q50_paise': q50,
        'q95_paise': q95,
        'cliff_crossing_prob': cross_rate,
    }


def run_comprehensive_quadrature_audit() -> Dict[str, Any]:
    """
    Executes audit across consumption grid near 500 kWh cliff and generates comparison report.
    """
    tariff = create_tnpdcl_lt1a_may2026_tariff()
    grid_mu = [480.0, 490.0, 495.0, 498.0, 500.0, 501.0, 502.0, 505.0, 510.0, 520.0]
    sigmas = [4.0, 8.0, 15.0]

    audit_records = []

    for sigma in sigmas:
        for mu in grid_mu:
            exact = exact_piecewise_tariff_moments(mu, sigma, tariff)
            gh5 = gauss_hermite_tariff_expectation(mu, sigma, tariff, n_points=5)
            gh11 = gauss_hermite_tariff_expectation(mu, sigma, tariff, n_points=11)
            mc = monte_carlo_tariff_moments(mu, sigma, tariff, n_samples=25000)

            # Expected bill error in INR
            err_gh5_inr = gh5['mean_bill_inr'] - exact['mean_bill_inr']
            err_gh11_inr = gh11['mean_bill_inr'] - exact['mean_bill_inr']
            err_mc_inr = mc['mean_bill_inr'] - exact['mean_bill_inr']

            # Cliff probability discrepancy
            cliff_err_gh5 = gh5['cliff_crossing_prob'] - exact['cliff_crossing_prob']
            cliff_err_mc = mc['cliff_crossing_prob'] - exact['cliff_crossing_prob']

            # Quantile comparison: Gaussian formula (mu - 1.645*sigma) vs Empirical Q05
            gauss_q05_paise = exact['mean_bill_paise'] - 1.645 * exact['std_bill_paise']
            empirical_q05_paise = mc['q05_paise']
            quantile_discrepancy_inr = (gauss_q05_paise - empirical_q05_paise) / 100.0

            audit_records.append({
                'mu_kwh': mu,
                'sigma_kwh': sigma,
                'exact_mean_inr': round(exact['mean_bill_inr'], 2),
                'exact_std_inr': round(exact['std_bill_inr'], 2),
                'exact_cliff_prob': round(exact['cliff_crossing_prob'], 4),
                'gh5_mean_inr': round(gh5['mean_bill_inr'], 2),
                'gh5_err_inr': round(err_gh5_inr, 2),
                'gh5_cliff_prob': round(gh5['cliff_crossing_prob'], 4),
                'gh5_cliff_err': round(cliff_err_gh5, 4),
                'gh11_err_inr': round(err_gh11_inr, 2),
                'mc_mean_inr': round(mc['mean_bill_inr'], 2),
                'mc_err_inr': round(err_mc_inr, 2),
                'empirical_q05_inr': round(empirical_q05_paise / 100.0, 2),
                'gauss_approx_q05_inr': round(gauss_q05_paise / 100.0, 2),
                'quantile_discrepancy_inr': round(quantile_discrepancy_inr, 2),
            })

    return {
        'grid_evaluations': audit_records,
        'summary': {
            'max_gh5_abs_err_inr': max(abs(r['gh5_err_inr']) for r in audit_records),
            'max_gh11_abs_err_inr': max(abs(r['gh11_err_inr']) for r in audit_records),
            'max_cliff_prob_err': max(abs(r['gh5_cliff_err']) for r in audit_records),
            'max_quantile_discrepancy_inr': max(abs(r['quantile_discrepancy_inr']) for r in audit_records),
        }
    }


if __name__ == '__main__':
    res = run_comprehensive_quadrature_audit()
    print(f"Audit Summary: {res['summary']}")
    # Print sample near cliff
    cliff_samples = [r for r in res['grid_evaluations'] if r['sigma_kwh'] == 8.0 and 495.0 <= r['mu_kwh'] <= 505.0]
    for cs in cliff_samples:
        print(f"mu={cs['mu_kwh']:5.1f} | Exact: ₹{cs['exact_mean_inr']:7.2f} | GH5 Err: ₹{cs['gh5_err_inr']:+6.2f} | GH5 Cliff Prob: {cs['gh5_cliff_prob']:.2f} (True: {cs['exact_cliff_prob']:.2f}) | Q05 Disc: ₹{cs['quantile_discrepancy_inr']:+6.2f}")
