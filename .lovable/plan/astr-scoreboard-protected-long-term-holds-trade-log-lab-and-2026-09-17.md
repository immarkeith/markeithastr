# ASTR Scoreboard, Protected Long-Term Holds, Trade Log, Lab, and Home

## Decisions applied

- Keep all scoring, ranking, researcher formulas, live timing, and same-day strategy rules unchanged.
- Research remains always running. There will be no Research Lab Start/Stop button.
- This release adds long-term buying and tracking only; it will not add a long-term sell control.
- Research remains simulated and independent of live brokerage money.

## 1. Protected live position accounting

Add an explicit live position allocation layer so one broker position can safely contain two internal buckets:

- `SAME_DAY`: controlled only by the existing automated live strategy.
- `LONG_TERM`: created only by an intentional confirmed long-term purchase and protected from automation.

Store the actual filled quantity, fill price, broker order ID, and position type for every live purchase. Existing live automated rows will be treated as `SAME_DAY`; research rows remain paper-only and separate.

Update live order handling so:

- Automated exits sell the recorded `SAME_DAY` quantity with a quantity order, never the broker's entire ticker position.
- Same-day P/L uses only the same-day filled shares and cost basis.
- Long-term current value and unrealized P/L use the long-term allocated shares.
- Reconciliation compares the broker's aggregate ticker quantity with the sum of internal allocations without merging their ownership.
- Reconciliation never trims or adopts long-term shares into the daily strategy.
- If broker quantity is lower than the protected allocation, automation fails safely and reports the mismatch instead of risking long-term shares.
- Daily slot counts and investable-capital calculations ignore long-term positions while Total Assets continues using the complete broker account value.
- Existing same-day buy timing, scoring, ranking, stake, T+1 handling, and pre-close timing remain unchanged.

Database changes will use a migration with explicit service-role grants and RLS preserved. No research table or paper ledger will reference the live position allocations.

## 2. Shared Long-Term Buy confirmation

Create one shared confirmation window and one server-side live purchase function used by both Analyze and Scoreboard.

The flow will:

1. Show the selected ticker.
2. Ask “How much do you want to buy?”
3. Show the estimated fractional shares using the latest available price.
4. Require explicit confirmation or allow Cancel.
5. Re-check the live account, place a real market purchase, and record only the actual filled shares as `LONG_TERM`.
6. Show the broker error and create no holding record when the order does not fill.
7. Add later purchases of the same ticker as additional long-term allocations while Home presents one combined long-term holding.

Analyze otherwise remains unchanged. Scoreboard rows use the same shared flow.

## 3. Scoreboard-only page

Keep the existing researcher/formula dropdown and existing ranking source. Do not create a second scoring pipeline.

The page will contain only:

- Scoreboard title and existing selector.
- Selected scoreboard's Top 10.
- Rank, ticker, score, existing status/detail relevant to that scoreboard, and a `Buy Long Term` action per row.
- A clear empty state for scoreboards, such as the Skeptic, that do not produce independent rankings.

Remove the duplicate Top 3 cards, research-flow cards, Lead evidence, formula explanations, and other non-scoreboard sections. Lead decisions remain available in the Research Lab rather than cluttering this page.

## 4. Trade Log filters and adaptive rows

Replace the current range/mode/state controls with:

- `Today`
- `72 Hours`
- `Researcher` selector containing Lead Researcher and every existing backup/formula source

Behavior:

- **Today:** every buy and sell event today; live rows blue, paper rows green; show ticker, side, amount, and actor/formula; omit repeated dates.
- **72 Hours:** every buy and sell event in the previous 72 hours; same colors; include date/time and actor/formula.
- **Individual Researcher:** only that source's last three months; include ticker, side, amount, date/time, and existing trade details; omit the repeated researcher name and mode color.

A completed trade may produce a separate buy event and sell event so “all trades” truly includes both actions. Live and paper data remain separate in storage and are only combined for display.

## 5. Research Lab presentation

Do not add a research stop control. Scheduled Lead and backup research continues every eligible market day regardless of live-bot status or brokerage balance.

Reorder the page to show:

1. Research Lab title and always-running status.
2. Lead Researcher's current proposals/suggestions.
3. Current validated Best Formula / Master Formula, clearly separate from proposals.
4. Performance for all seven research roles: Lead first, today's two rotating backups next, then the four inactive backups.
5. Existing details, Value, Return, holdings, Up Next, and formula controls remain accessible below/in their existing disclosure controls.

Use existing Lead tests and backup-test history to build each researcher's paper-only performance series. The Lead graph will use Lead test records; backup graphs will use their own recorded tests. No live P/L enters these charts.

Research charts keep the existing colors and controls, with:

- Solid line: 3-day result.
- Dotted line: same-day result.
- Small line-style legend.
- P/L and win rate visible for each researcher.

No scoring, rotation, validation, Master Formula, or research scheduling behavior changes.

## 6. Home dashboard hierarchy

Update the shared header to a compact mobile-first ASTR header with:

- Prominent existing ASTR logo.
- Hamburger menu: Home, Analyze Strategy, Research Lab, Trade Log, Scoreboard, Alerts, Settings, Lock.
- Remove Strategy from primary navigation only; keep its existing URL/page working.
- Live Start/Stop control near the top; this continues to control only automated real-money trading.

Replace the large market-status card with a thin, clipped, continuously scrolling status ticker that reuses the existing market-calendar result. It will show open, closed, pre-market, or after-hours status and the existing next-open/close detail without changing scheduling logic. Motion will stop for reduced-motion preferences and will never create horizontal page scrolling.

Directly below it, show:

- Total Assets: complete live broker equity.
- Current Balance: all broker cash, including uncleared cash.
- Available Balance: spendable live cash.
- Total Profit: cumulative live strategy profit, explicitly excluding Research Lab results and kept separate from long-term unrealized P/L.

Keep the live P/L graph always visible. It remains live-only and will:

- Render a flat baseline when no trades exist.
- Use green for an upward series, red for downward, and blue for flat/no movement.
- Label X as Date/Time and Y as P/L ($).
- Continue including the current same-day position's unrealized move, while excluding paper research and long-term holding P/L from the strategy-profit line.

Immediately below the graph, add the always-visible `Long-Term Holds` section:

- Aggregate actual open `LONG_TERM` allocations by ticker.
- Show shares, original investment, current value, unrealized dollar and percentage P/L.
- Show a clear empty state when none exist.
- Include a compact dropdown of the existing five long-term suggestions.

Keep suggestions distinct from owned long-term holdings and remove duplicate/general “Currently owned” presentation where it would mix the two buckets.

## 7. Verification

- Apply the migration and regenerate database types.
- Test long-term buy success, rejected/unfilled orders, repeat purchase of the same ticker, and same ticker held in both buckets.
- Verify an automated same-day close submits only the recorded same-day quantity and leaves all long-term shares untouched.
- Verify reconciliation does not trim, adopt, or relabel protected long-term shares.
- Verify Home totals equal the broker's full account while live-strategy P/L and long-term P/L remain separate.
- Verify Trade Log Today, 72 Hours, and every researcher option with buy/sell event display.
- Verify research still runs with the live bot stopped and with a $0 live balance.
- Verify Scoreboard, Analyze, Lab, Trade Log, Home, menu, ticker, modal, tables, and charts at iPhone and desktop widths with no horizontal page scrolling.
