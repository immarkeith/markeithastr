# Keep the testing running, and give every Research Lab strategy a Robinhood-style graph

## Part 1 — Why there is no test activity yet, and the fix

What I checked in your data just now:

```text
3 test slots        enabled, $20 each, seeded with $50 test cash
today's scoring     184 names scored, 48 eligible
paper trades        0
live trades         6
```

So the scoring engine is working fine — the test slots simply have never had a
pass run against them. Two reasons:

1. The paper race only runs *inside* the live scheduled passes, and each of
   those passes exits at the very first line when the bot switch is off
   ("auto_run is off"). Turn the bot off and the testing goes silent too.
2. The slots were set up after this morning's 9:35 pass, so even today's run
   couldn't have filled them.

Fix: give the testing its own life.

- The three scheduled passes (9:35 buy, 3:45 sell, 5:30 housekeeping) will run
  the paper race **before** the bot switch is checked, so testing and scoring
  keep going whether or not the live bot is armed and whether or not there is
  real cash in the account.
- The paper race gets its own market-calendar guard, so it still skips weekends
  and holidays.
- The live path stays exactly as it is: real orders remain behind the bot switch
  and behind live cash.
- After shipping, I'll run one test pass immediately so all three slots have a
  holding and the graphs have data, and report the tickers and prices back.

Cost: zero extra. The race re-ranks the bars the live scan already downloaded
and never calls an AI model.

## Part 2 — The profit graph, per strategy

Each strategy section on Research Lab gets its own graph in the Robinhood shape
you sent: big dollar figure on top with the change and percent underneath, a
dotted baseline through the chart, a thin line coloured by direction, and a row
of range pills underneath.

Range pills:

```text
LIVE · 1D · 1W · 2W · 3W · 1M
```

- **LIVE** — today so far, including the money currently riding on the open test
  position (not just closed trades). This is what makes the graph move on a day
  where nothing has been sold yet.
- **1D** — yesterday's session.
- **1W / 2W / 3W / 1M** — rolling windows, matching the 4-week test clock.

"This week" and "this month" are exactly what 1W and 1M show, so I'm using the
shorter labels rather than adding duplicate pills.

Each strategy section will read, top to bottom:

```text
Trend follower                          Rank #1   [Testing]
+$1.84  ▲ 0.92%  Today
  ~~~ graph ~~~
LIVE  1D  1W  2W  3W  1M
Now testing:  NVDA   +$0.42 (2.1%)   entry $118.40
Up next:      AMD    71.4 pts  ~$142.10
P&L $1.84 · Win rate 67% · Test cash $30.00
```

Cost of the LIVE line: one price snapshot per held test ticker (at most 3–4
symbols) on the free data feed, cached for a minute. No AI credits, and it only
fires while the market is open.

## Part 3 — Paper stays walled off from live

No change in the rules, just confirming what stays true and what I'll re-verify:

- Every simulated trade and cash row carries a `strategy_id`; live rows always
  have none. The Lab reads only tagged rows, the live book reads only untagged
  ones.
- Same dollars as live ($20 stake) and the same capital-ladder rules, but each
  slot keeps its own counters, its own cash and its own ladder step.
- No simulated trade can ever reach the broker — the race has no order path.

## Technical notes

- `scan.server.ts`: hoist the `runRacePass` calls out of the `auto_run` /
  `strategy_enabled` guards in the pre-open, pre-close and daily-cycle paths
  (add the market-calendar check to the race itself so it can't run on a
  closed day).
- `race.server.ts`: `raceStandings` returns per-entrant intraday series inputs —
  open-position mark-to-market plus a session-start baseline — and today's live
  price for held tickers from the existing free-feed snapshot helper in
  `market-data.server.ts`, batched in one request for all slots.
- `PnlChart.tsx`: replace `LAB_RANGES` with the Robinhood-style range set,
  add the change/percent header line, dotted baseline, and support an
  `unrealized` input so the LIVE and 1D windows include the open position.
- `lab.tsx`: reorder each slot card to name → graph → now testing → up next →
  stats, keeping the existing slot tools collapsed underneath.
