# Phase 2A Acceptance Specification & Verification Protocol
## HearthShift AI — Research Foundation & Simulator Gate

**Document Status:** Approved Acceptance Specification  
**Phase Focus:** Python Household Simulator, Baselines B1–B5, Tariff Equivalence, Seeded Reproducibility  
**Gate Policy:** Phase 2B candidate algorithm development cannot proceed until all Phase 2A tests achieve 100% passing status.

---

## 1. Phase 2A Acceptance Criteria

| ID | Criterion | Target Specification | Verification Method |
| :--- | :--- | :--- | :--- |
| **RAT-001** | Python Tariff Equivalence | Exact numerical match with TypeScript engine across all slabs and cliff jumps (e.g. ₹478.40 cliff delta at 500 vs 501 kWh) | `research/tests/test_tariff_equivalence.py` |
| **RAT-002** | Hidden Ground Truth Isolation | Agent algorithm receives zero access to private attributes `_theta_star` or oracle state; evaluator inspects true loss strictly post-decision | `research/tests/test_simulator_invariance.py` |
| **RAT-003** | Seeded Invariance | Two simulator runs initialized with identical seed produce bitwise-identical consumption and state trajectories | `research/tests/test_simulator_invariance.py` |
| **RAT-004** | Feasible Action Physical Bounds | Controllable appliance curtailments and schedule shifts obey physical device limits ($0 \le P \le P_{\max}$, minimum run times) | `research/tests/test_simulator_invariance.py` |
| **RAT-005** | Dynamic Source-Aware Gap Handling | Power integration correctly accepts nominal 15m/30m power series while omitting integration across abnormal gaps | `research/tests/test_simulator_invariance.py` |
| **RAT-006** | Baseline B1 (Rule-Based) Execution | B1 generates deterministic heuristic actions with zero queries | `research/tests/test_baselines.py` |
| **RAT-007** | Baseline B2 (Fixed Survey) Execution | B2 queries exactly $K$ fixed onboarding questions, computes MAP point estimate, and returns feasible action | `research/tests/test_baselines.py` |
| **RAT-008** | Baseline B3 (Entropy / LICA Proxy) | B3 greedily selects queries maximizing Shannon parameter entropy reduction | `research/tests/test_baselines.py` |
| **RAT-009** | Baseline B4 (Linear EVSI) Execution | B4 evaluates Value of Information under linear pricing assumption | `research/tests/test_baselines.py` |
| **RAT-010** | Baseline B5 (Oracle Reference) | B5 evaluates exact loss minimum using true hidden ground truth | `research/tests/test_baselines.py` |
| **RAT-011** | Non-Regressive Application Gate | Existing Next.js production build, 49 unit tests, and Playwright E2E browser tests continue passing with zero errors | `npm run test && npx playwright test` |

---

## 2. Definition of Done for Phase 2A

- [ ] All 6 Phase 2A research specification documents approved and committed.
- [ ] Python research package structured under `research/` with isolated dependencies (`pyproject.toml` / `requirements.txt`).
- [ ] Deterministic Python tariff engine implemented and verified against TypeScript contracts.
- [ ] Heterogeneous household simulator implemented with hidden ground truth isolation.
- [ ] Baselines B1, B2, B3, B4, and B5 implemented with clean interfaces.
- [ ] Automated pytest suite passes with 100% success rate across all RAT criteria.
- [ ] Existing Next.js application verified unaffected and 100% operational.
- [ ] Formal closeout report and Phase 2A decision recorded.
