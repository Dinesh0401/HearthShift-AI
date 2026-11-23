# Scientific Audit & Anomaly Investigation: Phase 2A Benchmark
## HearthShift AI — Root-Cause Analysis of Synthetic Benchmark Artifacts

**Document Status:** Formal Research Audit Report  
**Author:** Principal Research Team & Applied Mathematicians  
**Date:** November 23, 2026  
**Scope:** Investigation of 10 structural anomalies identified in Phase 2A synthetic evaluation.

---

## 1. Executive Summary of Root Causes

The Phase 2A engineering framework provided a working deterministic tariff engine and basic simulation loop, but its synthetic benchmark suffered from **five critical modeling misalignments**:

1. **Utility Scale Mismatch:** The soft discomfort penalty ($\lambda = ₹10.00/\text{unit}$) was two orders of magnitude smaller than typical monthly electricity bill savings (₹400–₹1,600). Consequently, net surplus $S - D$ was overwhelmingly positive for every action, causing the uncalibrated logistic acceptance model to output $P(\text{accept}) > 0.9999$ across all algorithms.
2. **Unconstrained Optimization vs. Hard Constraint Metric:** The evaluation harness tested a hard comfort constraint ($D(a, \theta) \le D_{\max} = 2.5$), but the Oracle (and all baselines) solved an unconstrained soft-penalty minimization. The Oracle knowingly accepted $D > 2.5$ because the monetary savings vastly outweighed the linear discomfort penalty.
3. **Ex-Ante vs. Ex-Post Information Mismatch in Oracle:** The Oracle advisor planned using baseline consumption $\mu_E$, but ex-post evaluation occurred on realized consumption $E = \mu_E + \epsilon_{\text{weather}}$. Slabs and cliff crossings between ex-ante and ex-post caused a 0.0002 regret gap.
4. **Coarse Action Discretization & Cliff Overshooting:** Every AC and water heater reduction action exceeded $43.2\text{ kWh}$. For households near the 500 kWh cliff ($490 \le E \le 520\text{ kWh}$), taking *any* action guaranteed falling below 500 kWh ($520 - 43.2 = 476.8 \le 500$), trivially producing 100% cliff avoidance.
5. **Linear EVSI Under-Valuation:** Linear tariff approximation eliminated the downside asymmetry of tariff jumps. Under linear rates, AC curtailment was dominant regardless of user preference answers, identically forcing $\text{EVSI}_{\text{linear}} \equiv 0 < c_{\text{ask}}$ and preventing B4 from ever asking a question.

---

## 2. Itemized Forensic Audit (Questions 1 to 10)

### 1. Why recommendation acceptance was 100% across every baseline
* **Code Location:** `research/simulator/feedback.py`, lines 78–96; `household.py`, line 39.
* **Mechanism:** Net perceived surplus was calculated in integer paise as $\Delta\text{Bill} - \lambda D(a, \boldsymbol{\theta}^*)$.
  - Monthly bill savings $\Delta\text{Bill}$ for AC curtailment ranged from $40{,}000$ to $160{,}000\text{ paise}$ (₹400–₹1,600).
  - With $\lambda = 1{,}000\text{ paise}$ (₹10.00/unit), discomfort for an action with feature 2.0 was only $2{,}000\text{ paise}$ (₹20.00).
  - Net surplus was $+38{,}000$ to $+158{,}000\text{ paise}$.
  - The logistic acceptance link used $\gamma = 0.002$: $\gamma \times \text{surplus} \ge 0.002 \times 38{,}000 = 76.0$.
  - The clipping boundary $[-20, 20]$ clipped this to $+20.0$, yielding $P(\text{accept}) = \frac{1}{1 + e^{-20}} = 0.999999998$.
* **Defect:** 
  - $\lambda$ was unrealistically small relative to household discomfort.
  - Hard comfort constraint violations ($D > D_{\max}$) were completely ignored by the acceptance model.
* **Remediation:** 
  - Calibrate $\lambda$ to reflect true willingness-to-pay for comfort (e.g. ₹150–₹300/unit of discomfort).
  - Introduce hard constraint rejection: if $D(a, \boldsymbol{\theta}^*) > D_{\max}$, user rejection is guaranteed ($P(\text{accept}) = 0$).

