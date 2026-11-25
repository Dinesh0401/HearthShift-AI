# HearthShift AI — Phase 4C-B0: Research Oversight & Ethics Submission Package
## Request for Review / Pathway Determination for Stage 1 Pre-Pilot Usability & Safety Comprehension Study (`N = 5–10`)

| Field | Current Submission Metadata |
| :--- | :--- |
| **Application & Build** | HearthShift AI `v0.1.0-alpha` (`https://hearthshift-ai.pages.dev/`) · Baseline Git HEAD `e43a260` *(following verified release closeout `b191b83`)* |
| **Package Date** | November 25, 2026 |
| **Current Study Execution Status** | **NOT STARTED — `0` real participants recruited · `0` household sessions conducted · `0` personal utility records collected** |
| **Current Authorization Status** | **PENDING SUPERVISOR / INSTITUTIONAL ETHICS REVIEW & PATHWAY DETERMINATION** |
| **Prohibited Actions** | **Do not recruit participants, send invitations, run sessions, collect household data, or fabricate approvals until written authorization is recorded below.** |

> [!CAUTION]
> **CORE SUBMISSION BOUNDARY (NO EFFICACY CLAIMS · NO AUTO-SUBMISSION · EMPTY AUTHORIZATION FIELDS)**
> 1. This document packages existing verified study protocols, bilingual consent materials, risk controls, scoring specifications, and regulatory analyses for review by an academic supervisor or institutional research/ethics body.
> 2. Stage 1 (`N = 5–10`) tests **interface usability, privacy mental models, and physical/financial safety comprehension only**. It cannot and will not be used to claim household kWh savings, utility bill reductions, or certified Measurement & Verification (M&V) results.
> 3. Approval dates, reviewer names/signatures, institutional pathway determinations, and reference numbers in **Section 10** are intentionally **blank** for completion solely by authorized human reviewers.

---

## 1. Study Overview, Problem Statement, Objectives & Expected Public Benefit

### 1.1 Background & Problem Statement
Residential electricity consumers under Tamil Nadu Power Distribution Corporation Limited (**TNPDCL**) Domestic Tariff **LT I-A** are billed bi-monthly across progressive telescopic slabs supplemented by state government welfare subsidies ([`REGULATORY-SOURCE-TRACEABILITY.md`](./REGULATORY-SOURCE-TRACEABILITY.md)). Under Government of Tamil Nadu (**GoTN**) `G.O.(Ms) No. 50` (`10-05-2026`) and **TNERC Order No. 5 of 2026** (`26-05-2026`), households consuming `<= 500 kWh` bi-monthly receive `200` free units (`₹1,570.00` modeled net bill at `500 kWh`), whereas crossing to `501 kWh` reverts eligibility to `100` free units (`₹2,048.40` modeled net bill)—creating an abrupt **`+₹478.40` cliff jump for `1 kWh`**. Existing energy apps often rely on centralized cloud servers, require smart hardware, or surface opaque point-estimate savings that obscure uncertainty and regional flat-slab rules (where pure time-of-day load shifting yields `₹0.00` direct savings under flat-slab LT I-A).

**HearthShift AI (`v0.1.0-alpha`)** is a local-first web research prototype executing pure client-side JavaScript/TypeScript inside the user's browser (`IndexedDB`, zero cloud telemetry, zero smart-plug actuation) using integer-paise tariff arithmetic and conservative lower-bound ($Q_{0.05}$) advisory modeling. Before any multi-month controlled trial can be considered, real adult householders must be tested to verify that they can operate the tool without critical workflow blockages or dangerous misunderstandings.

### 1.2 Research Objectives
1. Measure end-to-end task completion, interaction timing, and UI/bilingual (`en`/`ta`) defects across a standardized 10-step usability walkthrough.
2. Evaluate participant comprehension of uncertainty bounds ($Q_{0.05}$ lower bound vs. expected savings $\mathbb{E}[\Delta\text{Bill}]$), provenance labels (`simulated`, `user_reported`, `meter_observed`, `measurement_verified`), the `500 kWh` tariff cliff, and zero-savings load shifting under flat-slab TNPDCL LT I-A.
3. Detect and quantify **first-attempt safety and privacy misconceptions** before moderator explanation (`SAF-1` to `SAF-4`)—specifically false beliefs in automated AC/geyser control, unsafe geyser thermostat tampering, guaranteed utility refunds, or overriding health comfort during heatwaves—and trigger mandatory software/copy remediation if needed.
4. Collect empirical question-burden feedback ($c_{\text{ask}}$ calibration) and mental-model assessments of browser-profile `IndexedDB` persistence and unencrypted local JSON exports.

### 1.3 Expected Public Benefit
Even at small-sample pre-pilot scale, identifying ambiguous tariff wording, unsafe appliance assumptions, or hidden privacy confusion directly produces safer bilingual (`English` / `Tamil`) consumer energy literacy interfaces and prevents flawed field deployments.

