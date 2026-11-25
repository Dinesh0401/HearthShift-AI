# HearthShift AI — Alpha Limitations and Disclosures (`v0.1.0-alpha`)

**Document Status:** Mandatory Public & Pilot Disclosure Specification  
**Date:** November 25, 2026  
**Release Scope:** Experimental Research Alpha (`v0.1.0-alpha`)  
**Companion Specifications:** [`MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md) · [`USABILITY-STUDY-PROTOCOL.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/USABILITY-STUDY-PROTOCOL.md) · [`PHASE-4A-SECURITY-PRIVACY-AUDIT.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/security/PHASE-4A-SECURITY-PRIVACY-AUDIT.md)  

---

## Plain-Language Summary for Households

- **Research Prototype Only:** HearthShift AI (`v0.1.0-alpha`) is an experimental research tool, **not** an official utility billing system, certified energy audit, or financial guarantee.
- **No Automatic Device Control:** The website **cannot** touch, switch, or control your air conditioner, water heater (geyser), washing machine, or electrical panel. Any change must be done manually by you.
- **Your Safety & Health Come First:** Never follow an energy-saving suggestion during a heatwave, illness, or discomfort, and **never** alter factory thermostat safety cutouts or temperature limits on your water heater.
- **Check Your Printed Utility Bill:** Calculations are modeled primarily for Tamil Nadu domestic **TNPDCL LT-1A** bi-monthly slabs; always confirm charges and subsidies against your printed electricity bill before making financial decisions.
- **Estimates Are Not Guaranteed or Certified Savings:** Expected INR savings and conservative lower bounds ($Q_{0.05}$) are mathematical simulations under standard assumptions—they are **not** guaranteed bill reductions or certified under Measurement & Verification (M&V) standards.
- **Stored Only in This Browser:** Your bills and CSV files stay on your device in browser IndexedDB (`HearthShiftDB`), which is unencrypted if your device disk is unencrypted, clears automatically in Private/Incognito windows, and can be read by untrusted browser extensions.

---

## 1. Experimental Release Boundaries

1. **Pre-Field Prototype Status:** All software components in `src/` and simulation evaluations in `research/` have undergone automated software verification and synthetic benchmark testing only. **Zero human field trials** (neither Stage 1 usability comprehension $N=5\text{--}10$ nor Stage 2 powered RCT $N=152\text{--}160$) have been executed as of `v0.1.0-alpha`.
2. **Advisory Decision Support Only:** HearthShift AI provides educational estimates and decision-theoretic trade-off analysis (`TR-VOI`). It does **not** constitute licensed electrical engineering advice, regulatory billing adjudication, or legal/tax advice.
3. **Synthetic Demo Mode Separation:** The **Load Safe Demo Dataset (Synthetic)** control ([`src/core/demo/synthetic-household.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/demo/synthetic-household.ts)) loads synthetic bills (`445`, `492`, `508` kWh) and 192 hourly readings strictly for software exploration. Demo datasets keep the Savings Ledger empty (`db.savings = []`) and display a persistent warning banner; demo figures must never be cited as empirical household data.

---

## 2. Unsupported Physical Actuation & Safety Boundaries

1. **Zero Hardware / IoT Actuation:**
   - HearthShift AI runs inside a standard web browser with zero smart-plug, smart-thermostat, relay, IR-blaster, circuit-breaker, or utility AMI write integrations.
   - Recording `Useful` or `Tried It!` updates only local browser preference state (`belief` / `db.feedback` / `db.savings`) and does not actuate any appliance.
2. **Water Heater (Geyser) Thermal Hygiene & Safety Cutouts:**
   - Timer-trim advisories apply solely to manually switching off heating runtime once water reaches desired bath temperature.
   - Users **must never** bypass, lower, or modify factory thermal safety cutouts or pressure relief valves. Storage tanks kept lukewarm (`< 50°C`) for prolonged periods risk *Legionella pneumophila* growth without periodic `>= 60°C` heating cycles.
3. **Cooling, Health & Environmental Extremes:**
   - The system has no real-time ambient weather sensor, indoor humidity sensor, or awareness of medically vulnerable, elderly, or infant occupants.
   - During extreme heatwaves or any occupant health/comfort need, users must immediately ignore or mark AC setpoint suggestions `Impractical`.
4. **No Appliance-Level NILM Disaggregation:**
   - HearthShift AI does **not** perform Non-Intrusive Load Monitoring (NILM) disaggregation from whole-home smart-meter streams.
   - Appliance reductions in [`src/core/optimization/tr-voi.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/optimization/tr-voi.ts) and [`src/core/simulation/scenario-engine.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/simulation/scenario-engine.ts) use parameterized engineering nominal assumptions (e.g., 1.5 TR inverter AC with ~1.2–1.5 kW nominal load, 2 kW geyser, 15–20 W entertainment standby), which can differ substantially from a specific household's actual hardware efficiency, insulation, and runtime.

---

## 3. Tariff Verification Scope: TNPDCL LT-1A vs. Generic Schedules

