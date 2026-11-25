# HearthShift AI — Regulatory Source Traceability & Safety Verification Matrix

**Document Status:** Phase 4C-A Pre-Study Scientific & Regulatory Audit  
**Date:** November 25, 2026  
**Code Sources Verified:** [`src/core/tariff/tariffs/tnpdcl-lt1a.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/tariffs/tnpdcl-lt1a.ts) · [`src/core/tariff/calculator.ts`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/core/tariff/calculator.ts)  

---

## 1. Tariff Schedule & Official Order Provenance Matrix

| Plan ID (`SUPPORTED_TARIFF_CATALOG`) | Jurisdiction & Cadence | Regulatory / Statutory Basis | Effective Window | Verification Tier |
| :--- | :--- | :--- | :--- | :--- |
| `in-tnpdcl-lt1a-may2026` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | Underlying energy slabs per **TNERC Suo-Motu Tariff Order No. 6 of 2025** (`₹4.70`–`₹11.55/kWh`, `₹0` fixed charges) combined with **GoTN G.O. (Ms) No. 50, Energy (D3) Dept. (10-05-2026)** (doubles free units from `100` to `200` for total bi-monthly consumption `<= 500` units, implemented via TNPDCL billing memo `15-05-2026` with TNERC provisional subsidy backing; consumption `> 500` reverts to `100` free units). | `2026-05-10` onward (base slabs `2025-07-01`+) | **Statutory Consumer-Payable Model** *(verify against local receipt/PDF archive)* |
| `in-tnpdcl-lt1a-2025` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | **TNERC Suo-Motu Tariff Order No. 6 of 2025** consumer-payable rates after Sec. 65 GoTN base subsidy (`0–100` free universal; `101–200` `₹2.35/kWh` if total `<= 500`, `201–400` `₹4.70`, `401–500` `₹6.30`, jumping at `501+` to `100` free + `101–400` `₹4.70`). | `2025-07-01` to `2026-05-09` | **Statutory Consumer-Payable Model** |
| `in-tnpdcl-lt1a-2024` | Tamil Nadu TNPDCL Domestic LT-1A (Bi-monthly) | Historical **TNERC Tariff Order (Effective `2024-07-01`)** baseline (`₹4.50` / `₹2.25` / `₹6.00` / `₹8.00`..`₹11.00`) retained strictly for retrospective audit of 2024–2025 paper receipts. | `2024-07-01` to `2025-06-30` | **Historical Baseline Model** |
| `generic-flat-inr` | Illustrative India Flat Monthly | Synthetic comparative benchmark (`₹5.00/kWh`, `₹50.00/mo` fixed charge, `5%` electricity duty on energy charges only). | Synthetic reference (`2024-01-01`+) | **Illustrative Reference Only — Not a Real Utility Order** |
| `generic-tou-inr` | Illustrative Pilot TOU Monthly | Synthetic multi-band Time-of-Use schedule (`₹10.00/kWh` `06:00–10:00` & `18:00–22:00`, `₹7.00/kWh` `10:00–18:00`, `₹5.00/kWh` `22:00–06:00`, `₹0` fixed). | Synthetic reference (`2024-01-01`+) | **Illustrative Reference Only — Not a Real Utility Order** |

> [!NOTE]
> **Archive Guidance for Study Coordinators:** Before distributing printed participant billing examples in Phase 4C-B, the study team should archive PDF copies of **TNERC Tariff Order No. 6 of 2025** and **GoTN G.O. (Ms) No. 50 (10-05-2026)** from [`tnpdcl.org`](https://www.tnpdcl.org/en/tnpdcl/billing-services/schedules-tariff/) alongside the study binder. HearthShift AI never substitutes for the printed TNPDCL receipt.

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
