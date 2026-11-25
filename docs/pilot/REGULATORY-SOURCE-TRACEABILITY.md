# HearthShift AI — Regulatory Source Traceability & Safety Verification Matrix

**Document Status:** Phase 4C-A.1 Gate 3 Regulatory Archival & Safety Traceability Audit  
**Date:** November 25, 2026  
**Code Sources Verified:** [`src/core/tariff/tariffs/tnpdcl-lt1a.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/tariffs/tnpdcl-lt1a.ts) · [`src/core/tariff/calculator.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/calculator.ts) · [`docs/pilot/regulatory-archive/INDEX.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/regulatory-archive/INDEX.md)  

> [!IMPORTANT]
> **Non-Certification & Regulatory Verification Scope**
> Exact integer-paise arithmetic in `calculator.ts` and TypeScript/Python parity tests verify internal software agreement with the **consumer-payable schedules encoded below**. Internal software tests and synthetic sample checks do **not** constitute official TNERC or TNPDCL tariff certification. Domestic consumers must always verify official charges against printed TNPDCL bills/receipts.

---

## 1. Archived Official Source Inventory (`docs/pilot/regulatory-archive/`)

All primary PDF documents and portal index snapshots below were retrieved from official **`tnerc.tn.gov.in`** and **`tnpdcl.org`** servers and archived in [`docs/pilot/regulatory-archive/`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/regulatory-archive/INDEX.md) with byte lengths and SHA-256 checksums verified:

| Archived File | Official Order / Document | Date / Period | Exact Official Source URL | Bytes | SHA-256 |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `TNERC-200Units-Additional-Subsidy-Order-2026-05-27.pdf` | **TNERC Order No. 5 of 2026** (Additional Tariff Subsidy for 200 Free Units `<= 500` kWh bimonthly; cites **GoTN G.O.(Ms) No. 50** & Lr. `No. 2800/D3/2026` dt `10-05-2026`, TNPDCL Lr. dt `18-05-2026`) | `26-05-2026` (w.e.f. `10-05-2026` to `31-03-2027`) | `https://tnerc.tn.gov.in/Orders/files/TO-Order%20No%20270520261449.pdf` | `297,675` | `a75c54c0ce775c9c2bbd49e1f55092f342b3bdd15c79217f80c91856b75160e4` |
| `TNERC-Provisional-Subsidy-Order-FY2026-27.pdf` | **TNERC Order No. 4 of 2026** (Provisional Tariff Subsidy Order for FY 2026-27; pp. 7–9 full LT I-A Approved / GoTN Subsidy / Consumer-Payable schedule) | `27-04-2026` (`FY 2026-27` baseline) | `https://tnerc.tn.gov.in/Orders/files/TO-Order%20No%20280420261156.pdf` | `589,507` | `1eb20727bfa8bba5133c5d1a7579af80e42eac92c7400be52810f952f44fae00` |
| `TNPDCL-TNERC-TO62025.pdf` | **TNERC Suo-Motu Order No. 6 of 2025** (Determination of Tariff for Distribution for FY 2025-26; p. 12 hike exemption, p. 14 FY24–25 vs FY25–26, pp. 34–36 LT I-A rules) | `30-06-2025` (w.e.f. `01-07-2025`) | `https://www.tnpdcl.org/static/tnpdcl/assets/files/tariff/2025/TO062025/TO62025.pdf` | `1,082,004` | `efc5a4600d4319bc81565a0001540fd2f5f5301461f9e61d5ec0f345acdf31c4` |
| `TNERC-Final-Subsidy-Order-FY2025-26.pdf` | **TNERC Order No. 6 of 2026** (FY 2025-26 Final Subsidy Reconciliation; Domestic actual subsidy `Rs. 8020.01 Crores`) | `24-09-2026` (`FY 2025-26` true-up) | `https://tnerc.tn.gov.in/Orders/files/TO-Order%20No%20071020261124.pdf` | `479,186` | `9253df7d370297f247887f9f22d569535fb85f2573efabd99e82cd5b2009c0e4` |
| `tnpdcl-schedules-tariff.html` & `-extract.txt` | **TNPDCL Schedules of Tariff Portal Snapshot** | `2026-11-24` | `https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/` | `43,673` / `12,040` | `fe6b894aa782304072c8162216806727b309bb8773ffeb2eaef36512e63c4791` |
| `TariffOrders.aspx.html` & `OtherOrders.aspx.html` | **TNERC Official Orders Index Pages** | `2026` index | `https://tnerc.tn.gov.in/Orders/TariffOrders.aspx` | `32,838` / `20,030` | `685284297910264621976e50b2f77b04e46ce8886ce03226b1e2d78b4c0f4ab0` |

### 1.1 Official TNERC Approved Tariff vs. GoTN Subsidy vs. Consumer-Payable Breakdown (`LT I-A Domestic`)

Direct reconciliation against **TNERC Order No. 6 of 2025 (pp. 12, 14, 34)**, **TNERC Order No. 4 of 2026 (pp. 7–9)**, and **TNERC Order No. 5 of 2026 (pp. 1–4)** establishes *why* HearthShift AI encodes `470, 630, 840, 945, 1050, 1155` paise/kWh rather than the unsubsidized Commission tariff (`495, 665, 880, 995, 1105, 1215` paise/kWh): per Order No. 6 of 2025 Section `2.1.3(b)` (p. 12), GoTN exempted Domestic (`LT IA`) consumers from the `3.16%` FY 2025-26 escalation (`Lr. No. 4097/D3/2025` dt `30-06-2025` & `Letter No. 5434/D3/2024` dt `04-12-2024`) via Section 65 revenue-loss compensation:

| Bi-Monthly Consumption Band | Bi-Monthly Slab | TNERC Commission Approved (`TO6/2025`, paise/kWh) | GoTN Base Subsidy (`Order 4/2026`, paise/kWh) | Additional May 2026 Subsidy (`Order 5/2026`, paise/kWh) | Net Consumer-Payable w.e.f. `10-05-2026` (paise/kWh) | Implemented in `tnpdcl-lt1a.ts`? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`<= 500` units bi-monthly** | `0–100` (`0–50`/mo) | `495` | `495` | `0` | **`0` (`Nil`)** | Exact (`470` effective base minus `100%` free units -> `0`) |
| **`<= 500` units bi-monthly** | `101–200` (`51–100`/mo) | `495` | `260` *(consumer paid `235` pre-`10-05-2026`)* | `235` *(Rs. 2.35/unit extra per G.O. 50)* | **`0` (`Nil`)** | Exact (`200` free units in `may2026`; `235` in `2025`) |
| **`<= 500` units bi-monthly** | `201–400` (`101–200`/mo) | `495` | `25` | `0` | **`470`** | Exact (`470` paise/kWh) |
| **`<= 500` units bi-monthly** | `401–500` (`201–250`/mo) | `665` | `35` | `0` | **`630`** | Exact (`630` paise/kWh) |
| **`>= 501` units bi-monthly** | `0–100` (`0–50`/mo) | `495` | `495` | `0` *(Ineligible `> 500`)* | **`0` (`Nil`)** | Exact (`100` fallback free units -> `0`) |
| **`>= 501` units bi-monthly** | `101–400` (`51–200`/mo) | `495` | `25` | `0` | **`470`** | Exact (`470` paise/kWh) |
| **`>= 501` units bi-monthly** | `401–500` (`201–250`/mo) | `665` | `35` | `0` | **`630`** | Exact (`630` paise/kWh) |
| **`>= 501` units bi-monthly** | `501–600` (`251–300`/mo) | `880` | `40` | `0` | **`840`** | Exact (`840` paise/kWh) |
| **`>= 501` units bi-monthly** | `601–800` (`301–400`/mo) | `995` | `50` | `0` | **`945`** | Exact (`945` paise/kWh) |
| **`>= 501` units bi-monthly** | `801–1000` (`401–500`/mo) | `1105` | `55` | `0` | **`1050`** | Exact (`1050` paise/kWh) |
| **`>= 501` units bi-monthly** | `1001+` (`501+`/mo) | `1215` | `60` | `0` | **`1155`** | Exact (`1155` paise/kWh) |
| **Domestic Fixed Charge** | All LT I-A slabs | `Nil` | — | — | **`Nil` (`0`)** | Exact (`0` paise) |

- **Official Scope & Exclusions Verified from `TNPDCL-TNERC-TO62025.pdf` (`3.2.2.1`, pp. 35–36):** Applicable to independent dwelling units (lights, fans, ACs, TV, home appliances; 1 service per permanently physically/electrically segregated unit; additional services convert to **LT I-D**), student/bachelor accommodation `<= 6` persons without name board, domestic animals/gardening `<= 2 kW`, residential handlooms, free charitable old-age homes/orphanages, attached professional consulting rooms `<= 200 sq ft`, artisan/tuition home loads `<= 2 kW`, family pandals `<= 3 kW <= 1 week`, public free libraries `<= 200 sq ft`, and home EV charging (`3.2.1(k)`, p. 33). **Not** valid for Huts (**LT I-B**), single-point colony bulk supply (**LT I-C**), multi-tenement common facilities (**LT I-D** / **LT I-E**), or commercial premises / homestays (**LT V**).
- **Verified Mid-Cycle Note (`TNERC Order No. 5 of 2026`):** GoTN `G.O.(Ms) No. 50 (10-05-2026)` & commitment letter `No. 2800/D3/2026 (10-05-2026)` authorized provisional subsidy of `Rs. 1545.14 Crores` (`10-05-2026` to `31-03-2027`, 326 days; `Rs. 1730 Crores/annum`) extending total free units to `200` bimonthly strictly for `<= 500` units consumed (`100` base free + `101–200` subsidized from `235` to `0` payable), leaving `> 500` consumers unchanged at `100` free units. HearthShift AI models `2026-05-10` as a discrete effective-date transition (`meter_reading_date_after`) and does **not** pro-rate partially straddled cycles prior to `10-05-2026`.
- **Known Archival Gaps Disclosed:**
  1. Standalone **GoTN `G.O.(Ms) No. 50` (`10-05-2026`)** text was not separately archived from GoTN servers; its statutory operative provisions (`10-05-2026` effective date, `200` free units up to `500` bi-monthly units, `<= 500` cutoff, Sec. 108(1)/Sec. 65 commitment) are verified verbatim inside **TNERC Order No. 5 of 2026** (`TNERC-200Units-Additional-Subsidy-Order-2026-05-27.pdf`).
  2. Standalone **TNERC Suo-Motu Order No. 6 of 2024 (`15-07-2024`)** and **TNERC Order No. 7 of 2022 (`09-09-2022`)** PDFs were not retrieved from `tnerc.tn.gov.in` (ASP.NET year-dropdown HTTP 302 loop). Page 14 of archived `TNPDCL-TNERC-TO62025.pdf` documents the **Commission Approved** FY 2024-25 schedule as `4.80, 6.45, 8.55, 9.65, 10.70, 11.80` Rs/unit; `in-tnpdcl-lt1a-2024` in code (`4.50, 2.25, 6.00, 8.00, 9.00, 10.00, 11.00`) models the earlier historical consumer-payable reference and is retained strictly for retrospective benchmark comparison (`Historical Baseline Model`, not for active Stage 1/2 households).

### 1.2 Plan-to-Source Traceability Matrix (`SUPPORTED_TARIFF_CATALOG`)

| Plan ID (`SUPPORTED_TARIFF_CATALOG`) | Jurisdiction & Cadence | Regulatory / Statutory Basis | Effective Window | Verification Tier |
| :--- | :--- | :--- | :--- | :--- |
| `in-tnpdcl-lt1a-may2026` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | Consumer-payable base slabs per **TNERC Order No. 6 of 2025 (`30-06-2025`)** & **TNERC Order No. 4 of 2026 (`27-04-2026`)** combined with **GoTN G.O.(Ms) No. 50 (`10-05-2026`)** & **TNERC Order No. 5 of 2026 (`26-05-2026`)** (`200` free units `<= 500`, `100` free units `> 500`, `Nil` fixed charges). | `2026-05-10` onward (base slabs `2025-07-01`+) | **Archived Consumer-Payable Model (Not Official Certification)** |
| `in-tnpdcl-lt1a-2025` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | **TNERC Order No. 6 of 2025 (`30-06-2025`)** & **TNERC Order No. 4 of 2026 (`27-04-2026`)** pre-May-2026 consumer-payable slabs (`0–100` free; `101–200` `₹2.35` if `<= 500`, `201–400` `₹4.70`, `401–500` `₹6.30`, jumping at `501+` to `100` free + `101–400` `₹4.70`). | `2025-07-01` to `2026-05-09` | **Archived Consumer-Payable Model (Not Official Certification)** |
| `in-tnpdcl-lt1a-2024` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | Historical consumer-payable baseline (`₹4.50` / `₹2.25` / `₹6.00` / `₹8.00`–`₹11.00`) retained strictly for retrospective benchmarks (note: FY24–25 Commission approved gross table on `TO62025` p. 14 was `₹4.80`–`₹11.80`; standalone 2024 PDF not archived). | `2024-07-01` to `2025-06-30` *(Model window)* | **Historical Baseline Model (Standalone 2024 PDF Unarchived)** |
| `generic-flat-inr` | Illustrative India Flat Monthly | Synthetic comparative benchmark (`₹5.00/kWh`, `₹50.00/mo` fixed charge, `5%` electricity duty on energy charges only). | Synthetic reference (`2024-01-01`+) | **Illustrative Reference Only — Not a Real Utility Order** |
| `generic-tou-inr` | Illustrative Pilot TOU Monthly | Synthetic multi-band Time-of-Use schedule (`₹10.00/kWh` `06:00–10:00` & `18:00–22:00`, `₹7.00/kWh` `10:00–18:00`, `₹5.00/kWh` `22:00–06:00`, `₹0` fixed). | Synthetic reference (`2024-01-01`+) | **Illustrative Reference Only — Not a Real Utility Order** |

> [!NOTE]
> **Consumer-Payable Gross Basis Note:** In `tnpdcl-lt1a.ts`, the summary column `Gross Charges` equals consumption evaluated at **GoTN-adjusted consumer-payable base rates** (`₹4.70/kWh` base before `200`/`100` free-unit waiver and `101–200` slab discount), rather than the unsubsidized TNERC Commission tariff (`₹4.95/kWh`, `₹6.65`, etc.). Net Payable (`INR`) matches official consumer-payable slab rules identically under both views; displaying gross GoTN Section 65 Commission subsidies separately (`₹495`/`100` units etc.) is deferred to future utility-receipt reconciliation work.

---

## 2. Exact Verified Participant-Facing Billing Examples (`calculateBill()` Output)

Every rupee and paise value below was computed directly via integer-paise arithmetic in [`calculator.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/calculator.ts):

### 2.1 Active May 2026 Scheme (`in-tnpdcl-lt1a-may2026`)

| Example Context | Bi-Monthly kWh | Gross Charges | GoTN Subsidy | Net Payable (INR) | Exact Paise | Cliff / Marginal Interpretation |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| Zero consumption | `0` | `₹0.00` | `₹0.00` | **`₹0.00`** | `0` | `₹0` fixed domestic charge |
| Within free tier | `100` | `₹470.00` | `₹470.00` | **`₹0.00`** | `0` | Covered under 200 free units |
| Free-tier ceiling | `200` | `₹940.00` | `₹940.00` | **`₹0.00`** | `0` | Max zero-rupee consumption |
| Empty-app default baseline | `380` | `₹1,786.00` | `₹940.00` | **`₹846.00`** | `84,600` | `180 × ₹4.70` (`120 kWh` headroom to cliff) |
| Scenario counterfactual (`505 - 61`) | `444` | `₹2,157.20` | `₹940.00` | **`₹1,217.20`** | `121,720` | `200 × ₹4.70 + 44 × ₹6.30` |
| Safe Demo Bill 1 | `445` | `₹2,163.50` | `₹940.00` | **`₹1,223.50`** | `122,350` | Within `<= 500` eligibility |
| Manual-entry walkthrough example | `480` | `₹2,384.00` | `₹940.00` | **`₹1,444.00`** | `144,400` | `20 kWh` below cliff edge |
| Safe Demo Bill 2 | `492` | `₹2,459.60` | `₹940.00` | **`₹1,519.60`** | `151,960` | `8 kWh` below cliff edge |
| Exact cliff boundary | **`500`** | `₹2,510.00` | `₹940.00` | **`₹1,570.00`** | `157,000` | `200 × ₹4.70 + 100 × ₹6.30` (`200` free units retained) |
| First unit past cliff | **`501`** | `₹2,518.40` | `₹470.00` | **`₹2,048.40`** | `204,840` | Reverts to `100` free units + `1 × ₹8.40`: **`+₹478.40` jump for +1 kWh** |
| Simulator default baseline | `505` | `₹2,552.00` | `₹470.00` | **`₹2,082.00`** | `208,200` | Reducing `505 → 444 kWh` saves **`₹864.80`** (`₹386.40` slab + `₹478.40` avoided cliff, non-additive) |
| Safe Demo Bill 3 | `508` | `₹2,577.20` | `₹470.00` | **`₹2,107.20`** | `210,720` | Disqualified above `500 kWh` |
| Alpha security test bill | `512` | `₹2,610.80` | `₹470.00` | **`₹2,140.80`** | `214,080` | Above cliff threshold |

### 2.2 Cross-Order Comparison at `500` vs. `501` kWh

| Tariff Schedule ID | Bill at `500 kWh` | Bill at `501 kWh` | Cliff Jump (`501 - 500`) |
| :--- | :---: | :---: | :---: |
| `in-tnpdcl-lt1a-may2026` *(May 10, 2026+)* | `₹1,570.00` | `₹2,048.40` | **`+₹478.40`** |
| `in-tnpdcl-lt1a-2025` *(Jul 2025 – May 9, 2026)* | `₹1,805.00` | `₹2,048.40` | **`+₹243.40`** |
| `in-tnpdcl-lt1a-2024` *(Jul 2024 – Jun 2025)* | `₹1,725.00` | `₹1,958.00` | **`+₹233.00`** |

### 2.3 Illustrative Reference Tariffs (`generic-flat-inr` & `generic-tou-inr`)
- **`generic-flat-inr` at `300 kWh`:** `300 × ₹5.00 = ₹1,500.00` energy + `₹50.00` fixed + `5% × ₹1,500.00 = ₹75.00` duty = **`₹1,625.00`** (`162,500` paise; zero cliff).
- **`generic-tou-inr` at `300 kWh` (default flat time band):** `₹2,100.00` (`700` paise/kWh baseline). Shifting `24 kWh` from Evening Peak (`₹10/kWh`) to Night Off-Peak (`₹5/kWh`) yields `24 × ₹5.00 = ₹120.00` modeled delta, whereas pure time-shifting under flat-slab TNPDCL LT-1A yields **`₹0.00`** direct tariff savings.

---

## 3. Physical Appliance Safety & Participant Protection Boundaries

1. **Zero Physical Control (`SAF-1`):** HearthShift AI runs inside a browser with zero smart-plug, thermostat, or utility meter write capabilities. Pressing `Useful` or `Tried It!` only updates local preference beliefs and records an unverified ledger entry.
2. **Water Heater (Geyser) Thermal Safety (`SAF-2`):** Advisory duration trimming applies solely to manually switching off power once water reaches desired bath temperature. Participants **must never** adjust internal factory thermal cutouts, safety relief valves, or leave storage tanks lukewarm (`< 50°C`) across prolonged idle periods without periodic `>= 60°C` sanitization cycles (*Legionella* control).
3. **Health, Heatwave & Comfort Primacy (`SAF-3`, `SAF-4`):** During extreme heatwaves, illness, elderly/infant care, or any discomfort, participants must immediately dismiss cooling advice (`Impractical`) rather than tolerating unsafe indoor heat. Expected savings and $Q_{0.05}$ lower bounds remain mathematical estimates under stated priors—**never guaranteed bill reductions**.