Supported plans are cataloged in [`src/core/tariff/tariffs/tnpdcl-lt1a.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/tariffs/tnpdcl-lt1a.ts#L359-L420):

| Tariff ID | Classification | Verification & Scope Boundary |
| :--- | :--- | :--- |
| `in-tnpdcl-lt1a-may2026` | `statutory_consumer_payable` | Models TNPDCL Domestic LT-1A bi-monthly consumer-payable slabs per TNERC Order No. 6 of 2025 & GoTN G.O. (Ms) No. 50 (effective May 10, 2026: 200 free units for `<= 500` kWh; reverts to 100 free units at `501` kWh causing `+₹478.40` jump). Software-verified against unit/parity tests. |
| `in-tnpdcl-lt1a-2025` | `statutory_consumer_payable` | Models TNPDCL Domestic LT-1A effective July 1, 2025 – May 9, 2026 (100 universal free units + `101–200` @ `₹2.35/kWh` up to `500` kWh). |
| `in-tnpdcl-lt1a-2024` | `historical_baseline` | Retained strictly for retrospective verification of older 2024–2025 bills (`₹4.50` / `₹2.25` structure, `+₹233.00` jump at `501` kWh). |
| `generic-flat-inr` | `generic_reference` | **Illustrative reference only** (`₹5.00/kWh` + `₹50/mo` fixed + `5%` duty). **Not verified** against any non-Tamil Nadu state DISCOM tariff. |
| `generic-tou-inr` | `generic_reference` | **Illustrative pilot TOU reference only** (`₹10` peak / `₹7` day / `₹5` off-peak). **Not verified** against any live utility TOU tariff. |

### Known Tariff & Billing Edge Cases Not Modeled in UI

1. **Exclusions:** Commercial/industrial/agricultural tariffs (`LT-II`, `LT-III`, `LT-V`), arrears, delayed payment surcharges, meter rent, security deposit adjustments, kW-sanctioned-load fixed charge overrides, and rooftop solar net-metering export credits/banking rules are **not** modeled in the standard domestic LT-1A path.
2. **Mid-Cycle Tariff Transition Proration:** Although [`calculator.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/calculator.ts#L530-L569) includes a standalone `prorateBillAcrossTariffVersions()` helper, [`ManualBillForm.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/ingestion/ManualBillForm.tsx) and [`BillHistoryTable.tsx`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/dashboard/BillHistoryTable.tsx) evaluate each saved bill against a single resolved tariff schedule rather than splitting cycles mid-period.
3. **Regulatory Revisions:** Future TNERC tariff orders or GoTN subsidy notifications supersede static definitions bundled in `v0.1.0-alpha`.

---

## 4. Non-Certified Statistical & Measurement & Verification (M&V) Status

Per [`docs/pilot/MV-METHODOLOGY-REVIEW.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/MV-METHODOLOGY-REVIEW.md):

1. **No IPMVP Option C or ASHRAE Guideline 14 Certification:**
   - HearthShift AI is **not** certified under Efficiency Valuation Organization (EVO) IPMVP Option C, Option A/B, or ASHRAE Guideline 14.
   - The `MeasurementVerificationDetails` interface in [`src/types/contracts.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/types/contracts.ts#L422-L445) is a data metadata schema only; the client application does **not** run automated degree-day (CDD) baseline regression solvers, enforce `CV(RMSE) <= 15%` or `|NMBE| <= 5%`, collect Non-Routine Adjustments (NRAs), or compute autocorrelation-adjusted Fractional Savings Uncertainty (`FSU`).
2. **4-Tier Provenance Boundaries:**
   - `simulated`: Parametric model projection (`RecommendationFeed`, `ScenarioSimulator`).
   - `user_reported`: Self-reported action click (`Tried It!`), logged conservatively at $Q_{0.05}$ without meter confirmation.
   - `meter_observed`: Raw unadjusted meter change (confounded by weather, occupancy, and appliance changes).
   - `measurement_verified`: Reserved for externally audited causal counterfactuals; cannot be self-earned solely by using the alpha UI.
3. **Conditional Probabilistic Model Assumptions:**
   - TR-VOI's `95% Conservative Lower Bound` ($Q_{0.05}$) and `P(D > D_max) <= 0.05` comfort safety gate are **model-conditional bounds** assuming diagonal Gaussian preference priors $\boldsymbol{\theta} \sim \mathcal{N}(\boldsymbol{\mu}, \boldsymbol{\Sigma})$, Gaussian consumption volatility ($\sigma_X = 8.0\text{ kWh}$), linear discomfort features, and a single unitary household decision-maker.
   - Real households experience heavy-tailed heatwaves, multi-occupant preference conflicts, and appliance wear that violate idealized Gaussian assumptions; consequently, **neither savings nor zero discomfort are guaranteed**.
4. **Capability Gating Boundaries:**
   - In `BASIC` mode (bills only), hourly charts and load-shifting optimization remain strictly locked (`policy.ts`).
   - Even in `OPTIMIZATION_ELIGIBLE` mode (`>= 7` days and `>= 168` interval readings + constraints), pure time-shifting saves `₹0.00` under flat/tiered non-TOU schedules such as TNPDCL LT-1A.

---

## 5. Browser Storage, Input Limits & Runtime Boundaries

- **Pure Client-Side JavaScript/TypeScript Execution:** Uses standard browser JS/TS and optional Web Worker concurrency (zero WebAssembly binaries).
- **No Offline Service Worker Caching Yet:** While [`public/manifest.json`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/public/manifest.json) provides basic web-app metadata and loaded browser sessions compute locally without server calls, no Service Worker cache is registered in `v0.1.0-alpha`; opening or reloading the site requires network connectivity to reach the host.
- **CSV Import Bounds:** Enforces `25 MB` max file size and `500,000` max rows (`csv-parser.ts`) to prevent browser tab memory exhaustion; files exceeding these limits or containing abnormal gaps/meter resets without rollover modulus omit unverified intervals rather than fabricating values.
- **Local IndexedDB Persistence Risks:** Subject to browser disk-pressure eviction, automatic deletion on Private/Incognito exit, plaintext local storage unless OS disk encryption is enabled, and visibility to browser extensions with broad host permissions (`<all_urls>`). Always use **Export All Data (JSON)** for personal backups and **Delete All My Data** before leaving shared machines.
