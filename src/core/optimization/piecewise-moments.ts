/**
 * HearthShift AI — Analytical Piecewise Tariff Moment Integrator
 *
 * Computes closed-form truncated normal first/second moments across statutory
 * piecewise-linear slab tariffs (including TNPDCL LT-1A 500 kWh subsidy cliff),
 * with Gauss-Hermite fallback for arbitrary custom tariff schedules.
 *
 * @module core/optimization/piecewise-moments
 */

import type { TariffPlan } from '../tariff/types';
import { calculateBill } from '../tariff/calculator';

export function standardNormalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

export function standardNormalCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

/**
 * Standard numerical approximation for the error function erf(z).
 */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return sign * y;
}

interface PiecewiseSegment {
  min: number;
  max: number;
  slope: number;
  intercept: number;
}

const TARIFF_SEGMENT_SPECS: Record<
  string,
  { cliffThreshold: number | null; segments: PiecewiseSegment[] }
> = {
  'in-tnpdcl-lt1a-may2026': {
    cliffThreshold: 500.0,
    segments: [
      { min: 0.0, max: 200.0, slope: 0.0, intercept: 0.0 },
      { min: 200.0, max: 400.0, slope: 470.0, intercept: -94000.0 },
      { min: 400.0, max: 500.0, slope: 630.0, intercept: -158000.0 },
      { min: 500.0, max: 600.0, slope: 840.0, intercept: -216000.0 },
      { min: 600.0, max: 800.0, slope: 945.0, intercept: -279000.0 },
      { min: 800.0, max: 1000.0, slope: 1050.0, intercept: -363000.0 },
      { min: 1000.0, max: 3000.0, slope: 1155.0, intercept: -468000.0 },
    ],
  },
  'in-tnpdcl-lt1a-2025': {
    cliffThreshold: 500.0,
    segments: [
      { min: 0.0, max: 100.0, slope: 0.0, intercept: 0.0 },
      { min: 100.0, max: 200.0, slope: 235.0, intercept: -23500.0 },
      { min: 200.0, max: 400.0, slope: 470.0, intercept: -70500.0 },
      { min: 400.0, max: 500.0, slope: 630.0, intercept: -134500.0 },
      { min: 500.0, max: 600.0, slope: 840.0, intercept: -216000.0 },
      { min: 600.0, max: 800.0, slope: 945.0, intercept: -279000.0 },
      { min: 800.0, max: 1000.0, slope: 1050.0, intercept: -363000.0 },
      { min: 1000.0, max: 3000.0, slope: 1155.0, intercept: -468000.0 },
    ],
  },
  'in-tnpdcl-lt1a-2024': {
    cliffThreshold: 500.0,
    segments: [
      { min: 0.0, max: 100.0, slope: 0.0, intercept: 0.0 },
      { min: 100.0, max: 200.0, slope: 225.0, intercept: -22500.0 },
      { min: 200.0, max: 400.0, slope: 450.0, intercept: -67500.0 },
      { min: 400.0, max: 500.0, slope: 600.0, intercept: -127500.0 },
      { min: 500.0, max: 600.0, slope: 800.0, intercept: -205000.0 },
      { min: 600.0, max: 800.0, slope: 900.0, intercept: -265000.0 },
      { min: 800.0, max: 1000.0, slope: 1000.0, intercept: -345000.0 },
      { min: 1000.0, max: 3000.0, slope: 1100.0, intercept: -445000.0 },
    ],
  },
  'generic-flat-inr': {
    cliffThreshold: null,
    segments: [{ min: 0.0, max: 5000.0, slope: 525.0, intercept: 5000.0 }],
  },
  'generic-tou-inr': {
    cliffThreshold: null,
    segments: [{ min: 0.0, max: 5000.0, slope: 700.0, intercept: 0.0 }],
  },
};

/**
 * Closed-form analytical integration of piecewise linear tariff segments under X ~ N(mu, sigma^2).
 * Uses closed-form truncated normal moments for supported statutory/flat/TOU schedules,
 * and falls back to 7-point Gauss-Hermite numerical integration for arbitrary custom plans.
 */
