# ASTR Master Roadmap

## Approved corrected BYOB revision (2026-11-16)
- [x] Implement indicator toolkit, horizon-aware partitions, holdout-only regime qualification, marked drawdown and exact scoring.
- [x] Add immutable research records, durable test-exposure tracking and a transactional single active-model pointer; preserve all 30 legacy rows.
- [x] Verify 15 seeds: 12 provisional, 3 integrity-blocked; no active models. 107 tests pass; signed-in NVDA update reads back v3, desktop/phone verified.
- [ ] Independent-host deployment (`21-byob-corrected-research.sql`), new untouched future holdout and verified corporate-action/point-in-time source evidence (external prerequisites); authentic missing-session review for DELL/SHOP/ANET.

## Legacy Phase 2g implementation (superseded qualification; rows preserved)
- [x] Build isolated BYOB discovery, frozen holdout validation, versioned research records and fast evaluation.
- [x] Prepare and research all 15 seed stocks: 971 sessions each; 5 qualified, 6 provisional, 4 disqualified. Initial calendar-rejected records preserved as version 1, corrected historical-calendar evaluations saved as version 2.
- [x] Integrate advisory Analyze presentation; 79 tests pass, preview validation clean, authorized NVDA update reads back unchanged version 2, desktop/390px checks show no overflow or page errors.
- [ ] Independent Vercel database: apply `migration/fresh/20-byob-specialist.sql` and run `bun scripts/research-byob.ts` there; this preview cannot verify that separate deployment.

## Approved Research Lab backfill (2026-11-16)
- [x] Backfill the existing 300-stock research universe from January 2024 through November 13, 2026; existing bars preserved (301 symbols including SPY).
- [x] Replay seven researchers chronologically: 4,627 saved rows across 661 sessions, March 28, 2024–November 13, 2026; trades and live settings untouched.
- [x] Remove chart fallback to trade reconstruction; desktop and 390×710 phone checks confirm 1M, 3M, 1Y, All and Today use saved rows, without overflow.
- [x] Verify stored coverage and all 32 tests; newest preview validation passed. Historical replay uses current formulas and the existing alphabetically selected universe, not historical formula versions or a survivorship-free full-market backtest. Vercel's separate database has not been backfilled by this preview run; use the portable maintenance script there.

## Standing Core Rules
1. Research is strictly paper-only; live trading, broker accounts, Alpaca state, and P&L are isolated and protected.
2. All external integrations must be $0 cost with no paid subscriptions or platform fees.
3. Every live order must adhere to explicit capital sizing limits and strict time-based holding horizons.
4. Clean compiles (`vite build` exit 0) and type checks are required before any code merge.

---

## Completed Phases Archive

### Phase A — Key-Check Activation & Analyze Tab Researcher-Specific Buy [COMPLETED]
- [x] Run migration 14 in backend to activate 8:00 AM ET Alpaca key check pg_cron schedule
- [x] Analyze Tab: inline table of all active researchers with specific scores and research-derived hold periods
- [x] Per-researcher direct BUY button on each row with top fit highlighted
- [x] Position assignment: locked to researcher rules and hold duration
- [x] Remove legacy standalone "Buy Long Term" button
- [x] Home Tab: display owning researcher and target holding horizon on held stocks

### Phase C — Historical Market Regimes & Event Intelligence [COMPLETED]
- [x] Historical market condition classifier (SPY SMA20/50/200 direction + 20-day SMA50 slope; RV20 volatility vs trailing 252 sessions)
- [x] Market regime tagging — exactly 9 composite states (Bull/Bear/Sideways x Low/Normal/High vol), high-vol precedence, 758 SPY sessions loaded
- [x] Performance-by-regime evidence ledger with Benjamini-Hochberg correction and 0.1% transaction cost modeling

### Phase D — Eliminate Alpaca Paper API & Hard Live Firewall [COMPLETED]
- [x] Standardize exclusively on the single Live credential pair for market data and authorized execution
- [x] Purge all Alpaca Paper API endpoints and secondary keys from backend
- [x] Isolate paper research strictly as internal database simulations
- [x] Hard code-level firewall blocking unconfirmed automated live orders

### Phase J — Comprehensive System Manual & Feature Catalog (`FEATURES.md`) [COMPLETED]
- [x] Create `FEATURES.md`: complete reference manual of active ASTR systems, tabs, safeguards, and algorithms
- [x] Document researcher formulas, holding horizon logic, and ranking methodology
- [x] Detail risk controls, live order firewalls, and T+1 cash management rules

---

## Priority 1: Operational Hygiene & Data Health (Immediate Fixes)
*Target: 1 credit / Chat Mode execution*

