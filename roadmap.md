# ASTR Master Roadmap

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
- [ ] **Data Ingestion Self-Healing (Alpaca 401)**:
  - [ ] Replace rejected Alpaca credentials using the owner's valid pair; credentials cannot be reconstructed automatically. Full scan caching remains blocked until valid credentials are supplied.
  - [x] Add best-effort free Yahoo completed-session fallback for research marks only. Stooq currently returns a browser challenge. Do not mix Yahoo volume/adjustments with IEX scanner inputs; provider-separated ingestion remains pending.
  - [x] Missing research exit prices remain "Pending Market Mark", with no fabricated zero P&L or settlement; historical closes use target-session dates.
  - [x] Cache updates preserve older rows during partial provider responses; transient deepening failures no longer permanently blacklist tickers.
  - [ ] Review and repair previously contaminated zero-profit research records with provenance and ledger reconciliation; no historical trade records changed during this maintenance pass.
- [x] **15-Minute Health Check Query Optimization**:
  - [x] Health coverage uses an indexed, trailing-180-calendar-day query; missing-session detection independently covers the full 160-session scoring window.
  - [x] One transient query retry records recovery; persistent failures remain visible.
  - [ ] Full mark-to-market graph reconstruction remains Phase B; this maintenance does not declare graph accuracy repaired.

---

## Priority 2: Phase K — ASTR Self-Development AI Engineer Tab (`/engineer`)
*Target: 3–4 credits (One-time build; 100% self-contained and $0 platform fees thereafter)*

### Phase K.1 — Checkpoint Engine & Recovery System (The Safety Net)
- [ ] Database tables: `engineer_checkpoints` and `engineer_change_log` for snapshot tracking.
- [ ] GitHub Git Refs API integration: create lightweight, immutable Git Tags (`checkpoint/vX.X-...`) before any automated edit.
- [ ] Mobile Recovery UI (`/engineer/recovery`): milestone cards with 1-tap "Rollback Entire App" or "Feature-Specific Revert".
- [ ] Code vs. Data separation guarantee: Git rollbacks operate solely on repository text files and are strictly forbidden from executing destructive SQL against historical research tables (`daily_bars`, `trades`, `research_notebook`).

### Phase K.2 — Database Schema, Atomic Task Queue & Heartbeat Leases
- [ ] Create `public.engineer_tasks` (prompt, status, branch_name, commit_sha, plan_summary, diff_content, files_modified, build_passed).
- [ ] Create `public.engineer_logs` (task_id, step_name, log_text, level, created_at).
- [ ] Atomic queue claiming via PostgreSQL function using `FOR UPDATE SKIP LOCKED`.
- [ ] Runner lease timeout and orphan watchdog: auto-release or fail tasks whose runner heartbeat stops for >10 minutes.

### Phase K.3 — Hardened Multi-Layer Firewall & Security Boundary
- [ ] Zero-trust trading isolation: runner environment is strictly quarantined from `ALPACA_LIVE_KEY_ID` and `ALPACA_LIVE_SECRET_KEY`.
- [ ] Diff AST scanner: reject any patch containing references to live order endpoints (`/v2/orders`, `/v2/positions`).
- [ ] Directory protection: `.github/workflows/` and root configuration are read-only to the bot.
- [ ] Branch rulesets: bot operates exclusively on isolated `engineer/*` branches; zero direct pushes to `main`.
- [ ] Additive-only migrations: schema changes require explicit user authorization cards and cannot contain `DROP` or `TRUNCATE`.

### Phase K.4 — GitHub Actions Runner & Quality Gate
- [ ] Workflow definition `.github/workflows/astr-engineer.yml` with `timeout-minutes: 5` and serialized concurrency.
- [ ] High-efficiency patch engine: search-and-replace block diffs anchored by 2–3 unchanged lines with single-match enforcement.
- [ ] Two-phase verification gate: run `bun run lint` (ESLint 9) followed by `vite build` (Vite 8 / TanStack Start).
- [ ] Autonomous self-correction loop: feed compiler errors back to model for up to 3 repair attempts.

### Phase K.5 — In-App `/engineer` Mission Control UI
- [ ] Mobile-first route (`src/routes/engineer.tsx`) with code/wrench navigation icon.
- [ ] Voice-to-prompt dictation via browser Web Speech API with real-time waveform visualizer and text fallback.
- [ ] Live task stepper: Queued -> Planning -> Coding -> Verifying -> Ready for Review.
- [ ] Expandable terminal drawer streaming runner logs.
- [ ] Mobile-optimized red/green diff viewer with "Files Touched" indicators.
- [ ] Commit-pinned "Approve & Deploy" button: validates exact tested `commit_sha` before merging to `main`.

### Phase K.6 — Pilot Verification
- [ ] Dictate safe test prompt from phone: "Add build timestamp to bottom of Settings page".
- [ ] Confirm runner boots, compiles clean, posts diff, and merges successfully without touching Lovable or third-party IDEs.

---

