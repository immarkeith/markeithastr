# ASTR — Daily Rotation Scanner (Phase 1 web app)

A web version of your Python scanner: it scores your ticker universe each day, saves the history, and tracks a swing watchlist. Signals and record-keeping only in this phase — no orders are placed. Live trading is left as a clearly marked, disconnected next phase.

## Cost control (your main concern)

To keep credits low, this build is deliberately scoped:

- One build pass for the scoring engine + database, one for the UI, then small iterations. Bugs and tweaks are what add up, so we keep surface area small.
- Reuse of your existing scoring math verbatim (no redesign), so there's little back-and-forth about behavior.
- No login/auth, no backtest engine, no order execution in this phase — each of those would be its own build.
- Lovable Cloud (database) has a free monthly allowance that a once-a-day scan of ~25 tickers stays well inside.
- Data comes from your own API key, so no paid data add-on.

If you want an even cheaper first step, say so and I'll cut the swing watchlist from phase 1.

## What gets built

**1. Scan page (home)** — a "Run scan" button plus today's results:
- Scans a large universe, not 25 names. The universe is built automatically from the provider's list of active US common stocks, then narrowed by the same liquidity/price gates as your script (min $10 price, min $20M average dollar volume, 55+ bars of history). That typically leaves roughly 1,000–2,000 scoreable tickers.
- Ranked table of all qualifying tickers, sorted by score, paginated, with search and a Trade / No-trade flag against the 60-point threshold.
- Expandable row showing the factor breakdown (trend, momentum, volume, relative strength, volatility quality) with the same plain-English reasons your script prints, plus the invalidation line.
- Top-N picks (default 2) highlighted with the fixed dollar size per pick.


**2. History page** — every past scan kept in the database:
- Day-by-day top 10 with scores.
- Per-ticker score chart over time.

**3. Swing watchlist** — tickers in the top 10 for N consecutive days (default 5) that were never the single best pick, with the streak count and Approve / Dismiss buttons. Approved entries show a hold countdown (default 7 days).

**4. Trade log + P&L** — manually record entry/exit for picks you actually take; the app computes profit, applies the profit-keep split (default 50%), and tracks the reinvestable pool and T+1 settlement the way `ledger.json` does.

**5. Settings page** — edit the ticker universe, weights, thresholds, dollar size, top-N, profit-keep %, and streak days. No code edits needed to tune.

**6. Live trading (phase 2, not built now)** — a placeholder section explaining that broker execution requires a separate build with its own safety layer (daily loss circuit breaker, consecutive-losing-day halt, PDT handling).

## Technical notes

- Scoring is a direct TypeScript port of `score_security` and its five factor functions, including the exact point values, weights (25/25/20/15/15), RSI-14, SMA-20/50, ATR-14, RelVolume, ROC-5, and SPY as market proxy. Python/yfinance cannot run in this app's runtime, so the math is reimplemented rather than executed.
- Price history is fetched in a server function using your API key stored as a project secret; it never reaches the browser.
- Lovable Cloud tables: `scan_runs`, `scan_scores` (score + factor JSON per ticker per run), `watchlist_candidates`, `trades`, `ledger_entries`, `settings`. Public read policies plus grants; no user accounts in this phase, so the app is single-operator.
- Scans are on-demand via the button. A scheduled daily scan can be added later.
- No numbers in the UI are simulated: an empty database shows empty states until the first scan.

## First steps after approval

1. Confirm which data provider your key is for (Polygon, Alpaca, Finnhub, Tiingo, or other) — the fetch code differs per provider.
2. I request the key through the secure secret form.
3. Enable Lovable Cloud, create the tables, build the scoring engine and scan page, then history/watchlist/trade log.
