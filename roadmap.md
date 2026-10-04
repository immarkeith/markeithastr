# Roadmap

- [x] Calculate capital-analysis readiness and observed strategy statistics from existing completed research
- [x] Add the configurable advisory capital analysis to the Research Lab
- [x] Validate data counts, projection safeguards, and desktop/mobile presentation

## Researcher learning & progression
- [x] Per-example starting characteristics + outcomes stored per researcher (researcher_examples)
- [x] Per-researcher learned beliefs with hold-out testing and confidence decay (researcher_beliefs)
- [x] Learning pass runs after each daily research pass; failures are warnings only
- [x] "What I've learned" + dropped assumptions shown in each researcher card
- [x] Supported characteristics bias experiment ORDER only; skeptic/validation unchanged
- [x] SQL for the self-hosted copy: migration/fresh/12-researcher-learning.sql

## Phase A — historical paper rebuild
- [x] Trading calendar read from the whole market, not a single proxy ticker
- [x] Stale "complete with 0 trades" checkpoints restart instead of staying stuck
- [x] Every researcher (not just the Lead) logs 1M / 3M / 9M horizon predictions
- [x] Runner-up qualifying candidates tracked as background horizon watches
- [x] Home/Lab graph ranges: 1D | 1M | 3M | 9M | All Time
- [x] All rebuilt records keep their true historical timestamps

## Phase B — deeper free history
- [x] Pull several years of free daily bars into the shared history in resumable chunks (7,480 historical paper trades completed)

## Phase C — autonomous metric discovery
- [x] Specialist roles: Risk (recovery vs deterioration), Profit Potential, Trend, Smart Money, Consistency, Lead
- [x] Each specialist discovers how to measure its own objective instead of fixed weights
- [x] Streak backtesting: long qualification streaks flag a stock for deeper study, and researchers test whether streak length predicts continuation or exhaustion

## Phase D — Home tab & unified graph ranges
- [x] Stocks currently held list at the top (who, ticker, amount, days held, P/L %)
- [x] Four account totals; Live P/L box removed; lookup below the graph
- [x] Home graph combines short-term and long-term profit/loss into one total line
- [x] Ranges Today | 1W | 1M | 3M | YTD | 1Y | 5Y | All (weekly points on 5Y/All, display only)

## Phase E — Assign to Researcher & Influence Desk
- [x] Assign to Researcher beside every Buy Long Term (Home, Analyze, Scoreboard), paper-only
- [x] Influence Researcher: tip date, hold, source, notes; outcome vs SPY; profile on Analyze
- [x] Dedicated Paper BUY in Assign dialog

## Phase F — Multi-Candidate & Empirical Holds
- [x] Researchers track up to 5 qualifying stocks at once (was 1)
- [x] Each researcher uses its own hold length (hold_days in its formula, default 3)
- [x] Trade Log shows each practice buy's hold length
- [x] Paper BUY per researcher in the Assign dialog (practice only, own hold length)

## Phase H — 8:00 AM Daily API Key Check & Push Alert
- [x] Automated 365-day morning credential verification against Alpaca
- [x] Push notification alert to iPhone if keys are revoked or invalid
- [x] Rate-limited to at most 1 alert per day
- [x] Trade Log "Latest session" weekend filter fix
- [ ] Run migration 14 in Supabase to activate pg_cron schedule

## Phase G — Research Lab Deepening
- [ ] Historical backtest curves using each researcher's active formula
- [ ] Parameter stability & sensitivity testing (brittle vs. robust formulas)
- [ ] Market regime classification (Bull, Bear, Choppy, Stress) via SPY/QQQ volatility
- [ ] SEC EDGAR filing catalyst intelligence integration
- [ ] "Show Me Why" diagnostic drawer displaying raw metrics and chart triggers

## Phase I — Eliminate Alpaca Paper API & Hard Live Firewall
- [ ] Standardize exclusively on the single Live credential pair for data and live execution
- [ ] Purge all Alpaca Paper API endpoints and keys from backend
- [ ] Isolate all paper research strictly as internal database simulations
- [ ] Hard code-level firewall blocking any live order without explicit human confirmation

## Phase J — Lead Researcher Quantitative Self-Audit Engine
- [ ] Daily 6:00 PM ET raw-bar trade reconstruction (verifying fills, prices, same-day calendar precision)
- [ ] Independent recalculation of all graph points and scoreboard stats directly from immutable trade rows
- [ ] Saturday 10:00 AM ET weekly balance reconciliation (Starting Capital + Net Realized P&L = Current Value)
- [ ] Randomized historical look-ahead bias validation
- [ ] Audit Desk UI with PASS / WARNING / FAIL verdicts and discrepancy ledgers

## Phase L — T+1 Settlement & Cash Account Realism
- [ ] Strict T+1 cash gating on exits (available_on = exit_date + 1 trading session)
- [ ] Remove simulated cash top-ups; record "Skipped: waiting on T+1 settlement" when cash is pending
- [ ] Capital tranching (Tranche A / B) for 1-day hold specialists to trade daily without Good Faith Violations
- [ ] Turnaround-adjusted capital efficiency ranking (Return % / [Hold Days + 1])

## Phase M — Central Calibration Layer & Adaptive Capital Allocation
- [ ] Independent signal discovery: 7 formulas submit candidate setups with learned hold periods
- [ ] 6-pillar calibration engine: grades (Stock + Formula) pairs by historical hit rate, regime fit, setup quality, reward/drawdown asymmetry, whipsaw penalty, and turnaround efficiency
- [ ] Minimum calibrated confidence threshold: "Protect 100% Cash" ($0 spend) if a setup does not clear the cutoff
- [ ] Adaptive earned capital access ceilings based on out-of-sample performance (ceiling on maximum allowed exposure, not automatic spend)
- [ ] Opportunity-driven duration pool routing: researcher's percentage belongs to the researcher, but the pool is chosen by the opportunity's hold length (1–3 days to Short-Term, 4+ days to Long-Term)
- [ ] Calibrated spend sizing: actual dollars deployed scale with today's calibrated confidence, up to the researcher's ceiling
- [ ] Strict non-cannibalization rule: unspent capital remains reserved as cash for that researcher rather than drifting to whoever is hot
- [ ] Daily Confidence Matrix UI on Home and Research Lab

## Phase K — Grand Codebase Cleanup & Dead-Code Purge
- [ ] Comprehensive 4-category inventory (KEEP, MERGE, REVIEW, DELETE)
- [ ] Consolidate redundant modules into canonical sources after all features are verified
- [ ] Zero database schema changes, zero behavior modifications, full clean typecheck
