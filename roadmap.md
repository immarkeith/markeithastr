# ASTR Master Roadmap

## Active Phases (Credit-Budgeted Sequence)

### Phase A — Key-Check Activation & Analyze Tab Researcher-Specific Buy
*Target: 1–2 credits*
- [ ] Run migration 14 in Supabase to activate 8:00 AM ET Alpaca key check pg_cron schedule
- [ ] Analyze Tab: when searching a ticker (e.g. DIS), display an inline table of all 7 active researchers with each researcher's specific score and research-derived hold period (e.g. 17D, 3M)
- [ ] Per-researcher direct BUY button on each row; highest-ranked researcher clearly highlighted as top fit, but any researcher is selectable
- [ ] Position assignment: buying under a researcher locks that position to that researcher's rules and hold duration
- [ ] Remove the legacy standalone "Buy Long Term" button from Analyze flow
- [ ] Home Tab: update "Stocks Currently Held" to display owning researcher and target holding horizon (e.g. `Trend — DIS — $50 — 17D — +8.4%`)

### Phase B — Research Lab Curves & Parameter Stability Testing
*Target: 3–4 credits*
- [ ] Normalized researcher percentage curves (percentage-based return, not distorted by dollar amounts)
- [ ] Full time-range selectors for researcher curves: Today | 1W | 1M | 3M | YTD | 1Y | 5Y | All
- [ ] Uncapped multi-candidate tracking (researchers simulate all qualifying setups under their formula across history)
- [ ] Parameter stability & sensitivity engine (test numerical variations like ±2 days lookback or ±5% threshold to identify brittle vs. robust formulas)
- [ ] "Show Me Why" diagnostic drawer on research cards showing raw metrics, formula parameters, and stability scores

### Phase C — Historical Market Regimes & Event Intelligence
*Target: 3–4 credits*
- [ ] Historical market condition classifier (direction, volatility, momentum, stress, sector environment)
- [ ] Market regime tagging (Bull, Bear, Choppy, Stress/High-Volatility) using SPY/QQQ historical bars
- [ ] SEC EDGAR catalyst testing: test formulas with vs. without historical filings/news context at simulated point-in-time
- [ ] Performance-by-regime evidence ledger: evaluate which factors and formulas remain reliable across different conditions (no hardcoded rules)

### Phase D — Eliminate Alpaca Paper API & Hard Live Firewall
*Target: 2–3 credits*
- [ ] Standardize exclusively on the single Live credential pair for market data and authorized execution
- [ ] Purge all Alpaca Paper API endpoints and secondary keys from backend
- [ ] Isolate all paper research strictly as internal database simulations
- [ ] Hard code-level firewall blocking any automated or unconfirmed live order placement

### Phase E — Lead Researcher Quantitative Self-Audit Engine
*Target: 3–4 credits*
- [ ] Daily 6:00 PM ET raw-bar trade reconstruction (verifying fills, prices, same-day calendar precision)
- [ ] Independent recalculation of all graph points and scoreboard stats directly from immutable trade rows
- [ ] Saturday 10:00 AM ET weekly closed-loop balance reconciliation (Starting Capital + Net Realized P&L = Current Value)
- [ ] Randomized historical look-ahead bias validation
- [ ] Audit Desk UI with PASS / WARNING / FAIL verdicts and discrepancy ledgers

### Phase F — T+1 Settlement & Cash Account Realism
*Target: 2–3 credits*
- [ ] Strict T+1 cash gating on exits (available_on = exit_date + 1 trading session in paper ledgers)
- [ ] Turn off simulated auto top-ups; record "Skipped: waiting on T+1 settlement ($X pending until tomorrow)"
- [ ] Capital tranching (Tranche A / B) for 1-day hold specialists to trade daily legally without Good Faith Violations
- [ ] Turnaround-adjusted capital efficiency ranking (Return % / [Hold Days + 1])

