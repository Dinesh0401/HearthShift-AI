# ADR-005: Progressive Data Resolution & Capability Gating

## Status
Accepted

## Date
2026-11-22

## Context
Many commercial energy apps attempt to infer hourly usage patterns or appliance breakdowns from monthly bills using unverified statistical assumptions or generative synthetic profiles. This practice represents intellectual dishonesty: an aggregate monthly total of 450 kWh contains zero physical information regarding whether a washing machine ran at 2:00 PM or 8:00 PM, or whether AC cooling occurred during peak or off-peak hours. Presenting speculative hourly curves to users creates phantom savings claims and undermines user trust.

## Decision
We enforce **Progressive Data Resolution & Capability Gating**:
1. The application explicitly measures the granularity of available local data (`monthly`, `daily`, `hourly`, `half-hourly`).
2. If only monthly bills are available (`basic` mode):
   * The UI restricts analysis to total expenditure tracking, slab boundary warnings, and generic conservation heuristics.
   * **The system is strictly forbidden from displaying synthetic hourly load curves, suggesting time-of-day load shifts, or claiming appliance-specific kWh attribution.**
3. Load-shifting recommendations, empirical night baselining, and TOU rate arbitrage are unlocked **only** when interval data (e.g. smart-meter CSV at $\le 1\text{ hour}$ resolution) is imported (`detailed` mode).

## Consequences
### Positive
* Absolute scientific and engineering honesty.
* Prevents misleading households into making lifestyle sacrifices that yield zero tariff savings.
* Clear visual distinction between speculative heuristics and empirical measurements.

### Negative
* Users who enter only monthly bills receive a more modest set of actionable recommendations until they import interval data.

## Alternatives Considered
* *Synthetic Profile Imputation:* Using regional average load profiles to "guess" hourly usage. Rejected because individual household variance is high, making synthetic load-shifting recommendations dangerously inaccurate.
