# Research Lab: Lead Researcher + 6 Rotating Backup Scientists

## What exists today

- Five specialist researchers (Trend, Contrarian, Consistency, Growth, Risk) all experiment every single day.
- The Skeptic is a review step inside the engine, not a researcher with its own tests.
- The Lead Researcher only appears at the end of a run: it merges whatever was validated that day and files a Balanced Strategy. It has no formula of its own and runs no test of its own.

## What changes

### 1. Six backup scientists, two per day

The Skeptic becomes a full sixth researcher with its own test slot. Each market day the engine picks exactly two of the six, using a fairness rule: least recently tested goes first, ties broken by fewest tests run. The other four sit out that day and keep their current formulas untouched. Their specialties stay as they are; they keep evolving their own parameters, keep their notebooks, and keep the permanent "what doesn't work" memory.

The Skeptic's test slot is a disproof test: it takes the strongest recent finding from any researcher and re-runs it on different windows, up markets vs down markets, with the luckiest and unluckiest trades removed, and on days the finding was never tuned on. Its output is evidence for or against, not a stock pick. Separately, the Skeptic still reviews findings every day as it does now — that review is cheap and stays on for all lanes even when the Skeptic is not in a test slot.

### 2. The Master Formula becomes a real, separate thing

Today's Balanced Strategy is recomputed from scratch each day. It is replaced by a persistent Master Formula owned only by the Lead Researcher:

- A versioned list of **master rules**, each one a single validated condition (a factor weight emphasis, a favourable factor band such as trend 60–70, or an entry filter) with the researcher who discovered it, the evidence behind it, and its running record.
- A rule is only added after sustained evidence: enough observations, holds up on days it was not tuned on, holds in both up and down markets, survives the luck trim, survives the Skeptic, and repeats across multiple days — not one good day. "Worked 100% of the time" on a small sample is explicitly treated as unproven and parked under observation instead.
- A rule is only removed after sustained failure, never after one bad day.
- A researcher changing its own formula never changes or erases an existing master rule. The rule keeps the range it was validated at.
- Every add, remove, or re-weight bumps the version (1.0 → 1.1 → 2.0 for structural change) and records what changed, why, who discovered it, the evidence, the Skeptic's assessment, and the before/after performance.

### 3. The Lead Researcher's own daily test

Test 1 of every market day: the Lead assembles the current Master Formula into a complete scoring rule, ranks the market with it, and records master formula version, stocks selected, final score, each factor's contribution, entry/exit conditions, results at same-day, 1, 3, 5 and 10 days, market conditions, which master rules contributed, and whether the formula still validates. A run of failures puts the version under review rather than silently rewriting it.

The Balanced Strategy proposal you approve on the Strategy tab is now generated from the Master Formula, so the approve-and-go-live path is unchanged. Nothing goes live automatically.

### 4. Backup scientist test records

Each of the two daily backup tests records: researcher, formula version and parameters, stocks selected, scores, entry/exit conditions, same-day/1/3/5/10-day results, market conditions, what worked, what failed, whether it looks repeatable, potential discoveries, potential problems, and whether it is being escalated to the Lead.

### 5. Research Lab view

The Lab page is reorganised around the daily three tests:

- **Today's three tests** at the top: the Lead's Master Formula test, plus the two rotating backup tests, each with picks, scores and horizon results.
- **Master Formula** panel: current version, every active rule with its discoverer and evidence, rules under observation, retired rules, and the full version history with reasons.
- **The six scientists**: who tested today, who is next in the rotation, each one's current formula, generation, best finding and notebook.
- Skeptic objections and the "what doesn't work" ledger stay where they are.

## Technical notes

- New `skeptic` lane added to `LANES` in `src/lib/department.server.ts` with its own params/objective, and a seed row in `researchers`.
- `runDepartment` gains a rotation selector (2 lanes/day from `last_run_at` + `experiments_run`) and only loops those lanes; a `force_lanes` option keeps the manual "run now" button able to test a specific researcher.
- New tables: `master_formula_versions` (version, rules snapshot, change reason, discoverer, evidence, skeptic note, before/after performance), `master_rules` (rule kind, factor, band/threshold, discoverer lane, evidence, status active/observation/retired, consecutive confirmations and failures), `lead_tests` (daily Master Formula test with picks, per-factor contributions, horizon results, contributing rules, verdict), and `backup_tests` (per-researcher daily test record). Service-role only with RLS, matching the existing gated pattern.
- Rule promotion/demotion logic lives in a new `src/lib/master-formula.server.ts`: candidate extraction from validated findings, the evidence bar, confirmation counters, versioning, and assembling rules into a scoring rule the existing `scoreWith`/`passesFilters` path can run.
- `departmentOverview` extended with master formula, rotation state and today's three tests; `ResearchDepartment.tsx` gains the new panels.
- Daily hook keeps calling `runDepartment` once per market day — unchanged schedule, all replay of cached bars, no new data cost.

## Untouched

Live trading, buy/sell rules, schedules, scoring for live picks, the three paper slots, Analyze, Strategy, Alerts, Settings, and the research verification assistants.

## Build order

1. Skeptic lane + rotation selector.
2. Master formula tables and rule engine.
3. Lead daily Master Formula test + backup test records.
4. Balanced Strategy proposal sourced from the Master Formula.
5. Research Lab UI.