### Phase G — Central Calibration Layer & Adaptive Capital Allocation
*Target: 4–5 credits*
- [ ] Independent signal discovery: 7 formulas submit candidate setups with learned hold periods (zero submissions allowed)
- [ ] 6-pillar calibration engine: grades (Stock + Formula) pairs by historical hit rate, regime fit, setup quality, reward/drawdown asymmetry, whipsaw penalty, and turnaround efficiency
- [ ] Minimum calibrated confidence threshold: "Protect 100% Cash" ($0 spend) if no setup clears the cutoff
- [ ] Adaptive earned capital access ceilings based on out-of-sample performance (ceiling on maximum allowed exposure, not automatic spend)
- [ ] Opportunity-driven duration pool routing: researcher's percentage belongs to the researcher, but the pool is chosen by the opportunity's hold length (1–3 days to Short-Term, 4+ days to Long-Term)
- [ ] Calibrated spend sizing: actual dollars deployed scale with today's calibrated confidence, up to the researcher's ceiling
- [ ] Strict non-cannibalization rule: unspent capital remains reserved as cash for that researcher rather than drifting to whoever is hot
- [ ] Daily Confidence Matrix UI on Home and Research Lab

### Phase H — Autonomous Entertainment & Events Relationship Researcher
*Target: 3–4 credits*
- [ ] Strict Research-Only Isolation: Findings are stored as hypotheses and discovery graphs only; zero authority to modify live trading, SAME_DAY, LONG_TERM, Alpaca orders, balances, or production formulas without explicit future approval
- [ ] Source Registry ($0 Rule & Failover): Adapters for sports (ESPN/iCal), concerts/tours (MusicBrainz/venue calendars), film/streaming (The Numbers/press feeds), corporate/sponsorships (SEC EDGAR/Wikidata); automatic health pings mark paid or auth-walled sources unavailable and switch to free fallbacks; no paid subscriptions or API keys
- [ ] Living Time-Scoped Entity Graph: Dynamic relationships (`entity_a`, `entity_b`, `relationship_type`, `ticker`, `valid_from`, `valid_to`); revalidatable cache that closes old edges and opens new ones when sponsors, venues, broadcasters, or parent companies change
- [ ] Multi-Source Corroboration: Graph stitches independent facts across multiple public sources; does not require one source to contain the entire chain and does not assume every relationship produces an SEC 8-K
- [ ] Unbiased Discovery vs. Learned Prioritization: Discovers real-world events without pre-filtering for assumed economic impact; learns prioritization over time (deprioritizes weak categories without permanently blacklisting)
- [ ] Automated Pre-Scheduled Testing Pipeline: Autonomous lifecycle ($T-5$ to $T-1$ baseline & historical comparables, $T0$ to $T+1$ immediate reaction, $T+1$ to $T+5$ follow-through); reuses ASTR's shared historical market data pool
- [ ] Entertainment Hypothesis Ledger UI: Dedicated research-only desk showing discovered events, active relationship paths, historical comparable outcomes, and win-rate/edge tracking

### Phase I — Grand Codebase Cleanup & Dead-Code Purge
*Target: 2–3 credits*
- [ ] Comprehensive 4-category inventory (KEEP, MERGE, REVIEW, DELETE)
- [ ] Consolidate redundant modules into canonical sources after all features are verified
- [ ] Zero database schema changes, zero behavior modifications, full clean typecheck

### Phase J — Comprehensive System Manual & Feature Catalog (`FEATURES.md`)
*Target: 1 credit*
- [ ] Create `FEATURES.md`: complete, exhaustive reference manual of all active ASTR systems, tabs, safeguards, and algorithms
- [ ] Document every researcher formula, holding horizon logic, and ranking methodology
- [ ] Detail all risk controls, live order firewalls, and T+1 cash management rules

---

## Completed & Verified Foundations

- [x] Advisory Capital Requirement Analysis in Research Lab
- [x] Researcher learning & progression (per-example characteristics, beliefs, hold-out testing, confidence decay)
- [x] Historical Paper Rebuild (whole-market calendar, true historical timestamps, multi-horizon predictions)
- [x] Deeper Free History (7,480 historical paper trades completed from multi-year IEX data)
- [x] Autonomous Metric Discovery (specialist roles, dynamic factor discovery, qualification streak backtesting)
- [x] Home tab 4-box account totals & unified Robinhood graph (Today | 1W | 1M | 3M | YTD | 1Y | 5Y | All)
- [x] Assign to Researcher & Influence Desk (custom tips, outcome vs SPY tracking)
- [x] Multi-Candidate & Empirical Holds (up to 5 concurrent positions, formula-derived hold lengths 1–252 days)
- [x] 8:00 AM Daily API Key Check & Push Alert Engine (code-complete, pending migration 14 schedule run)
