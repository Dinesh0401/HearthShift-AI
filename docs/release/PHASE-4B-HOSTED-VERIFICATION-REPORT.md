# HearthShift AI — Phase 4B Hosted Production Verification Report (`v0.1.0-alpha`)

**Document Status:** Post-Deployment Acceptance Sign-Off  
**Date:** November 25, 2026  
**Final Phase 4B Decision:** **PASS**  

---

## 1. Deployment Identity & CI Provenance

| Attribute | Verified Value | Evidence |
| :--- | :--- | :--- |
| **Public Production URL** | `https://hearthshift-ai.pages.dev/` | HTTP `301` redirect from `http://hearthshift-ai.pages.dev/` → HTTPS `200 OK` |
| **Hosting Platform** | Cloudflare Pages (Static Export `out/` + `out/_headers`) | Response `server: cloudflare`, edge PoP `cf-ray: a601dd9b98217ef4-MAA` |
| **Deployed Git Commit** | `fce18f8acc5d4d4887ae3a2c7ddfd037e510a324` | Verified live HTML includes Phase 4B Changelog, How It Works, honest non-offline disclosure, and consent-gated Feedback controls |
| **GitHub Actions CI Run** | [`runs/45611552791`](https://github.com/Dinesh0401/HearthShift-AI/actions/runs/45611552791) | `completed` / `success` on `fce18f8` (covers audit, `tsc`, `lint`, Vitest `83/83`, Pytest `41/41`, Node build/E2E `5/5`, and static `out/` build/E2E `5/5`) |
| **Live Asset ETag (`/`):** | `W/"187aea52b409479bb0b1d6d3480f7fd9"` | `HTML` `33,769` bytes (`HAS_BEACON=false`, zero analytics injection) |

> **Preview-Branch Note:** Connecting `main` in Cloudflare Pages published the production origin directly to `https://hearthshift-ai.pages.dev/`. Preview branches / PRs against `main` will automatically receive isolated `https://<hash>.hearthshift-ai.pages.dev` preview URLs via the connected Git integration.

---

## 2. Hosted HTTPS & Security Header Audit (`https://hearthshift-ai.pages.dev/`)

Verified via live HTTPS inspection (`2026-11-25T16:00Z`):

| Endpoint | HTTP Status | Observed Security Header / Edge Result | Matches `public/_headers` |
| :--- | :---: | :--- | :---: |
| `GET /` | `200 OK` | All 8 security directives present; `HAS_BEACON=false` | Yes |
| `GET /manifest.json` | `200 OK` | Valid JSON web app manifest (`application/json`) | Yes |
| `GET /icon.svg` | `200 OK` | `image/svg+xml` served cleanly | Yes |
| `GET /_headers` | `404` | Not publicly downloadable (`cache-control: no-store`; consumed by edge rules) | Yes |
| `http://hearthshift-ai.pages.dev/` | `301` | Redirects cleanly to `https://hearthshift-ai.pages.dev/` | Yes |

### Observed Edge Headers on `https://hearthshift-ai.pages.dev/`
- `content-security-policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
- `strict-transport-security`: `max-age=63072000; includeSubDomains; preload`
- `x-frame-options`: `DENY`
- `x-content-type-options`: `nosniff`
- `referrer-policy`: `no-referrer`
- `permissions-policy`: `camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `cross-origin-opener-policy`: `same-origin`
- `cross-origin-resource-policy`: `same-origin`

*Edge Observation:* Cloudflare Pages includes standard platform defaults (`access-control-allow-origin: *` on static assets alongside `CORP: same-origin`, and passive `cf-nel` error-logging headers with `success_fraction: 0.0`). Neither transmits household records nor injects Web Analytics beacons (`HAS_BEACON=false`).

---

## 3. Live Hosted Playwright E2E Results (`E2E_BASE_URL=https://hearthshift-ai.pages.dev`)

Command executed directly against the production HTTPS URL (`assertHostedTargetSafety` verified remote HTTPS origin ≠ `localhost`/`127.0.0.1` + HSTS enforcement):

```text
5 passed (18.0s) · HOSTED_E2E_EXIT=0
```

| Spec | Time | Verified Hosted Workflows & Invariants |
| :--- | :---: | :--- |
| `tests/e2e/data-integrity-mobile.spec.ts` | `3.1s` | Mobile (`375×667`) header/layout, form validation errors, REFIT trapezoidal W→kWh CSV integration, IndexedDB purge |
| `tests/e2e/ingestion-workflow.spec.ts` | `4.6s` | Manual bill entry (`480 kWh`), TNPDCL breakdown, `BASIC` interval gating, reload persistence, CSV ingestion, Tamil toggle, purge, `0` external telemetry |
| `tests/e2e/phase3-mvp-reliability.spec.ts` | `3.0s` | 7-tab ARIA navigation, `505 kWh` `₹478.40` tariff cliff simulator, `192h` CSV unlock, EVSI dialog + TR-VOI recommendation, 4-tier provenance badges, Tamil UI, JSON export & wipe |
| `tests/e2e/phase4a-alpha-security-demo.spec.ts` | `2.6s` | Live HTTPS + HSTS + CSP enforcement, `0` external requests, `0` sensitive same-origin payloads/queries, `0` CSP violations, tariff region switching, Safe Demo Mode (`0` fake savings), mobile a11y |
| `tests/e2e/phase4b-alpha-presentation.spec.ts` | `2.4s` | Live `/manifest.json` & `/icon.svg`, "How HearthShift Works" disclosure, `v0.1.0-alpha` Changelog modal, explicit non-offline notice, consent-gated zero-PII Feedback draft & sanitization |

### Desktop & Mobile Hosted Screenshots Verified
- Desktop Safe Demo & Empty Ledger: [`phase4a-demo-mode.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/phase4a-demo-mode.png)
- Desktop Overview + How It Works + Changelog/Feedback Controls: [`phase4b-alpha-overview.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/phase4b-alpha-overview.png)
- Zero-Telemetry Scrubbed Feedback Modal: [`phase4b-feedback-modal.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/phase4b-feedback-modal.png)
- Scenario Simulator & Tariff Cliff Avoidance: [`simulator-cliff.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/simulator-cliff.png)
- Recommendation Card & Conservative Bounds: [`recommendation-card.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/recommendation-card.png)
- Mobile (`375×667`) Bilingual Tamil Interface: [`phase4a-mobile-a11y.png`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/tests/e2e/screenshots/phase4a-mobile-a11y.png)

---

## 4. Minor Observations, Known Limitations & Scientific Boundaries

1. **Minor Visual Polish Note (Non-Blocking):** Inside [`AlphaFeedbackModal`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/src/components/alpha/AlphaModals.tsx) at shorter `720px` desktop viewport heights, action buttons sit near the bottom edge of the `max-h-[90vh]` scrollable dialog container when the comment box and live JSON preview are both visible. All buttons remain keyboard-accessible and functional cleanly.
2. **Feedback Collection in Phase 4C:** The public Feedback Modal deliberately generates a local JSON/clipboard/opt-in draft without backend ingestion (`0` household data uploaded). Phase 4C usability study sessions therefore use [`PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md`](file:///c:/Users/sjdin/Downloads/Project6/HearthShift-AI/docs/pilot/PHASE-4C-USABILITY-STUDY-EXECUTION-KIT.md) for explicit written consent and moderator-collected feedback capture.
3. **No Offline Service Worker Caching:** Initial load requires internet access to reach `https://hearthshift-ai.pages.dev/`; open browser sessions execute computations locally in IndexedDB.
4. **Scientific & Regulatory Scope:** Zero real household trials have been executed (`Stage 1` $N=5\text{--}10$ and `Stage 2` RCT remain unstarted). HearthShift AI makes **zero claims** of guaranteed savings, certified optimization, IPMVP Option C M&V verification, or utility tariff compliance beyond stated Tamil Nadu TNPDCL LT-1A schedules.
