/**
 * HearthShift AI — Client-Side TR-VOI Decision Domain Contracts
 *
 * @module core/optimization/types
 */

import type {
  ApplianceCategory,
  ConfidenceLevel,
  DecisionOutcome,
  LocalizedString,
  SavingsBasis,
} from '../../types/contracts';

export interface ClientEnergyAction {
  id: string;
  applianceCategory: ApplianceCategory;
  actionType: 'reduction' | 'shift';
  title: LocalizedString;
  description: LocalizedString;
  deltaKwh: number;        // Bi-monthly kWh reduction (>0 for reduction, 0 for shift)
  shiftHours: number;      // Shift in hours (+ for delay, - for advance)
  featureVector: number[]; // [ac_sensitivity, wm_sensitivity, wh_sensitivity, stby_sensitivity]
  estimatedEffort: 'minimal' | 'moderate' | 'significant';
  assumptions: LocalizedString[];
}

export interface ClientAdaptiveQuestion {
  id: string;
  featureIndex: number;
  text: LocalizedString;
  category: ApplianceCategory;
  privacyCostPaise: number; // Annoyance / privacy friction penalty (e.g. 200 = ₹2.00)
  burdenScore: number;
}

export interface LatentPreferenceBelief {
  mu: number[];    // Length 4: [ac, wm, wh, stby]
  sigma: number[]; // Length 4 standard deviations
  updatedAt: string;
}

export interface TrVoiDecisionResult {
  outcome: DecisionOutcome;
  recommendedAction?: ClientEnergyAction;
  candidateQuestion?: ClientAdaptiveQuestion;
  pointEstimateSavingsPaise: number;
  conservativeLowerBoundPaise: number;
  expectedWelfarePaise: number;
  confidenceLevel: ConfidenceLevel;
  basis: SavingsBasis;
  assumptions: LocalizedString[];
  metadata: {
    decisionMetricPaise: number;
    askedQuestionIds: string[];
    isComfortSafe: boolean;
  };
}

export interface TrVoiConfig {
  alphaQuantile?: number;         // Default 0.05 (z = 1.645)
  deltaComfortRisk?: number;      // Default 0.05 (5% comfort risk budget)
  cMinPaise?: number;             // Default 3000 paise (₹30.00 minimum noticeable benefit)
  costAskPaise?: number;          // Default 200 paise (₹2.00 annoyance cost)
  lambdaDiscomfortPaise?: number; // Default 20000 paise (₹200.00 per unit discomfort)
  dMaxNominal?: number;           // Default 2.0 (conservative 1.0 for sensitive users)
  consumptionSigmaKwh?: number;   // Default 8.0 kWh weather volatility
}
