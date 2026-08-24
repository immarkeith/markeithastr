# Final check + slim the app down to 9 tabs, add a real paper-trading lab

## Part 1 — The "is everything good to go" check

Confirmed live right now: bot is ON (`auto_run` and `strategy_enabled` both true), live mode (not simulation), 1 stock per day at $20.00, exit buffer 15 minutes, min score 60, active strategy "Balanced rotation (default)", ladder reset clean (1 stock x $20, 0 stable days, 0 breach days). All six scheduled jobs are active:

```text
9:35 AM ET   morning score + buy      (astr-preopen-recheck)
3:45 PM ET   rescore + sell/hold      (astr-preclose-exit)
3:52 PM ET   backup sell pass         (astr-preclose-retry)
5:30 PM ET   housekeeping / ladder    (astr-daily-cycle)
every 15 min self-check, market hours (astr-health-market-hours)
hourly       self-check, off hours    (astr-health-offhours)
```

Money on the books: $50.54 spendable, $0.12 saved profit. So Monday's buy is exactly $20.00 of the single highest-scoring eligible ticker.

Before shipping the UI changes, I'll run one end-to-end dry pass to confirm: the price-history feed answers (free IEX feed, no 403), a scan scores a non-zero universe, the broker returns live account equity and positions, the self-check reports clean with no stuck trades, and the ladder math sees cash + open position value (the bug that caused the $15 buy). Anything that fails gets fixed in this same pass, and I'll report the numbers back to you.

Real-time dollars: Home already pulls live account equity and position values straight from the broker on each load. I'll make Home, Trade Log and the Lab auto-refresh every 30 seconds while the market is open so you don't have to pull to refresh.

Self-healing stays always on (the two health jobs above), keeps its loop guard so it won't repeat the same repair over and over, and only notifies you when something needs *your* action.

## Part 2 — Tabs (13 down to 9)

New order, exactly as you asked:

```text
Home · Research Lab · Analyze · Trade Log · Research Log · Watchlist · Strategy · Alerts · Settings
```

Removed: Scan, Scans (history), Lab, Research, Trades. Their useful parts move where you asked (below); nothing else is lost.

### Scan tab — removed, results move to Home
The three buttons meant: **Load market data** = download the day's prices, **Run scan** = score using prices already downloaded, **Run today's cycle** = download + score + actually buy/sell. You don't need any of them — the scheduled jobs do all three on time every day. So the candidate list plus one **Rescore** button (which does download-then-score, no trading) moves onto the bottom of Home. That kills the tab without losing the score table.

### Trades tab — removed
"Capital ladder", "Open a trade" and "Adjust cash" move to **Strategy**. The Research Lab gets its own "Open a paper trade" and "Adjust paper cash" for the test accounts. Everything else on that tab was duplicated on Home.

## Part 3 — Research Lab: 3 paper strategies racing your live one

The Lab becomes what you described. Every scheduled pass already scores the market once; the Lab reuses that exact same score data, so this adds **zero extra market-data cost and zero AI cost**. Paper orders go to your Alpaca paper account, which is free.

- 3 test slots, each running one saved strategy (you pick which, defaults: Trend follower, Momentum burst, Careful / low volatility). Your live Balanced rotation is the 4th line for comparison.
- Each slot has its own independent $20 stake and its own ladder — profit + cushion adds a second stock exactly like live. Same dollars, so you can compare without doing math.
- Each slot is fully walled off from live: its own trades, its own cash ledger, its own positions. Live money and paper money can never mix (separate account credentials, separate rows, separate ladders).
- Each section shows: strategy name, current stock, profit graph (daily / 1w / 2w / 3w / 4w), and its "Up next" pick.

### Monthly winner
Nothing changes live automatically. After a full 4 weeks, if a paper strategy outranks the live one, you get a suggestion alert plus a "Switch to this" button on Strategy. If it stays #1, the suggestion repeats weekly until you act or it loses the lead.

## Part 4 — Research Log (paper trade log)

Same layout as Trade Log but simplified and grouped by strategy: strategy name, total P&L, win rate, and rank (1 = best), then the list of that strategy's paper buys/sells with prices, dates and times.

## Technical notes

- Tag paper activity by strategy: add `strategy_id` to `trades` and `ledger_entries` (null = live), plus a `paper_slots` table holding each slot's strategy, its own ladder counters and enabled flag. Grants + RLS matching the existing gated pattern (service-role only, read through the passcode-gated server layer).
- `scan.server.ts`: the existing pass gains a paper loop that re-ranks the same cached scan rows under each slot's strategy weights and calls the existing entry/exit logic with `mode: "paper"` and that slot's `strategy_id` and ladder. Live path untouched.
- Broker calls for paper slots use the existing `ALPACA_PAPER_*` credentials; live uses `ALPACA_LIVE_*`. Bounded work per run (max 3 slots), and paper failures never abort the live pass.
- Ranking + monthly suggestion computed in a new `strategy-race.server.ts`, surfaced by the 5:30 PM housekeeping pass; notification deduped weekly.
- Delete routes `scan.tsx`, `history.tsx`, `trades.tsx`, `research.tsx`; rebuild `lab.tsx` as Research Lab and add `paper-log.tsx`. Old `/scan`, `/trades`, `/history`, `/research` paths redirect to their new homes so bookmarks don't 404.
