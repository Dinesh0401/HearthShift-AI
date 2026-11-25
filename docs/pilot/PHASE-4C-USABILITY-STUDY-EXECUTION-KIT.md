# HearthShift AI — Phase 4C Stage 1 Usability Study Execution Kit

**Document Status:** Prepared Pre-Launch Execution Kit (Pending Ethics Sign-Off & Recruitment Authorization — **DO NOT RECRUIT YET**)  
**Target Live Study URL:** `https://hearthshift-ai.pages.dev/` (Phase 4B verified build `fce18f8`)  
**Companion Protocol:** [`docs/pilot/USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md)  

> [!CAUTION]
> **PRE-RECRUITMENT BOUNDARY**
> Phase 4C preparation is ready for protocol review. Do **not** recruit external participants, advertise the study publicly, collect real household bills, or claim empirical energy savings until explicit human-study / ethics authorization is granted.

---

## 1. Consent-Based Feedback Capture Architecture (Addressing Alpha Feedback Boundary)

Because the public alpha website (`https://hearthshift-ai.pages.dev/`) sends **zero automatic telemetry or feedback uploads** to any backend server, Phase 4C usability sessions obtain explicit feedback cleanly through **moderated consent** rather than passive web analytics:

1. **Verbal + Written Informed Consent (Before Session Start):**
   - Moderator explains that HearthShift AI is an experimental `v0.1.0-alpha` research assistant, **does not control appliances**, **does not guarantee savings**, and **stores entered data only in the browser tab**.
   - Participant chooses either:
     - **Option A (Preferred Low-Risk):** Use the hosted **Safe Demo Dataset (Synthetic)** + sandbox CSV sample on a guest/clean browser profile; or
     - **Option B (Participant Device):** Enter their own bill values locally on their own phone/laptop (`HearthShiftDB` stays local; moderator views screen share only and **never records account/consumer numbers or raw bill documents**).
2. **Explicit Two-Channel Study Feedback Capture:**
   - **Channel 1 (Structured Moderator Scoring Sheet):** Moderator records 10-step completion (`0/1/2`), SEQ ratings (`1–7`), 10-item SUS (`1–5`), question-burden scores (`QB-1/2`), safety teach-back checks (**SAF-1 through SAF-4**), and Defects (`S0–S3`).
   - **Channel 2 (Consent-Verified Scrubbed Feedback Export):** At the end of the session, participant opens **Alpha Feedback (Zero-Telemetry)** on `https://hearthshift-ai.pages.dev/`, reviews the live JSON preview confirming `householdBillsIncluded: 0`, checks the explicit consent toggle if opting to share electronically, and downloads (`hearthshift_feedback_YYYY-MM-DD.json`) or sends the scrubbed file manually to the authorized study coordinator.

---

## 2. Moderator Pre-Session Technical & Privacy Setup Checklist

Execute before every participant session:
- [ ] Confirm `https://hearthshift-ai.pages.dev/` loads HTTPS (`200 OK`) with no console errors.
- [ ] Open a clean **Guest / fresh Chrome profile** (if using a study test laptop) so prior IndexedDB state is zeroed and untrusted browser extensions are absent.
- [ ] Prepare synthetic backup CSV (`tests/fixtures/` sample) in case participant lacks a smart-meter CSV (expected for typical `BASIC` mode households).
- [ ] Remind participant at start: *"Never follow AC or geyser advice during extreme heat, illness, or medical need, and never tamper with geyser thermostat safety cutouts."*
- [ ] Post-session cleanup on any shared/study browser: open **Privacy & Storage → Delete All My Data → Yes, Delete Everything** and close the guest profile.

---

## 3. Participant Informed Consent Summary (Plain Language · EN / TA Key Points)

- **Purpose:** We are testing whether `HearthShift AI (v0.1.0-alpha)` is clear, easy to use, and safe to understand (`N = 5–10` sessions). We are **not** running an electricity-savings clinical trial yet.
- **No Appliance Control / No Savings Guarantee:** This site only gives estimates (`Modeled Estimate`, `Q0.05` lower bound). Always verify amounts against your printed TANGEDCO/TNPDCL bill.
- **Privacy Guarantee:** Any numbers you enter remain strictly inside browser storage on this device. Moderators will **not** copy your consumer number, address, or bill PDF.
- **Voluntary Withdrawal:** You may skip any step or stop at any time.

*(Tamil Verbal Briefing Key Summary: "இது ஒரு சோதனை ஆய்வு செயலி மட்டுமே. இது உங்கள் ஏசி அல்லது வாட்டர் ஹீட்டரைத் தானாகக் கட்டுப்படுத்தாது. நீங்கள் உள்ளிடும் தகவல்கள் இந்த உலாவியிலேயே இருக்கும்—எங்கள் சேவையகத்திற்குச் செல்லாது. கடுமையான வெப்பம் அல்லது உடல்நலத் தேவைகளின்போது வசதியையே முதன்மையாகக் கொள்ளவும்.")*

---

## 4. Standardized Session Scorecard Template (`P-01` .. `P-10`)

Copy once per anonymized Participant ID (`P-01`..`P-10`; zero PII stored):

```markdown
### Session Record — Participant ID: `P-0X`
- **Date:** YYYY-MM-DD | **Locale Used:** en / ta | **Device/Viewport:** Desktop / Mobile (`375px`+)
- **Data Mode Used:** Safe Synthetic Demo / Participant Entered Local Bill (+ Sample CSV)
- **Live URL Tested:** `https://hearthshift-ai.pages.dev/` (`v0.1.0-alpha`, `fce18f8`)

#### 10-Step Completion (`2 = Unassisted`, `1 = Assisted >90s`, `0 = Failed`)
- Step 1 (Disclaimer/Safety): [_]  Step 2 (Lang & Capability): [_]  Step 3 (Manual Bill): [_]
- Step 4 (Headroom & 500 kWh Cliff): [_]  Step 5 (CSV Import): [_]  Step 6 (Interval Chart): [_]
- Step 7 (Simulator & Laundry ₹0): [_]  Step 8 (Rec Card & Q0.05): [_]
- Step 9 (EVSI Modal & Provenance): [_]  Step 10 (Export / Feedback Draft / Delete All): [_]

#### Mandatory Safety Comprehension Probes (`PASS` / `FLAGGED & CORRECTED`)
- **SAF-1 (No Appliance Auto-Control):** [ ]  **SAF-2 (Never Bypass Geyser Safety Cutout):** [ ]
- **SAF-3 (Not a Guaranteed Bill Refund):** [ ]  **SAF-4 (Heatwave / Illness Overrides Advice):** [ ]

#### Quantitative Metrics
- SEQ Manual Bill Ease (`1–7`): [_] | SEQ CSV Import Ease (`1–7`): [_]
- Question Burden `QB-1` (`1–5`, lower better): [_] | `QB-2` Effort (`1–5`): [_] | Bi-Monthly Q Tolerance: `0 / 1 / 2-3 / 4+`
- SUS Score (`0–100`): [_] | Willingness to Try Manually (`1–5`): [_]
- Consent-Verified Scrubbed Feedback JSON Collected (`0` Household Bills/CSV): `Yes / No`
- Defects Logged (`S0 / S1 / S2 / S3`): <none or list>
```

---

## 5. Phase 4C Exit Gate (Mandatory Before Stage 2 RCT Authorization)

Per [`docs/pilot/USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md#L154-L161):
1. Complete $N = 5\text{--}10$ moderated usability sessions with **0 unresolved S0/S1 defects**.
2. Achieve **100% pass rate on SAF-1 & SAF-2**, **$\ge 90\%$ pass rate on SAF-3 & SAF-4**, **$\ge 80\%$ unassisted task completion**, and **mean SUS $\ge 70$**.
3. Log calibration findings for `c_ask` / `c_min` and publish usability fixes before ethics submission or recruitment for the powered Stage 2 RCT ($N = 152\text{--}160$).
