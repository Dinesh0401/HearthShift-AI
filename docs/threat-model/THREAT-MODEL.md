# System Threat Model & Privacy Analysis
## HearthShift AI — Privacy-First Threat Boundary and Vulnerability Assessment

**Document Status:** Approved Threat Specification  
**Version:** 1.0  
**Date:** November 22, 2026  
**Methodology:** STRIDE Threat Categorization & LINDDUN Privacy Assessment  

---

## 1. System Boundary & Architecture Context

HearthShift AI is strictly architected as a **Local-First Client-Side Application**. The primary trust boundary encompasses the user's local execution environment (the web browser sandbox).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED EXTERNAL ZONE                         │
│                                                                        │
│   [ Utility Company / Grid ]           [ Remote Cloud / Public CDN ]   │
│             │                                       │                  │
│             │ (Offline bill PDF / CSV)              │ Static App Code  │
│             ▼                                       ▼ & Public Tariffs │
├────────────────────────────────────────────────────────────────────────┤
│                       LOCAL CLIENT TRUST BOUNDARY                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Modern Web Browser Sandbox (Chromium / Gecko / WebKit)         │   │
│   │                                                                │   │
│   │   [ UI Shell / React / Tailwind ]                              │   │
│   │                │                                               │   │
│   │   [ Deterministic Billing & SPARE-HEM Optimizer ]              │   │
│   │                │                                               │   │
│   │   [ Local IndexedDB via Dexie.js ]                             │   │
│   │      ├── Private Energy Readings                               │   │
│   │      ├── Latent Preference Vectors                             │   │
│   │      └── Feedback Ledger                                       │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│                      [ User Operating System / Hardware ]              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Classification

| Data Asset | Sensitivity | Storage Location | Default Network Policy | Retention Policy |
| :--- | :---: | :---: | :---: | :---: |
| **Interval Energy Readings (15m/30m/1h)** | **CRITICAL** | Client IndexedDB only | **NEVER TRANSMITTED** | User-controlled / Purge on request |
| **Historical Utility Bills (kWh + Cost)** | **HIGH** | Client IndexedDB only | **NEVER TRANSMITTED** | User-controlled / Purge on request |
| **Household Preference Vector ($\boldsymbol{\theta}$)** | **HIGH** | Client IndexedDB only | **NEVER TRANSMITTED** | User-controlled / Purge on request |
| **User Feedback on Actions ($y \in \{-1,0,+1\}$)** | **MEDIUM** | Client IndexedDB only | **NEVER TRANSMITTED** | User-controlled / Purge on request |
| **Public Tariff Definitions** | **PUBLIC** | CDN Cached / IndexedDB | Inbound HTTPS only | Publicly immutable, versioned |
| **Application Assets (HTML/JS/WASM)** | **PUBLIC** | CDN Cached / ServiceWorker | Inbound HTTPS only | Standard PWA cache updates |

---

## 3. Threat Actors & Adversarial Profiles

1. **Passive Network Eavesdropper (ISP / Public Wi-Fi):** Inspects HTTP(S) headers and packet payloads between client and host.
2. **Curious Cloud / Hosting Provider:** The operator hosting the static web application (e.g., Vercel, Netlify, GitHub Pages). May seek to harvest telemetry or usage data.
3. **Malicious Browser Extension:** Third-party extensions installed in the user's browser with DOM inspection or network observation privileges.
4. **Physical / Device Access Adversary:** A shared family member, roommate, or unauthorized person with physical access to the unlocked device.
5. **Malicious External Code Injection (XSS):** Script injection via compromised CDN dependencies or supply chain packages.

---

## 4. STRIDE Threat Analysis

### 4.1 Spoofing
* **Threat:** Malicious actor spoofs regional tariff files to trick users into shifting load to expensive peak hours.
* **Mitigation:** Tariff definitions are statically committed, versioned in source control, cryptographically checksummed, and served strictly over HTTPS with Subresource Integrity (SRI) headers.