- [x] **Database Storage Purge**:
  - [x] Removed 3,023 `health_checks` older than seven days on November 1, 2026.
  - [x] Removed 138 old runs and 39,195 attached/low-ranked scores; verified 30 runs and 300 top-ten scores remain. All 100,014 historical bars preserved. Deleted space can be reused; physical allocation is not guaranteed to shrink immediately.
- [x] **Data Ingestion Self-Healing (Alpaca 401)**:
  - [x] Valid Alpaca live key pair installed and verified.
  - [x] Add best-effort free Yahoo completed-session fallback for research marks only. Stooq currently returns a browser challenge. Do not mix Yahoo volume/adjustments with IEX scanner inputs; provider-separated ingestion remains pending.
  - [x] Missing research exit prices remain "Pending Market Mark", with no fabricated zero P&L or settlement; historical closes use target-session dates.
  - [x] Cache updates preserve older rows during partial provider responses; transient deepening failures no longer permanently blacklist tickers.
  - [x] 113 contaminated $0 research trades quarantined as pending (rows preserved).
- [x] **15-Minute Health Check Query Optimization**:
  - [x] Health coverage uses an indexed, trailing-180-calendar-day query; missing-session detection independently covers the full 160-session scoring window.
  - [x] One transient query retry records recovery; persistent failures remain visible.
  - [x] Graph accuracy resolved by the saved researcher ledger (Phase B).

---