export function exactPiecewiseTariffMoments(
  muKwh: number,
  sigmaKwh: number = 8.0,
  tariff: TariffPlan
): { meanBillPaise: number; stdBillPaise: number; cliffCrossingProb: number } {
  const segmentSpec = TARIFF_SEGMENT_SPECS[tariff.id] ?? null;
  const cliffThreshold = segmentSpec?.cliffThreshold ?? null;

  // If sigma is tiny, evaluate deterministic point estimate
  if (sigmaKwh <= 1e-4) {
    const bill = calculateBill(Math.max(0.0, muKwh), tariff);
    return {
      meanBillPaise: bill.net_payable_paise,
      stdBillPaise: 0.0,
      cliffCrossingProb: cliffThreshold !== null && muKwh > cliffThreshold ? 1.0 : 0.0,
    };
  }

  if (!segmentSpec) {
    // General fallback via 7-point Gauss-Hermite quadrature for arbitrary TariffPlan definitions
    const ghNodes = [
      -2.6519613568, -1.6735516288, -0.8162878829, 0.0, 0.8162878829, 1.6735516288, 2.6519613568,
    ];
    const ghWeights = [
      0.0005482689, 0.0307571240, 0.2401231786, 0.4571428571, 0.2401231786, 0.0307571240, 0.0005482689,
    ];
    const bills = ghNodes.map((z) =>
      calculateBill(Math.max(0.0, muKwh + sigmaKwh * Math.sqrt(2.0) * z), tariff).net_payable_paise
    );
    const meanBillPaise = bills.reduce((acc, b, idx) => acc + b * ghWeights[idx], 0);
    const variance = bills.reduce(
      (acc, b, idx) => acc + ((b - meanBillPaise) ** 2) * ghWeights[idx],
      0
    );
    return {
      meanBillPaise,
      stdBillPaise: Math.sqrt(Math.max(0.0, variance)),
      cliffCrossingProb: 0.0,
    };
  }

  const { segments } = segmentSpec;
  let totalMeanPaise = 0.0;
  let totalSecondMomentPaise2 = 0.0;
  const cliffCrossingProb =
    cliffThreshold !== null
      ? Math.max(0.0, 1.0 - standardNormalCdf((cliffThreshold - muKwh) / sigmaKwh))
      : 0.0;

  for (const seg of segments) {
    const alpha = (seg.min - muKwh) / sigmaKwh;
    const beta = (seg.max - muKwh) / sigmaKwh;

    const phiAlpha = standardNormalPdf(alpha);
    const phiBeta = standardNormalPdf(beta);

    const cdfAlpha = standardNormalCdf(alpha);
    const cdfBeta = standardNormalCdf(beta);
    const prob = Math.max(0.0, cdfBeta - cdfAlpha);

    if (prob <= 1e-15) continue;

    // Truncated normal first moment: int_a^b X phi(X) dX
    const intX = muKwh * prob + sigmaKwh * (phiAlpha - phiBeta);
    const val = seg.slope * intX + seg.intercept * prob;

    // Truncated normal second moment: int_a^b X^2 phi(X) dX
    const termSecond =
      (muKwh * muKwh + sigmaKwh * sigmaKwh) * prob +
      sigmaKwh * ((seg.min + muKwh) * phiAlpha - (seg.max + muKwh) * phiBeta);
    const valSq =
      (seg.slope * seg.slope) * termSecond +
      2.0 * seg.slope * seg.intercept * intX +
      (seg.intercept * seg.intercept) * prob;

    totalMeanPaise += val;
    totalSecondMomentPaise2 += valSq;
  }

  const variancePaise2 = Math.max(0.0, totalSecondMomentPaise2 - totalMeanPaise * totalMeanPaise);
  const stdBillPaise = Math.sqrt(variancePaise2);

  return {
    meanBillPaise: totalMeanPaise,
    stdBillPaise,
    cliffCrossingProb,
  };
}