### 4.2 Tampering
* **Threat:** Tampering with local IndexedDB records to manipulate savings estimates.
* **Mitigation:** IndexedDB is scoped strictly to the origin (`https://domain`). OS-level user profile separation prevents cross-user tampering.

### 4.3 Repudiation
* **Threat:** User disputes previous bill calculation or recommendation advice.
* **Mitigation:** The billing engine is pure and deterministic; given an input vector of readings and a versioned tariff ID, the calculated output is mathematically identical and reproducible.

### 4.4 Information Disclosure (The Primary Risk)
* **Threat 1: Exfiltration of Raw Interval Data.** Interval energy data can reveal occupancy, sleep schedules, TV viewing, and appliance ownership.
  * **Mitigation:** No backend API endpoints exist for reading ingestion. The application contains zero network fetch calls carrying reading payloads.
* **Threat 2: Behavioral Inference via Anonymized Telemetry.**
  * **Mitigation:** Standard third-party behavioral analytics (Google Analytics, Mixpanel, Hotjar) are **strictly forbidden** and excluded from the codebase. Zero telemetry SDKs.

### 4.5 Denial of Service
* **Threat:** Importing a massive CSV file (e.g., 10 million rows) freezes the browser main thread.
* **Mitigation:** CSV parsing and optimization algorithms run inside Web Workers with strict chunking (batches of 5,000 rows) and memory limits.

### 4.6 Elevation of Privilege
* **Threat:** Malicious script escapes browser sandbox to access host filesystem.
* **Mitigation:** Pure web platform APIs (IndexedDB, Web Workers); zero native plugins or insecure Electron bindings.

---

## 5. LINDDUN Privacy Threat Assessment

1. **Linkability:** Can an external observer link two recommendations to the same home?
   * *Analysis:* Because no data leaves the browser, external linkability is zero.
2. **Identifiability:** Can a user be identified by their consumption signature?
   * *Analysis:* No consumption signatures are transmitted.
3. **Non-repudiation:** Can an outsider prove a household was cooking or showering at 3:00 AM?
   * *Analysis:* No, as raw data remains in local IndexedDB.
4. **Detectability:** Can an observer detect when a user shifts their laundry?
   * *Analysis:* Only the utility meter itself detects total load; HearthShift generates no auxiliary signal.
5. **Information Leakage via EVSI Questions:** Could the specific questions asked reveal latent vulnerabilities?
   * *Mitigation:* Questions are generated and scored locally; question text is never logged to an external server.

---

## 6. Known Residual Risks & Honest Limitations

1. **Unencrypted Browser Storage at Rest:**  
   IndexedDB is stored unencrypted on the client's physical filesystem (unless the underlying OS drive has BitLocker / FileVault enabled). Anyone with raw physical filesystem access to the user profile folder could parse the SQLite/LevelDB database.
2. **Malicious Browser Extensions:**  
   Extensions with `<all_urls>` permission can read the DOM and window storage. Users are cautioned against running untrusted extensions in profiles handling sensitive financial or utility data.
3. **Absence of Differential Privacy Guarantees in v1:**  
   Because v1 operates purely locally without federated sharing, formal $(\epsilon, \delta)$-differential privacy is not required. However, if aggregate cohort benchmarking is introduced in future versions, formal DP mechanisms must be implemented before any parameter sharing.

---

## 7. Security & Privacy Testing Verification Checklist

* [ ] Automated Playwright test monitoring all outgoing network requests during bill entry, CSV import, and scenario simulation; must assert `requests.filter(r => r.url.includes('/api/')).length === 0`.
* [ ] Zero external script tags in `index.html` (strict Content Security Policy: `default-src 'self'`).
* [ ] Verification of `deleteAllUserData()` to ensure zero residual storage in IndexedDB.
* [ ] Verification of `exportAllUserData()` to ensure human-auditable output.