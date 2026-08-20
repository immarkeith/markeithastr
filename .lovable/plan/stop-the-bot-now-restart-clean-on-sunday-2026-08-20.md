# Stop the bot now, restart clean on Sunday

## First, what actually caused the $15 buy

It wasn't the trade logic. On Aug 18 the app measured available capital as **$29.97** — three cents under the **$30.00** it requires for a $20 stake ($20 stake + $10 untouched cushion) — so the position-size ladder stepped down one rung to **1 stock/day at $15**. That's the recorded ladder event. The next buy (MLR) was therefore $15 by design.

Why capital read low: capital is counted as *settled cash + banked profit only*. Money still settling under T+1, and the value sitting inside an open position, count as zero. On Aug 19 that got worse — the $15 MLR buy the app didn't record left the cash ledger reconciled down to $35.55 with no matching position entry, so the same dollars were effectively invisible twice. So your read is right: the shortfall was a bookkeeping artifact, not a real shortage.

## Step 1 — Stop it today

- Turn the strategy **off** and automation **off** in settings. Every scheduled pass then exits immediately with "automation is off" — no scoring, no buying, no selling, no reconciliation writes.
- The scheduled jobs stay in place (deactivating them would leave you unable to restart on your own), but they become no-ops while the switches are off.
- Home and Settings get an unmistakable **BOT STOPPED** banner with a single **Start bot** button, so Sunday is one tap rather than hunting toggles.
- You sell MLR manually today; nothing in the app will fight you for it. When you restart, the app reads the broker as truth and will see a flat book.

## Step 2 — Fix the capital accounting before the restart

- Capital for ladder decisions becomes **settled cash + cash settling under T+1 + market value of open positions + banked profit** — i.e. what the account is actually worth, not just the idle slice. A normal day holding a $20 position will no longer look like a $20 shortfall.
- A step-down also requires a *real* shortfall, not a rounding miss: the breach only counts when capital is under the requirement by more than $0.50.
- When you press **Start bot**, the ladder resets to **1 stock/day at $20** with breach/stable counters cleared, so Monday buys $20.
- Position adoption (a broker holding with no app record) now writes a proper `deploy` ledger entry instead of only a cash adjustment, so cash and positions can never be double-counted again.

## Step 3 — The schedule you'll get from Monday

All times New York, all guarded by the market calendar — nothing runs on weekends, holidays, half-day closures, or outside the regular session.

| Time | What happens |
| --- | --- |
| 9:35 AM | Refresh data, rescore the whole universe on live post-open prices, buy $20 of the highest-scoring eligible name |
| 3:45 PM | Rescore on updated data; sell unless the held name is still the top-ranked eligible stock |
| 3:52 PM | Backup pass — retries any sell that didn't fill |

Morning timing moves from 9:32 to **9:35**. Two minutes after the bell you're still inside opening-auction noise, where the first prints often reverse; five minutes is the more realistic read of how the market absorbed overnight news, and it's still early enough that the day's move is ahead of you.

Close timing stays at 3:45 with the 3:52 retry and a 15-minute sell window — the sell completes on the trade date, so proceeds clear under T+1 and are usable the next session.

## Step 4 — Your Sunday/Monday sequence

- **Today (Thu):** you sell manually; bot stopped.
- **Fri:** your sale settles on the exchange side; bot stays stopped, does nothing.
- **Sun:** you press **Start bot**. Nothing happens Sunday — markets are closed.
- **Mon 9:35 AM:** first automated score and $20 buy; 3:45 PM rescore and sell/hold. Normal cycle from there.

## Technical notes

- `app_settings`: `strategy_enabled = false`, `auto_run = false` now; `preopen_recheck_minutes = 5`. `exit_buffer_minutes` stays 15.
- `pg_cron`: reschedule `astr-preopen-recheck` from `32 13 * * 1-5` to `35 13 * * 1-5`; `astr-preclose-exit` (19:45 UTC) and `astr-preclose-retry` (19:52 UTC) unchanged. Both DST-correct for the Aug–Oct window; the in-handler calendar check is the real guard.
- `src/lib/capital.server.ts`: widen the `capital` input to include unsettled receivables and open-position market value; add a `BREACH_TOLERANCE = 0.5` to `evaluateLadder` so `capital < required - tolerance` is required for a breach.
- Caller of `evaluateLadder` (capital ladder evaluation in `src/lib/scan.server.ts`) supplies the richer capital figure from ledger + `listPositions("live")`.
- `reconcileBroker` adoption path: write the matching `deploy` ledger entry with the adopted stake, and compute the cash-alignment residual after that entry so it stops absorbing positions as cash adjustments.
- Add a `resetLadder()` used by the Start-bot action: set `stocks_per_day = 1`, `position_dollars = 20`, `stable_days = 0`, `breach_days = 0`, `hold_level = false`.
- UI: stopped-state banner + `Start bot` action on `src/routes/index.tsx` and `src/routes/settings.tsx`, wired through a server function that flips both switches and resets the ladder.
- Health/self-check passes keep running while stopped but stay read-only — no trades, no repairs that place orders.
