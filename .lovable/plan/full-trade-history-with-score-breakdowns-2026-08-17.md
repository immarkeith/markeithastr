# Full trade history with score breakdowns

Add a complete buy/sell ledger of every stock ASTR has traded, with exact prices, dates, times, and an expandable panel showing why the name scored high — including every formula that flagged it.

## What you'll see

A new **Trade history** section (its own tab, above the existing scan history) listing every trade newest-first:

- Ticker, kind (day / swing) and mode badge (live vs simulated)
- **Bought**: date + time, price per share, dollars invested, share count
- **Sold**: date + time, price per share, proceeds, P&L in $ and %, saved profit
- Still-open trades show "open" with the current status note instead of a sell row
- Running totals at the top: number of trades, win rate, total P&L, total saved profit
- Filters: all / live only / simulated only, and open / closed

Each row expands into **"Why it scored high"**:

- The score and rank it had on the day it was bought
- Each scoring formula that contributed, with its points and plain-English reasons — e.g. Trend 22.5 pts ("price above SMA20", "SMA20 above SMA50"), Momentum 18.0 pts ("RSI14 in healthy zone (61)", "5-day ROC +4.2%"), Volume, Relative strength, Volatility quality
- The machine-learning read when one exists for that day: predicted return, probability of a positive day, and the combined ASTR+ML score
- Which strategy preset was active, and the invalidation rule that was set ("price closes below SMA20 …")
- Its score on the exit day too, so you can see whether it was still qualifying when sold

If no score record exists for that date (manually entered trade), the panel says so plainly instead of showing blanks.

## Times

Trades currently only store dates for entries and exits, so exact clock times aren't recoverable for past sells. The change adds proper timestamps going forward and shows the best available time for older rows (the record's creation time), labeled as approximate.

## Technical notes

- Migration: add `entry_at timestamptz` and `exit_at timestamptz` to `public.trades`, backfilling `entry_at` from `created_at` and `exit_at` from `created_at` for closed rows. No new grants needed (table stays service-role only behind the passcode gate).
- `src/lib/scan.server.ts`: set `entry_at: now()` when opening a trade and `exit_at: now()` in `closeTrade` / paper exits.
- New gated server function `fetchTradeHistory` in `src/lib/data.functions.ts`: returns trades (up to 500) joined with the matching `scan_scores` rows (by ticker + run date for entry and exit dates), plus any `model_predictions` row for that ticker/date, and the active strategy name. Add `tradeHistoryQuery` to `src/lib/queries.ts`.
- New route `src/routes/trade-history.tsx` with its own `head()` metadata; add it to the nav in `src/routes/__root.tsx`. Uses the existing shadcn accordion/collapsible for the dropdown detail; no new dependencies.
- Reuses the stored `factors` jsonb (weighted points + reasons) already written by every scan, so no rescoring or extra market-data calls.
