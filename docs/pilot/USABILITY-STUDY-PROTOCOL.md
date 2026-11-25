# HearthShift AI — Stage 1 Usability & Safety Comprehension Study Protocol
## Phase 4A Stage 3 Human-Factors Pre-Pilot (`N = 5 to 10` Households)

**Document Status:** Proposed Pre-Pilot Protocol (Pending Ethics Review & Recruitment — Not Executed)  
**Study Role:** Phase 4A Stage 3 Deliverable — Field Evaluation Stage 1 (Pre-Pilot Usability & Safety Comprehension Check, strictly preceding the Stage 2 Powered RCT)  
**Version:** 1.0.0  
**Date:** November 25, 2026  
**Target Cohort:** $N = 5\text{ to }10$ Consenting Adult Domestic Electricity Consumers (Tamil Nadu / LT-1A context)  
**Related Protocols:** [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md) · [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md)

---

> [!CAUTION]
> **STRICT PROHIBITION ON SAVINGS & EFFICACY CLAIMS**
> This $N = 5\text{--}10$ study is **strictly a qualitative and quantitative usability, cognitive-load, and safety-comprehension pre-pilot**. It is **NOT** a randomized efficacy trial and is **statistically unpowered** to measure energy or bill savings.
> - **Prohibited Claims:** Researchers and authors **MUST NOT** claim, imply, or extrapolate measured kWh reductions, INR bill savings, 500 kWh tariff-cliff avoidance rates, or IPMVP Option C verification from any data collected in this Stage 1 study.
> - **Permitted Claims:** Only task completion rates, interaction defects, System Usability Scale (SUS) scores, question-burden feedback ($c_{\text{ask}}$ calibration), privacy perception, and safety-comprehension findings may be reported from Stage 1.

---

## 1. Study Purpose & Scope Within Phase 4A

Before launching a resource-intensive, formally powered Stage 2 Randomized Controlled Trial (RCT) (see [`power_analysis.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/power_analysis.py) and [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md)), HearthShift AI requires empirical evidence that real adult householders can operate the client-side web application without critical usability failures or dangerous physical/financial misunderstandings.

### 1.1 Primary Objectives
1. Validate end-to-end usability of the **10-step real-user flow** across billing input, CSV import, counterfactual simulation, TR-VOI recommendation review, EVSI inquiry, and local privacy controls.
2. Verify comprehension of probabilistic uncertainty bounds ($Q_{0.05}$ lower bound vs. expected savings $\mathbb{E}[\Delta\text{Bill}]$) and provenance labels (`simulated`, `user_reported`, `meter_observed`, `measurement_verified`).
3. Detect and eliminate **unsafe interpretations** (e.g., false belief in automatic appliance actuation, water-heater safety cutout tampering, or viewing modeled simulations as guaranteed utility refunds).
4. Empirically assess perceived question annoyance ($c_{\text{ask}}$) and privacy comfort with browser-local `IndexedDB` (`HearthShiftDB`) storage.
5. Capture and triage product defects prior to locking the Stage 2 RCT software build.

### 1.2 Sample Size Justification ($N = 5\text{--}10$)
Per formative human-factors engineering standards (Nielsen & Landauer, 1993; Virzi, 1992), $5$ to $10$ representative participants in moderated think-aloud testing typically uncover the majority of high-severity UI workflow and copy comprehension defects while keeping participant burden low. We target **$N = 8$ primary participants** (acceptable completion window: **$N = 5\text{ to }10$**), stratified to include both English-preferring and Tamil-preferring (`en` / `ta`) household electricity decision-makers, and a mix of smartphone and laptop browsers.

---

## 2. Participant Eligibility, Informed Consent & Ethical Safeguards

### 2.1 Inclusion & Exclusion Criteria
- **Inclusion:**
  - Consenting adult ($\ge 18$ years) residing in a domestic household (preferably TNPDCL LT-1A domestic service) who reviews or pays household electricity bills.
  - Access to at least 1–3 recent electricity bills (or willingness to enter representative bill values during a sandboxed walkthrough alongside their own bill).
  - Basic familiarity with a mobile or desktop web browser.
- **Exclusion:**
  - Households relying on continuous life-support or critical medical electrical equipment.
  - Individuals involved in developing or auditing HearthShift AI (to prevent expert-bias distortion).

### 2.2 Informed Consent & Study Safeguards
1. **Explicit Experimental Status:** Consent form states clearly that HearthShift AI is a research prototype, provides advisory estimates only, does **not** connect to utility meters or control appliances, and offers **no guarantee** of financial savings.
2. **Local-First Data Protection During Sessions:** Participants run the application in their own browser session (or a clean private/guest browser profile on a study device wiped immediately post-session via `deleteAllUserData()`). Moderators **must not** record consumer service numbers, street addresses, or raw bill PDFs in study logs.
3. **Voluntary Participation & Withdrawal:** Participants may skip any task, decline to upload personal CSVs (using provided anonymized sample CSVs instead), or withdraw at any time without penalty.
4. **Session Format:** 45–60 minute moderated session (in-person or screen-shared remote), conducted in English or Tamil according to participant preference, followed by structured debriefing.

---

## 3. The 10-Step Real-User Evaluation Flow

Participants complete the following **10 standardized tasks** sequentially using the live client interface ([`src/app/page.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/app/page.tsx)) under think-aloud observation. Moderators remain silent during initial attempts and provide standardized hints only after a participant gets stuck for $>90\text{ seconds}$ (logged as "Completed with Assistance").

