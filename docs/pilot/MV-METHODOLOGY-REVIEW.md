# Measurement & Verification (M&V) Methodology Review
## Assessment Against EVO IPMVP Option C & ASHRAE Guideline 14 Standards

**Document Status:** Engineering & Statistical Compliance Review  
**Version:** 1.0.0  
**Date:** November 25, 2026  
**Scope:** HearthShift AI Savings Provenance (`Tier 3: METER_OBSERVED`, `Tier 4: MEASUREMENT_VERIFIED`) & Future Scaling Roadmap  
**Related Specifications:** [`src/types/contracts.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/types/contracts.ts) · [`PHASE-3-PARITY-REPORT.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/research/PHASE-3-PARITY-REPORT.md) · [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md)

---

> [!IMPORTANT]
> **EXPLICIT COMPLIANCE & CERTIFICATION BOUNDARY**
> 1. **Weather normalization alone does NOT establish IPMVP Option C compliance.** Subtracting a simple degree-day adjustment or recording `weather_normalized: true` in software is insufficient under Efficiency Valuation Organization (EVO) International Performance Measurement and Verification Protocol (IPMVP) Option C and ASHRAE Guideline 14.
> 2. **HearthShift AI currently does NOT claim IPMVP Option C certification, ASHRAE Guideline 14 certification, or regulatory M&V verification status.**
> 3. The `MeasurementVerificationDetails` interface in [`src/types/contracts.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/types/contracts.ts#L422-L445) is presently a **data provenance metadata schema**—it does **not** execute automated IPMVP Option C baseline regressions, non-routine adjustments (NRAs), autocorrelation-corrected uncertainty budgets, or pre-registered M&V plans.

---

## 1. Executive Summary & Current Gap Assessment

HearthShift AI classifies savings estimates into four provenance tiers (`simulated`, `user_reported`, `meter_observed`, `measurement_verified`) to prevent simulated projections from being presented as empirical savings. However, promoting a household record to `meter_observed` or `measurement_verified` for external reporting, utility incentive programs, or academic causal claims requires adhering to rigorous physical and statistical standards—chiefly **IPMVP Option C (Whole Facility)** and **ASHRAE Guideline 14** (*Measurement of Energy, Demand, and Water Savings*).

| IPMVP Option C / ASHRAE 14 Requirement | Current HearthShift AI v1 Status | Gap Severity for Scaling |
| :--- | :--- | :---: |
| **1. Whole-Facility Measurement Boundary** | Implicitly uses user-entered TNPDCL bill kWh or imported CSV readings; lacks formal check for secondary meters, solar net-export, or backup inverters. | **Medium** |
| **2. Minimum Baseline Data Horizon** | Pilot eligibility allowed $\ge 3$ bi-monthly bills ($\ge 6$ months) or $\ge 14$ days CSV; far short of seasonal 12-month cycle. | **High (Blocker for Option C)** |
| **3. Routine Adjustments (CDD Regression & Goodness-of-Fit)** | No automated baseline regression solver, no $R^2$, $\text{CV(RMSE)}$, or $\text{NMBE}$ enforcement in `src/`. | **High (Blocker for Option C)** |
| **4. Non-Routine Adjustments (NRAs)** | `occupancy_verified` boolean exists in schema; no structured static-factor survey or quantitative NRA calculation protocol. | **High (Blocker for Option C)** |
| **5. Documented M&V Plan** | Not yet instantiated per site/cohort prior to reporting period. | **High (Blocker for Option C)** |
| **6. Fractional Savings Uncertainty (FSU) & Autocorrelation** | Schema carries generic `uncertainty_inr`; does not compute regression prediction variance, autocorrelation $n'$, or meter error propagation. | **High (Blocker for Option C)** |

---

## 2. Full IPMVP Option C & ASHRAE Guideline 14 Requirements for Scaling

Before HearthShift AI can legitimately claim IPMVP Option C–compliant savings verification at scale (outside randomized controlled trial comparisons), **all six engineering and statistical requirements below** must be implemented and audited.

### 2.1 Whole-Facility Utility Meter Measurement Boundary
Under IPMVP Option C, energy performance is evaluated at the **whole-facility level** using revenue-grade utility meter data (or continuous whole-premise interval telemetry covering the exact same electrical boundary):
- **Boundary Definition:** The boundary must encompass the **entire domestic LT-1A service connection** downstream of the TNPDCL revenue meter, capturing all major loads (AC, geyser, refrigeration, lighting, plug loads) and interactive effects (e.g., reduced internal heat gain or fan substitution).
- **Exclusions & Multi-Source Integrity:**
  - Unmetered backup power (diesel generators, off-grid solar/battery bypasses) must be either excluded from the boundary or separately metered so load shifting to unmeasured supply does not masquerade as savings.
  - Grid-tied rooftop solar PV homes require **gross household consumption** ($E_{\text{load}} = E_{\text{import}} + E_{\text{PV\_gen}} - E_{\text{export}}$) rather than net utility billed import alone, unless PV generation is explicitly modeled as a static factor with irradiance adjustment.
- **Interactive Effects Capture:** Option C automatically captures interactive effects (such as substituting a $60\text{ W}$ ceiling fan when raising AC setpoint by $+1^\circ\text{C}$), provided the entire residence sits inside the meter boundary.

### 2.2 Minimum Baseline Data Horizon
A statistically valid baseline regression cannot be fit on a short snippet of interval data or a single season:
- **Whole-Bill / Monthly Cadence:** Minimum **$\ge 12$ consecutive months** of utility billing data (**$\ge 6$ consecutive TNPDCL bi-monthly billing cycles**, and ideally **18–24 months** / 9–12 cycles given Tamil Nadu's bi-monthly cadence) so that the baseline covers the full annual meteorological range—including hot-dry peak summer (March–June), southwest/northeast monsoon periods, and cooler winter nights (December–February).
- **Daily / Interval Cadence:** If using smart-meter daily or hourly interval telemetry, a minimum of **$\ge 12$ months** (or at least a verified multi-season span covering full cooling and non-cooling operating regimes per ASHRAE Guideline 14) is required before projecting annual or cross-season counterfactuals.
- **Why Short Baselines Fail:** Using $14\text{ days}$ of CSV data or $3$ bi-monthly bills (6 months) violates seasonal representativeness; extrapolating a cool-season slope into a May heatwave induces severe out-of-range bias.

### 2.3 Routine Adjustments (Weather Normalization & Statistical Fit Thresholds)
Routine adjustments account for expected, recurring variation in independent variables—primarily outdoor weather and billing-period duration.

#### A. Degree-Day / Change-Point Regression Model
Because TNPDCL billing periods vary in length ($N_{\text{days}, i} \in [56, 64]\text{ days}$), consumption must be normalized to **average daily energy** $y_i = E_i / N_{\text{days}, i}$ ($\text{kWh/day}$) before fitting:
$$y_i = \alpha_0 + \beta_1 \overline{\text{CDD}}_i(T_{\text{bal}}) + \epsilon_i$$
where $\overline{\text{CDD}}_i(T_{\text{bal}}) = \frac{1}{N_{\text{days}, i}} \sum_{d \in \text{cycle } i} \max(0, T_{\text{mean}, d} - T_{\text{bal}})$ is mean daily Cooling Degree Days relative to a site-calibrated balance-point temperature $T_{\text{bal}}$ (typically evaluated over $18.3^\circ\text{C}\text{--}26.0^\circ\text{C}$ for Indian domestic AC thresholds, or via a 3-parameter cooling change-point model $\alpha_0 + \beta_1 (T_i - T_{\text{bal}})^+$ when daily weather/load data exist).

#### B. ASHRAE Guideline 14 Statistical Goodness-of-Fit Criteria
A baseline model is **rejected** as non-compliant if it fails any of the following diagnostic thresholds over the baseline period ($n$ observations, $p$ model parameters):

1. **Coefficient of Determination ($R^2$):**
   - Target **$R^2 \ge 0.75$** for weather-sensitive cooling residences (explanatory check; low $R^2$ indicates either negligible weather sensitivity or severe unmodeled occupancy/appliance variance).
2. **Coefficient of Variation of the Root Mean Square Error ($\text{CV(RMSE)}$):**
   $$\text{CV(RMSE)} = \frac{1}{\bar{y}} \sqrt{ \frac{\sum_{i=1}^{n} (y_i - \hat{y}_i)^2}{n - p} } \times 100\%$$
   - **ASHRAE Guideline 14 Threshold (Monthly / Billing-Cycle Models):** **$\text{CV(RMSE)} \le 15\%$** when reporting period spans $\le 12$ months (note: ASHRAE 14 also specifies $\le 20\%$ for models using daily data and $\le 30\%$ for hourly models, or stricter $\le 15\%$ for whole-building monthly baseline calibration).
3. **Normalized Mean Bias Error ($\text{NMBE}$):**
   $$\text{NMBE} = \frac{\sum_{i=1}^{n} (y_i - \hat{y}_i)}{(n - p)\,\bar{y}} \times 100\%$$
   *(Note: some texts divide by $n\bar{y}$; ASHRAE Guideline 14-2014 uses $(n - p)\bar{y}$, which is slightly stricter for small $n$.)*
   - **ASHRAE Guideline 14 Threshold:** **$|\text{NMBE}| \le 5\%$** for monthly/billing-cycle models ($|\text{NMBE}| \le 10\%$ for hourly models). By OLS algebra with an intercept, training-set $\text{NMBE} \approx 0\%$; however, **out-of-sample / holdout validation** or non-linear change-point models can exhibit non-zero bias and must satisfy $|\text{NMBE}| \le 5\%$.
4. **Additional Diagnostic Checks:**
   - **Physical Sign Check:** $\hat{\beta}_1 \ge 0$ for CDD (negative cooling slopes indicate misspecification or confounding).
   - **Residual Autocorrelation:** Check lag-1 autocorrelation $\rho_1$ (Durbin–Watson statistic $DW \approx 2(1 - \rho_1)$); if significant positive autocorrelation exists, apply the autocorrelation correction in Section 2.6.
   - **Extrapolation Guard:** Reporting-period weather ($\overline{\text{CDD}}_{\text{rep}}$) must stay within observed baseline range ($[\min \overline{\text{CDD}}_{\text{base}}, 1.1 \max \overline{\text{CDD}}_{\text{base}}]$).

### 2.4 Non-Routine Adjustments (NRAs)
Under IPMVP Option C, **static factors**—physical characteristics of the home expected to remain constant—must be tracked throughout both baseline and reporting periods. Whenever a static factor changes, a **Non-Routine Adjustment (NRA)** is mandatory; otherwise, whole-meter deltas cannot be attributed to HearthShift AI recommendations.

Required household NRA triggers and logging rules:
1. **Occupancy & Schedule Shifts:** Addition/departure of household members, extended travel ($>5$ vacant days in a cycle), transition between office commute and full-time work-from-home, or multi-week festival hosting.
2. **Floor Area & Envelope Modifications:** Room extensions, roof cool-coatings, shading additions, or window/door retrofits.
3. **Appliance Stock Changes:** Purchase or removal of high-draw loads (e.g., new split AC, electric vehicle charger, induction cooktop, replacement refrigerator, inverter battery bank).
4. **Tariff Structure & Rate Revisions:** Crucial under TNPDCL LT-1A—if TNERC or GoTN modifies slab rates, fixed charges, or the $500\text{ kWh}$ subsidy rule between baseline and reporting periods, **monetary savings MUST be evaluated by applying a single frozen statutory tariff schedule $T_{\text{ref}}(\cdot)$ to both the adjusted baseline energy $\hat{E}_{\text{adj}}$ and reporting energy $E_{\text{rep}}$**:
   $$\Delta \text{Bill}_{\text{OptionC}} = T_{\text{ref}}(\hat{E}_{\text{adj}}) - T_{\text{ref}}(E_{\text{rep}})$$
   never by comparing raw unadjusted INR bills across different tariff regimes.
5. **Meter Replacements & Estimated Reads:** Utility meter changeouts, CT ratio corrections, or multi-cycle estimated-bill true-ups must be excluded or reconciled before computing deltas.

### 2.5 Documented M&V Plan (Pre-Registered Before Reporting Period)
IPMVP requires a written, site- or cohort-specific **M&V Plan** finalized *before* post-intervention verification begins, containing:
- Facility/household ID (de-identified), meter ID (kept locally on device in privacy-preserving deployments), and exact physical measurement boundary;
- Defined baseline period dates, data resolution, and baseline static-factor inventory;
- Pre-specified routine adjustment model specification, weather station provenance (e.g., IMD/automated meteorological station matched by district), and acceptance criteria ($\text{CV(RMSE)}, \text{NMBE}, R^2$);
- Standard operating procedure for collecting periodic static-factor check-ins (NRA survey) and quantifying/excluding confounded cycles;
- Metering accuracy specifications, missing-data imputation boundaries (max gap allowed), and formal uncertainty calculation equations;
- Explicit sign-off and audit trail linking `SavingsRecord` outputs to versioned baseline regression parameters.

### 2.6 Formal Fractional Savings Uncertainty (FSU) with Autocorrelation Adjustment
Reporting point savings without uncertainty violates IPMVP Option C and ASHRAE Guideline 14 (Annex B). Let $n$ be the number of baseline observations, $p$ the number of regression parameters, $m$ the number of reporting-period observations summed to yield total energy savings $S_{\text{total}} = \sum_{j=1}^m (\hat{y}_{\text{adj}, j} - y_{\text{rep}, j}) N_{\text{days}, j}$ (or in daily-normalized units over $m$ periods).

1. **Baseline Model Prediction Standard Error ($\text{SE}_{\text{model}}$):**
   For $m$ reporting periods summed together, because every reporting prediction shares the same estimated baseline regression vector $\hat{\boldsymbol{\beta}}$, prediction errors across the $m$ reporting periods are **positively correlated** through parameter estimation uncertainty. Using the baseline residual standard error $s = \text{RMSE} = \sqrt{\frac{\sum_{i=1}^n (y_i - \hat{y}_i)^2}{n - p}}$ and design matrix $\mathbf{X}_{\text{base}} \in \mathbb{R}^{n \times p}$:
   $$\text{Var}\left(\sum_{j=1}^m \hat{y}_{\text{adj}, j}\right) = s^2 \left[ m + \left(\sum_{j=1}^m \mathbf{x}_{\text{rep}, j}\right)^\top (\mathbf{X}_{\text{base}}^\top \mathbf{X}_{\text{base}})^{-1} \left(\sum_{j=1}^m \mathbf{x}_{\text{rep}, j}\right) \right]$$
   Under the simplified ASHRAE Guideline 14 uniform-leverage approximation (for $p \approx 2\text{--}3$ when reporting weather matches baseline mean):
   $$\text{SE}_{\text{model, simp}} \approx s \cdot \sqrt{ m \left(1 + \frac{2}{n}\right) + \frac{m^2}{n} } \quad \text{(or with ASHRAE adjustment factor } 1.26\text{ for } p \text{ parameters)}$$
   Notice that the $m^2 / n$ term grows quadratically with reporting horizon $m$ when baseline $n$ is small—another mathematical reason why $n \ge 6\text{--}12$ billing cycles (or daily data) is essential.

2. **Autocorrelation Adjustment ($n'$ Effective Sample Size):**
   When interval (daily or hourly) data are modeled, consecutive residuals exhibit lag-1 serial correlation $\rho_1 \in (0, 1)$, causing naive OLS formulas to severely underestimate prediction variance. Per ASHRAE Guideline 14 Annex B, the effective independent baseline sample size $n'$ replaces $n$ in the uncertainty term:
   $$n' = n \cdot \frac{1 - \rho_1}{1 + \rho_1}$$
   and the effective reporting-period variance inflates accordingly across correlated residual sequences:
   $$\text{SE}_{\text{model, AC}} = \text{RMSE}_{\text{adj}} \cdot \sqrt{ m \cdot \frac{1 + \rho_1}{1 - \rho_1} \cdot \left(1 - \text{decay terms}\right) + \frac{m^2}{n'} \dots }$$
   *(Explicitly implementing the exact ASHRAE Guideline 14-2014 Annex B autocorrelation summation over lag covariances $\rho_1^k$ for $k = 1 \dots m-1$ prevents false statistical significance on daily/hourly smart-meter baselines.)*

3. **Combined Savings Uncertainty ($U_{\text{savings}}$) & Fractional Savings Uncertainty ($\text{FSU}$):**
   Combining baseline model uncertainty, utility meter instrumentation uncertainty ($u_{\text{meter}}$, e.g. $\pm 1.0\%$ for Class 1.0 meters), and non-routine adjustment uncertainty ($u_{\text{NRA}}$) in quadrature at confidence level $1 - \alpha$:
   $$U_{\text{savings}} = t_{\alpha/2, \, \text{df}_{\text{eff}}} \cdot \sqrt{ \text{SE}_{\text{model, AC}}^2 + u_{\text{meter}}^2 + u_{\text{NRA}}^2 }$$
   $$\text{FSU} = \frac{U_{\text{savings}}}{S_{\text{total}}}$$
   **IPMVP Significance Rule:** Savings at an individual home are **statistically indistinguishable from noise** unless $\text{FSU} < 50\%$ (typically evaluated at $68\%$ confidence [$t \approx 1.0$] for Option C screening, and at $90\%$ or $95\%$ confidence for formal claims).

---

## 3. Why Single-Household Option C Struggles — And How RCT Design Solves Causal Identification

A fundamental physics reality of residential energy conservation is the **signal-to-noise problem**:
- Typical behavioral curtailment yields **$3\%\text{ to }10\%$** whole-home savings ($S \approx 15\text{--}50\text{ kWh}$ per bi-monthly cycle on a $450\text{--}550\text{ kWh}$ home).
- Meanwhile, individual household bi-monthly $\text{CV(RMSE)}$ even after CDD normalization is commonly **$10\%\text{ to }20\%$** due to unmeasured occupancy swings, cooking/guests, and appliance cycling.
- Consequently, at a single household level over $m = 1\text{--}2$ reporting cycles, **$\text{FSU}$ frequently exceeds $100\%$**, making single-household IPMVP Option C verification inconclusive even when genuine savings occurred!

### Strategic Path for HearthShift AI
1. **Stage 2 Randomized Controlled Trial (Causal Identification via Control Group):**
   In [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md) and [`power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py), causal efficacy is evaluated across **randomized Treatment vs. Control cohorts** over concurrent calendar periods. The concurrent control arm absorbs shared meteorological shocks, macroeconomic trends, and tariff-schedule effects, while pre-period weather-normalized bills serve as an **ANCOVA variance-reduction covariate** (not as a standalone Option C proof).
2. **Future Option C Readiness Roadmap (Phase 4B / 5):**
   If future utility partnerships require individual-site IPMVP Option C verification:
   - Require $\ge 6$ historical bi-monthly bills ($\ge 12\text{ months}$) OR $\ge 12\text{ months}$ of daily interval telemetry;
   - Implement an on-device TypeScript OLS/CDD baseline fitter enforcing $\text{CV(RMSE)} \le 15\%$, $|\text{NMBE}| \le 5\%$, Durbin–Watson / $\rho_1$ autocorrelation correction, and formal FSU calculation;
   - Enforce an explicit static-factor NRA questionnaire every billing cycle before allowing `SavingsBasis = 'measurement_verified'` on any whole-home meter record;
   - Restrict `Tier 4: MEASUREMENT_VERIFIED` at the single-home level to either (a) **IPMVP Option A/B** dedicated sub-metered smart-plug / CT-clamp telemetry, or (b) Option C records whose pre-registered baseline passes all ASHRAE 14 criteria **and** achieves $\text{FSU} < 50\%$ at the stated confidence level.
