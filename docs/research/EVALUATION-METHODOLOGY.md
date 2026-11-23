# Reconstructed Evaluation Methodology & Metric Formalism
## HearthShift AI — Phase 2A/2B Rigorous Mathematical Standards

**Document Status:** Approved Mathematical Specification  
**Version:** 2.0.0 (Corrected Post-Audit)  
**Date:** November 23, 2026  
**Authors:** HearthShift AI Applied Mathematics & Research Team  

---

## 1. State Space, Physical Actions & Tariffs

### 1.1 Physical Consumption & Realization
Let $X_0 \in \mathbb{R}_+$ be the household's ex-ante expected consumption in kWh for a billing period.
The actual ex-post consumption $X$ realized at the meter is subject to exogenous weather and occupancy shocks:
$$X = \max\left(10.0, X_0 + \epsilon_W\right), \quad \epsilon_W \sim \mathcal{N}(0, \sigma_W^2)$$

### 1.2 Feasible Action Space
An action $a \in \mathcal{A}$ modifies household consumption:
$$\mathcal{A} = \mathcal{A}_{\text{red}} \cup \mathcal{A}_{\text{shift}} \cup \{a_0\}$$
where:
* $\Delta E(a) \ge 0$ is permanent energy reduction in kWh.
* $\boldsymbol{\phi}(a) \in \mathbb{R}_+^M$ is the observable disruption feature vector (e.g. thermostat adjustment, duration curtailment, schedule shift).
* For status quo $a_0$: $\Delta E(a_0) = 0, \boldsymbol{\phi}(a_0) = \mathbf{0}$.
* For load shifting $a \in \mathcal{A}_{\text{shift}}$: $\Delta E(a) = 0, \boldsymbol{\phi}(a) \ne \mathbf{0}$.

### 1.3 Exact Statutory Tariff Engine
$T(X) \in \mathbb{Z}_+$ computes utility bills in integer paise using verified statutory schedules.
$$\text{Under any time-independent slab tariff } (\partial T / \partial t = 0), \quad \forall a \in \mathcal{A}_{\text{shift}}, \; T(X) - T(X - \Delta E(a)) \equiv 0$$

---

## 2. Hard Comfort Constraints vs. Soft Dissatisfaction

To prevent unconstrained optimization from recommending intolerable lifestyle disruptions:

### 2.1 Latent Household Comfort Profile
Each household $i$ possesses:
1. Latent sensitivity vector $\boldsymbol{\theta}_i^* \in \mathbb{R}_+^M$
2. Marginal rate of substitution $\lambda_{\text{comfort}, i} > 0$ (paise per unit of discomfort)
3. **Hard Comfort Tolerance Limit** $D_{\max, i} > 0$

Nonmonetary discomfort score:
$$D(a, \boldsymbol{\theta}_i^*) = (\boldsymbol{\theta}_i^*)^\top \boldsymbol{\phi}(a)$$

### 2.2 Hard Feasibility Set
An action $a$ is **feasible and tolerable** for household $i$ if and only if:
$$a \in \mathcal{A}_{\text{feas}}(\boldsymbol{\theta}_i^*) \iff D(a, \boldsymbol{\theta}_i^*) \le D_{\max, i}$$

If an advisor recommends an action outside $\mathcal{A}_{\text{feas}}$, the action constitutes a **Hard Comfort Violation**, triggering immediate user rejection.

### 2.3 Monetary Dissatisfaction Cost
For feasible actions ($D \le D_{\max}$), the monetary equivalent discomfort is:
$$C_{\text{comfort}}(a, \boldsymbol{\theta}_i^*) = \lambda_{\text{comfort}, i} \cdot D(a, \boldsymbol{\theta}_i^*) \quad \text{[in paise]}$$
*Calibration:* $\lambda_{\text{comfort}}$ is calibrated to ₹150.00–₹300.00 per unit (15,000–30,000 paise), ensuring comfort tradeoffs are economically commensurate with monthly electricity bills.

---

## 3. Household Net Economic Welfare

The ex-post net economic welfare of executing action $a$ under realization $X$ and preferences $\boldsymbol{\theta}^*$ is:
$$U(a, X, \boldsymbol{\theta}^*) = \begin{cases} \Delta\text{Bill}(a, X) - C_{\text{comfort}}(a, \boldsymbol{\theta}^*) & \text{if } D(a, \boldsymbol{\theta}^*) \le D_{\max} \\ -\infty & \text{if } D(a, \boldsymbol{\theta}^*) > D_{\max} \end{cases}$$
where $\Delta\text{Bill}(a, X) = T(X) - T(\max(0, X - \Delta E(a)))$.

For status quo $a_0$: $U(a_0, X, \boldsymbol{\theta}^*) = 0$.

---

## 4. Formal Metric Definitions

### 4.1 Ex-Post Full-Information Oracle Action
The Ex-Post Oracle has complete access to $(X, \boldsymbol{\theta}^*)$ and solves:
$$a^*(X, \boldsymbol{\theta}^*) = \arg\max_{a \in \mathcal{A}_{\text{feas}}(\boldsymbol{\theta}^*)} U(a, X, \boldsymbol{\theta}^*)$$
Since $a_0 \in \mathcal{A}_{\text{feas}}$ and $U(a_0) = 0$, $U(a^*) \ge 0$.