| Step | Real-User Flow Task | Target App Module / Tab | Success Criterion (Unassisted) | Primary Constructs Tested |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Onboarding & Advisory Disclaimer Check** | Landing / Consent & Header | Correctly explains that app is advisory-only, local-first, and cannot actuate appliances. | Construct 7 (Safety), Construct 8 (Privacy) |
| **2** | **Language Toggle & Capability Status Inspection** | `Header.tsx` + `CapabilityBadge.tsx` | Switches EN/TA if desired and identifies current capability mode (`BASIC`) and why interval features are locked. | Construct 1 (Completion), Construct 9 (Defects) |
| **3** | **Manual Historical Bill Entry** | `Bills` tab (`ManualBillForm.tsx`, `BillHistoryTable.tsx`) | Enters 2–3 bi-monthly bills (start/end dates, kWh, optional INR) without validation failure; verifies table entry. | Construct 1, Construct 3 (Bill Input Ease) |
| **4** | **Tariff Headroom & 500 kWh Cliff Interpretation** | `TariffHeadroomCard.tsx` | Identifies kWh headroom/excess relative to 500 kWh and explains the +₹478.40 subsidy cliff risk in own words. | Construct 1, Construct 2 (Comprehension) |
| **5** | **Interval CSV Import & Worker Feedback** | `Import CSV` tab (`CsvDropzone.tsx`, `csv-parser.worker.ts`) | Uploads interval CSV (own or synthetic sample), waits for worker parsing, verifies capability upgrade (`INTERVAL`/`OPTIMIZATION_ELIGIBLE`). | Construct 1, Construct 3 (CSV Ease), Construct 9 |
| **6** | **Interval Chart & Standby Baseload Review** | `Interval Profiles` tab (`IntervalChart.tsx`) | Locates quiet-hour/standby baseload pattern and differentiates interval kWh data from manual bill totals. | Construct 1, Construct 2 |
| **7** | **Counterfactual Scenario Exploration** | `Simulator` tab (`ScenarioSimulator.tsx`) | Toggles AC setpoint, geyser trim, standby, and laundry shift; explains why laundry shift saves ₹0.00 under LT-1A and why cliff bonus is non-additive. | Construct 1, Construct 2, Construct 7 |
| **8** | **Recommendation & Uncertainty Bound Audit** | `Recommendations` tab (`RecommendationFeed.tsx`) | Identifies top recommendation (or abstention), reads Assumptions list, and distinguishes $\mathbb{E}[\Delta\text{Bill}]$ from conservative $Q_{0.05}$ and `SIMULATED` badge. | Construct 2 (Bounds), Construct 6 (Willingness) |
| **9** | **Adaptive EVSI Modal & Feedback / Ledger Check** | `AdaptiveQueryModal.tsx` + `SavingsLedger.tsx` | Answers or skips single EVSI question (or records `useful`/`impractical`/`tried_it`); checks `SavingsLedger` badge (`user_reported` vs `measurement_verified`). | Construct 5 ($c_{\text{ask}}$ Burden), Construct 6 |
| **10** | **Privacy Audit, Batch Rollback & Full Wipe** | `Privacy` tab (`PrivacyDataManager.tsx`, `db.ts`) | Inspects JSON export (`exportAllUserData()`), rolls back an imported CSV batch (`rollbackBatch()`), and executes `deleteAllUserData()` verifying reset. | Construct 1, Construct 8 (Privacy), Construct 9 |

---

## 4. Structured Instrumentation for All 9 Required Constructs

Every session records quantitative scores and verbatim observations across the **9 required constructs** below using a standardized moderator scoring sheet (`Session ID`, `Locale`, `Device/Browser`, `Date`).

### Construct 1: Task Completion (10-Step Real-User Flow)
- **Metric:** Per-step completion code $\in \{\text{2 = Unassisted Success}, \text{1 = Assisted Success (prompt needed)}, \text{0 = Failed / Abandoned}\}$.
- **Timing & Errors:** Wall-clock seconds per step; count of validation/navigation errors per step.
- **Stage 1 Benchmark:** Unassisted completion $\ge 80\%$ across Steps 1–10; zero tasks with $>30\%$ failure rate before Stage 2 launch.

