# Research Specification: SPARE-HEM
## Sparse-feedback, Privacy-Aware, Risk-sensitive Energy Management
### Mathematical Foundations, Decision Theory, and Experimental Protocol

**Document Status:** Candidate Research Specification  
**Version:** 0.1.0-draft  
**Date:** November 22, 2026  
**Authors:** HearthShift AI Research & Engineering Team  

---

## 1. Research Problem & Core Question

Standard Home Energy Management Systems (HEMS) frame the residential optimization problem as either:
1. **Consumption Forecasting:** $\hat{y}_{t+1} = f(y_{1:t}, \text{weather}_t)$
2. **Appliance Disaggregation (NILM):** $\hat{e}^{(i)}_t = g(E_t)$
3. **Full-Information Schedule Optimization:** $\min_x \text{Cost}(x) + \text{Discomfort}(x)$ assuming a fully known user utility function.

In real-world households, these formulations suffer from three compounding failures:
* **The Telemetry Paradox:** Accurately measuring appliance-level discomfort requires invasive sensors or high-frequency telemetry that violate domestic privacy.
* **The Survey Fatigue Wall:** Questioning households about their preferences causes rapid abandonment (survey attrition $>70\%$ after 3 days).
* **The Noisy Baseline Fallacy:** Savings reported against synthetic, uncalibrated baselines lead to phantom savings claims that evaporate on the actual utility bill.

We formulate the core research question from first principles:
$$\mathbf{Q}^* = \text{"What is the minimal information subset } \mathcal{I}^* \subset \mathcal{X} \text{ such that an energy recommendation } a^* \text{ achieves } \ge 95\% \text{ of the optimal policy value, subject to zero external telemetry and bounded interaction burden?"}$$

---

## 2. Critical Related Work & Novelty Audit

To establish genuine scientific integrity, we explicitly acknowledge and benchmark against existing literature:

### 2.1 Existing Academic & Commercial Systems
* **Sense & Emporia Energy (Commercial Prior Art):** Provide high-resolution monitoring and heuristic load identification. Both require cloud ingestion of private electrical signatures and offer static rule-based scheduling.
* **Edge-based Privacy-Preserving Energy Recommendations (ScienceDirect, Nov 2026):** Employs local edge models and federated parameter averaging to generate recommendations without centralized raw data collection. However, it assumes fixed user preference vectors and does not quantify value-of-information for user interaction.
* **LICA: Learning Individual Constraints via Active Questioning (ScienceDirect, 2026):** Formulates active preference elicitation for appliance scheduling using uncertainty sampling. However, LICA's acquisition functions focus on reducing parameter entropy rather than minimizing decision loss under complex non-linear tariffs and privacy penalties.
* **Value of Information in Decision Analysis (Raiffa & Schlaifer, Howard 1966):** Expected Value of Sample Information ($\text{EVSI}$) is foundational in decision theory, medical trial design, and subsurface exploration, but has not been operationalized on-device for residential demand flexibility under privacy constraints.

### 2.2 Novelty Matrix & Research Contribution Boundary

| Dimension | Standard NILM / HEMS | LICA (2026) | Edge-ML (Nov 2026) | **SPARE-HEM (This Work)** |
| :--- | :--- | :--- | :--- | :--- |
| **Objective** | Minimize $\text{Cost}$ | Active learning of constraints | Private recommendation model | Minimize $\mathbb{E}[\text{Loss}]$ with EVSI-gated queries |
| **Query Strategy** | None / Static onboarding | Uncertainty entropy reduction | None / Fixed preference vector | **Economic $\text{EVSI} - \alpha \text{Burden} - \beta \text{Privacy}$** |
| **Tariff Support** | Flat or simplified TOU | Linear TOU pricing | Generic synthetic tariff | **Complex piecewise slab + TOU + fixed charges** |
| **Output Type** | Point estimate savings | Schedule $x^*$ | Schedule ranking | **Tri-state: Recommend / Ask / Abstain** |
| **Savings Framing** | Single number | Difference in objective | Predicted reward | **Conservative lower bound $Q_\alpha(S)$ + provenance** |

**Explicit Claim:** Combining AI with smart meters and privacy is **not novel**. HearthShift’s proposed candidate contribution is the **decision-theoretic coupling of EVSI-based interaction gating with conservative risk-bounded recommendations over piecewise non-linear tariff structures in an entirely local browser sandbox.**

---

## 3. Mathematical Formulation of SPARE-HEM

