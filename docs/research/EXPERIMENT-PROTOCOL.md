# Experimental Protocol & Evaluation Framework
## HearthShift AI — Phase 2A/2B Scientific Methodology

**Document Status:** Approved Protocol Specification  
**Version:** 1.0.0  
**Date:** November 22, 2026  

---

## 1. Experimental Environment & Seed Schedule

To ensure 100% scientific reproducibility across runs, all stochastic simulations are strictly governed by fixed, versioned pseudo-random number generators:

* **PRNG Engine:** Python `numpy.random.default_rng(seed)`
* **Primary Evaluation Seeds:** `[42, 137, 2026, 777, 9999]` (5 independent seeds per experiment condition)
* **Household Population:** $N = 100$ heterogeneous synthetic households
* **Household Train / Test Split:** Disjoint 60% Train, 20% Validation, 20% Holdout Test households. Ground truth preferences $\boldsymbol{\theta}^*$ of holdout test households are never exposed during hyperparameter tuning.

---

## 2. Quantitative Evaluation Metrics

Every benchmark run records the following 10 formal metrics:

1. **Mean Normalized Decision Regret ($\bar{\mathcal{R}}$):**
   $$\bar{\mathcal{R}} = \frac{1}{N} \sum_{i=1}^N \frac{L(a_i, \boldsymbol{\theta}_i^*, E_i) - L(a_i^*, \boldsymbol{\theta}_i^*, E_i)}{L(a_0, \boldsymbol{\theta}_i^*, E_i) - L(a_i^*, \boldsymbol{\theta}_i^*, E_i) + \epsilon}$$
   Normalized between $0.0$ (matching Oracle B5) and $1.0$ (no benefit over status quo $a_0$).

2. **Realized Electricity Bill Savings ($\Delta \text{Bill}$):**
   $$\Delta \text{Bill} = \frac{1}{N} \sum_{i=1}^N \left[ T(E_i) - T(E_i - \Delta E(a_i)) \right]$$
   Measured in Indian Rupees (₹).

3. **Comfort Constraint Violation Rate ($\text{CVR}$):**
   $$\text{CVR} = \frac{\#\{i \mid D(a_i, \boldsymbol{\theta}_i^*) > D_{\max, i}\}}{N}$$
   Fraction of recommendations that exceed the household's maximum acceptable discomfort threshold.

4. **Interaction Query Count ($\bar{K}$):**
   $$\bar{K} = \frac{1}{N} \sum_{i=1}^N K_i \quad \text{subject to } K_i \le K_{\max}$$

5. **Recommendation Acceptance Rate ($\text{RAR}$):**
   Fraction of recommendations accepted when presented to the simulated household:
   $$\text{RAR} = \frac{\#\{i \mid y_i = +1\}}{\#\{i \mid a_i \ne a_0\}}$$

6. **Abstention Precision ($\text{AP}$):**
   Fraction of abstention events where taking the best naive action would have resulted in negative net benefit ($L(a) > L(a_0)$).

7. **Savings Lower-Bound Coverage Calibration ($\text{Cov}_{95}$):**
   $$\text{Cov}_{95} = \frac{1}{N} \sum_{i=1}^N \mathbb{I}\left( S(a_i) \ge Q_{0.05}(S(a_i)) \right)$$
   Empirical coverage should be $\ge 95\%$.

8. **Cliff Avoidance Success Rate ($\text{CASR}$):**
   For households with baseline consumption $E \in [495, 520]\text{ kWh}$ near the 500 kWh cliff, fraction of households successfully guided below 500 units.

9. **Time-Shifting False-Alarm Rate under Slab Tariff:**
   Number of time-shifting recommendations emitted under time-independent tariffs (target: identically 0).

10. **Computation Latency per Query Decision:**
    Execution time in milliseconds for computing $\text{EVSI}$ across all candidate questions. Target: $<50\text{ ms}$ on standard CPU.

---

## 3. Controlled Ablation Studies

1. **Ablation 1 (Threshold Awareness):** Replace nonlinear tariff $T(E)$ in $\text{EVSI}$ with linearized rate $\bar{r} \cdot E$. Observe regret degradation near the 500 kWh cliff.
2. **Ablation 2 (Abstention Gate):** Remove $Q_\alpha(S(a)) > c_{\text{min}}$ lower-bound condition (force always recommending best candidate). Observe surge in comfort violations and user rejection.
3. **Ablation 3 (Query Budget):** Vary $K_{\max} \in \{0, 1, 2, 3, 5, 10\}$. Plot Pareto frontier of Decision Regret vs. Interaction Burden.
