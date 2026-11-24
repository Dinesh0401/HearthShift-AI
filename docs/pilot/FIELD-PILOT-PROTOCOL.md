# HearthShift AI — Field-Pilot Protocol & Human-Centered Evaluation Plan
## Gate H: Empirical Household Validation, Informed Consent, and Research Integrity

**Document Status:** Approved Field-Pilot Protocol  
**Version:** 1.0.0  
**Date:** November 24, 2026  
**Target Release:** Phase 3 Gate G/H Verification  
**Repository:** `HearthShift-AI` (Flagship Project #04)  
**Author:** Pilot Protocol & Research Integrity Auditor  

---

## 1. Executive Summary & Protocol Architecture

The HearthShift AI Field-Pilot Protocol governs the empirical validation of the Sparse-feedback, Privacy-Aware, Risk-sensitive Energy Management (SPARE-HEM) framework and its client-side Threshold-Aware Robust Value-of-Information (TR-VOI) decision engine.

Unlike conventional energy management platforms that aggregate smart meter telemetry onto centralized cloud servers and deploy black-box deep learning or remote Large Language Models (LLMs), HearthShift AI executes **100% on-device** within standard modern web browsers. It couples deterministic, bitwise-verified statutory tariff calculators with robust Bayesian active learning to deliver conservative, risk-bounded energy advice.

This document establishes the operational procedures, participant protections, ethical safeguards, structured user evaluation tasks, usability metrics, and research boundaries required for conducting an empirical field study across residential households in Tamil Nadu, India.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   FIELD-PILOT GOVERNANCE ARCHITECTURE                  │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Ethical Foundation       │ Informed Consent & Local-First Sovereignty  │
│ Target Cohort            │ Tamil Nadu Domestic LT-1A Households (N=30) │
│ Data Security            │ Zero Cloud Telemetry & Atomic Browser Wipe  │
│ Experimental Workflow    │ 5 Structured Tasks (Ingestion → Feedback)   │
│ Success Threshold        │ System Usability Scale (SUS) >= 80 (Grade A)│
│ Risk Management          │ Hard Discomfort Quantile Safety Bounds      │
└──────────────────────────┴─────────────────────────────────────────────┘
```

---

## 2. Participant Information & Informed Consent Protocol

### 2.1 Principle of Local-First Execution
Participants must be explicitly informed during onboarding that HearthShift AI is architected on local-first privacy principles:
1. **Zero Cloud Telemetry:** All electricity meter data, historical utility bills, household appliance configurations, subjective responses, and inferred preferences are stored exclusively within the browser's local IndexedDB (`HearthShiftDB`).
2. **Zero Remote Processing:** Optimization algorithms, numerical integrations, tariff calculations, and counterfactual scenario simulations run on the client's local CPU via JavaScript/WebAssembly Web Workers.
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
   - **Tier 1 Requirement (Basic Mode):** Minimum of 3 consecutive historical bi-monthly electricity bills (spanning at least 6 months) with verified consumption in kilowatt-hours (kWh).
   - **Tier 2 Requirement (Detailed Mode):** Availability of smart meter export data or smart plug interval logging in standard CSV format (15-minute, 30-minute, or 60-minute resolution covering $\ge 14\text{ days}$).
5. **Consumption Proximity to Tariff Thresholds:**
   - Preference is given to households with historical bi-monthly consumption between **$350\text{ kWh}$ and $650\text{ kWh}$**, as this cohort operates within the critical influence zone of the $500\text{ kWh}$ statutory tariff cliff.

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
- **Service Worker / PWA Caching:** Core static assets (JavaScript, WebAssembly, CSS, public tariff definitions) are cached locally, allowing the application to operate fully offline after initial load.
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

Field-pilot participants execute five standardized evaluation tasks designed to stress-test the end-to-end user experience, data processing capabilities, and decision-theoretic algorithms.

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
  3. Toggle candidate appliance reductions:
     - Micro-curtailment: Raise AC thermostat by $+0.5^\circ\text{C}$ ($-15\text{ kWh}$).
     - Water heater trim: Reduce geyser runtime by 15 minutes ($-20\text{ kWh}$).
     - Standby elimination: Power down entertainment center overnight ($-6\text{ kWh}$).
  4. Observe the calculated new total ($490\text{ kWh}$) and the resulting bill savings.
  5. Inspect the highlighted **Tariff Cliff Bonus** of ₹478.40.
- **Verification Criteria:**
  - Total proposed consumption drops below $500.0\text{ kWh}$.
  - System reports total net savings of ₹575.00 (₹96.60 volumetric slab savings + ₹478.40 reclaimed subsidy).
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
- **Target:** **$\ge 80.0$** (corresponding to Grade A, top decile usability under Bangor et al., 2008).
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

## 7. Research Limitations & Experimental Disclaimers

To maintain research integrity and avoid overclaiming in academic and regulatory reporting, the pilot operates under explicitly acknowledged constraints:

1. **Quasi-Experimental Pilot Design:**
   - The pilot uses a within-subject observational framework rather than a fully randomized controlled trial (RCT) with sub-metered control groups.
   - External factors—such as seasonal ambient temperature fluctuations across Tamil Nadu's coastal and interior districts, family vacation schedules, and festival holidays (e.g., Pongal, Deepavali)—introduce exogenous variance in household baselines.
2. **Non-Intrusive Load Monitoring (NILM) Boundary:**
   - HearthShift AI does not claim high-fidelity disaggregation of simultaneous unmetered loads from raw aggregate meter streams.
   - Appliance reductions are evaluated using parameterized physical models and user-reported configurations, supplemented by whole-home interval change detection.
3. **Regulatory Tariff Scope:**
   - Calculations are strictly calibrated to official tariff orders issued by TNERC and GoTN for TNPDCL Domestic LT-1A.
   - Findings may not generalize directly to jurisdictions with complex dynamic spot pricing, continuous critical peak pricing (CPP), or real-time locational marginal pricing without tariff plan reconfiguration.
4. **Behavioral Durability vs. Immediate Adoption:**
   - Pilot evaluation spans a 4-to-8 week monitoring horizon. While immediate recommendation acceptance and actionability are measured, long-term multi-year habit persistence requires subsequent longitudinal investigation.

---

## 8. Optional Encrypted Feedback Export Protocol

For participants who voluntarily agree to contribute anonymized interaction data to the research team, an explicit, cryptographic export protocol is established.

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

## 9. Pilot Protocol Approval & Sign-Off

This protocol constitutes the authoritative operational guideline for Phase 3 field testing of HearthShift AI.

| Role | Name / Title | Date | Signature / Status |
| :--- | :--- | :---: | :---: |
| **Research Lead** | HearthShift AI Applied Mathematics Team | Nov 24, 2026 | **APPROVED** |
| **Privacy & Security Auditor** | Systems Security & Ethics Panel | Nov 24, 2026 | **APPROVED** |
| **Pilot Operations Lead** | Household Field Studies Coordinator | Nov 24, 2026 | **APPROVED** |

*All pilot operations must adhere strictly to the protocols, eligibility criteria, and safety disclaimers detailed herein.*