## Phase K — AI Engineer Tab (`/engineer`) [COMPLETED 2026-11-16]
- [x] Checkpoints/recovery, task queue with leases, firewall, GitHub runner with independent verification, chat-style mobile UI.
- [x] Pilot task merged after human approval (PR #5); safety drills pass. Setup reference: `docs/phase-k-deployment.md`.

---

## Priority 3: Phase L — Autonomous Stock Selector & Strict Time-Based Exits
*Target: 2–3 credits*

### Phase L.1 — Autonomous Live Trading Engine & Daily Selection
- [x] Dedicated "Autonomous Live Trading" toggle in Settings with hard daily loss limit and max position size (e.g. $20–$50 per trade, max 1 trade/day).
- [x] Automated 9:35 AM ET market scan via cron across the tracked universe.
- [x] Multi-researcher consensus ranking: score tickers across all active specialists and select the #1 ranked candidate with highest calibrated confidence.
- [x] Hold horizon assignment: automatically assign the winning specialist's research-derived hold period (e.g. DIS for 17 trading days) and record `hold_until_date` and `owning_researcher`.
- [x] Automated market order execution via Alpaca Live API for the selected top ticker.

### Phase L.2 — Strict Time-Based Liquidation Engine
- [x] Scheduled 3:45 PM ET daily liquidation check against open positions.
- [x] Strict expiration exit: if `hold_days_elapsed >= target_horizon`, automatically submit a market sell order before market close.
- [x] Same-day trade guarantee: positions with horizon = 0 are strictly liquidated by 3:55 PM ET—never carried overnight.
- [x] Volatility kill switch: automatically abort new buys and cancel unfilled orders if SPY intraday volatility spikes above high-vol regime threshold.
- [x] Notification summary: dispatch push/in-app alert detailing morning entry reason, assigned specialist, and afternoon exit execution.
- [ ] Run `migration/fresh/18-phase-l-autonomous-live.sql` on the Vercel site's database (applied to the preview database only).
- [ ] Live end-to-end check on a real trading morning (not exercised with real money yet).

---

## Priority 4: Core Quantitative Research & Platform Engine

### Phase B — Research Lab Curves & Parameter Stability Testing [COMPLETED]
*Target: 2 credits*
- [x] Normalized researcher percentage curves
- [x] Time-range selectors (Today to All)
- [x] Parameter stability & sensitivity engine
- [x] Daily saved researcher results (ledger) from Jan 2024 history; charts plot saved rows only.

### Phase E — Lead Researcher Quantitative Self-Audit Engine
*Target: 3–4 credits*
- [x] Four-pillar audits, explicit evidence gaps, saved manual results, filters and real-record verification. All 50 tests pass; see `docs/phase-e-audit.md`.
- [x] Raw-bar entry/exit reconstruction and paper-only closed-loop balance equation; daily cycle persists reports, weekly hook extends lookback to 180 days.
- [x] Independent paper scoreboard recomputation and saved researcher ledger identities. Graphs remain ledger-based, never reconstructed from trades.
- [x] Historical boundary validation; missing provenance and fewer than five verified records warn instead of passing.
- [x] Audit Desk PASS / WARNING / FAIL verdicts and category/severity filters; manual run saved and read back, desktop/phone verified.
- [ ] Configure dedicated 6 PM ET daily / Saturday 10 AM ET weekly integrity schedules on the independent host; no integrity job exists in the inspected scheduler. Existing daily cycle timing differs.
- [ ] Record actual input-cutoff provenance in research producers; legacy records cannot prove lookahead absence. Requires separately reviewed producer changes.
- [ ] Review first audit findings before any data repair: 119 fill violations, two scoreboard discrepancies and eight balance discrepancies; no automatic changes authorized.
- [ ] Apply portable audit-history setup (`migration/fresh/19-phase-e-integrity-history.sql`) to the separate Vercel database; only preview application is verified.

### Phase F — T+1 Settlement & Cash Account Realism [IMPLEMENTED — SESSION CHECK PENDING]
*Target: 2–3 credits*
- [x] New paper sales settle next eligible session; all paper entry paths check settled cash. Historical rows preserved.
- [x] Disable automatic top-ups and reserve-release deposits; display settled, in-flight and marked equity balances.
- [x] Alternate A/B pools for rapid paper slots and historical simulation; 65 tests pass, real cash display verified desktop/phone.
- [x] Separate capital-efficiency indicator, not ranking: realized Return % / (elapsed holding sessions + 1 settlement session).
- [ ] Observe the first scheduled paper-session execution after independent-host deployment (waiting for deployment/open market); no live orders used for verification. See `docs/phase-f-settlement.md` for limitations.

### Phase G — Central Calibration Layer & Adaptive Capital Allocation
*Target: 4–5 credits*
- [ ] Independent signal discovery: 7 formulas submit candidate setups with learned hold periods.
- [ ] 6-pillar calibration engine: score pairs by historical hit rate, regime fit, setup quality, reward/drawdown asymmetry, whipsaw penalty, and turnaround efficiency.
- [ ] Minimum calibrated confidence threshold: "Protect 100% Cash" ($0 spend) if no setup clears cutoff.
- [ ] Adaptive earned capital access ceilings based on out-of-sample performance.
- [ ] Opportunity-driven duration pool routing: 1–3 days to Short-Term pool, 4+ days to Long-Term pool.
- [ ] Calibrated spend sizing scaling with daily confidence up to specialist ceiling.
- [ ] Daily Confidence Matrix UI on Home and Research Lab tabs.

### Phase H — Autonomous Entertainment & Events Relationship Researcher
*Target: 3–4 credits*
- [ ] Strict research-only isolation: hypotheses and graphs only; zero authority over live trading or orders.
- [ ] $0 source registry adapters (sports, concerts, films, SEC EDGAR/Wikidata) with automatic health failovers.
- [ ] Living time-scoped entity graph (`entity_a`, `entity_b`, `relationship_type`, `valid_from`, `valid_to`).
- [ ] Multi-source corroboration without exclusive reliance on single sources or SEC 8-Ks.
- [ ] Entertainment Hypothesis Ledger UI showing discovered events, relationship paths, and historical comparable outcomes.
- [ ] Embed searched ticker's SEC event filings directly on the Analyze tab.

### Phase I — Grand Codebase Cleanup & Dead-Code Purge
*Target: 2–3 credits*
- [ ] Comprehensive 4-category inventory (KEEP, MERGE, REVIEW, DELETE).
- [ ] Consolidate redundant modules into canonical sources after all features are verified.
- [ ] Zero database schema changes, zero behavior modifications, full clean typecheck.
---

## Phase B.1 & Phase 2g — True Daily Mark-to-Market Curves & Stock-Specific Discovery

### 1–2. Mark-to-market curves & chart calibration [SUPERSEDED — done via saved researcher ledger, see Phase B]

### 3. Phase 2g — BYOB Stock-Specific Discovery & Dynamic Horizon Engine
*Full spec: `docs/06-byob-researcher-spec.md`*
*Goal: Evolve from static universal scoring to stock-specific quantitative modeling across the seed universe (NVDA, AMD, MU, DELL, LRCX, SHOP, AVGO, ASML, ANET, etc.).*
- [x] **Stock-Specific Formula Exploration**: Independent momentum-breakout, trend-pullback and mean-reversion parameter discovery, with recorded trial counts.
- [x] **Empirical Holding Horizon Calibration**: Validation selects from the approved 11 horizons spanning 1–90 trading days; holdout never selects a model.
- [x] **Corrected Out-of-Sample Validation**: 10/5/5 trades, >=0.50% holdout expectancy, positive PF, two positive known holdout-only regimes, <=25% marked drawdown and verified source evidence. Legacy qualification superseded; no corrected active models yet.
- [x] **Analyze Desk Integration**: Separate paper-only advisory BYOB section, independent score/quality/confidence, chronological metrics, saved outcomes and model history; standard specialists and execution unchanged. See `docs/phase-2g-byob.md` for limits.

## Open setup items
- [ ] Vercel site uses its own database: run `bun scripts/backfill-research-ledger.ts` there to get the same Lab history.
