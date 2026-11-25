# HearthShift AI — Field-Pilot Protocol & Two-Stage Human Evaluation Plan
## Pre-Pilot Usability Check (Stage 1) and Powered RCT Design (Stage 2)

**Document Status:** Proposed / Pilot-Ready Pending Ethics & Deployment Approval — Not Executed  
**Version:** 2.0.0 (Phase 4A Revision)  
**Date:** November 25, 2026  
**Target Release:** Phase 4A Human-Evaluation & Statistical Governance  
**Repository:** `HearthShift-AI` (Flagship Project #04)  
**Author:** Pilot Protocol, Power Analysis & M&V Audit Team  
**Companion Specifications:** [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md) · [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md) · [`power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py)

---

> [!IMPORTANT]
> **EXECUTION & COMPLIANCE STATUS**
> - **Not Yet Executed:** Zero human participants have been recruited, consented, or evaluated to date. All field testing remains **Proposed / Pilot-Ready Pending Institutional Ethics Review & Deployment Approval**.
> - **No IPMVP Option C Certification:** HearthShift AI does **NOT** claim Efficiency Valuation Organization (EVO) IPMVP Option C or ASHRAE Guideline 14 certification. See [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md) for the exact baseline horizon, regression fit ($\text{CV(RMSE)} \le 15\%$, $|\text{NMBE}| \le 5\%$), non-routine adjustment, and autocorrelation-corrected Fractional Savings Uncertainty ($\text{FSU}$) requirements before Option C claims could be made.

---

## 1. Executive Summary & Two-Stage Pilot Architecture

The HearthShift AI Field-Pilot Protocol governs the proposed empirical human validation of the Sparse-feedback, Privacy-Aware, Risk-sensitive Energy Management (SPARE-HEM) framework and its client-side Threshold-Aware Robust Value-of-Information (TR-VOI) decision engine.

Unlike energy management platforms that aggregate smart meter telemetry onto centralized cloud servers and deploy remote Large Language Models (LLMs), HearthShift AI executes **100% on-device** within modern web browsers using **pure client-side JavaScript/TypeScript** (with background Web Workers for heavy CSV parsing via [`src/workers/csv-parser.worker.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/workers/csv-parser.worker.ts); zero WebAssembly binaries). It couples deterministic integer-paise statutory tariff calculators with Bayesian active preference updates to deliver conservative, model-bounded energy advice.

To preserve scientific rigor and eliminate underpowered efficacy claims, human evaluation is strictly structured into **two sequential stages**:

1. **Stage 1 — Pre-Pilot Usability & Safety Comprehension Study ($N = 5\text{ to }10$ Households):**
   Governed by [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md) (Phase 4A Stage 3 deliverable). Evaluates a 10-step real-user flow, uncertainty comprehension ($Q_{0.05}$ vs. expectation), CSV/bill ingestion ease, SUS score, question burden ($c_{\text{ask}}$), privacy mental model, product defects, and safety-critical misconceptions. **Strictly prohibits any energy or bill savings efficacy claims.**
2. **Stage 2 — Formally Powered Randomized Controlled Trial (RCT):**
   Executed *only after* all Stage 1 usability and safety gates pass. Households are randomized $1:1$ to TR-VOI Advisory Treatment vs. Standard Tariff-Info Control across concurrent TNPDCL bi-monthly billing cycles, sized using exact statistical power calculations in [`power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py) and [`power_analysis_phase4a.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/results/power_analysis_phase4a.json).