### Construct 2: Comprehension of Recommendations & Uncertainty Bounds ($Q_{0.05}$ vs. Expectation)
Structured teach-back questions asked immediately after Steps 7 and 8 (scored `Correct`, `Partial`, `Incorrect`):
1. **Expected vs. Lower Bound ($Q_{0.05}$):** *"The card shows Expected Savings of ₹X and Conservative Lower Bound ($Q_{0.05}$) of ₹Y. In plain language, why are these two numbers different, and which number is safer for budgeting?"*
   - *Pass criterion:* Recognizes $Q_{0.05}$ as a conservative downside estimate accounting for weather/usage uncertainty, not a minimum guaranteed payout.
2. **Provenance Tier Distinction:** *"What is the difference between a yellow `Simulated` badge, a blue `User Reported` badge, and a green `Measurement Verified` badge?"*
   - *Pass criterion:* Correctly states that `Simulated` and `User Reported` are not independently verified by meter data.
3. **Cliff Non-Double-Counting & Load-Shift Invariant:** *"If total savings are ₹575 and the Cliff Bonus shows ₹478.40, do you save ₹575 or ₹1,053.40? And why does shifting laundry save ₹0.00 here?"*

### Construct 3: Ease of Importing Bills & CSVs
- **Instrument 3A (SEQ):** Immediately after Step 3 (Manual Bills) and Step 5 (CSV Import), participant completes the **Single Ease Question (SEQ)**: *"Overall, how difficult or easy was this task?"* ($1 = \text{Very Difficult}$ to $7 = \text{Very Easy}$).
- **Instrument 3B (Friction Log):** Moderator logs utility-bill terminology confusion (e.g., billing dates vs. assessment date, bi-monthly vs. monthly kWh confusion, CSV header mismatch, unit W vs. kWh confusion).
- **Stage 1 Benchmark:** Median SEQ $\ge 5.0 / 7.0$ for both manual bill entry and CSV import.

### Construct 4: Perceived Usefulness & Usability (SUS + Domain Likert)
- **Instrument 4A (Standard 10-Item SUS):** Administered at end of session using Brooke's standard 10 alternating items ($1\text{--}5$ scale, transformed to $0\text{--}100$).
- **Instrument 4B (Perceived Usefulness 5-Point Likert, $1 = \text{Strongly Disagree}$ to $5 = \text{Strongly Agree}$):**
  - *PU-1:* "The 500 kWh tariff headroom display helps me understand how my bill jumps."
  - *PU-2:* "The counterfactual simulator helps me compare practical appliance adjustments."
  - *PU-3:* "The English/Tamil wording is natural and easy to follow."
  - *PU-4:* "The assumptions listed on recommendations make the advice transparent and trustworthy."
- **Stage 1 Benchmark:** Mean SUS $\ge 70$ (minimum Stage 2 gate; target $\ge 80$ after copy polish) and median usefulness items $\ge 4.0 / 5.0$.

### Construct 5: Question Burden ($c_{\text{ask}}$ Validation)
Evaluates whether TR-VOI's annoyance/privacy hurdle ($c_{\text{ask}} = 200\text{ paise} = \text{₹}2.00$, plus per-question privacy costs $c_{\text{priv}} \in [\text{₹}2.00, \text{₹}5.00]$, capping typical session prompts at $K \le 1$) feels appropriately lightweight:
- **Instrument 5A (Post-Modal Burden Scale, $1\text{--}5$):**
  - *QB-1:* "How intrusive or annoying did this preference question feel?" ($1 = \text{Not at all}$, $5 = \text{Very intrusive}$).
  - *QB-2:* "How much mental effort did answering this question take?" ($1 = \text{Minimal}$, $5 = \text{Exhausting}$).
- **Instrument 5B (Tolerance Threshold Probe):** *"In a two-month billing cycle, what is the maximum number of short questions like this you would tolerate before ignoring the app?"* (Options: `0`, `1`, `2–3`, `4+`).
- **Calibration Rule:** If $>25\%$ of participants report tolerance $\le 1$ question or rate *QB-1* $\ge 3$, escalate $c_{\text{ask}}$ (e.g., from ₹2.00 to ₹5.00) or restrict inquiry frequency before Stage 2.

### Construct 6: Willingness to Try Recommendations Manually
- **Instrument 6A (Behavioral Intention, $1\text{--}5$ Likert):** *"Assuming your household has this appliance, how willing would you be to manually try the top recommended action over the next week?"*
- **Instrument 6B (Qualitative Barrier Coding):** Record specific household friction factors:
  - Intra-household disagreement (elderly/children thermal needs),
  - Thermal discomfort during Tamil Nadu summer peak,
  - Lack of geyser timer / difficulty accessing power strips,
  - Effort vs. perceived INR savings below participant's personal threshold (informs $c_{\min} = \text{₹}30.00$ calibration).