### 2. Why the full-information oracle reported 17.6% comfort violations
* **Code Location:** `research/simulator/environment.py`, line 152; `research/baselines/b5_oracle.py`, lines 34–37.
* **Mechanism:** The evaluation metric checked:
  $$\text{is\_comfort\_violated} = \left( D(a, \boldsymbol{\theta}^*) > D_{\max} \right), \quad D_{\max} = 2.5$$
  However, the Oracle solver minimized unconstrained loss:
  $$\min_{a \in \mathcal{A}} \left[ T(E - \Delta E(a)) + \lambda D(a, \boldsymbol{\theta}^*) \right]$$
  For an action with $D = 2.8$ and bill savings of ₹800, $\lambda D = ₹28.00$. The objective function chose the action because ₹800 savings $\gg$ ₹28 discomfort penalty, even though $2.8 > 2.5$.
* **Defect:** Disconnect between the optimization objective (unconstrained Lagrangian) and the evaluation criterion (hard constraint).
* **Remediation:** Explicitly enforce the feasible action set $\mathcal{A}_{\text{feas}}(\boldsymbol{\theta}^*) = \{a \in \mathcal{A} \mid D(a, \boldsymbol{\theta}^*) \le D_{\max}\}$ in the Oracle solver.

### 3. Why the oracle reported nonzero normalized regret (0.0002)
* **Code Location:** `research/baselines/b5_oracle.py`, line 34 vs `research/simulator/environment.py`, lines 128, 169.
* **Mechanism:**
  - `OracleAdvisor.decide()` evaluated loss using `household.baseline_kwh` ($\mu_E$).
  - `SimulationEnvironment.evaluate_decision()` generated stochastic weather jitter $E = \mu_E + \mathcal{N}(0, \sigma_w^2)$ and computed oracle loss using the realized $E$.
  - When weather jitter pushed consumption across a slab threshold, the optimal action at realized $E$ differed from the optimal action at baseline $\mu_E$.
* **Defect:** Ambiguity between an **Ex-Ante Oracle** (knows distribution $P(E)$ and $\boldsymbol{\theta}^*$) and an **Ex-Post Oracle** (knows realized $E$ and $\boldsymbol{\theta}^*$).
* **Remediation:** Formally define the Ex-Post Oracle as having access to $(E_{\text{realized}}, \boldsymbol{\theta}^*)$, ensuring its regret is identically $0.0000$.

### 4. Why every baseline reported 0.0% abstention
* **Code Location:** `research/baselines/b1_rule_based.py` through `b5_oracle.py`.
* **Mechanism:** In all five baselines, `decision_type` was hardcoded to `'recommend'`. Even when B1 selected `null_action`, it returned `decision_type='recommend'`. None of the baselines contained an abstention rule (e.g. checking whether expected net benefit is negative or uncertainty is too high).
* **Defect:** Baselines lacked the tri-state decision mechanism required by SPARE-HEM.
* **Remediation:** Equip baselines and candidate algorithms with explicit abstention gating: abstain when expected net benefit $\le 0$, when credible savings lower bound $Q_\alpha < c_{\min}$, or when no action satisfies comfort safety.

### 5. Why every baseline reported 100% tariff-cliff avoidance
* **Code Location:** `research/simulator/appliances.py`, lines 62, 71, 79, 137; `environment.py`, line 230.
* **Mechanism:**
  - The cliff test cohort was filtered to $E \in [490, 520]\text{ kWh}$.
  - The smallest AC reduction action in the action space was $\Delta E = 43.2\text{ kWh}$.
  - For any consumption up to $520\text{ kWh}$, $520 - 43.2 = 476.8 \le 500\text{ kWh}$.
  - Therefore, taking *any* non-null reduction action guaranteed crossing below 500 kWh.
* **Defect:** Unrealistic cliff test cases. There were no scenarios with small feasible curtailments (e.g. $\Delta E = 2\text{ kWh}$ or $5\text{ kWh}$), high weather uncertainty, or households unable/unwilling to curtail.
* **Remediation:** Introduce micro-actions ($\Delta E \in [1, 5]\text{ kWh}$), uncertain post-action consumption distributions, and households at 501–505 kWh where avoiding the cliff is infeasible or too uncomfortable.

