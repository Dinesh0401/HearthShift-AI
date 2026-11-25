# HearthShift AI — Stage 1 Usability & Safety Comprehension Analysis Report

> [!CAUTION]
> **SYNTHETIC PRE-STUDY EXAMPLE — NOT REAL PARTICIPANTS**
> Generated solely to verify reproducible scoring and schema validation against `research/fixtures/stage1_synthetic_usability_sessions.json`. Zero real households have been tested.

---

## 1. Cohort Scope & Inferential vs. Exploratory Boundaries
- **Independent Participants ($N$):** `8`
- **Epistemic Boundary:** Formative exploratory usability audit across N=8 independent participants. Within-participant task completions (10 tasks/participant) are correlated repeated measures and are summarized at the participant level before step-level breakdowns. Small-N intervals are exploratory uncertainty bounds only—never population-wide efficacy, tariff certification, or savings claims.

## 2. Participant-Level Task Completion (Primary Descriptive Summary across N Independent People)
- **Participant Unassisted Proportion (`/10` steps):** Mean `93.8%` (SD `7.4%`), Median `95.0%` (IQR `90.0%–100.0%`, Range `80.0%–100.0%`)
- **Participants Completing All 10/10 Unassisted:** `4/8`

| Participant | Locale | Device | Unassisted (`2`) | Assisted (`1`) | Failed (`0`) | Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `SYN-P01` | `en` | `desktop` | 10 | 0 | 0 | `100%` |
| `SYN-P02` | `ta` | `mobile` | 9 | 1 | 0 | `90%` |
| `SYN-P03` | `en` | `desktop` | 9 | 1 | 0 | `90%` |
| `SYN-P04` | `ta` | `desktop` | 9 | 1 | 0 | `90%` |
| `SYN-P05` | `en` | `mobile` | 10 | 0 | 0 | `100%` |
| `SYN-P06` | `ta` | `mobile` | 8 | 1 | 1 | `80%` |
| `SYN-P07` | `en` | `desktop` | 10 | 0 | 0 | `100%` |
| `SYN-P08` | `ta` | `desktop` | 10 | 0 | 0 | `100%` |

## 3. Step-by-Step Breakdown & Correlated Tally
- **Repeated-Measures Attempt Tally (Correlated Within-Participant Steps — No Pooled Binomial CI):** `80` attempts — Unassisted (`2`): `75`, Assisted (`1`): `4`, Failed (`0`): `1`

| Step | Unassisted (`2`) | Assisted (`1`) | Failed (`0`) | Exploratory Unassisted Rate Across N (95% Clopper-Pearson CI) | Median Time (IQR) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Step 1: Onboarding & Advisory Disclaimer Check | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 62.5s (57.2–69.0s) |
| Step 2: Language Toggle & Capability Inspection | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 44.5s (39.5–46.8s) |
| Step 3: Manual Historical Bill Entry | 7 | 1 | 0 | `87.5%` (`[47.3%, 99.7%]`) | 100.0s (92.2–114.5s) |
| Step 4: Tariff Headroom & 500 kWh Cliff Interpretation | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 59.5s (51.0–63.0s) |
| Step 5: Interval CSV Import & Worker Feedback | 6 | 1 | 1 | `75.0%` (`[34.9%, 96.8%]`) | 101.0s (87.5–124.8s) |
| Step 6: Interval Chart & Standby Baseload Review | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 64.0s (58.0–70.2s) |
| Step 7: Counterfactual Scenario Exploration | 7 | 1 | 0 | `87.5%` (`[47.3%, 99.7%]`) | 110.0s (98.0–115.0s) |
| Step 8: Recommendation & Q0.05 Bound Audit | 7 | 1 | 0 | `87.5%` (`[47.3%, 99.7%]`) | 95.5s (89.5–104.0s) |
| Step 9: Adaptive EVSI Modal & Provenance Ledger | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 73.0s (67.8–79.0s) |
| Step 10: Privacy Export, Feedback Review & Wipe | 8 | 0 | 0 | `100.0%` (`[63.1%, 100.0%]`) | 73.5s (69.5–82.2s) |

## 4. First-Attempt vs. Post-Debrief Safety Comprehension (`SAF-1` to `SAF-4`)
*Initial misconceptions BEFORE moderator debriefing are never overwritten or masked.*

| Probe | First-Attempt Pass (Exploratory 95% CI) | Initial Misconceptions | Post-Debrief Pass (Exploratory 95% CI) | UI Remediation Triggered? |
| :--- | :---: | :---: | :---: | :---: |
| **SAF-1** | `7/8` (`87.5%`, `[47.3%, 99.7%]`) | `SYN-P04` | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | YES |
| **SAF-2** | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | `None` | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | No |
| **SAF-3** | `7/8` (`87.5%`, `[47.3%, 99.7%]`) | `SYN-P02` | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | YES |
| **SAF-4** | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | `None` | `8/8` (`100.0%`, `[63.1%, 100.0%]`) | No |

## 5. Individual Brooke SUS Scores, SEQ & Question Burden (Explicit Denominators)
- **SUS Summary (`N=8`):** Mean `77.19` (SD `8.18`), Median `76.25` (IQR `72.5–80.62`, Range `65.0–92.5`)
- **SEQ Median Ease (`1–7`, `n=8/8`):** Manual Bill = `6.0`, CSV Import = `5.0`
- **Question Burden (Missing / N/A Excluded from Denominator):** `QB-1` Mean `1.75 (n=8/8)`, `QB-2` Mean `1.88 (n=8/8)`, Evaluated `n=8/8`, Low-Tolerance / High-Burden = `2/8` (`25.0%`, `c_ask` escalation triggered: `False`)

| Participant ID | Locale | Device | SUS Score |
| :--- | :---: | :---: | :---: |
| `SYN-P01` | `en` | `desktop` | `80.0` |
| `SYN-P02` | `ta` | `mobile` | `72.5` |
| `SYN-P03` | `en` | `desktop` | `82.5` |
| `SYN-P04` | `ta` | `desktop` | `72.5` |
| `SYN-P05` | `en` | `mobile` | `77.5` |
| `SYN-P06` | `ta` | `mobile` | `65.0` |
| `SYN-P07` | `en` | `desktop` | `92.5` |
| `SYN-P08` | `ta` | `desktop` | `75.0` |

## 6. Defect Summary & Stage 1 -> Stage 2 Go/No-Go Check
- **Defects:** `S0=0`, `S1=0`, `S2=2`, `S3=1`
- **Zero S0/S1 Defects:** `True`
- **SAF-1 & SAF-2 First-Attempt 100% (No UI Remediation Required):** `False`
- **SAF-1 & SAF-2 Post-Debrief 100%:** `True`
- **Participant Mean Unassisted Completion >= 80%:** `True`
- **Mean SUS >= 70:** `True`
- **Stage 2 Go Without Pre-RCT Copy Remediation:** `False`
