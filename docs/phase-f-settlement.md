# Phase F — Paper settlement

## Delivered
- Every new strategy-scoped paper buy (scheduled, manual Lab, and researcher BUY) checks settled cash. Automatic shortfall deposits and automatic reserve-release deposits are removed. Explicit starting capital and manual cash adjustments remain.
- New paper sales settle next eligible NYSE session, independently of the live settlement setting. Weekends, recurring holidays, historical Good Friday and the 2025 mourning closure are supported; half-days are settlement sessions.
- Rapid paper slots (stored hold_days 1 or 2, counting entry day) alternate A/B pools. Existing untagged balances are split equally; future deploy and sale notes carry pool ownership. No historical rows are rewritten.
- Scoreboard → choose a researcher → Paper cash book shows settled cash, in-flight cash, reserved profit, marked total equity, next clearing date, and rapid-book pool availability. Missing marks show Pending mark, not invented equity.
- Capital efficiency is realized paper return percentage divided by elapsed holding sessions plus one settlement session. It is not a portfolio return, ranking input, or recommendation change.
- Historical simulator supports same-day and overnight pools and T+1. Daily producers append only new saved sessions; existing graph records stay unchanged.

## Files changed
- Added: `src/lib/settlement-rules.ts`, `src/lib/settlement-rules.test.ts`, `src/lib/paper-cash.server.ts`, this document.
- Updated: `src/lib/race.server.ts`, `src/lib/researcher-ledger.ts`, `src/lib/researcher-ledger.test.ts`, `src/lib/researcher-ledger.server.ts`, `src/lib/scoreboard.functions.ts`, `src/routes/scoreboard.tsx`, `roadmap.md`.
- Required page metadata completion only: history, strategy, research and research-log routes.

## Database and safety
No migrations, schema changes, balance resets, historical repairs, or maintenance writes were performed. No brokerage module, live account, Alpaca integration, autonomous rule, researcher score, or ranking was changed.

## Verification
65 tests across 10 files passed, including 12 settlement rules, five historical simulator tests and the unchanged 13 autonomous-live rule tests. Preview compilation/type validation passed. Unlocked the real preview and read Lead Researcher cash through the Scoreboard; checked desktop and 390px phone layouts: no overflow or page errors.

## Remaining limitations
- Deploy the committed code on the independent host; no database setup is required for Phase F.
- This run occurred on Sunday. No paper buy or sale was created in production for verification; actual scheduled session execution remains to be observed.
- Existing cash irregularities and old automatic deposits remain visible, not repaired.
- Paper trade and cash writes remain separate existing requests, not a transactional cash-reservation RPC. Simultaneous entry callers and a failed second write remain a pre-existing reconciliation risk; this implementation does not claim concurrency-safe settlement.
- Historical saved simulation results retain legacy immediate-reinvestment behavior before the v2 cutover. Future replay still uses current formulas, not historical formula versions; no return history is silently rewritten.
- Daily historical simulation buys at the close; a same-close same-day round trip cannot measure an intraday price move. No intraday returns are invented.
- Unexpected future market closures require calendar updates; no new external service or paid dependency was added.
- Efficiency uses the current slot's configured holding horizon, not a trade-weighted estimate across older horizon changes.