# ADR-001: Local-First Client-Side Architecture

## Status
Accepted

## Date
2026-11-22

## Context
Residential smart-meter readings at 15-minute or 30-minute intervals reveal intimate household behaviors: sleep cycles, morning routines, cooking schedules, presence/absence patterns, and appliance usage signatures. Uploading these readings to cloud servers introduces major surveillance risks, vendor liability, regulatory burdens (GDPR, Indian DPDP Act 2023), and cloud operational costs.

At the same time, households need an accessible solution that runs on existing laptops, tablets, and smartphones without purchasing specialized edge hardware (e.g. Raspberry Pi hubs or custom NILM devices).

## Decision
We adopt a **Local-First Progressive Web App (PWA)** architecture:
1. All raw interval readings, historical bills, preference parameters, and recommendation logs are parsed, stored, and evaluated entirely within the client's browser environment using Web Workers, IndexedDB, and WebAssembly/JavaScript.
2. The remote backend serves strictly static assets (HTML/JS/CSS) and versioned public tariff schedules. Zero user energy readings or feedback tokens are accepted or ingested by any server.
3. The app is fully functional offline after initial load.

## Consequences
### Positive
* Zero server-side storage liability or data breach exposure for private household telemetry.
* Zero cloud compute costs for time-series parsing, simulation, or optimization.
* Complete offline usability for households with intermittent connectivity.
* Complete compliance with data minimization requirements under global privacy regulations.

### Negative
* Compute performance is constrained by client CPU/memory capabilities.
* Absence of centralized telemetry makes population-wide aggregate learning impossible without explicit opt-in federated learning mechanisms.
* Data is tied to the specific browser profile unless manually exported/imported by the user.

## Alternatives Considered
1. *Cloud-First with Client-Side Encryption:* Upload encrypted blobs to cloud storage. Rejected: Introduces key-management complexity for non-technical users and creates metadata leakage (file sizes, upload timestamps).
2. *Dedicated Local Hardware Hub:* Require a local Raspberry Pi/Home Assistant device. Rejected: Adds hardware cost and setup friction, excluding mass-market adoption.
