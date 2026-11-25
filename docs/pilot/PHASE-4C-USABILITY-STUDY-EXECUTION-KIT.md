# HearthShift AI — Phase 4C-A Stage 1 Usability & Safety Study Execution Kit

**Document Status:** Phase 4C-A Ethics & Methodological Readiness Package (Pending Ethics Sign-Off — **DO NOT RECRUIT OR COLLECT DATA YET**)  
**Version:** 2.0.0 (Phase 4C-A Complete Pre-Recruitment Kit)  
**Date:** November 25, 2026  
**Target Live URL:** `https://hearthshift-ai.pages.dev/` (`v0.1.0-alpha`)  
**Companion Specifications:** [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md) · [`REGULATORY-SOURCE-TRACEABILITY.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/REGULATORY-SOURCE-TRACEABILITY.md) · [`FIELD-PILOT-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/FIELD-PILOT-PROTOCOL.md) · [`stage1_usability_scoring.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/stage1_usability_scoring.py)

> [!CAUTION]
> **HARD PRE-RECRUITMENT & SAFETY STOP BOUNDARY**
> 1. **Zero Participants Recruited:** Do **not** invite households, collect real utility bills, or conduct moderated sessions until ethics review and explicit project authorization are granted.
> 2. **Small-Sample Scope ($N = 5\text{--}10$):** Stage 1 evaluates task usability, safety comprehension, and burden—**never** population efficacy, bill reductions, or energy savings.

---

## 1. Participant Information Sheet (English & Tamil Plain-Language Summary)

### 1.1 English Participant Information Summary
- **Study Purpose:** You are invited to test an experimental household electricity website called **HearthShift AI (`v0.1.0-alpha`)** in a 45–60 minute guided usability session ($5$ to $10$ total participants). We are testing whether the screens, Tamil/English wording, charts, and safety warnings are clear and easy to follow—**not** whether the app actually lowers electricity bills.
- **No Appliance Control & No Guarantee of Savings:** HearthShift AI cannot touch or control your air conditioner, geyser (water heater), or electricity meter. All rupee figures are modeled educational estimates based on Tamil Nadu **TNPDCL LT-1A** tariff schedules (`GoTN G.O. (Ms) No. 50` & `TNERC Tariff Order No. 6 of 2025`), not official utility quotes or guaranteed savings.
- **How Browser Storage Works (`IndexedDB` Profile Persistence):** Any bills or CSV samples entered during your session remain on this device inside the web browser's **`HearthShiftDB` (`IndexedDB`)**. **Important:** Data persists inside this **browser profile** even after closing the browser tab or restarting the browser, unless you use a Private/Incognito window, clear site data, or click **Privacy & Storage → Delete All My Data**.
- **Shared-Device, Extension & Export Risks:** Never enter personal bills on a shared/public device unless you wipe `IndexedDB` afterward. Browser extensions with broad permissions (`<all_urls>`) can inspect open web-page data, and clicking **Export All Data (JSON)** saves an **unencrypted plaintext file** onto your device that you must safeguard yourself.
- **Free-Text Feedback Privacy:** Although the feedback draft tool excludes structured database records (`bills`, `readings`, `preferences`, `savings`), free-text comments you type are **not** automatically redacted. You and the moderator will manually review any written feedback together to delete names, phone numbers, addresses, or meter numbers before saving or sharing.
- **Voluntary Participation:** You may use the built-in synthetic sample dataset (`Load Safe Demo Dataset (Synthetic)`), skip any question, or withdraw at any time with zero penalty.

### 1.2 தமிழ் பங்கேற்பாளர் தகவல் சுருக்கம் (Tamil Summary)
- **ஆய்வின் நோக்கம்:** இது `HearthShift AI (v0.1.0-alpha)` இணையதளத்தின் பயன்பாட்டு எளிமை மற்றும் பாதுகாப்பு எச்சரிக்கைகளின் தெளிவைச் சோதிக்கும் 45–60 நிமிட ஆய்வு ($5\text{--}10$ பங்கேற்பாளர்கள் மட்டுமே). இது மின்கட்டணச் சேமிப்பை நிரூபிக்கும் சோதனை அல்ல.
- **சாதனக் கட்டுப்பாடு இல்லை:** இந்தச் செயலி உங்கள் ஏசி, வாட்டர் ஹீட்டர் (கீசர்) அல்லது மின் மீட்டரைத் தானாகக் கட்டுப்படுத்தாது. காட்டப்படும் தொகைகள் மாதிரி மதிப்பீடுகள் மட்டுமே—உறுதிப்படுத்தப்பட்ட சேமிப்பு அல்ல; எப்போதும் உங்கள் அச்சிடப்பட்ட TANGEDCO/TNPDCL ரசீதைச் சரிபார்க்கவும்.
- **உலாவி சுயவிவர (Browser Profile) சேமிப்பு:** நீங்கள் உள்ளிடும் தகவல்கள் உங்கள் சாதனத்தின் உலாவி சுயவிவர **`IndexedDB`**-யில் சேமிக்கப்படும்; **டேப் மூடிய பின்னும் அது நீடிக்கும்** (Incognito சாளரத்தை மூடினால் அல்லது **Delete All My Data** அழுத்தினால் மட்டுமே அழியும்).
- **பகிர்ந்த சாதனம் & JSON ஆபத்து:** JSON காப்புப் பிரதி குறியாக்கம் (encryption) இன்றி சேமிக்கப்படும். பகிர்ந்த சாதனங்களில் பயன்படுத்திய பின் **Delete All My Data** அழுத்தி அழிக்கவும்.
- **கருத்துப் படிவ PII சரிபார்ப்பு:** இலவச உரையில் (free text) பெயர், முகவரி அல்லது மின் எண் இருந்தால், பகிரும் முன் நீங்களே கைமுறையாக நீக்க வேண்டும். எப்போது வேண்டுமானாலும் ஆய்விலிருந்து விலகலாம்.

---

## 2. Printable Informed Consent Forms (English & Tamil)

### 2.1 Informed Consent Form (English Version)
> **Assigned Study ID:** `P-0___` *(Do NOT write participant name, phone number, address, or TNPDCL consumer service number on scoring sheets)*
>
> Please confirm each item orally/in writing before starting:
> 1. [ ] I confirm I am **18 years or older** and participate voluntarily.
> 2. [ ] I understand HearthShift AI (`v0.1.0-alpha`) is an experimental research tool that **cannot control physical appliances** and offers **no guaranteed bill savings** or certified M&V results.
> 3. [ ] I understand I must never follow energy advice during extreme heatwaves, illness, or medical discomfort, and must never modify geyser safety thermostat cutouts.
> 4. [ ] I understand entered numbers remain locally in this **browser profile (`IndexedDB`)** across tab closes, and I know the risks of shared devices, browser extensions, and unencrypted local JSON exports.
> 5. [ ] I understand any free-text feedback I choose to share will be **manually reviewed** with the moderator to remove identifying details before export, stored access-restricted under ID `P-0___`, and that I may withdraw before analysis freeze (or wipe browser storage immediately).
> 6. [ ] Optional choice during session: [ ] Use **Safe Synthetic Demo / Sample Bill** (recommended) OR [ ] Enter representative own bill figures on my own device without sharing consumer IDs/PDFs.
>
> **Participant Consent Recorded:** `Yes / No` · **Date:** `2026-__-__` · **Locale:** `en / ta`

### 2.2 ஒப்புதல் படிவம் (Tamil Version)
> **ஆய்வு எண்:** `P-0___` *(பெயர், தொலைபேசி எண், முகவரி அல்லது மின் நுகர்வோர் எண்ணை இங்கு எழுத வேண்டாம்)*
>
> 1. [ ] எனக்கு **18 வயது அல்லது அதற்கு மேல்**; நான் தன்னார்வத்துடன் இந்த ஆய்வில் பங்கேற்கிறேன்.
> 2. [ ] HearthShift AI (`v0.1.0-alpha`) என்பது சோதனை ஆய்வுக் கருவி மட்டுமே; இது **மின் சாதனங்களைத் தானாகக் கட்டுப்படுத்தாது**, **கட்டணச் சேமிப்பிற்கு உத்தரவாதம் அளிக்காது** என்பதை அறிவேன்.
> 3. [ ] கடுமையான வெப்பம் அல்லது உடல்நலக் குறைவின்போது வசதி/பாதுகாப்பிற்கே முன்னுரிமை அளிக்க வேண்டும்; வாட்டர் ஹீட்டரின் பாதுகாப்பு தெர்மோஸ்டாட் அமைப்பை மாற்றக்கூடாது என்பதை அறிவேன்.
> 4. [ ] உள்ளிடப்படும் தரவு இந்தச் சாதனத்தின் **உலாவி சுயவிவர (`IndexedDB`)**-யில் டேப் மூடிய பின்னும் நிலைத்திருக்கும் என்பதையும், பகிர்ந்த சாதனம் மற்றும் குறியாக்கமற்ற JSON பதிவிறக்கத்தின் அபாயங்களையும் புரிந்துகொண்டேன்.
> 5. [ ] கருத்துப் படிவத்தில் தட்டச்சு செய்யும் உரையை அடையாளத் தகவல்கள் இன்றி **கைமுறையாகச் சரிபார்த்த பின்பே** பகிரலாம் என்பதையும், எந்த நேரத்திலும் ஆய்விலிருந்து விலகலாம் என்பதையும் அறிவேன்.
>
> **பங்கேற்பாளர் ஒப்புதல்:** `ஆம் / இல்லை` · **தேதி:** `2026-__-__`

---

## 3. Eligibility Screening Checklist (`N = 5 to 10` Target Cohort)

| Screening Check | Inclusion / Exclusion Rule | Response (`Y/N`) |
| :--- | :--- | :---: |
| Age $\ge 18$ years and reviews/pays household domestic electricity bills | **Required = Yes** | `[ ]` |
| Resides in domestic household familiar with Tamil Nadu LT-1A (or domestic tiered billing) | **Required = Yes** | `[ ]` |
| Able to read/converse comfortably in English (`en`) or Tamil (`ta`) on mobile or desktop browser | **Required = Yes** | `[ ]` |
| Household depends on critical life-support or continuous medical electrical equipment | **Must be No (Exclude)** | `[ ]` |
| Involved in developing, auditing, or testing HearthShift AI previously | **Must be No (Exclude)** | `[ ]` |
| Target Stratification Check: Balance `en`/`ta` (`>= 2` each) and mobile/desktop (`>= 2` each) | Track Cohort Balance | `[ ]` |

---

## 4. Standardized 10-Step Moderator Script (Frozen Outcomes)

**Moderator Setup Rules:**
- Open `https://hearthshift-ai.pages.dev/` in a clean **Guest Chrome profile** (if on study laptop) or confirm participant's own browser is clean.
- **Strict Assistance Policy:** Remain silent during each task. Start timing when task prompt ends. Only offer one neutral pointer (`"Look at the tabs across the middle"`) if stalled $> 90\text{ seconds}$, and **immediately mark Outcome = `1` (Assisted)**—never upgrade an assisted step back to `2` (Unassisted).

| Step | Verbatim Moderator Prompt (Read Aloud) | Unassisted (`2`) Pass Criterion |
| :---: | :--- | :--- |
| **1** | *"Take a minute to read the top of the screen and the Alpha disclosure. Tell me in your own words what this site does, what it does NOT do, and where entered data is saved."* | States advisory-only, no appliance control, browser-profile local storage (not cloud), no offline caching. |
| **2** | *"Switch the language if you prefer Tamil, and look at the capability status box on the left. Why does it say Basic Mode right now?"* | Identifies `BASIC MODE` and explains hourly load analysis is locked until interval CSV data exists. |
| **3** | *"Under Bills & Slab Analysis, enter a synthetic bi-monthly bill from `2026-05-01` to `2026-06-30` for `512` kWh (leave Consumer Ref blank or put `SAMPLE-01`) and save it."* *(Follow immediately with SEQ #1.)* | Saves `512 kWh` cleanly without validation stall; table shows `₹2,140.80` modeled bill. |
| **4** | *"Look at the Tariff Plan summary card on the right. What happens if a home uses 501 kWh instead of 500 kWh?"* | Explains losing 200 free units / `₹478.40` bill jump (`₹1,570` → `₹2,048.40`) above `500 kWh`. |
| **5** | *"Now open Smart Meter CSV Import, upload the synthetic 8-day CSV sample file, inspect the preview, and confirm saving."* *(Follow with SEQ #2.)* | Uploads synthetic CSV cleanly (`192` readings) and clicks confirm. |
| **6** | *"Open Load Curves & Intervals. Tell me what changed compared to earlier when you only had a manual bill."* | Notes hourly chart is now unlocked and distinguishes measured intervals from monthly totals. |
| **7** | *"Go to Scenario Simulator. Set AC Thermostat to `+1°C`, toggle Water Heater Trim, and tell me why shifting laundry to morning saves `₹0.00` here."* | Applies adjustments, notes cliff protection delta is non-additive, explains flat-slab TNPDCL vs TOU. |
| **8** | *"Open Smart Recommendations. If a question popup appears, answer or skip it as you choose. Read the main card and explain Expected Savings vs Conservative Lower Bound (`Q0.05`) and the assumptions."* | Identifies recommendation (or abstention), reads assumptions, distinguishes expected vs conservative bound (`modeled`, not guaranteed). |
| **9** | *"Try clicking `Tried It!`, then check Savings Ledger. Why does it show User Reported instead of Measurement Verified, and what is the M&V notice saying?"* | Recognizes `User Reported` ≠ verified M&V/IPMVP Option C savings. |
| **10** | *"Open Privacy & Storage (and optionally inspect Alpha Feedback). Check what Export JSON and Delete All My Data do, explain what happens if you had kept data after closing this tab, then wipe the test data and reload the page."* | Exports or describes unencrypted JSON risk, confirms browser-profile persistence across tab closes, wipes cleanly, confirms reset after reload. |

---

## 5. Structured Scorecards & Questionnaires

### 5.1 Task Timing & Assistance Record (`Participant ID: P-0___`)
- **Outcome Codes (Strictly Disjoint):** `2 = Unassisted`, `1 = Assisted (>90s prompt needed)`, `0 = Failed / Abandoned`

| Step # | Task Short Name | Start–End (Seconds) | Outcome (`2 / 1 / 0`) | Friction / Verbatim Notes |
| :---: | :--- | :---: | :---: | :--- |
| `1` | Onboarding & Disclosure | `___ s` | `[ ]` | |
| `2` | Language & Capability | `___ s` | `[ ]` | |
| `3` | Manual Bill Entry | `___ s` | `[ ]` | |
| `4` | Headroom & 500 kWh Cliff | `___ s` | `[ ]` | |
| `5` | CSV Interval Import | `___ s` | `[ ]` | |
| `6` | Interval Chart Review | `___ s` | `[ ]` | |
| `7` | Scenario Simulator | `___ s` | `[ ]` | |
| `8` | Recommendations & $Q_{0.05}$ | `___ s` | `[ ]` | |
| `9` | EVSI & Savings Provenance | `___ s` | `[ ]` | |
| `10` | Privacy & Wipe | `___ s` | `[ ]` | |

### 5.2 Dual-Stage Safety Comprehension Scorecard (`SAF-1` to `SAF-4`)

> [!IMPORTANT]
> Record **Column A (First Attempt BEFORE Moderator Explanation)** independently of **Column B (Post-Debrief Re-Test)**. Never alter Column A after helping the participant!

| Probe ID | Exact Moderator Question | Col A: First Attempt (`PASS` / `MISCONCEPTION`) | Col B: Post-Debrief (`PASS` / `FAIL`) | Verbatim Quote / Remedial UI Note |
| :--- | :--- | :---: | :---: | :--- |
| **SAF-1 (No Actuation)** | *"If you press 'Useful' or 'Tried It!' on an AC suggestion, will this website change your AC settings?"* | `[ ]` | `[ ]` | |
| **SAF-2 (Geyser Safety)** | *"Should you lower or disable the internal safety thermostat inside your water heater to save more power?"* | `[ ]` | `[ ]` | |
| **SAF-3 (Not Guaranteed)** | *"If the simulator shows ₹575 or ₹864.80 savings, is TNPDCL guaranteed to cut your next bill by that amount?"* | `[ ]` | `[ ]` | |
| **SAF-4 (Health Priority)** | *"During a severe summer heatwave or if an elderly/ill family member feels unwell, what should you do with cooling tips?"* | `[ ]` | `[ ]` | |

### 5.3 Single Ease Question (SEQ) & Question-Burden (`QB`) Questionnaires
- **SEQ-1 (Asked after Step 3 Manual Bill):** *"Overall, how difficult or easy was adding a bill?"* `1 (Very Difficult) — 2 — 3 — 4 — 5 — 6 — 7 (Very Easy)`: Score `[__]`
- **SEQ-2 (Asked after Step 5 CSV Import):** *"Overall, how difficult or easy was importing interval data?"* `1 — 2 — 3 — 4 — 5 — 6 — 7`: Score `[__]`
- **QB-1 (Intrusiveness):** *"How intrusive or annoying did the preference question popup feel?"* `1 (Not at all) — 2 — 3 — 4 — 5 (Very intrusive)`: Score `[__]` *(If no modal triggered cleanly during participant flow, record `N/A` and inspect Scenario/Preference toggle comfort separately.)*
- **QB-2 (Effort):** *"How much mental effort did answering that question take?"* `1 (Minimal) — 2 — 3 — 4 — 5 (Exhausting)`: Score `[__]`
- **QB Tolerance:** *"In one two-month billing cycle, what is the maximum number of quick preference questions like this you would tolerate before ignoring the app?"* Circle one: `0` / `1` / `2–3` / `4+`
- **Willingness (`1–5`):** *"If your household has this appliance, how willing would you be to try the top suggestion manually for one week?"* `1 — 2 — 3 — 4 — 5`: Score `[__]`

### 5.4 Standardized Brooke 10-Item System Usability Scale (`SUS`)
Rate each statement `1 (Strongly Disagree)` through `5 (Strongly Agree)`. Exact scoring computed by [`stage1_usability_scoring.py`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/research/experiments/stage1_usability_scoring.py): $\text{SUS} = 2.5 \times [\sum_{\text{odd}}(x_i - 1) + \sum_{\text{even}}(5 - x_j)]$.

| # | Item | `1..5` |
| :-: | :--- | :-: |
| 1 | I think that I would like to use this website frequently. | `[ ]` |
| 2 | I found the website unnecessarily complex. | `[ ]` |
| 3 | I thought the website was easy to use. | `[ ]` |
| 4 | I think that I would need the support of a technical person to be able to use this website. | `[ ]` |
| 5 | I found the various functions in this website were well integrated. | `[ ]` |
| 6 | I thought there was too much inconsistency in this website. | `[ ]` |
| 7 | I would imagine that most people would learn to use this website very quickly. | `[ ]` |
| 8 | I found the website very awkward to use. | `[ ]` |
| 9 | I felt very confident using the website. | `[ ]` |
| 10 | I needed to learn a lot of things before I could get going with this website. | `[ ]` |

### 5.5 Defect Severity Register Template (`S0–S3`)

| Defect ID | Participant | Step # | Severity (`S0–S3`) | Locale & Viewport | Expected vs. Observed Behavior | Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `DEF-01` | `P-0_` | `#_` | `S_` | `en/ta · Mobile/Desk` | | `Open / Fixed` |

---

## 6. Feedback Storage, Access, Retention, Manual PII Review & Withdrawal SOP

1. **What Moderators May Record:** Pseudonymous ID (`P-01`..`P-10`), device class/browser, locale (`en`/`ta`), outcome codes (`2/1/0`), timings, Likert/SUS/SEQ/QB responses, `SAF-1..4` initial & post-debrief answers, defects, and manually scrubbed qualitative quotes. **Strictly prohibited:** consumer service numbers, names, addresses, phone numbers, email addresses, or raw bill images/CSVs.
2. **Mandatory Manual Free-Text PII Check:** Before exporting JSON from **Alpha Feedback** or saving moderator notes, both participant and moderator inspect the free-text box & preview together to manually delete any personal names, street names, phone numbers, or meter references.
3. **Storage & Access Control:** Completed scorecards and redacted feedback JSONs are stored inside an access-restricted, disk-encrypted project folder (`4C_Stage1_Data/`) accessible only to the Principal Investigator and session moderator. Never store raw identifiable participant contacts alongside `P-0X` scoring sheets (keep consent key strictly separate in a locked/encrypted roster file).
4. **Retention & Deletion Schedule:** Any temporary session notes or optional audio recordings used strictly for defect transcription are permanently deleted within **30 calendar days** after Stage 1 defect coding concludes. Anonymized quantitative scorecards (`P-01`..`P-10`, zero PII) are retained solely for auditability alongside defect remediation records.
5. **Participant Withdrawal Procedure:**
   - *During session:* Stop immediately, open **Privacy & Storage → Delete All My Data**, confirm reload reset, and shred/delete that session's scorecard without retaining incomplete records unless participant consents.
   - *Post-session:* Participant provides their `P-0X` code from their consent copy before Stage 1 cohort lock; PI permanently deletes the matching scorecard, feedback JSON, and consent key entry within 48 hours and confirms deletion.

---

## 7. Stage 1 Results-Analysis Template & Stage 2 Go/No-Go Checklist

Run `research\.venv\Scripts\python.exe research/experiments/stage1_usability_scoring.py --input <SESSION_JSON> --md-out <REPORT_MD> --json-out <REPORT_JSON>` to produce standardized statistics without manual arithmetic drift. See the verified synthetic dry-run output in [`PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/PHASE-4C-SYNTHETIC-SAMPLE-REPORT.md).

**Stage 1 $\to$ Stage 2 Go/No-Go Criteria (`ALL` must pass post-remediation before RCT authorization):**
- [ ] **Zero S0/S1 Defects:** `S0 = 0` and `S1 = 0` on candidate build.
- [ ] **Safety First-Attempt + Post-Debrief:** `100%` first-attempt and post-debrief pass on **SAF-1** & **SAF-2** (after any required UI copy revision); `>= 90%` on **SAF-3** & **SAF-4**.
- [ ] **Workflow & SUS:** Unassisted (`2`) step completion `>= 80%`, no step with failure (`0`) rate `> 30%`, mean `SUS >= 70`.
- [ ] **Honest Small-$N$ Reporting:** Report individual scores + exact Clopper-Pearson 95% CIs; `0` energy-savings or bill-reduction claims.