### 3.1 Comfort-Aware Schedule Optimization
Let:
* $\mathcal{T} = \{1, 2, \dots, T\}$ denote the discrete time horizon (e.g., $T=24$ or $48$ intervals).
* $x \in \mathcal{F} \subset \mathbb{R}^{K \times T}$ denote the candidate household electrical schedule across $K$ controllable or shiftable tasks.
* $\mathcal{F}$ denote the physical and operational feasible set:
  $$\mathcal{F} = \left\{ x \;\middle|\; \sum_{t=\tau_{\text{start}}}^{\tau_{\text{end}}} x_{k,t} = E_k^{\text{req}}, \quad x_{k,t} \in [0, P_k^{\max}], \quad \forall k \in \{1,\dots,K\} \right\}$$
* $E_t(x) = E_t^{\text{inflexible}} + \sum_{k=1}^K x_{k,t}$ represent total household energy consumption at time $t$.
* $\mathcal{B}(E(x), \boldsymbol{\tau})$ represent the verified non-linear tariff billing function, where $\boldsymbol{\tau}$ encapsulates rate slabs, time-of-use rates, demand charges, and electricity duty.
* $D(x, \boldsymbol{\theta})$ represent the subjective household inconvenience / discomfort under latent preference vector $\boldsymbol{\theta}$.
* $R(x)$ represent the operational execution risk (e.g., probability of grid outage, appliance wear, or weather-induced failure).

The household decision problem seeks the optimal schedule:
$$x^*(\boldsymbol{\theta}) = \arg\min_{x \in \mathcal{F}} \left[ \mathcal{B}(E(x), \boldsymbol{\tau}) + \lambda D(x, \boldsymbol{\theta}) + \mu R(x) \right]$$
where $\lambda > 0$ and $\mu \ge 0$ are scaling hyper-parameters converting subjective discomfort and risk into monetary equivalents.

### 3.2 Inconvenience Modeling with Latent Preferences
We model the household inconvenience $D(x, \boldsymbol{\theta})$ as a linear-in-parameters disutility:
$$D(x, \boldsymbol{\theta}) = \sum_{k=1}^K \sum_{t=1}^T \theta_{k,t} \cdot \left| x_{k,t} - x_{k,t}^{\text{baseline}} \right| + \sum_{k=1}^K \theta_{k,\text{delay}} \cdot \max(0, t_{k,\text{finish}} - t_{k,\text{desired}})$$
where $\boldsymbol{\theta} = [\theta_{1}, \dots, \theta_M]^\top \in \mathbb{R}_+^M$ represents the latent sensitivity vector for the household (e.g., sensitivity to moving laundry to early morning, AC temperature deviation, delayed cooking).

### 3.3 Bayesian Learning from Sparse Discrete Feedback
Rather than demanding explicit numeric ratings, the system collects sparse, natural feedback $y \in \{-1, 0, +1\}$ corresponding to:
* $y = -1$: "Not practical / Disagree"
* $y = 0$: "Useful / Acknowledged"
* $y = +1$: "Tried it / Accepted"

Given prior beliefs $\boldsymbol{\theta} \sim \mathcal{N}(\boldsymbol{\mu}_0, \boldsymbol{\Sigma}_0)$, the likelihood of observing user feedback $y_i$ on proposed recommendation $a_i = (x_i^{\text{prop}}, x_i^{\text{base}})$ is modeled via an ordinal or logistic link function:
$$P(y_i = +1 \mid a_i, \boldsymbol{\theta}) = \sigma\left( \gamma \cdot \left( \Delta \text{Cost}(a_i) - \lambda D(a_i, \boldsymbol{\theta}) \right) \right)$$
where $\sigma(z) = (1 + e^{-z})^{-1}$ and $\gamma$ is a rationality parameter.

The posterior over $\boldsymbol{\theta}$ given interaction history $\mathcal{D}_n = \{(a_1, y_1), \dots, (a_n, y_n)\}$ is given by Bayes' rule:
$$P(\boldsymbol{\theta} \mid \mathcal{D}_n) \propto P(\boldsymbol{\theta}) \prod_{i=1}^n P(y_i \mid a_i, \boldsymbol{\theta})$$
For on-device browser execution, we approximate the posterior $P(\boldsymbol{\theta} \mid \mathcal{D}_n) \approx \mathcal{N}(\boldsymbol{\mu}_n, \boldsymbol{\Sigma}_n)$ using either:
1. **Laplace Approximation:** Taylor expansion around the Maximum A Posteriori (MAP) estimate $\hat{\boldsymbol{\theta}}_{\text{MAP}}$.
2. **Recursive Extended Kalman / Assumed Density Filtering (ADF):** Providing $O(M^2)$ lightweight online updates requiring negligible memory.

