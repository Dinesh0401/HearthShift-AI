# Development and contribution guide

HearthShift AI is a **public research-backed alpha**. This guide documents the engineering workflow and the boundaries required to keep the implementation scientifically and operationally honest.

> **License status:** No root `LICENSE` is currently provided. Public source visibility is **not** permission to redistribute or reuse the implementation. Discussion and issue reports are welcome; licensing terms must be established before treating the code as open source.

## Environment

- **Node.js 20**, matching [GitHub Actions](.github/workflows/ci.yml), and npm.
- **Python 3.12** only for the independent research suite.
- Playwright Chromium for browser E2E.

```bash
npm ci
npm run dev

# In a second terminal: http://localhost:3000
```

The optional synthetic demo **replaces existing HearthShift records in the current browser profile**. Use a new profile or incognito session when demonstrating or testing with throwaway data.

## Quality gates

```bash
npm audit --omit=dev
npm run type-check
npm run lint
npm test

npx playwright install chromium
npm run build
npm run test:e2e
npm run build:static
npm run verify:static
npm run test:e2e:static

# Independent research suite
python -m venv .venv
# Activate: .venv/bin/activate (macOS/Linux)
# or: .venv\Scripts\Activate.ps1 (Windows PowerShell)
python -m pip install -r research/requirements.txt
python -m pytest research/tests
```

## Change boundaries

- **Tariff and money:** Keep statutory arithmetic deterministic and integer-paise based. Do not use LLM outputs for charges. If a tariff rule changes, document the source and effective date; add historical boundary tests.
- **Capability safety:** A monthly bill cannot justify invented hourly curves. Interval counts do **not** imply consent to comfort-adjusting recommendations. Add negative tests for these cases.
- **Decision modeling:** Distinguish expected modeled savings, conservative model quantiles, actual meter observations, and verified field outcomes. No fabricated participants, approvals, novelty claims, or physical guarantees.
- **Privacy:** Do not include household bills, addresses, consumer IDs, real interval readings, browser exports, or secrets in commits, test screenshots, issues, or CI logs. Use synthetic fixtures.
- **Localization and accessibility:** Keep English and Tamil copy aligned; check long Tamil text at mobile widths, keyboard operation, visible focus, and useful error states.
- **Research parity:** If modifying `src/core/optimization/` or `src/core/tariff/`, assess effects on Python fixtures and numerical parity before merging.

## Suggested PR workflow

1. Branch from current `main`, name the change by intent (`fix/`, `feat/`, `docs/`).
2. Keep domain, UI, and research changes separated where practical.
3. Add tests for the behavior being changed, including failure cases and old regressions.
4. Update affected documentation and user-visible disclaimers.
5. Run the relevant commands above, open a PR targeting `main`, and inspect GitHub Actions and Cloudflare Pages checks.
6. Review the actual desktop/mobile interface when presentation changes; passing a DOM assertion alone is not a visual review.
7. Merge only after reviewing the diff and the required checks.

**PR description should answer:** What user problem changed? What architectural boundaries were affected? What tests ran? What remains unverified?

## Research oversight

Stage 1 human usability and safety sessions and any Stage 2 savings efficacy study require the appropriate supervisory / institutional determination **before** recruiting participants or collecting household study data. See the [oversight submission package](docs/pilot/PHASE-4C-B0-OVERSIGHT-SUBMISSION-PACKAGE.md) and [field-pilot protocol](docs/pilot/FIELD-PILOT-PROTOCOL.md).

For module ownership, see [architecture](docs/ARCHITECTURE.md). For known limitations, see [alpha disclosures](docs/release/ALPHA-LIMITATIONS-AND-DISCLOSURES.md).