## Priority 3: Phase L — Autonomous Stock Selector & Strict Time-Based Exits
*Target: 2–3 credits*

### Phase L.1 — Autonomous Live Trading Engine & Daily Selection
- [ ] Dedicated "Autonomous Live Trading" toggle in Settings with hard daily loss limit and max position size (e.g. $20–$50 per trade, max 1 trade/day).
- [ ] Automated 9:35 AM ET market scan via cron across the tracked universe.
- [ ] Multi-researcher consensus ranking: score tickers across all active specialists and select the #1 ranked candidate with highest calibrated confidence.
- [ ] Hold horizon assignment: automatically assign the winning specialist's research-derived hold period (e.g. DIS for 17 trading days) and record `hold_until_date` and `owning_researcher`.
- [ ] Automated market order execution via Alpaca Live API for the selected top ticker.

### Phase L.2 — Strict Time-Based Liquidation Engine
- [ ] Scheduled 3:45 PM ET daily liquidation check against open positions.
- [ ] Strict expiration exit: if `hold_days_elapsed >= target_horizon`, automatically submit a market sell order before market close.
- [ ] Same-day trade guarantee: positions with horizon = 0 are strictly liquidated by 3:55 PM ET—never carried overnight.
- [ ] Volatility kill switch: automatically abort new buys and cancel unfilled orders if SPY intraday volatility spikes above high-vol regime threshold.
- [ ] Notification summary: dispatch push/in-app alert detailing morning entry reason, assigned specialist, and afternoon exit execution.

---

## Priority 4: Core Quantitative Research & Platform Engine

### Phase B — Research Lab Curves & Parameter Stability Testing (In Progress)
*Target: 2 credits*
- [x] Normalized researcher percentage curves
- [x] Time-range selectors (Today to All)
- [x] Parameter stability & sensitivity engine
- [ ] True daily mark-to-market equity curves (realized P&L + open position daily mark from authentic bars) once fresh market data resumes.

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

### 1. Research Lab True Daily Mark-to-Market Engine (`race.server.ts`)
*Problem documented: `PnlChart` currently builds curves from realized profit on `exit_date` and carries the value forward, leaving flat baselines and false end-spikes. True curves require session-by-session valuation.*
- [ ] **Server-Side Session Reconstruction**:
  - In `src/lib/race.server.ts`, load every researcher's open and closed paper positions.
  - For each active chart window, load cached `daily_bars` for every held ticker across all trading sessions between `entry_date` and `exit_date` (or latest bar if still open).
  - Compute daily portfolio equity using the formal snapshot formula:
    $$\text{equity}_t = \sum_{i \le t} \text{realized P/L}_i + \sum_{\text{open at } t} \left( \text{stake} \times \left( \frac{\text{close}_t}{\text{entry\_price}} - 1 \right) \right)$$
  - Never accumulate unrealized P/L across consecutive days; evaluate each session as an independent mark-to-market snapshot.
- [ ] **Gaps & Data Coverage Safeguards**:
  - Missing sessions must remain explicit gaps; never carry previous closes forward to simulate artificial flat lines.
  - Tag each researcher's curve with `coverage_from`, `coverage_to`, and `has_gaps`.
  - When cached session coverage is under 50% for a requested range, display an explicit *"Data coverage pending"* warning banner rather than falling back to realized-only stepping.

### 2. Lab PnlChart Visual Scale & Coordinate Calibration (`PnlChart.tsx`)
*Problem documented: Percent mode dynamically scales the vertical axis without numerical tick marks, causing tiny fractional movements to look like massive spikes.*
- [ ] **Numerical Y-Axis Ticks**: Add explicit percentage graduation marks (e.g. -2.0%, -1.0%, 0.0%, +1.0%, +2.0%) so micro-fluctuations do not visually dominate the viewport.
- [ ] **Baseline Grounding**: Anchor curves to a visible zero-line so positive and negative performance have an honest visual reference.
- [ ] **Direct Point Ingestion**: Render the server-emitted daily equity series directly instead of synthesizing calendar steps in client memory.

### 3. Phase 2g — BYOB Stock-Specific Discovery & Dynamic Horizon Engine
*Goal: Evolve from static universal scoring to stock-specific quantitative modeling across the seed universe (NVDA, AMD, MU, DELL, LRCX, SHOP, AVGO, ASML, ANET, etc.).*
- [ ] **Stock-Specific Formula Exploration**: Test independent momentum, mean-reversion, and breakout parameter combinations against historical bars for each individual seed stock.
- [ ] **Empirical Holding Horizon Calibration**: Determine the specific holding horizon (1 to 21 trading days) that maximizes risk-adjusted expectancy for that specific ticker.
- [ ] **Out-of-Sample Validation**: Require candidate models to clear at least 10 historical test trades across two unseen market regimes with positive net expectancy after 0.1% modeled costs.
- [ ] **Analyze Desk Integration**: Surface validated stock-specific BYOB findings on the Analyze tab alongside standard specialists without altering live execution rules.