### 3.4 Expected Value of Sample Information (EVSI) Question Selection
Let $\mathcal{Q} = \{q_1, q_2, \dots, q_J\}$ be the finite set of candidate questions the system could ask (e.g., $q_1$: "Can laundry run between 6 AM and 8 AM?").
Each question $q$ admits a discrete response $y \in \mathcal{Y}_q$.

Let the decision loss under action $a$ and true preference $\boldsymbol{\theta}$ be:
$$L(a, \boldsymbol{\theta}) = \mathcal{B}(E(x(a)), \boldsymbol{\tau}) + \lambda D(x(a), \boldsymbol{\theta})$$

Prior to asking question $q$, the optimal decision under current beliefs $P(\boldsymbol{\theta})$ incurs expected loss:
$$V_0 = \min_{a \in \mathcal{A}} \mathbb{E}_{\boldsymbol{\theta}}[L(a, \boldsymbol{\theta})]$$

If question $q$ is asked and answer $y$ is observed, the posterior becomes $P(\boldsymbol{\theta} \mid y, q)$, yielding expected loss:
$$V(y, q) = \min_{a \in \mathcal{A}} \mathbb{E}_{\boldsymbol{\theta} \mid y, q}[L(a, \boldsymbol{\theta})]$$

The Expected Value of Sample Information ($\text{EVSI}$) is the expected reduction in decision loss across possible answers:
$$\text{EVSI}(q) = V_0 - \mathbb{E}_{y \sim P(y \mid q)} \left[ V(y, q) \right] \ge 0$$

#### Question Acquisition Objective
We define the net acquisition utility by penalizing cognitive burden $B(q)$ and privacy sensitivity $P(q)$:
$$\mathcal{U}(q) = \text{EVSI}(q) - \alpha B(q) - \beta P(q)$$
where:
* $B(q) \in [0, 1]$ models the cognitive friction (e.g., yes/no question $= 0.2$, slider question $= 0.6$, appliance audit $= 1.0$).
* $P(q) \in [0, 1]$ models privacy sensitivity (e.g., "washing machine flexibility" $= 0.1$, "shower schedule" $= 0.7$, "occupancy / sleep hours" $= 0.95$).
* $\alpha, \beta > 0$ are hurdle parameters.

The optimal question is selected via:
$$q^* = \arg\max_{q \in \mathcal{Q}} \mathcal{U}(q)$$

**Silence / Abstention Rule:** If $\max_{q \in \mathcal{Q}} \mathcal{U}(q) < \epsilon_{\text{threshold}}$, the assistant **asks no questions**.

### 3.5 Conservative Evidence-Bounded Recommendation Policy
For candidate action $a$, the estimated monthly monetary savings is a random variable:
$$S(a) = \text{Bill}_{\text{baseline}} - \text{Bill}_{\text{proposed}}(a)$$
incorporating posterior uncertainty over preference satisfaction and behavioral adherence.

Let $F_S(s) = P(S(a) \le s \mid \mathcal{D})$ be the cumulative distribution function of savings. The conservative credible lower bound at significance level $\alpha = 0.05$ (or 95% credible floor) is:
$$S_{\text{lower}}(a) = Q_\alpha(S(a)) = \inf \{ s : F_S(s) \ge \alpha \}$$

#### The Tri-State Decision Rule
$$\text{Decision}(a) = \begin{cases}
\mathbf{Recommend}(a) & \text{if } S_{\text{lower}}(a) > S_{\min} \text{ and } \mathbb{E}[D(a, \boldsymbol{\theta})] \le D_{\max} \\
\mathbf{AskQuestion}(q^*) & \text{if } S_{\text{lower}}(a) \le S_{\min} \text{ and } \mathcal{U}(q^*) > \epsilon_{\text{threshold}} \\
\mathbf{Abstain} & \text{otherwise (benefit too small, uncertain, or intrusive)}
\end{cases}$$

---

## 4. Experimental Design & Benchmarking Protocol

### 4.1 Benchmark Baselines
To rigorously validate SPARE-HEM, we define five comparative baselines:

