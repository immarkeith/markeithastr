# On-Demand Stock Analyzer

Add an "Analyze a Stock" tool that scores any ticker you type using the exact same engine the daily scanner uses — no second formula, no trades, no strategy changes.

## What you'll see

Type a ticker, press Analyze, and get back:

- Overall score (0-100) and a verdict band: Strong / Good / Neutral / Weak / Avoid
- Whether it clears the configured minimum score to trade
- Factor breakdown (Trend, Momentum, Volume, Relative strength, Volatility quality) with the weighted points each contributed
- Helped / hurt lists built from the same factor reasons the scanner records
- Failed criteria when it's screened out (below minimum price, below the average dollar-volume floor, not enough clean history)
- Its invalidation line ("price closes below SMA20 … or RSI14 < 45")
- Comparison against today's top-ranked eligible names from the most recent scan run, including where this ticker would rank

Monitored status, one of:

- "Already monitored" (green check) when the ticker is in the scanner universe or watchlist — no duplicate entry is created
- "Request to Add to Monitored Stocks" button when it isn't monitored and its score meets the minimum
- "Does not currently qualify for monitored-stock consideration." when it's below the minimum

The request creates a pending entry that shows up on the Swing watchlist page for Approve / Reject. Nothing becomes tradeable until you approve it.

## Data usage

On-demand only — one ticker per press.

1. First it uses price history already cached in the database (free, no API call).
2. Only if that ticker isn't cached does it pull a single symbol's daily bars from the market data provider, and it caches them so a repeat analysis is free.

## Technical notes

- `src/lib/analyze.server.ts`: `analyzeTicker(ticker)` loads settings, calls existing `scoreConfig(s, await volumeShare(s))`, computes the market proxy 5-day ROC exactly as `runScan` does, and calls the shared `scoreSecurity` from `src/lib/scoring.ts`. Bars come from `daily_bars` for the ticker; if fewer than 55 sessions are present it falls back to `alpacaBars` / `polygonSymbolBars` for that one symbol and upserts the rows. When `scoreSecurity` returns null it re-runs the gate checks individually to report which criterion failed. Peers come from the latest `scan_scores` rows; monitored status comes from presence in `daily_bars` / `watchlist_candidates`.
- `src/lib/analyze.functions.ts`: `analyzeStock` (POST, `requireGate`, zod ticker validation, max 10 chars) and `requestMonitoredStock` (POST, `requireGate`) which upserts `watchlist_candidates` with `status = 'requested'`, `streak_days = 0`. Both are read/advisory only — neither touches trades, ladder, or `app_settings`.
- Extend the `setWatchlist` status enum with `requested` so the watchlist page can approve or reject these.
- UI: new route `src/routes/analyze.tsx` (ticker input + Analyze button + result card reusing `StatTile` and the existing factor labels from `FACTOR_LABELS`), linked from the nav in `src/routes/__root.tsx`, plus a compact "Analyze a stock" link on the Trades page. Watchlist page shows a "requested" badge for pending adds.
- No migration needed: `watchlist_candidates.status` is free text.