```
┌────────────────────────────────────────────────────────────────────────┐
│                 TWO-STAGE FIELD-PILOT GOVERNANCE ARCHITECTURE          │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Approval Status          │ Proposed — Pending Ethics & Deployment      │
│ Stage 1 (Pre-Pilot)      │ N = 5-10 Usability & Safety Check (No Effic.)│
│ Stage 2 (Powered RCT)    │ N = 152-160 (d=0.50 @ 80% pwr w/ 15-20% att)│
│ Cliff-Enriched Binary    │ N = 140-150 (exact chi2) / 156-170 (CC)     │
│ Data Security            │ Zero Cloud Telemetry & Atomic Local Wipe    │
│ M&V Governance           │ Concurrent RCT Control; NO IPMVP Opt C Claim│
│ Risk Management          │ Advisory-Only + Empirical Q_0.05 Bounds     │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### 1.2 Stage 2 Statistical Power Analysis & Sample Size Determination
Exact power calculations ($\alpha = 0.05$, two-sided) were executed in [`research/experiments/power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py) using `scipy.stats` (`nct` and exact product-binomial $\chi^2$ enumeration) and verified in [`research/results/power_analysis_phase4a.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/results/power_analysis_phase4a.json).

#### Why the Legacy $N = 30$ Cohort Was Retired
An earlier draft protocol targeted $N = 30$ households ($15$ per arm). At $N = 30$ ($0\%$ attrition), two-sample $t$-test power is only **$0.125$** for $d=0.30$, **$0.262$** for $d=0.50$, and **$0.562$** for $d=0.80$ (dropping to **$0.108 / 0.216 / 0.466$** under $20\%$ attrition, with MDE $d = 1.060\text{--}1.197$ at $80\%$ power). $N = 30$ is therefore retired as statistically unpowered for efficacy testing.

#### Endpoint A: Continuous Normalized Bill / Consumption Reduction ($\Delta\text{INR}$ or Normalized $\Delta\text{kWh}$ per Bi-Monthly Cycle)

| Standardized Effect Size | Target Power | Completers / Arm ($N_{\text{comp}}$) | Enrolled (15% Attrition) | Enrolled (20% Attrition) |
| :--- | :---: | :---: | :---: | :---: |
| **Small ($d = 0.30$)** | $0.80$ | $176$ ($352$) | $416$ ($208$/arm) | $440$ ($220$/arm) |
| **Small ($d = 0.30$)** | $0.90$ | $235$ ($470$) | $554$ ($277$/arm) | $588$ ($294$/arm) |
| **Conservative Realistic ($d = 0.50$)** | $0.80$ | **$64$ ($128$)** | **$152$ ($76$/arm)** | **$160$ ($80$/arm)** |
| **Conservative Realistic ($d = 0.50$)** | $0.90$ | $86$ ($172$) | $204$ ($102$/arm) | $216$ ($108$/arm) |
| **Large ($d = 0.80$)** | $0.80$ | $26$ ($52$) | $62$ ($31$/arm) | $66$ ($33$/arm) |
| **Large ($d = 0.80$)** | $0.90$ | $34$ ($68$) | $80$ ($40$/arm) | $86$ ($43$/arm) |

#### Endpoint B: Binary 500 kWh Tariff-Cliff Avoidance Rate (Among $450\text{--}550\text{ kWh}$ Households)

| Control vs. Treatment Avoidance ($p_0 \to p_1$) | Target Power | Exact Binomial $\chi^2$ Completers ($N_{\text{comp}}$) | Fleiss Continuity-Corrected ($N_{\text{cc}}$) | Exact Enrolled (15% / 20% Att.) |
| :--- | :---: | :---: | :---: | :---: |
| **Conservative $+20\text{ pp}$ ($25\% \to 45\%$)** | $0.80$ | $88$/arm ($176$) | $98$/arm ($196$) | $208$ / $220$ |
| **Conservative $+20\text{ pp}$ ($30\% \to 50\%$)** | $0.80$ | $94$/arm ($188$) | $103$/arm ($206$) | $222$ / $236$ |
| **Primary Realistic $+25\text{ pp}$ ($25\% \to 50\%$)** | $0.80$ | **$59$/arm ($118$)** | $66$/arm ($132$) | **$140$ / $148$** *(CC: $156$ / $166$)* |
| **Primary Realistic $+25\text{ pp}$ ($30\% \to 55\%$)** | $0.80$ | **$60$/arm ($120$)** | $68$/arm ($136$) | **$142$ / $150$** *(CC: $160$ / $170$)* |
| **Primary Realistic $+25\text{ pp}$ ($25\% \to 50\%$)** | $0.90$ | $76$/arm ($152$) | $85$/arm ($170$) | $180$ / $190$ |
| **Primary Realistic $+25\text{ pp}$ ($30\% \to 55\%$)** | $0.90$ | $82$/arm ($164$) | $88$/arm ($176$) | $194$ / $206$ |
| **Optimistic $+30\text{ pp}$ ($20\% \to 50\%$)** | $0.80$ | $39$/arm ($78$) | $45$/arm ($90$) | $92$ / $98$ |
| **Large $+35\text{ pp}$ ($25\% \to 60\%$)** | $0.80$ | $30$/arm ($60$) | $36$/arm ($72$) | $72$ / $76$ |

#### Explicit Capability Boundary of an $N = 100$ Pilot ($50$/arm Enrolled $\to 80\text{--}85$ Completers)
If interim operational funding caps Stage 2 enrollment at $N = 100$ ($50$/arm, yielding $80$ completers at $20\%$ attrition or $84\text{--}85$ completers at $15\%$ attrition), the protocol **explicitly pre-registers** what $N = 100$ **can** versus **cannot** reliably detect ($\ge 80\%$ power):
- **What $N = 100$ CAN reliably detect ($\ge 80\%$ power):**
  - **Large continuous effects ($d = 0.80$):** Achieved power is **$0.942$** at $N=80$ ($40$/arm), **$0.952\text{--}0.954$** at $N=84\text{--}85$, and **$0.977$** at $N=100$ ($50$/arm). Continuous MDE at $80\%$ power is **$d = 0.634$** ($N=80$), **$d = 0.619$** ($N=84$), **$d = 0.615$** ($N=85$), and **$d = 0.566$** ($N=100$).
  - **Large cliff-avoidance lifts ($\ge +30\text{ to }+35\text{ pp}$) in a 100% cliff-enriched ($450\text{--}550\text{ kWh}$) cohort:** Exact $\chi^2$ power is **$0.817\text{--}0.844$** for $20\% \to 50\%$ and **$0.907\text{--}0.927$** for $25\% \to 60\%$ across $80\text{--}85$ completers. MDE lift above $p_0 = 0.25$ at $80\%$ power is **$+29.94\text{ pp}$** ($N=80$) / **$+28.75\text{--}29.41\text{ pp}$** ($N=84\text{--}85$).
- **What $N = 100$ CANNOT reliably detect ($< 80\%$ power):**
  - **Conservative realistic continuous effects ($d = 0.50$):** Power is only **$0.598$** at $N=80$, **$0.620\text{--}0.625$** at $N=84\text{--}85$, and **$0.697$** even with $0\%$ attrition ($N=100$).
  - **Small continuous effects ($d = 0.30$):** Power is only **$0.263\text{--}0.318$** across $80\text{--}100$ completers.
  - **Primary $+25\text{ pp}$ binary cliff lifts ($25\% \to 50\%$ or $30\% \to 55\%$) even if 100% cliff-enriched:** Exact $\chi^2$ power is **$0.640\text{--}0.647$** ($N=80$), **$0.647\text{--}0.684$** ($N=84\text{--}85$), and **$0.737\text{--}0.745$** ($N=100$).
  - **Binary cliff avoidance in an unselected all-comer $N = 100$ cohort:** If only $25\%\text{--}40\%$ of enrolled homes sit in $450\text{--}550\text{ kWh}$ ($n = 10\text{--}17$ cliff completers/arm after $15\%\text{--}20\%$ attrition), exact power for $+25\text{ pp}$ collapses to **$0.181\text{--}0.333$**.
- **Stage 2 Design Choice:** Stage 2 therefore targets **$N = 152\text{--}160$ enrolled** for Endpoint A ($d = 0.50$ at $80\%$ power assuming $15\text{--}20\%$ attrition) with stratified enrollment prioritizing $450\text{--}550\text{ kWh}$ cliff-adjacent homes (at least $140\text{--}150$ cliff-enriched enrolled for Endpoint B exact $\chi^2$ power $\ge 0.80$, or $156\text{--}170$ under continuity-corrected Fleiss criteria). If $\ge 12\text{ months}$ of pre-intervention baseline bills exist for all enrollees, ANCOVA baseline adjustment with $\rho = 0.50$ reduces required $d=0.50$ enrollment to $116\text{--}124$ (sensitivity estimate only; not assumed for primary sizing).

---

## 2. Participant Information & Informed Consent Protocol

### 2.1 Principle of Local-First Execution
Participants must be explicitly informed during onboarding that HearthShift AI is architected on local-first privacy principles:
1. **Zero Cloud Telemetry:** All electricity meter data, historical utility bills, household appliance configurations, subjective responses, and inferred preferences are stored exclusively within the browser's local IndexedDB (`HearthShiftDB`).
2. **Zero Remote Processing:** Optimization algorithms, numerical integrations, tariff calculations, and counterfactual scenario simulations run on the client's local CPU using **pure client-side JavaScript/TypeScript**, with dedicated Web Workers (e.g., `src/workers/csv-parser.worker.ts`) offloading CSV parsing so the UI remains responsive (zero WebAssembly binaries).
3. **No User Accounts:** No account registration, email collection, phone number verification, or password creation is required or supported.

### 2.2 Experimental AI Advisory Role
Participants must acknowledge the distinct nature of the system's recommendations:
- HearthShift AI functions strictly as an **educational and advisory decision-support tool**.
- Recommendations are generated through probabilistic models of household preferences and empirical thermodynamic approximations of appliance behavior.
- Suggestions represent mathematically optimal trade-offs under specified assumptions, but **do not constitute professional electrical engineering, utility billing, or legal advice**.
- The system does not possess sensory awareness of immediate household conditions (e.g., medical fragility, infant presence, extreme localized heatwaves, or unexpected visitors) beyond what the participant inputs.

### 2.3 Non-Guaranteed Physical Safety Disclaimer
HearthShift AI operates as an informational software layer and has no direct physical or electrical interface to household appliances:
- **No Direct Actuation:** The platform does not control circuit breakers, relays, smart plugs, or appliance thermostats. All actions require voluntary manual implementation by the household.
- **Appliance Safety Interlocks:** Recommendations to alter appliance usage (e.g., adjusting air conditioner setpoints, trimming water heater duration, powering down standby power strips) must never compromise manufacturer safety guidelines, building code standards, or electrical wiring limits.
- **Water Heater Safety:** Users are instructed never to disable or modify factory-calibrated thermostat safety cutouts or pressure relief valves on electric water heaters. Water temperatures must remain sufficient to prevent bacterial proliferation (e.g., *Legionella* risk) if storage volumes remain warm over extended idle periods.
- **Physical Safety Primacy:** In any conflict between an energy-saving recommendation and household physical comfort, medical health, or safety, the participant must prioritize safety and reject or dismiss the recommendation.

### 2.4 Form of Informed Consent
Before initializing the application, participants must review and affirmatively check the following consent declaration in the onboarding interface:

> **Participant Acknowledgment:**  
> *"I understand that HearthShift AI is an experimental research system running entirely inside my web browser. My consumption data never leaves my device. I acknowledge that energy recommendations are advisory estimates based on statutory tariffs and physical models, not absolute guarantees of financial savings or physical appliance operation. I retain sole authority over my household appliances and electrical systems."*

---

## 3. Strict Household Eligibility Criteria

To ensure statistical validity, regulatory relevance, and experimental control, field-pilot participants must satisfy strict inclusion and exclusion criteria:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      HOUSEHOLD ELIGIBILITY MATRIX                      │
├───────────────────────────────────┬────────────────────────────────────┤
│ Regulatory Tariff Criterion       │ Domestic Tariff LT-1A (TNPDCL)     │
│ Grid Interconnection              │ Single-Phase (5kW) / 3-Phase (15kW)│
│ High-Power Controllable Loads     │ Air Conditioner AND/OR Water Heater│
│ Minimum Data Availability         │ >= 3 Bi-monthly Bills OR 15m CSV   │
│ Geographic Boundary               │ State of Tamil Nadu, India         │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 3.1 Inclusion Criteria
1. **Utility & Tariff Jurisdiction:**
   - Must be an active domestic consumer connected to the Tamil Nadu Power Distribution Corporation Limited (TNPDCL, formerly TANGEDCO).
   - Must be billed under the **Domestic Tariff LT-1A** schedule (bi-monthly billing cycle).
2. **Electrical Supply Phase:**
   - Single-Phase domestic service (sanctioned load typically $\le 5.0\text{ kW}$) OR Three-Phase domestic service (sanctioned load up to $15.0\text{ kW}$).
3. **Appliance Infrastructure:**
   - Must possess at least one controllable high-power cooling or heating appliance:
     - **Cooling:** Minimum of one split or window Air Conditioner (inverter or fixed-speed, rated $1.0\text{ TR}$ to $2.0\text{ TR}$, $1.0\text{ kW}$ to $2.2\text{ kW}$).
     - **Water Heating:** Minimum of one Electric Storage Water Heater / Geyser (storage volume $10\text{ L}$ to $25\text{ L}$, heating element rated $1.5\text{ kW}$ to $3.0\text{ kW}$).
     - **Optional Controllable Loads:** Domestic automatic washing machine ($0.4\text{ kW}$ to $2.0\text{ kW}$ with heating) and home entertainment/computing standby setups.
4. **Historical Energy Data Availability:**
   - **Stage 1 Usability Minimum (Basic Mode):** At least 1–3 historical bi-monthly electricity bills (or representative test values during usability walkthroughs) with verified consumption in kilowatt-hours (kWh).
   - **Stage 2 RCT / Covariate Baseline Target:** Minimum of $\ge 6$ consecutive historical bi-monthly bills ($\ge 12\text{ months}$, covering cooling and non-cooling seasons) strongly preferred for ANCOVA baseline normalization, supplemented where available by smart meter or smart plug CSV exports (15-, 30-, or 60-minute resolution covering $\ge 14\text{ days}$). *(Note: see [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md) regarding full IPMVP Option C baseline horizon requirements.)*
5. **Consumption Proximity to Tariff Thresholds:**
   - Stage 2 RCT enrollment explicitly stratifies and enriches households with historical bi-monthly consumption between **$450\text{ kWh}$ and $550\text{ kWh}$** (critical influence zone of the $500\text{ kWh}$ statutory tariff cliff), alongside a broader **$350\text{ kWh}$ to $650\text{ kWh}$** domestic cohort for Endpoint A continuous bill reduction.

### 3.2 Exclusion Criteria
1. Commercial, industrial, agricultural, or temporary supply tariffs (e.g., LT-II, LT-III, LT-V).
2. Off-grid solar installations without utility grid connection (grid-tied net-metered domestic solar is eligible if net utility billing data is provided).
3. Rental tenants who do not have access to electricity bills or lack autonomy to adjust major appliances.
4. Households with life-support medical equipment or critical continuous medical loads dependent on domestic power supply.

---

## 4. Data Minimization and Sovereignty Protocol

HearthShift AI treats user privacy not merely as an administrative policy, but as a verifiable cryptographic and architectural invariant.

```
┌────────────────────────────────────────────────────────────────────────┐
│                     DATA SOVEREIGNTY INVARIANTS                        │
│                                                                        │
│  [User Device: Browser Sandbox]                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ IndexedDB ("HearthShiftDB")                                      │  │
│  │   ├── bills: Stored utility statements                           │  │
│  │   ├── readings: Raw interval readings + batch tracking           │  │
│  │   ├── preferences: Latent beliefs (mu, sigma)                    │  │
│  │   ├── recommendations: Active recommendations & status           │  │
│  │   ├── feedback: User audit log & responses                       │  │
│  │   └── scenarios: Counterfactual configs                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         │                                        │                     │
│    (Atomic Wipe)                           (Unencrypted / Encrypted)   │
│         ▼                                        ▼                     │
│  [Immediate Deletion]                      [JSON Local Download]       │
│                                                                        │
│  ════════════════════════════════════════════════════════════════════  │
│  [Network Boundary] ─── ZERO OUTBOUND TELEMETRY ─── [External Web]     │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Zero Cloud Telemetry Enforcement
- **Network Request Suppression:** The web application is engineered with zero remote endpoints. Runtime network monitoring confirms $0$ outbound analytics requests, $0$ performance logging calls, and $0$ remote tracking pixels.
- **Service Worker / PWA Caching:** Core static assets (JavaScript/TypeScript bundles, CSS, public tariff definitions; zero WebAssembly binaries) are cached locally, allowing the application to operate offline after initial load.
- **Self-Contained Decision Engine:** TR-VOI evaluations, numerical integrations, and database operations execute purely in-memory on the client machine.

### 4.2 Local IndexedDB Architecture
Data persistence is handled through Dexie.js wrapping the browser's IndexedDB engine:
- **Database Identity:** `HearthShiftDB` (Schema Version 1).
- **Physical Partitioning:**
  - `bills`: Auto-incremented primary key, period start/end dates, total billed kWh, net payable amount in paise.
  - `readings`: Auto-incremented primary key, UTC timestamp, resolution, source, batch identifier, interval energy in kWh.
  - `preferences`: Household latent comfort parameters ($\boldsymbol{\mu}, \boldsymbol{\Sigma}$), explicit temperature/schedule constraints, feedback counters.
  - `recommendations`: Historical recommendation records, lower-bound savings, confidence levels, physical assumptions.
  - `feedback`: User response events (`useful`, `impractical`, `tried_it`), comments, and interaction timestamps.
  - `scenarios`: Saved user counterfactual configurations and outcomes.

### 4.3 One-Click Permanent Wipe & Atomic Batch Rollback
- **Permanent Data Wipe:** The application provides a one-click purge action (`deleteAllUserData()`) in `PrivacyDataManager.tsx`. When triggered:
  - An atomic transaction purges all user tables (`bills`, `readings`, `preferences`, `recommendations`, `feedback`, `savings`, `scenarios`, `questions`).
  - IndexedDB storage is reclaimed immediately without residual records or soft-deletion flags.
  - Default neutral preferences are reseeded.
- **Atomic CSV Batch Rollback:** Every imported CSV dataset is tagged with a unique `import_batch_id`. If a participant uploads an incorrect CSV or wishes to withdraw specific interval files, the `rollbackBatch(batchId)` function atomically purges all records associated with that batch without disrupting historical bills or preferences.

---

## 5. Structured Pilot User Tasks

In **Stage 1 ($N = 5\text{--}10$ Usability & Safety Comprehension)**, participants execute the full **10-step real-user flow** defined in [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md). Across Stage 1 and Stage 2 onboarding, participants are guided through five core functional capability checks:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STRUCTURED PILOT WORKFLOW PIPELINE                   │
│                                                                        │
│  Task 1: Historical Bill Ingestion ───► Slab Headroom & Cliff Distance │
│                       │                                                │
│  Task 2: CSV Interval Data Import  ───► Baseload & Standby Inspection  │
│                       │                                                │
│  Task 3: Counterfactual Simulator  ───► 500 kWh Cliff Avoidance Test   │
│                       │                                                │
│  Task 4: Recommendation Audit      ───► Physical Assumption & Feedback │
│                       │                                                │
│  Task 5: Adaptive Question Modal   ───► Single EVSI Preference Check   │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Task 1: Historical Bill Ingestion & Slab Headroom Review
- **Objective:** Ingest historical bi-monthly utility statements and evaluate baseline consumption relative to statutory tariff tiers.
- **Participant Actions:**
  1. Open the **Bill History** module.
  2. Input 3 to 6 historical bi-monthly statements from TNPDCL bills (Billing cycle start, billing cycle end, total units consumed in kWh, total bill amount).
  3. Observe the **Tariff Headroom Card**.
  4. Note the calculated distance to the nearest tariff boundary (e.g., $400\text{ kWh}$ telescopic boundary or $500\text{ kWh}$ cliff threshold).
- **Verification Criteria:**
  - System must accurately calculate gross charges, welfare subsidies, and net payable amounts in paise.
  - System must display visual headroom indicators (e.g., "15 kWh remaining before ₹478.40 cliff jump").

### 5.2 Task 2: CSV Interval Data Import & Standby Baseline Inspection
- **Objective:** Import high-resolution interval energy data, verify automated power-to-energy integration, and inspect household vampire/standby load.
- **Participant Actions:**
  1. Navigate to the **Data Ingestion Dropzone**.
  2. Drag and drop a representative CSV file containing interval active power (Watts) or interval energy (kWh) from a smart meter or smart plug logger.
  3. Review the **Capability Badge** transition from *Basic Mode* to *Detailed Mode*.
  4. Inspect the **Interval Consumption Chart** for detected baseline standby power during quiet hours (01:00 to 05:00).
- **Verification Criteria:**
  - Automated detection of sampling resolution and column mapping.
  - Correct physical trapezoidal integration of Watts to kWh with abnormal gap detection.
  - UI surfaces estimated standby baseload in Watts and bi-monthly kWh impact.

### 5.3 Task 3: Counterfactual Scenario Exploration Around the 500 kWh Cliff
- **Objective:** Interact with the counterfactual scenario engine to simulate the financial impact of specific appliance adjustments near the statutory cliff.
- **Participant Actions:**
  1. Open the **Scenario Simulator**.
  2. Set baseline consumption to $505\text{ kWh}$ (representing a household in the high-consumption regime that has lost the 200 free units subsidy).
  3. Toggle the single micro-curtailment adjustment: raise AC thermostat by $+0.5^\circ\text{C}$ ($-15\text{ kWh}$), observing the calculated new total ($490\text{ kWh}$) and total net savings of ₹575.00 (₹96.60 volumetric slab savings + ₹478.40 reclaimed subsidy, non-additive).
  4. Optionally toggle additional reductions (geyser trim $-20\text{ kWh}$, standby elimination $-6\text{ kWh}$, bringing total down to $464\text{ kWh}$) and toggle laundry load-shifting to verify ₹0.00 monetary impact under flat-slab LT-1A.
  5. Inspect the highlighted **Tariff Cliff Bonus** of ₹478.40 and confirm it is reported as a component of net savings, not added twice.
- **Verification Criteria:**
  - Total proposed consumption drops below $500.0\text{ kWh}$.
  - For $505\text{ kWh} \to 490\text{ kWh}$, system reports exact net savings of ₹575.00 (₹96.60 volumetric slab savings + ₹478.40 reclaimed subsidy).
  - Explicit assumption list notes that load shifting (e.g., laundry) yields zero monetary savings under the flat-slab schedule.

### 5.4 Task 4: Recommendation Review, Assumption Audit & Feedback Logging
- **Objective:** Inspect an active recommendation generated by TR-VOI, audit the physical assumptions, and log subjective feedback.
- **Participant Actions:**
  1. Navigate to the **Recommendation Feed**.
  2. Inspect the top recommended action (e.g., *Raise AC Thermostat by 1.0°C*).
  3. Expand the **Assumptions & Evidence** drawer.
  4. Review the point estimate (₹180.00), conservative lower bound $Q_{0.05}$ (₹145.00), and statistical confidence level.
  5. Select and record feedback:
     - `useful` (Action is feasible and acceptable).
     - `impractical` (Action disrupts household comfort or routine).
     - `tried_it` (Household has already implemented this adjustment).
  6. Submit an optional text reflection on perceived clarity.
- **Verification Criteria:**
  - Feedback record is atomically committed to IndexedDB table `feedback`.
  - Latent preference belief $\boldsymbol{\mu}, \boldsymbol{\Sigma}$ updates dynamically based on user response.

### 5.5 Task 5: Single-Question Preference Check Evaluation
- **Objective:** Trigger and evaluate the adaptive inquiry mechanism governed by Expected Value of Sample Information (EVSI).
- **Participant Actions:**
  1. Trigger an active recommendation update when uncertainty $\boldsymbol{\Sigma}$ is high.
  2. Observe the modal prompt presenting a single high-value question (e.g., *"Are you comfortable setting the AC 1°C to 2°C higher on warm afternoons?"*).
  3. Answer the query: *Yes / Flexible (+1)*, *No / Inflexible (-1)*, or *Skip / Neutral (0)*.
  4. Verify that the system terminates inquiry (asking $\le 1$ question per session) and updates its recommendation accordingly.
- **Verification Criteria:**
  - The inquiry fires only if $\text{NetVOI}(q) = \text{EVSI}(q) - c_{\text{ask}} - c_{\text{priv}}(q) > 0$.
  - Variance in the queried dimension halves ($\sigma_j \to 0.5 \sigma_j$).
  - System never asks redundant questions regarding zero-consequence dimensions under the active tariff.

---

## 6. Usability & Usefulness Metrics

The field pilot evaluates system performance using standardized psychometric instruments and quantitative interaction telemetry:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PILOT EVALUATION METRICS                        │
├───────────────────────────────┬───────────────────┬────────────────────┤
│ Metric Dimension              │ Target Threshold  │ Primary Instrument │
├───────────────────────────────┼───────────────────┼────────────────────┤
│ System Usability Scale (SUS)  │ Score >= 80.0     │ Standard 10-Item   │
│ Cognitive Burden Index        │ Score <= 2.0 / 5  │ Single-Item Likert │
│ Recommendation Actionability  │ Rate >= 70.0%     │ Feedback Logging   │
│ Tariff Transparency & Trust   │ Score >= 4.0 / 5  │ Post-Trial Survey  │
│ Decision Latency              │ < 50 ms client    │ Local Performance  │
└───────────────────────────────┴───────────────────┴────────────────────┘
```

### 6.1 System Usability Scale (SUS) Target
- **Target:** **$\ge 80.0$** (Grade A under Bangor et al., 2008; minimum Stage 1 $\to$ Stage 2 Go/No-Go gate is mean SUS $\ge 70.0$ per [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md)).
- **Administration:** Administered post-pilot via the standard 10-item Likert questionnaire (Items 1–10 alternating positive and negative polarity, scored on a 1–5 scale, transformed to 0–100).
- **Specific Pilot Focus Areas:**
  - Ease of entering historical bi-monthly bills without utility terminology confusion.
  - Clarity of the visual tariff headroom indicator near 500 kWh.
  - Simplicity of the CSV drag-and-drop workflow.

### 6.2 Cognitive Burden & Interaction Friction Rating
- **Target:** **$\le 2.0$** on a 5-point subjective burden scale ($1 = \text{Negligible}$, $5 = \text{Overwhelming}$).
- **Measurement:** After each recommendation and adaptive question prompt, participants rate:
  - *"How much mental effort did it take to understand this suggestion?"*
  - *"Did the questions asked feel intrusive or burdensome?"*
- **Algorithmic Validation:** Confirms that the $c_{\text{ask}} = ₹2.00$ annoyance penalty in TR-VOI effectively prevents survey fatigue by strictly bounding session queries ($K \le 1$ in practice, theoretical maximum $K \le 3$).

### 6.3 Recommendation Actionability & Acceptance Rate
- **Target:** **$\ge 70.0\%$** positive actionability (fraction of presented recommendations marked as `useful` or `tried_it`).
- **Dismissal Diagnostics:** When a participant marks an action `impractical`, the system logs the target dimension (e.g., AC cooling, water heating) to assess whether prior comfort bounds $D_{\max}$ require tightening for specific demographics.

### 6.4 Tariff Transparency & Provenance Trust
- **Target:** **$\ge 4.0 / 5.0$** on transparent calculation trust.
- Evaluates whether users understand that savings are computed using official TNERC tariff orders rather than vague approximations or fabricated AI projections.

---

## 7. Research Limitations, M&V Scope & Experimental Disclaimers

To maintain research integrity and avoid overclaiming in academic and regulatory reporting, the pilot operates under explicitly acknowledged constraints:

1. **Two-Stage Separation & M&V Certification Boundary (No IPMVP Option C Claim):**
   - **Stage 1 ($N = 5\text{--}10$)** assesses usability, comprehension, and safety only; **zero energy or bill savings efficacy claims** may be drawn from Stage 1.
   - **Stage 2** relies on a concurrent **Randomized Controlled Trial (Treatment vs. Control)** for causal inference across shared seasonal/weather shocks rather than single-home pre-post M&V proofs.
   - **Weather normalization alone does NOT establish IPMVP Option C compliance**, and HearthShift AI currently does **NOT** claim EVO IPMVP Option C or ASHRAE Guideline 14 certification. Full Option C compliance requires $\ge 12$ months baseline, $\text{CV(RMSE)} \le 15\%$, $|\text{NMBE}| \le 5\%$, documented non-routine adjustments (occupancy, floor area, appliance stock, tariff revisions, meter swaps), a pre-registered M&V plan, and autocorrelation-corrected Fractional Savings Uncertainty ($\text{FSU}$). See [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md).
2. **Non-Intrusive Load Monitoring (NILM) Boundary:**
   - HearthShift AI does not claim high-fidelity disaggregation of simultaneous unmetered loads from raw aggregate meter streams.
   - Appliance reductions are evaluated using parameterized physical models and user-reported configurations, supplemented by whole-home interval change detection.
3. **Regulatory Tariff Scope:**
   - Calculations are strictly calibrated to official tariff orders issued by TNERC and GoTN for TNPDCL Domestic LT-1A.
   - Findings may not generalize directly to jurisdictions with complex dynamic spot pricing, continuous critical peak pricing (CPP), or real-time locational marginal pricing without tariff plan reconfiguration.
4. **Behavioral Durability vs. Immediate Adoption:**
   - Stage 2 evaluation spans 1–2 bi-monthly billing cycles (8–16 weeks) to align with TNPDCL billing cadence. Long-term multi-year habit persistence requires subsequent longitudinal investigation.

---

## 8. Local Backup & Proposed Encrypted Research Export Protocol

> [!NOTE]
> **Current v1 Implementation vs. Proposed Stage 2 Extension:**  
> In the current v1 client application (`PrivacyDataManager.tsx` / `db.exportAllUserData()`), **"Export JSON"** generates an **unencrypted local JSON backup** (`hearthshift_backup_<date>.json`) for participant auditability and personal portability. The encrypted research bundle workflow (`.hearthshift-research.enc` via Web Crypto AES-GCM / ECDH) specified below is a **proposed Stage 2 RCT extension** to be implemented prior to multi-household Stage 2 data collection.

For Stage 2 participants who voluntarily agree to contribute de-identified interaction data to the research team, the following cryptographic export specification is established:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   OPTIONAL RESEARCH EXPORT WORKFLOW                    │
│                                                                        │
│  1. Participant initiates "Export for Research" in Settings            │
│  2. Explicit Consent Modal displayed (lists exact data fields)         │
│  3. Data Sanitization Engine executes:                                 │
│     - Strips bill reference numbers, account IDs, and user notes       │
│     - Quantizes timestamps to 1-hour relative offsets                  │
│  4. In-Browser Cryptographic Packaging:                                │
│     - Web Crypto API (AES-GCM 256-bit)                                 │
│     - Encrypted using Research Team Public Key (ECDH P-256)            │
│  5. Browser downloads `.hearthshift-research.enc` package               │
│  6. Zero automatic transmissions: user manually transmits file         │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Data Sanitization & De-Identification Rules
Before encryption, the export pipeline executes deterministic data minimization:
- **Identifier Removal:** Consumer service numbers, bill reference numbers, street addresses, and free-form personal notes are stripped.
- **Timestamp Truncation:** Absolute calendar dates may be converted to relative pilot experiment days ($t \in [0, 60]$) to prevent temporal re-identification.
- **Paise Quantization:** Financial amounts are retained in integer paise for numerical parity auditing.
- **Belief State Representation:** Only latent mean $\boldsymbol{\mu}$ and variance $\boldsymbol{\Sigma}$ parameters are included.

### 8.2 Client-Side Cryptographic Protocol
- **Encryption Standard:** The export bundle is serialized to JSON and encrypted on-device using the standard **W3C Web Crypto API**.
- **Cipher Suite:** Authenticated symmetric encryption via **AES-GCM with a 256-bit key**, wrapped using an asymmetric **ECDH / RSA-4096** research recipient public key, or secured with an explicit participant-selected export passphrase.
- **Manual Transmission Only:** The resulting encrypted artifact (`hearthshift_pilot_data_<date>.enc`) is saved to the participant's local downloads folder. The web application **never transmits the file over any network socket**. The participant retains full physical possession and transmits the file via email or secure drive only if they choose.

---

## 9. Pilot Protocol Governance & Current Status

This protocol constitutes the **proposed** operational and statistical guideline for Stage 1 usability validation and Stage 2 powered RCT evaluation of HearthShift AI. **No human-subject recruitment or field execution has occurred as of November 25, 2026.**

| Role | Scope | Date | Current Status |
| :--- | :--- | :---: | :---: |
| **Research & Statistics Lead** | Power analysis (`power_analysis.py`) & RCT sizing | Nov 25, 2026 | **PROPOSED — PENDING ETHICS & DEPLOYMENT APPROVAL** |
| **M&V Methodology Reviewer** | IPMVP Option C & ASHRAE 14 gap alignment | Nov 25, 2026 | **PROPOSED — NO OPTION C CLAIMED** |
| **Human-Factors & Safety Lead** | Stage 1 ($N=5\text{--}10$) usability & safety gate | Nov 25, 2026 | **PROPOSED — NOT EXECUTED** |

*All field operations require formal Institutional Ethics Committee / IRB approval, Stage 1 usability sign-off, and documented informed consent prior to recruiting the first participant.*