1. **B1: Rule-Based Energy Advice:** Static rule engine emitting standard energy-efficiency tips (e.g., "Set AC to 24°C", "Avoid running loads during 6–9 PM").
2. **B2: Price-Only Cost Optimizer:** Solves $\min_{x \in \mathcal{F}} \mathcal{B}(E(x))$ ignoring household discomfort ($\lambda = 0$). Represents greedy financial optimization.
3. **B3: Fixed Static Questionnaire + Optimizer:** Administers a standard 10-question upfront lifestyle survey, estimates a static preference vector $\hat{\boldsymbol{\theta}}$, and optimizes schedules.
4. **B4: Active Uncertainty Sampling (LICA-style Baseline):** Selects questions that maximize parameter entropy reduction $\mathbb{H}(\boldsymbol{\theta}) - \mathbb{E}_y[\mathbb{H}(\boldsymbol{\theta} \mid y, q)]$ without weighing EVSI, privacy, or burden.
5. **B5: Full-Information Reference (Oracle):** An idealized upper bound with perfect knowledge of the household's true latent parameters $\boldsymbol{\theta}^*$.

### 4.2 Research Datasets
* **Low Carbon London (LCL):** 5,567 London households, half-hourly intervals (smart meter). Validates interval processing, TOU response, and aggregate diversity.
* **REFIT Electrical Load Measurements:** 20 UK households with aggregate and individual appliance sub-metering. Used for ground-truth validation of shiftable appliance cycles (washing machine, dishwasher).
* **UCI Household Electric Power Consumption:** 2,075,259 measurements over 47 months. Benchmark for data imputation, noise resistance, and missing data degradation.
* **Synthetic Household Simulator (`hearthshift-sim`):** Provides ground-truth latent preference vectors $\boldsymbol{\theta}_{\text{true}}$ and controllable response noise to evaluate EVSI convergence and regret.

### 4.3 Evaluation Metrics

$$\begin{aligned}
\text{Question Burden Reduction} &= \frac{N_{\text{questions}}(\text{B3}) - N_{\text{questions}}(\text{SPARE-HEM})}{N_{\text{questions}}(\text{B3})} \times 100\% \quad (\text{Target } \ge 30\%) \\
\text{Policy Regret / Value Loss} &= \frac{V(\text{Oracle}) - V(\text{SPARE-HEM})}{V(\text{Oracle})} \times 100\% \quad (\text{Target } \le 5\%) \\
\text{Empirical Coverage} &= \frac{1}{N} \sum_{i=1}^N \mathbb{I}\left( S_{\text{actual}}^{(i)} \ge S_{\text{lower}}^{(i)} \right) \quad (\text{Target } \ge 95\%) \\
\text{Privacy Leakage} &= \text{Total bytes of raw interval readings emitted to network } \equiv 0
\end{aligned}$$

---

## 5. Synthetic Household Simulator Design

The simulator models four distinct household archetypes:
1. **Archetype A (Chennai Family):** High cooling demand, school/office routine, bi-monthly slab tariff sensitivity.
2. **Archetype B (Single Tech Worker):** High flexibility on weekends, night-time PC/cooling usage, strict privacy stance.
3. **Archetype C (Retired Couple):** Predictable daytime presence, low peak power, high risk aversion to routine changes.
4. **Archetype D (Student Flat):** Highly variable schedule, budget-constrained, frequent appliance sharing conflicts.

Each synthetic agent responds to proposed recommendations with stochastic utility:
$$U_{\text{agent}}(a) = \Delta \text{Cost}(a) - \lambda_{\text{true}} D(a, \boldsymbol{\theta}_{\text{true}}) + \varepsilon, \quad \varepsilon \sim \text{Gumbel}(0, \sigma^2)$$

---

## 6. Novelty Audit & Publication Protocol

Before any scientific publication or patent submission, the following five-step audit must be conducted:
1. **Exhaustive Keyword Query:** Automated search on IEEE Xplore, ACM Digital Library, and Google Scholar for: `("EVSI" OR "expected value of sample information") AND ("home energy management" OR "demand response") AND ("privacy")`.
2. **Direct Algorithmic Parity Check with LICA (2026):** Run SPARE-HEM and LICA on identical synthetic cohorts to isolate whether EVSI produces statistically significant regret reduction under non-linear slab tariffs.
3. **Ablation Matrix Execution:** Quantify the independent contribution of:
   * (a) EVSI vs Entropy sampling,
   * (b) Risk penalty $\mu R(x)$ vs Risk-neutral,
   * (c) Privacy penalty $\beta P(q)$ vs Unconstrained questioning.
4. **Reproducibility Guarantee:** All experiment code, random seeds, and synthetic cohort definitions must run end-to-end via a single deterministic script (`scripts/run_experiments.py`).
5. **Honest Scope Delineation:** Disclose all experimental limitations in the paper's conclusion without marketing exaggerations.