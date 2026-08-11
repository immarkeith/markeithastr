# Dynamic Capital & Position Scaling

Make the desk size itself to the account: never fully stop while it can afford a $10 position, grow only after a proven cushion, and shrink one step at a time.

## The rules it will follow

**Required capital for a level**
`($20 x stocks per day) + $10 cushion`
1 stock -> $30, 2 -> $50, 3 -> $70, 4 -> $90. Your $50 already supports 2 stocks/day.


**Capital used for the decision**
Settled/available cash **plus** the Saved profit balance. Saved profit still never gets invested automatically — it only counts as cushion. You can release it into the stake pool manually if you ever want to.

**Scaling up**
- Requires the account to hold the *next* level's required capital for 5 consecutive trading days.
- A day only counts as stable if the cushion still holds **after** that day's trades close.
- Any day that fails resets the counter to 0.
- On the 5th stable day the stock count increases and a fresh 5-day period starts for the tier above.
- Position size stays $20 per stock; count grows first, size only grows back toward $20 if it had been reduced.

**Scaling down**
- Reduce the stock count first, keeping $20 each: 3 -> 2 -> 1.
- Only at 1 stock/day does the size step down: $20 -> $15 -> $10. Never below $10.

- A drop only triggers after the account stays under the threshold for 2 consecutive trading days, so one bad day doesn't shrink the desk.
- The most recently added allocation is always the one removed.
- If capital can't support even $10, it holds (no trades) but keeps scoring and waits, then re-enters as soon as $10 clears.

**Recovery** uses the same 5-day stability rule — a single profitable day never restores a higher level.

## What you'll see

A new **Capital ladder** panel on the Trades page:
- Current level (e.g. "2 stocks/day at $20")
- Current capital vs required capital
- Cushion remaining
- "3 of 5 stable days toward 2 stocks/day" progress bar
- Next level and what capital it needs
- A note when it's holding for settlement or below the $10 floor

Push notifications when the level changes up or down, and when a day fails the stability check.

## Technical notes

- New table `capital_ladder_state`: `stocks_per_day`, `position_dollars`, `stable_days`, `pending_target_stocks`, `breach_days`, `last_evaluated_date`, plus timestamps. Single row, service-role only, read through the existing gated data layer.
- New `src/lib/capital.server.ts` holds the pure ladder math (`requiredCapital`, `evaluateLadder`) plus the DB read/update, so it is unit-testable and independent of the broker.
- `availableCash()` in `src/lib/scan.server.ts` stays as-is (settled, excludes reserve). A new `scalingCapital()` adds the reserve total for ladder decisions only.
- `managePaperTrades` reads the ladder instead of `num_day_trades` / `dollars_per_day_trade` for automatic entries; those settings become the *starting/maximum* values rather than fixed ones.
- The ladder is evaluated once per cycle in `runDailyCycle`, **after** exits close, so the day's result is included before the stability day is counted.
- Trades page gains a `CapitalLadder` component fed by a new query in `src/lib/queries.ts` and a gated fetcher in `src/lib/data.functions.ts`.
- Level changes are recorded as notifications via `notify.server` with dedupe keys so the same change never double-pushes.

## Suggestions worth considering

- **Cap the ladder at 4 stocks/day** for now; beyond that a $25 stake spreads thin and each extra name adds broker rounding noise. Easy to raise later.
- **Add a manual override switch** on the Strategy page ("hold current level") so you can freeze scaling during a period you don't want it moving.
- **Log every level change** in a small history list so you can see whether scaling up actually helped, rather than guessing.