### 4.2 Decision Regret
$$\text{Regret}(a \mid X, \boldsymbol{\theta}^*) = U(a^*(X, \boldsymbol{\theta}^*), X, \boldsymbol{\theta}^*) - U(a, X, \boldsymbol{\theta}^*) \ge 0$$
*Oracle Invariant:* $\text{Regret}(a^* \mid X, \boldsymbol{\theta}^*) \equiv 0.0000$.

### 4.3 Normalized Decision Regret ($\bar{\mathcal{R}}$)
$$\bar{\mathcal{R}}(a) = \frac{U(a^*) - U(a)}{U(a^*) + \epsilon_{\text{regret}}}, \quad \epsilon_{\text{regret}} = 100\text{ paise (₹1.00)}$$
* $\bar{\mathcal{R}} = 0.0$: Matches the Oracle.
* $\bar{\mathcal{R}} = 1.0$: Yields no improvement over doing nothing.
* $\bar{\mathcal{R}} > 1.0$: Degrades household welfare below status quo.

### 4.4 Realistic Recommendation Acceptance Model
When presented with recommendation $a \ne a_0$:
1. If $D(a, \boldsymbol{\theta}^*) > D_{\max}$: Hard violation $\implies P(\text{accept}) \equiv 0.0$.
2. If $D(a, \boldsymbol{\theta}^*) \le D_{\max}$: Bounded-rational logistic link:
   $$P(\text{accept} \mid a, X, \boldsymbol{\theta}^*) = \sigma\left( \gamma \cdot \left[ U(a, X, \boldsymbol{\theta}^*) - c_{\text{switch}} \right] \right)$$
   where:
   * $\gamma = 0.0002\text{ paise}^{-1}$ ($\gamma = 0.02\text{ INR}^{-1}$)
   * $c_{\text{switch}} = 3{,}000\text{ paise}$ (₹30.00 behavioral friction / cognitive overhead).

### 4.5 Comfort Constraint Violation Rate (CVR)
$$\text{CVR} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}\left( D(a_i, \boldsymbol{\theta}_i^*) > D_{\max, i} \right)$$

### 4.6 Abstention Rate & Abstention Precision
An algorithm chooses decision $d \in \{\text{RECOMMEND}(a), \text{ASK}(q), \text{ABSTAIN}\}$.
Abstention occurs when $d = \text{ABSTAIN}$ or $a = a_0$.
$$\text{Abstention Rate} = \frac{\#\{i \mid d_i = \text{ABSTAIN} \text{ or } a_i = a_0\}}{N}$$
$$\text{Abstention Precision (AP)} = \frac{\#\{i \in \text{Abstentions} \mid \max_{a \in \mathcal{A} \setminus \{a_0\}} U(a, X_i, \boldsymbol{\theta}_i^*) \le 0\}}{\#\{i \mid \text{Abstention}\}}$$
Measures whether the algorithm abstained when every non-null action was genuinely unfavorable or unsafe.

### 4.7 Cliff Avoidance Success Rate (CASR)
Evaluated strictly over the subset of households whose consumption is near a tariff cliff $\Xi$ ($X \in [\Xi - 10, \Xi + 25]\text{ kWh}$) and for whom safe avoidance is physically feasible ($\exists a \in \mathcal{A}_{\text{feas}} \text{ s.t. } X - \Delta E(a) \le \Xi$):
$$\text{CASR} = \frac{\#\{i \in \text{FeasibleCliffCohort} \mid X_i - \Delta E(a_i) \le \Xi \text{ AND } D(a_i, \boldsymbol{\theta}_i^*) \le D_{\max, i}\}}{\#\{i \in \text{FeasibleCliffCohort}\}}$$

### 4.8 Query Cost & Privacy Exposure
$$\bar{K} = \frac{1}{N} \sum_{i=1}^N K_i \le K_{\max}$$
Total interaction cost in paise:
$$C_{\text{interaction}} = \sum_{k=1}^{K_i} \left[ c_{\text{ask}} + c_{\text{priv}}(q_k) \right]$$
* $c_{\text{ask}} = 200\text{ paise}$ (₹2.00 annoyance cost)
* $c_{\text{priv}}(q) = 300\text{–}500\text{ paise}$ (₹3.00–₹5.00 privacy penalty for revealing sensitive appliance habits).

---

## 5. Statistical Rigor Protocol

1. **Separation of Counters:** Distinct households ($N=100$), evaluation seeds ($S=5$), and policy trials ($N \times S = 500$) are reported separately.
2. **Paired Evaluations:** All algorithms in an experiment are evaluated on the exact same realized consumption and preferences $(X_{i,s}, \boldsymbol{\theta}_{i,s}^*)$.
3. **Uncertainty Intervals:** Reported as Mean $\pm$ 95% Confidence Interval across seeds using Student's $t$-distribution ($df = S - 1$).
