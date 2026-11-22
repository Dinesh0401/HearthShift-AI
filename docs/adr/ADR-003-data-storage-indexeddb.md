# ADR-003: Local Data Storage via IndexedDB and Dexie.js

## Status
Accepted

## Date
2026-11-22

## Context
A household using HearthShift in Detailed Mode may import multiple years of interval smart-meter data (17,520 rows per year for 30-minute intervals). In addition, the application must store historical utility bills, versioned tariff schedules, latent preference parameters, feedback ledgers, and simulation scenarios.

Browser storage options include:
1. `localStorage` / `sessionStorage`: Synchronous, string-only, strictly capped at ~5 MB across origin.
2. `IndexedDB`: Asynchronous, structured transactional object store with multi-megabyte/gigabyte storage capacity and secondary indices.
3. Embedded SQLite via WebAssembly (`sqlite-wasm`): Powerful SQL querying, but requires loading a ~1.5 MB WASM binary and managing OPFS (Origin Private File System) persistence.

## Decision
We select **IndexedDB wrapped with Dexie.js (`src/lib/db.ts`)** as the primary storage layer:
1. Dexie provides typed, promise-based API ergonomics and schema version migrations.
2. Structured indices on timestamps, tariff IDs, and resolution types ensure sub-second query performance without WASM overhead.
3. Explicit transactional lifecycle methods provide atomic single-button `deleteAllUserData()` and `exportAllUserData()`.

## Consequences
### Positive
* High capacity (>500 MB quota on modern browsers).
* Fast indexed queries over large interval arrays.
* Clean schema migration paths across application updates.
* Native browser support without WASM initialization overhead.

### Negative
* Browser storage is unencrypted at rest by default (relies on host OS encryption).
* Data may be cleared if the host device experiences extreme storage pressure and the site has not requested persistent storage permission.

## Alternatives Considered
* *localStorage:* Rejected due to strict 5 MB quota and main-thread blocking synchronous I/O.
* *WASM SQLite:* Rejected for MVP to minimize initial JavaScript/WASM bundle size and complex OPFS fallback logic across mobile browsers.