---

## 2. Formal `N = 5–10` Usability Protocol Summary

Full specification: [`USABILITY-STUDY-PROTOCOL.md`](./USABILITY-STUDY-PROTOCOL.md) (v2.0.0) · [`PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md`](./PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md) (v2.0.0).

| Protocol Dimension | Frozen Stage 1 Specification |
| :--- | :--- |
| **Design** | Single-session moderated formative think-aloud usability & comprehension study (`45–60 minutes` per participant, in-person or screen-shared remote, clean Guest Chrome profile or participant's browser) |
| **Target Sample** | $N = 8$ primary target (valid study completion window: **$N = 5$ to $N = 10$** independent consenting adults), justified per formative defect-discovery standards (Nielsen & Landauer, 1993; Virzi, 1992) |
| **Stratification** | Balanced across language (`>= 2` English `en`, `>= 2` Tamil `ta`) and device form factor (`>= 2` mobile, `>= 2` desktop) |
| **Standardized Tasks** | **10 sequential steps:** (1) Onboarding & Advisory Disclaimer Check -> (2) EN/TA Toggle & `BASIC` Capability Inspection -> (3) Manual Bill Entry -> (4) Tariff Headroom & `500 kWh` Cliff -> (5) CSV Interval Import (synthetic 8-day CSV or voluntary own export) -> (6) Interval Chart & Standby Baseload -> (7) Counterfactual Simulator -> (8) Recommendation & $Q_{0.05}$ Audit -> (9) EVSI Modal & `SavingsLedger` Provenance -> (10) `Privacy & Storage` JSON Export, Batch Rollback, Manual PII Review Check & `Delete All My Data` Wipe |
| **Assistance Policy** | Moderator remains silent during first attempts; offers one standardized neutral hint only after `> 90 s` stall (permanently scored `1 = Assisted`, never upgraded back to `2 = Unassisted`) |
| **Baseline Dry Run** | Scoring pipeline audited with `24/24` unit/negative tests in `stage1_usability_scoring.py`; synthetic fixture dry-run archived strictly as a verification artifact ([`PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md`](./PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md)) |

---

## 3. Eligibility, Recruitment & Voluntary Participation Plan

### 3.1 Inclusion & Exclusion Criteria
- **Inclusion (all required):**
  1. Consenting adult ($\ge 18$ years) who reviews or pays domestic household electricity bills.
  2. Resides in a domestic household familiar with Tamil Nadu **TNPDCL LT I-A** (or domestic tiered bi-monthly/monthly residential billing).
  3. Able to read and converse comfortably in English (`en`) or Tamil (`ta`) using a mobile or desktop web browser.
  4. Access to 1–3 representative bill values OR willingness to test with the built-in synthetic sample dataset (`Load Safe Demo Dataset (Synthetic)`).
- **Exclusion (any disqualifies):**
  1. Households relying on continuous **life-support or critical medical electrical equipment** dependent on domestic power supply.
  2. Individuals who previously helped develop, code, audit, or test HearthShift AI (prevents expert-bias masking of UI failures).
  3. Non-domestic / commercial / industrial / HT / LT-IB hut / LT-IC bulk accounts (unless explicitly framed as non-household interface walk-through under LT I-A scope disclosure).

### 3.2 Recruitment & Voluntary Participation Safeguards
- **Gated Start:** Zero outreach, flyers, messages, or participant scheduling may occur until written supervisor/ethics clearance is documented in **Section 10**.
- **Convenience / Purposive Community Recruitment (Post-Authorization Only):** After authorization, adult participants are invited through non-coercive academic/community contacts with explicit assurance that declining or withdrawing has zero academic, financial, or service penalty.
- **Zero-PII Optionality During Testing:** Participants are **encouraged to use the Safe Synthetic Demo / walkthrough numbers (`SAMPLE-01`, `512 kWh`)** rather than entering personal utility bills; any participant choosing to test their own bill numbers does so solely on their own device (and is never asked to hand over paper/PDF bills or TNPDCL consumer service numbers).

---

## 4. Final Participant Information Summaries & Consent Forms (English & Tamil)

The verbatim text below matches [`PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md`](./PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md) Sections `1–2` for print/electronic distribution **only after authorization**.

### 4.1 English Participant Information Summary
- **Study Purpose:** You are invited to test an experimental household electricity website called **HearthShift AI (`v0.1.0-alpha`)** in a 45–60 minute guided usability session ($5$ to $10$ total participants). We are testing whether the screens, Tamil/English wording, charts, and safety warnings are clear and easy to follow—**not** whether the app actually lowers electricity bills.
- **No Appliance Control & No Guarantee of Savings:** HearthShift AI cannot touch or control your air conditioner, geyser (water heater), or electricity meter. All rupee figures are modeled educational estimates based on Tamil Nadu **TNPDCL LT-1A** consumer-payable schedules (**TNERC Order No. 6 of 2025**, **Order No. 4 of 2026**, **Order No. 5 of 2026**, & **GoTN G.O. (Ms) No. 50** — archived in [`regulatory-archive/`](./regulatory-archive/INDEX.md)), not official utility quotes, tariff certification, or guaranteed savings.
- **How Browser Storage Works (`IndexedDB` Profile Persistence):** Any bills or CSV samples entered during your session remain on this device inside the web browser's **`HearthShiftDB` (`IndexedDB`)**. **Important:** Data persists inside this **browser profile** even after closing the browser tab or restarting the browser, unless you use a Private/Incognito window, clear site data, or click **Privacy & Storage → Delete All My Data**.
- **Shared-Device, Extension & Export Risks:** Never enter personal bills on a shared/public device unless you wipe `IndexedDB` afterward. Browser extensions with broad permissions (`<all_urls>`) can inspect open web-page data, and clicking **Export All Data (JSON)** saves an **unencrypted plaintext file** onto your device that you must safeguard yourself.
- **Free-Text Feedback Privacy:** Although the feedback draft tool excludes structured database records (`bills`, `readings`, `preferences`, `savings`), free-text comments you type are **not** automatically redacted. You and the moderator will manually review any written feedback together to delete names, phone numbers, addresses, or meter numbers before saving or sharing.
- **Voluntary Participation:** You may use the built-in synthetic sample dataset (`Load Safe Demo Dataset (Synthetic)`), skip any question, or withdraw at any time with zero penalty.

### 4.2 English Informed Consent Form
> **Assigned Study ID:** `P-0___` *(Do NOT write participant name, phone number, address, or TNPDCL consumer service number on scoring sheets)*
>
> Please confirm each item orally or in writing before starting:
> 1. `[ ]` I confirm I am **18 years or older** and participate voluntarily.
> 2. `[ ]` I understand HearthShift AI (`v0.1.0-alpha`) is an experimental research tool that **cannot control physical appliances** and offers **no guaranteed bill savings** or certified M&V results.
> 3. `[ ]` I understand I must never follow energy advice during extreme heatwaves, illness, or medical discomfort, and must never modify geyser safety thermostat cutouts.
> 4. `[ ]` I understand entered numbers remain locally in this **browser profile (`IndexedDB`)** across tab closes, and I know the risks of shared devices, browser extensions, and unencrypted local JSON exports.
> 5. `[ ]` I understand any free-text feedback I choose to share will be **manually reviewed** with the moderator to remove identifying details before export, stored access-restricted under ID `P-0___`, and that I may withdraw before analysis freeze (or wipe browser storage immediately).
> 6. `[ ]` Optional choice during session: `[ ]` Use **Safe Synthetic Demo / Sample Bill** *(recommended)* OR `[ ]` Enter representative own bill figures on my own device without sharing consumer IDs/PDFs.
>
> **Participant Consent Recorded:** `Yes / No` · **Date:** `____-__-__` · **Locale:** `en / ta`  
> **Participant Initials / Signature (stored separately from scorecard under Consent Roster Key):** `____________________`

### 4.3 தமிழ் பங்கேற்பாளர் தகவல் சுருக்கம் (Tamil Participant Information Summary)
- **ஆய்வின் நோக்கம்:** இது `HearthShift AI (v0.1.0-alpha)` இணையதளத்தின் பயன்பாட்டு எளிமை மற்றும் பாதுகாப்பு எச்சரிக்கைகளின் தெளிவைச் சோதிக்கும் 45–60 நிமிட ஆய்வு ($5\text{--}10$ பங்கேற்பாளர்கள் மட்டுமே). இது மின்கட்டணச் சேமிப்பை நிரூபிக்கும் சோதனை அல்ல.
- **சாதனக் கட்டுப்பாடு இல்லை:** இந்தச் செயலி உங்கள் ஏசி, வாட்டர் ஹீட்டர் (கீசர்) அல்லது மின் மீட்டரைத் தானாகக் கட்டுப்படுத்தாது. காட்டப்படும் தொகைகள் மாதிரி மதிப்பீடுகள் மட்டுமே—உறுதிப்படுத்தப்பட்ட சேமிப்பு அல்ல; எப்போதும் உங்கள் அச்சிடப்பட்ட TANGEDCO/TNPDCL ரசீதைச் சரிபார்க்கவும்.
- **உலாவி சுயவிவர (Browser Profile) சேமிப்பு:** நீங்கள் உள்ளிடும் தகவல்கள் உங்கள் சாதனத்தின் உலாவி சுயவிவர **`IndexedDB`**-யில் சேமிக்கப்படும்; **டேப் மூடிய பின்னும் அது நீடிக்கும்** (Incognito சாளரத்தை மூடினால் அல்லது **Delete All My Data** அழுத்தினால் மட்டுமே அழியும்).
- **பகிர்ந்த சாதனம் & JSON ஆபத்து:** JSON காப்புப் பிரதி குறியாக்கம் (encryption) இன்றி சேமிக்கப்படும். பகிர்ந்த சாதனங்களில் பயன்படுத்திய பின் **Delete All My Data** அழுத்தி அழிக்கவும்.
- **கருத்துப் படிவ PII சரிபார்ப்பு:** இலவச உரையில் (free text) பெயர், முகவரி அல்லது மின் எண் இருந்தால், பகிரும் முன் நீங்களே கைமுறையாக நீக்க வேண்டும். எப்போது வேண்டுமானாலும் ஆய்விலிருந்து விலகலாம்.

### 4.4 ஒப்புதல் படிவம் (Tamil Informed Consent Form)
> **ஆய்வு எண்:** `P-0___` *(பெயர், தொலைபேசி எண், முகவரி அல்லது மின் நுகர்வோர் எண்ணை இங்கு எழுத வேண்டாம்)*
>
> 1. `[ ]` எனக்கு **18 வயது அல்லது அதற்கு மேல்**; நான் தன்னார்வத்துடன் இந்த ஆய்வில் பங்கேற்கிறேன்.
> 2. `[ ]` HearthShift AI (`v0.1.0-alpha`) என்பது சோதனை ஆய்வுக் கருவி மட்டுமே; இது **மின் சாதனங்களைத் தானாகக் கட்டுப்படுத்தாது**, **கட்டணச் சேமிப்பிற்கு உத்தரவாதம் அளிக்காது** என்பதை அறிவேன்.
> 3. `[ ]` கடுமையான வெப்பம் அல்லது உடல்நலக் குறைவின்போது வசதி/பாதுகாப்பிற்கே முன்னுரிமை அளிக்க வேண்டும்; வாட்டர் ஹீட்டரின் பாதுகாப்பு தெர்மோஸ்டாட் அமைப்பை மாற்றக்கூடாது என்பதை அறிவேன்.
> 4. `[ ]` உள்ளிடப்படும் தரவு இந்தச் சாதனத்தின் **உலாவி சுயவிவர (`IndexedDB`)**-யில் டேப் மூடிய பின்னும் நிலைத்திருக்கும் என்பதையும், பகிர்ந்த சாதனம் மற்றும் குறியாக்கமற்ற JSON பதிவிறக்கத்தின் அபாயங்களையும் புரிந்துகொண்டேன்.
> 5. `[ ]` கருத்துப் படிவத்தில் தட்டச்சு செய்யும் உரையை அடையாளத் தகவல்கள் இன்றி **கைமுறையாகச் சரிபார்த்த பின்பே** பகிரலாம் என்பதையும், எந்த நேரத்திலும் ஆய்விலிருந்து விலகலாம் என்பதையும் அறிவேன்.
>
> **பங்கேற்பாளர் ஒப்புதல்:** `ஆம் / இல்லை` · **தேதி:** `____-__-__` · **கையொப்பம் / சுருக்கெழுத்து (தனி ஒப்புதல் பதிவேட்டில்):** `____________________`

---

## 5. Multi-Domain Risk Assessment & Mitigations

| Domain | Specific Risk / Failure Mode | Severity | Pre-Study Technical & Protocol Mitigation |
| :--- | :--- | :---: | :--- |
| **Household Privacy** | Data entered in browser `IndexedDB` persists across tab closes on shared/study laptops; `exportAllUserData()` outputs **unencrypted** JSON; free-text Alpha Feedback comments could accidentally contain names/meter IDs; untrusted `<all_urls>` browser extensions can inspect page DOM. | **Moderate** | Clean Guest Chrome profile used on study devices; participants encouraged to use built-in synthetic data; explicit EN/TA browser-profile & JSON risk disclosures in UI (`src/locales/i18n.tsx`) & consent; Alpha Feedback excludes structured `HearthShiftDB` tables (`0` DB records) and enforces manual PII confirmation checkbox (`AlphaModals.tsx`); moderator & participant inspect free text before saving; mandatory **Step 10** `deleteAllUserData()` wipe verified on reload. |
| **Electricity & Financial Advice** | Participant treats modeled expected savings, $Q_{0.05}$, or `₹478.40` cliff calculation as a guaranteed TNPDCL refund/credit, or applies LT I-A calculator output to excluded tariff classes (`LT I-B` huts, `LT I-C` bulk colonies, `LT V` commercial) or mid-cycle straddled bills. | **Moderate** | Prominent `Experimental Research Alpha` banner (`i18n.tsx`), yellow `SIMULATED` / blue `USER_REPORTED` provenance badges vs. green `MEASUREMENT_VERIFIED`, explicit `non-certified` notices in `REGULATORY-SOURCE-TRACEABILITY.md`, exclusion screening, mandatory **SAF-3** teach-back probe + immediate debriefing if misunderstood. |
| **Physical Appliance & Health Safety** | **False actuation belief:** thinking `Useful` / `Tried It!` changes AC/geyser remotely (`SAF-1`); **Thermal hazard:** lowering internal storage geyser thermostat `< 50°C` risking *Legionella* growth or tampering with safety cutouts (`SAF-2`); **Heatwave / medical harm:** tolerating unsafe indoor heat (`SAF-4`) or jeopardizing medical equipment. | **High (if unmitigated)** | Zero actuation APIs in code; medical/life-support exclusion rule; explicit advice never to alter internal factory thermostats (runtime trimming only) and to immediately dismiss cooling advice (`Impractical`) during heatwaves/illness; mandatory pre-debrief **SAF-1/2/4** comprehension gates; any **SAF-1** or **SAF-2** first-attempt misconception blocks Stage 2 until UI copy remediation & re-verification pass. |

---

## 6. Research Data Management Plan (Access, Anonymization, Retention & Withdrawal)

Full SOP: [`PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md`](./PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md) Section `6` · [`USABILITY-STUDY-PROTOCOL.md`](./USABILITY-STUDY-PROTOCOL.md) Section `2.2`.

1. **Data Minimization & Strictly Prohibited Fields:** Study scorecards collect ONLY pseudonymous ID (`P-01`–`P-10`), locale (`en`/`ta`), device class/viewport (`desktop`/`mobile`), task completion codes (`2`/`1`/`0`), timings (seconds), SUS/SEQ/QB/Willingness scores, `SAF-1..4` initial & post-debrief codes, `S0–S3` defect logs, and manually scrubbed qualitative quotes. Collecting TNPDCL consumer service numbers, Aadhaar/phone numbers, home addresses, full names, or raw utility PDFs/receipt images on scorecards is **strictly prohibited**.
2. **Designated Storage & Role-Based Access Permissions:**
   - **Study Scorecard & Redacted Feedback Folder:** Stored offline/access-restricted in a full-disk-encrypted directory (`4C_Stage1_Data/`, accessible solely to the designated **Principal Investigator [PI] and session moderator**).
   - **Consent Key Separation:** Physical/scanned signed consent sheets linking a real name to `P-0X` are stored separately under lock / separate encrypted container and **never** co-located inside JSON scoring files or Git repositories.
   - **Supervisor / Designate Designation Required Before Start:** The academic supervisor or oversight designate must confirm the named custodian and encrypted storage path in **Section 10** prior to Session 1.
3. **Retention & Destruction Schedule:**
   - Temporary identifiable moderator scratch notes or optional defect-transcription audio (if separately consented) are permanently purged within **30 calendar days** after Stage 1 defect coding concludes.
   - Completely de-identified quantitative scorecards (`P-01`–`P-10`, zero PII) are retained solely for reproducible academic audit alongside defect remediation logs.
4. **Participant Withdrawal Procedure:**
   - **In-session:** Session stops immediately; participant executes **Privacy & Storage → Delete All My Data**, confirms empty reload state, and all uncompleted session sheets are destroyed.
   - **Post-session (up to anonymized Stage 1 cohort freeze):** Participant quotes their `P-0X` code from their information copy; PI permanently deletes the matching scorecard, redacted feedback JSON, and consent-key link within **48 hours** and confirms deletion.

---

## 7. Exact Study Measurements & First-Attempt Safety Evaluation Methodology

Implemented and verified cleanly in [`stage1_usability_scoring.py`](../../research/experiments/stage1_usability_scoring.py) (`65/65` pytest suite passing, including `24/24` strict scorer validation tests):

| Construct | Exact Instrument & Mathematical / Coding Definition | Statistical & Pre-RCT Gate Rule |
| :--- | :--- | :--- |
| **Task Completion (`10` Steps)** | Disjoint frozen outcome codes per step: `2 = Unassisted`, `1 = Assisted (>90s stall hint)`, `0 = Failed/Abandoned`. Strict integer type checking (`bool`/`float`/`string` rejected). | Primary metric: **participant-level** mean/SD & median/IQR of `/10` unassisted proportions across $N$ independent humans (`>= 80%` mean required). Correlated 10-step totals reported descriptively without pooled binomial CIs; each step gets exact Clopper-Pearson 95% CI across $N$ (`<= 30%` failure per step). |
| **Safety Comprehension (`SAF-1`–`SAF-4`)** | Mandatory **Dual-Stage Scorecard**: **Col A (First Attempt)** scored strictly *before* moderator explanation (`True = PASS`, `False = MISCONCEPTION`; truthiness bypassed strings like `"FAIL"` rejected); **Col B (Post-Debrief)** scored after immediate verbal ethical correction. | In-session duty: `0` participants leave with an unresolved safety misconception. **Pre-RCT Software Remediation Rule:** Any **SAF-1** or **SAF-2** first-attempt misconception (`< 100%`) preserves the flag even after post-debrief `100%` pass and **blocks Stage 2** until UI copy revision + re-verification pass. `>= 90%` required on `SAF-3`/`SAF-4`. |
| **Perceived Usability (`SUS`)** | Standardized 10-item Brooke (1996) SUS (`1–5` alternating polarity): $\text{SUS} = 2.5 \times [\sum_{\text{odd}}(x_i - 1) + \sum_{\text{even}}(5 - x_j)] \in [0, 100]$. | Report individual scores, Mean/SD, Median/IQR (`Mean >= 70` required for Stage 1 -> Stage 2; `>= 80` target post-polish). |
| **Ease (`SEQ`) & Burden (`QB` / $c_{\text{ask}}$)** | **SEQ (`1–7`)** after Steps 3 & 5 (`Median >= 5.0`); **QB-1** intrusiveness (`1–5`), **QB-2** effort (`1–5`), **Tolerance** (`0`, `1`, `2–3`, `4+`), **Willingness** (`1–5`). | If EVSI modal does not fire for a participant, record `"N/A"`; scorer reports exact `answered / N` denominators cleanly. Escalate $c_{\text{ask}}$ if `> 25%` report low tolerance (`<= 1`) or `QB-1 >= 3`. |
| **Product Defects & Privacy Mental Model** | **DEF register** (`S0` Blocker, `S1` Major, `S2` Moderate, `S3` Minor); **Mental model** probe (`Understands Browser-Profile Persistence + Unencrypted Export` vs. ephemeral/cloud/unsure). | **`S0 = 0` and `S1 = 0`** mandatory on candidate build prior to Stage 2 authorization. |

---

## 8. Explicit Distinction: Stage 1 Usability Study vs. Electricity-Savings Efficacy Trial

| Characteristic | **Phase 4C Stage 1 (This Submission)** | **Proposed Stage 2 RCT (Future — Separate Approval)** | **Scale IPMVP Option C / Utility M&V** |
| :--- | :--- | :--- | :--- |
| **Primary Question** | Can adults navigate the bilingual app safely, understand $Q_{0.05}$ / cliffs / privacy, without critical defects? | Does TR-VOI guidance cause measurable kWh/bill reductions or cliff avoidance vs. control? | Can a single home's savings be certified against weather-normalized ASHRAE 14 / EVO baselines? |
| **Sample Size** | **$N = 5–10$ independent participants** (one 45–60 min session each) | **$N = 152–160$ enrolled** ($d = 0.50$, 80% power) & **$140–150$ cliff-enriched** (`power_analysis.py`) | Requires `>= 12 months` baseline ($\ge 6$ bi-monthly cycles), $\text{CV(RMSE)} \le 15\%$, $\text{FSU} < 50\%$ |
| **Savings / Efficacy Claims Permitted** | **ZERO (`0`)** — strictly prohibited from claiming kWh reductions, INR savings, or cliff avoidance | Permitted only under pre-registered concurrent RCT analysis **after** Stage 1 passes and separate Stage 2 ethics clearance | **Not claimed / Not certified** in `v0.1.0-alpha` (`MV-METHODOLOGY-REVIEW.md`) |

---

## 9. Review of Mid-Cycle Tariff Applicability (`May 10, 2026`) & Limitations of Statutory Bill Examples

### 9.1 Verified Regulatory & Software Rule Reconciliation
1. **Underlying Statutory Orders Archived ([`REGULATORY-SOURCE-TRACEABILITY.md`](./REGULATORY-SOURCE-TRACEABILITY.md)):**
   - **TNERC Suo-Motu Order No. 6 of 2025 (`30-06-2025`)** (`TNPDCL-TNERC-TO62025.pdf`): Sets FY 2025-26 Commission approved LT I-A slabs (`495–1215` paise/kWh, fixed charges `Nil`) and notes GoTN's 1-year `3.16%` domestic hike exemption (`Sec. 2.1.3(b)`, p. 12).
   - **TNERC Order No. 4 of 2026 (`27-04-2026`)** (`TNERC-Provisional-Subsidy-Order-FY2026-27.pdf`, pp. 7–9): Verifies exact **Commission Approved / GoTN Base Subsidy / Net Consumer-Payable** tables (`0–100`: `Nil`, `101–200`: `235` paise pre-May-10, `201–400`: `470`, `401–500`: `630`, `501–600`: `840`, `601–800`: `945`, `801–1000`: `1050`, `1001+`: `1155`).
   - **TNERC Order No. 5 of 2026 (`26-05-2026`)** (`TNERC-200Units-Additional-Subsidy-Order-2026-05-27.pdf`, pp. 1–5): Implements **GoTN `G.O.(Ms) No. 50` (`10-05-2026`)** and GoTN commitment letter `No. 2800/D3/2026` (`10-05-2026`) providing `200` total free units bi-monthly for LT I-A consumption `<= 500` units (`+2.35 Rs/unit` extra subsidy on `101–200`) **`with effect from 10-05-2026`**, while continuing `100` free units for `> 500` units. **Clause 7 (p. 5)** expressly classifies this as a *provisional subsidy to be reconciled later based on actual TNPDCL consumption*; the Order does not prescribe consumer-level proration arithmetic for cycles crossing `10-05-2026`.
2. **Implemented Behavior in HearthShift AI (`v0.1.0-alpha`):**
   - `TNPDCL_LT1A_MAY_2026_SCHEME` ([`tnpdcl-lt1a.ts`](../../src/core/tariff/tariffs/tnpdcl-lt1a.ts#L201)) sets `mid_cycle_transition_policy: 'meter_reading_date_after'`.
   - [`BillHistoryTable.tsx`](../../src/components/dashboard/BillHistoryTable.tsx#L59-L107) applies a bill's explicit `tariff_id` if selected, or otherwise selects `TNPDCL_LT1A_2026_MAY10` whenever **`billing_period_end >= 2026-05-10`**.
   - Standalone helper [`prorateBillAcrossTariffVersions()`](../../src/core/tariff/calculator.ts#L530-L569) is **not wired into the UI** (furthermore, its unit-tested linear day split evaluates unscaled bi-monthly slab thresholds separately on each sub-period rather than scaling slab widths, so it is deliberately excluded from consumer displays).

### 9.2 Classification of All Study & Demo Examples Relative to `2026-05-10`

| Context / Source | Period & kWh | Software Displays | Pre-`10-05-2026` (`2025` Order) | Variance & Required Special Disclaimer / Resolution |
| :--- | :--- | :---: | :---: | :--- |
| **Moderator Step 3 Walkthrough** ([Execution Kit](./PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md#L86)) & **Safe Demo Bill 3** ([synthetic-household.ts](../../src/core/demo/synthetic-household.ts#L102-L108)) | `2026-05-01` → `2026-06-30` (`512 kWh` / `508 kWh`) | **`₹2,140.80`** / **`₹2,107.20`** | **`₹2,140.80`** / **`₹2,107.20`** | **`₹0.00` variance (Mid-Cycle Invariant):** Both examples exceed `500 kWh`, receiving `100` free units under both regimes (`Order 4` & `Order 5`). *No arithmetic ambiguity; keep disclaimer noting post-`2026-05-10` complete cycles (`e.g., Jul–Aug 2026`) apply cleanly to `<= 500` cases.* |
| **Safe Demo Bills 1 & 2** ([synthetic-household.ts](../../src/core/demo/synthetic-household.ts#L89-L101)) | `2026-01-01` → `2026-02-28` (`445 kWh`); `2026-03-01` → `2026-04-30` (`492 kWh`) | **`₹1,223.50`** / **`₹1,519.60`** | **`₹1,458.50`** / **`₹1,754.60`** | **`-₹235.00` synthetic tagging difference — SPECIAL DISCLAIMER REQUIRED:** Demo mode intentionally tags `Jan–Apr 2026` synthetic history with `in-tnpdcl-lt1a-may2026` to compare counterfactual baselines on one uniform post-May-2026 schedule (`100` extra free units worth `₹235.00`). Historical utility receipts strictly before `10-05-2026` would be `₹235.00` higher. |
| **Walkthrough `<= 500 kWh` / Real Straddled Cycles** ([Traceability](./REGULATORY-SOURCE-TRACEABILITY.md#L76-L82)) | Any `101–500 kWh` cycle where `start < 2026-05-10 <= end` (e.g., `380`, `480`, `500 kWh`) | **`₹846.00`** / **`₹1,444.00`** / **`₹1,570.00`** | **`₹1,081.00`** / **`₹1,679.00`** / **`₹1,805.00`** | **Up to `₹235.00` regime sensitivity — SPECIAL DISCLAIMER & PROTOCOL RULE:** Under `meter_reading_date_after`, any cycle ending `>= 2026-05-10` receives the full `200` free units (`-₹235.00`). Because TNPDCL cycle-straddle proration vs. reading-date cutoff for `May 2026` receipts is unconfirmed in archived orders, any voluntary real bill straddling `2026-05-10` is **flagged and excluded from unadjusted INR savings comparisons**, and Stage 1 manual-entry checks on `<= 500 kWh` use post-`2026-05-10` full cycles (e.g., `2026-07-01`–`2026-08-31`) whenever demonstrating active May 2026 receipts. |

### 9.3 Residual Statutory Limitations Disclosure
1. **Non-Certification:** HearthShift AI is **not** certified by TNERC or TNPDCL as an official billing engine.
2. **Primary-Source Gaps:** `GoTN G.O.(Ms) No. 50` (`10-05-2026`) is verified verbatim via **TNERC Order No. 5 of 2026** (`26-05-2026`) rather than an independently archived GoTN Gazette PDF; standalone pre-2025 Commission orders (`T.O. No. 6 of 2024`, `T.O. No. 7 of 2022`) were not archived, so legacy `in-tnpdcl-lt1a-2024` is retained strictly as an historical benchmark model and is **excluded** from Stage 1/2 household evaluation.
3. **Applicable Class Restriction:** Model applies strictly to single-service residential units under **LT Tariff I-A** (`TNPDCL-TNERC-TO62025.pdf` Section `3.2.2.1`), excluding `LT I-B` (Huts), `LT I-C` (bulk residential), `LT I-D/E` (common facilities), `LT V` (commercial/homestays), electricity duty overrides, or arrears/surcharges.

---

## 10. Pre-Execution Submission Checklist & Blank Institutional Authorization Record

### 10.1 Completeness & Readiness Checklist

| # | Oversight / Governance Artifact | Status | Primary Source Reference |
| :-: | :--- | :---: | :--- |
| 1 | Study Overview, Public Benefit & Ethical Framing | **Prepared** | Section `1` above |
| 2 | Frozen Stage 1 (`N = 5–10`) Moderation & 10-Step Protocol | **Prepared** | [`USABILITY-STUDY-PROTOCOL.md`](./USABILITY-STUDY-PROTOCOL.md) |
| 3 | Eligibility, Medical-Equipment Exclusion & Recruitment Plan | **Prepared** | Section `3` above + [`PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md`](./PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md#L63-L73) |
| 4 | Final Bilingual (`en` & `ta`) Information Sheets & Consent Forms | **Prepared** | Section `4` above |
| 5 | Privacy, Financial Advice & Physical Appliance Risk Assessment | **Prepared** | Section `5` above |
| 6 | Data Management, Custodial Storage, 30-Day Purge & Withdrawal Plan | **Prepared** | Section `6` above *(custodian/folder confirmation pending Section `10.2`)* |
| 7 | Defensive Python Scoring Suite & Dual-Stage Safety Probe Rubric (`SAF-1`–`SAF-4`) | **Verified (`24/24` tests)** | [`stage1_usability_scoring.py`](../../research/experiments/stage1_usability_scoring.py) · [`PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md`](./PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md) |
| 8 | Epistemic Boundary (Usability Pre-Pilot $\neq$ Savings Trial / No IPMVP Option C) | **Prepared** | Section `8` above · [`MV-METHODOLOGY-REVIEW.md`](./MV-METHODOLOGY-REVIEW.md) |
| 9 | Archived Official TNERC PDFs, Mid-Cycle `2026-05-10` Audit & Disclaimers | **Verified & Archived** | [`REGULATORY-SOURCE-TRACEABILITY.md`](./REGULATORY-SOURCE-TRACEABILITY.md) · [`regulatory-archive/INDEX.md`](./regulatory-archive/INDEX.md) |
| 10 | Live Hosted Alpha Build (`e43a260`) & Zero-Telemetry Security Verification | **CI & E2E Passed** | `https://hearthshift-ai.pages.dev/` · CI Run `45663023893` |

### 10.2 Supervisor / Institutional Review Pathway, Custodial Designation & Authorization Block *(TO BE COMPLETED ONLY BY AUTHORIZED REVIEWERS)*

> [!IMPORTANT]
> **DO NOT FILL ARTIFICIALLY:** Leave all decision checkboxes, dates, custodian names, pathway notes, and signature/reference fields below blank until an authorized academic supervisor, Departmental Ethics Chair, or Institutional Review Board (IRB) issues a written determination. If the institution specifies an alternative pathway (e.g., Departmental Minimal-Risk Exemption vs. Full IRB Review), document the exact decision and issuing body verbatim in the **Determination Source / Pathway** fields below.

| Authorization / Oversight Field | Entry by Authorized Reviewer *(Leave Blank Until Issued)* |
| :--- | :--- |
| **Reviewing Body / Authority** *(e.g., Academic Supervisor / Dept. Committee / Institutional IRB)* | `____________________________________________________________` |
| **Assigned Review Pathway / Determination** | `[ ] Full Ethics/IRB Review` · `[ ] Expedited Review` · `[ ] Exempt / Minimal-Risk Usability Determination` · `[ ] Departmental Supervisor Approval` · `[ ] Modifications Required` · `[ ] Not Approved` |
| **Exact Institutional Determination Source & Rationale** *(Document email/memo/minute ref if pathway/exemption differs from standard IRB)* | `____________________________________________________________` |
| **Designated Access-Controlled Record Custodian & Encrypted Location (`4C_Stage1_Data/`)** | `Name/Role: ____________________  Storage Verification: ________` |
| **Authorized Stage 1 Sample Size (`N`) & Recruitment Window** | `Max N = ______ · Authorized Dates: ____-__-__ to ____-__-__` |
| **Approval / Determination Date** | `____-__-__` *(YYYY-MM-DD — EMPTY UNTIL APPROVED)* |
| **Official Approval / Exemption Reference Number** | `________________________` *(EMPTY UNTIL ISSUED)* |
| **Authorized Reviewer Name, Title & Signature** | `____________________________________________________________` |
| **Principal Investigator / Student Submission Sign-off** | `Name: ____________________  Date Submitted: ____-__-__` |