### 6. Why the fixed-survey baseline (B2) was almost identical to the oracle
* **Code Location:** `research/baselines/b2_fixed_survey.py`, lines 26–30; `research/simulator/household.py`, lines 70–90.
* **Mechanism:**
  - The household model had exactly 3 appliance categories: AC (feature 0), Washing Machine (feature 1), Water Heater (feature 2).
  - The question pool had exactly 3 questions, each directly probing one appliance feature.
  - B2 asked all $K=3$ questions upfront, probing every single dimension of preference uncertainty.
  - The response noise in `sample_question_response` was small ($\sigma = 0.2$), yielding a near-perfect point estimate of $\boldsymbol{\theta}^*$.
* **Defect:** The parameter space was completely covered by the survey budget. In real homes, the space of comfort preferences is high-dimensional ($M \gg K$), and answers are noisy and uncalibrated.
* **Remediation:** Expand preference dimension ($M \ge 6$) or constrain survey budget ($K \le 2$), introduce realistic response noise and refusal rates, and include unobservable latent confounders.

### 7. Why B4 (Linear EVSI) asked no questions
* **Code Location:** `research/baselines/b4_linear_evsi.py`, lines 58–92.
* **Mechanism:**
  - B4 approximated the tariff as a flat rate: $\bar{r} = T(E) / E \approx ₹4.00/\text{kWh}$.
  - Under $\bar{r} = ₹4.00$, saving $43.2\text{ kWh}$ yielded ₹172.80.
  - Expected discomfort was $\le ₹20.00$.
  - Regardless of whether the user answered $y = +1$ (flexible) or $y = -1$ (inflexible), the optimal action remained AC curtailment because $172.80 \gg 20.00$.
  - Because the choice of action never changed based on the answer, $\text{EVSI} = \mathbb{E}_y[V(y)] - V_0 \equiv 0 < c_{\text{ask}}$ (₹2.00).
* **Defect:** Linearization flattened the decision landscape, eliminating the asymmetric downside of discomfort near tariff cliffs.
* **Remediation:** Test scenarios near marginal decisions (where savings $\approx$ discomfort) and introduce Exact-Tariff EVSI (B7) to prove the specific value of non-convex cliff modeling.

### 8. Whether all baselines used identical objective definitions and action sets
* **Finding:** No.
  - B1 used heuristic consumption thresholds.
  - B4 optimized linear surplus $\bar{r} \Delta E - \lambda D$.
  - B2, B3, B5 optimized exact nonlinear bill + soft discomfort.
  - None enforced hard comfort constraints or accounted for interaction/privacy costs in action selection.
* **Remediation:** Standardize downstream evaluation to a unified objective: net economic welfare subject to hard comfort constraints, with explicit accounting for interaction and privacy costs.

### 9. Whether reported realized savings are exclusively synthetic
* **Finding:** Yes. All savings reported in Phase 2A were computed purely via the synthetic simulation environment $\Delta \text{Bill} = T(E) - T(E - \Delta E)$. No physical smart meter hardware or real utility bills were used.
* **Remediation:** Formally declare all numerical metrics as **Synthetic Simulation Benchmarks**.

### 10. Whether hidden preference ground truth leaked into non-oracle policies
* **Finding:** No direct variable leakage occurred (`_theta_star` was not read by B1–B4). However, the synthetic response model was overly clean (Gaussian noise $\sigma = 0.2$), creating an artificially high signal-to-noise ratio where 1 question resolved 80% of parameter variance.
* **Remediation:** Increase question response noise, model survey non-response/fatigue dropout, and test preference non-stationarity (seasonal drift).

---

## 3. Corrective Action Plan for Gates 2 to 4

1. **Gate 2:** Standardize mathematical definitions of welfare, regret, hard constraints, and ex-post oracle optimality.
2. **Gate 3:** Introduce high-difficulty challenge scenarios (micro-actions, 499–502 kWh cliff edge, extreme discomfort, missing responses, seasonal drift).
3. **Gate 4:** Add Baselines B6 (Exact Passive), B7 (Exact-Tariff EVSI), B8 (Risk-Sensitive Passive), and B9 (Exact EVSI without Privacy Penalty).