### Construct 7: Misunderstandings or Unsafe Interpretations (Mandatory Safety Gate)
Moderators administer **4 explicit safety-probe scenarios** using structured prompts and log any spontaneous unsafe statement:

| Safety Probe ID | Probe Question | Unsafe / Misunderstood Response (Flagged) | Required Safe Comprehension |
| :--- | :--- | :--- | :--- |
| **SAF-1 (No Actuation)** | *"If you click 'Useful' or 'Tried It' on an AC recommendation, will the app change your AC temperature?"* | Believes app connects via Wi-Fi/IR/smart meter to adjust AC or geyser automatically. | Clearly states user must manually adjust appliances with remote/switch. |
| **SAF-2 (Geyser Safety)** | *"Should you turn down or disable the internal safety thermostat inside your water heater to maximize savings?"* | Thinks disabling/bypassing thermal cutoff or keeping tank lukewarm permanently is advised. | Knows never to tamper with safety cutouts/valves; understands safe operating hygiene. |
| **SAF-3 (Financial Guarantee)** | *"If the simulator shows ₹575 savings, is TNPDCL guaranteed to reduce your next bill by at least ₹575?"* | Treats modeled savings or $Q_{0.05}$ as a guaranteed refund or binding bill quote. | Understands real bills depend on weather, occupancy, and exact manual adherence. |
| **SAF-4 (Medical / Heat Priority)** | *"During an extreme heatwave or if an ill/elderly family member needs cooler air, what should you do with the app's recommendation?"* | Feels obligated to follow app recommendation despite health/comfort distress. | Prioritizes health and safety; dismisses (`Impractical`) without hesitation. |

> [!WARNING]
> **MANDATORY SAFETY REMEDIATION GATE:**
> Any single **SAF-1** (false automation) or **SAF-2** (thermal safety bypass) failure triggers: (1) immediate verbal debriefing correction by the moderator before the participant leaves, and (2) mandatory UI warning copy / visual redesign and re-verification prior to Stage 2 RCT approval.

### Construct 8: Privacy Concerns (Local Storage vs. Cloud)
- **Instrument 8A (Mental Model Check):** *"Where are the electricity bills and CSV files you just entered stored right now? Could the HearthShift developers read them from a server?"* (Scored: `Accurate Local-Only Model` vs. `Assumes Cloud Upload` vs. `Unsure`).
- **Instrument 8B (Trust & Control Likert, $1\text{--}5$):**
  - *PR-1:* Comfort entering real household bills knowing data stays in browser `IndexedDB` (`HearthShiftDB`).
  - *PR-2:* Understanding that clicking **Export JSON** (`exportAllUserData()`) creates an **unencrypted local file** on their device (so they control sharing it, and must protect that file themselves).
  - *PR-3:* Confidence that **Delete Everything** (`deleteAllUserData()`) actually clears their browser data.

### Construct 9: Product Defects
Every UI bug, crash, worker stall, layout overflow, or confusing bilingual translation is logged in a structured Defect Register:
- **Fields:** `Defect ID`, `Step #`, `Severity (S0–S3)`, `Browser/OS/Viewport`, `Locale (en/ta)`, `Expected Behavior`, `Observed Behavior`, `Console/Worker Error`.
- **Severity Rubric:**
  - **S0 (Blocker):** Data corruption, privacy leak/unexpected outbound call, safety warning missing/misleading, or complete crash.
  - **S1 (Major):** Core flow task impossible without moderator intervention (e.g., CSV import fails silently, bill validation blocks valid TNPDCL bill).
  - **S2 (Moderate):** Confusing label, clipped mobile layout, suboptimal error message causing delay.
  - **S3 (Minor):** Cosmetic styling or non-critical phrasing polish.

---

## 5. Stage 1 $\to$ Stage 2 Go/No-Go Release Criteria

Stage 2 powered RCT recruitment ([`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md)) **cannot** commence until all Stage 1 exit gates are satisfied:

1. **Zero Unresolved S0 Defects & Zero S1 Blockers** remaining in the candidate Stage 2 build.
2. **Safety Comprehension Rate:** $100\%$ of post-remediation participants pass **SAF-1** and **SAF-2**, and $\ge 90\%$ pass **SAF-3** and **SAF-4** without prompting after any required UI copy refinements.
3. **Workflow Viability:** Unassisted completion $\ge 80\%$ across Steps 1–10; mean SUS $\ge 70$ (with remediation plan for any subscale $< 70$).
4. **Honest Reporting Check:** All Stage 1 write-ups explicitly report only usability, comprehension, burden, and defect metrics—with **zero savings efficacy claims**.
