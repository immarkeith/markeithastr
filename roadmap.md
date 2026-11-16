# ASTR Master Roadmap

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
- [ ] Daily 6:00 PM ET raw-bar trade reconstruction (verifying fills, prices, same-day calendar precision).
- [ ] Independent recalculation of all graph points and scoreboard stats directly from immutable trade rows.
- [ ] Saturday 10:00 AM ET weekly closed-loop balance reconciliation (Starting Capital + Net Realized P&L = Current Value).
- [ ] Randomized historical look-ahead bias validation.
- [ ] Audit Desk UI with PASS / WARNING / FAIL verdicts and discrepancy ledgers.

### Phase F — T+1 Settlement & Cash Account Realism
*Target: 2–3 credits*
- [ ] Strict T+1 cash gating on exits (`available_on = exit_date + 1 trading session` in paper ledgers).
- [ ] Disable simulated auto top-ups; log pending settlement balances.
- [ ] Capital tranching (Tranche A / B) for same-day and 1-day specialists to prevent simulated Good Faith Violations.
- [ ] Turnaround-adjusted capital efficiency ranking (`Return % / [Hold Days + 1]`).

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
- [ ] **Stock-Specific Formula Exploration**: Test independent momentum, mean-reversion, and breakout parameter combinations against historical bars for each individual seed stock.
- [ ] **Empirical Holding Horizon Calibration**: Determine the specific holding horizon (1 to 21 trading days) that maximizes risk-adjusted expectancy for that specific ticker.
- [ ] **Out-of-Sample Validation**: Require candidate models to clear at least 10 historical test trades across two unseen market regimes with positive net expectancy after 0.1% modeled costs.
- [ ] **Analyze Desk Integration**: Surface validated stock-specific BYOB findings on the Analyze tab alongside standard specialists without altering live execution rules.

## Open setup items
- [ ] Vercel site uses its own database: run `bun scripts/backfill-research-ledger.ts` there to get the same Lab history.
