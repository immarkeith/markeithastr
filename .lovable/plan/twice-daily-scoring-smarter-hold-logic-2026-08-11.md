# Twice-Daily Scoring & Smarter Hold Logic

Two authoritative scores per trading day, and no more selling a winner just to buy it back the next morning.

## How the day will run

1. **9:32 ET — post-open score (new authority for buying).**
   Tops up market data, rescores the entire universe on live post-open data, re-ranks, then buys that day's allocation from the fresh ranking. Yesterday's winner gets no head start — if a different name is now #1 and eligible, that's what gets bought.
2. **~8 minutes before the close — pre-close score (existing schedule).**
   Rescores and decides the fate of each open position:
   - Still the highest-ranked eligible name → **hold it overnight**, no sell, no rebuy.
   - No longer top-ranked or no longer eligible → sell now, inside the existing T-minus buffer, so cash clears under T+1.

## Stale-data safety

The 9:32 score only buys when the data it scored on is genuinely fresh. If the feed hasn't posted the session yet, returns nothing, or the newest cached bar is older than expected, the pass records "stale data — no purchase" and exits without trading, using the existing error/notify path. It never buys off yesterday's numbers pretending they're today's.

## Capital interaction

A held-over position keeps its $20 occupied, so that allocation slot isn't available for a new buy that day. The capital ladder counts held positions as deployed capital, so it won't try to open more stocks than the settled cash supports.

## Configurable timing

Settings gains a **Post-open score delay** field (default 2 minutes after the open, so 9:32 ET) alongside the existing pre-close buffer. Changing it moves both the in-app guard and the scheduled job. The Alerts/notification copy will name the actual time used.

## Technical notes

- `app_settings`: rename the meaning of `preopen_recheck_minutes` to the post-open delay with default `2`; no schema change needed. Add `hold_qualifying_positions` (boolean, default true).
- `runPreOpenEntries` in `src/lib/scan.server.ts`: fix the minutes-since-open math (it currently derives it from `minutesToClose` against a fixed 390-minute session, which is wrong on half days) by using `nyParts` minus `OPEN_MINUTES`. Add a freshness assertion on `runScan().bars_as_of` before calling `managePaperTrades({ phase: "entry" })`.
- `runPreCloseExits`: before exiting, compare each open position against the fresh pre-close ranking; skip the exit when it is still within the top-ranked eligible set and `hold_qualifying_positions` is on. Push a "Holding X overnight — still ranked #1" notification instead of an exit alert.
- `managePaperTrades({ phase: "exit" })` gains a `keepQualifying` option so the hold decision lives in one place; the pre-close pass must still force-exit anything that fails eligibility, plus anything held when the strategy or live mode is switched off.
- Entry sizing already reads the capital ladder; adjust the open-slot count to subtract positions carried over from yesterday.
- `pg_cron`: reschedule the post-open job to 13:32 UTC (9:32 ET during DST) and keep the pre-close job as-is; both remain guarded in-handler by market-calendar checks so holidays and half days are respected.
- Settings UI: new numeric field for the post-open delay and a toggle for overnight holds, with a one-line explanation of the trade-off.
