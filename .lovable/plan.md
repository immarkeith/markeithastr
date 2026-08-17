# Fix the doubled UMH position, rebuild the home tab

## What actually happened (confirmed against your live account)

Your broker account right now holds **2.4635 shares of UMH ($39.74 market value)** with only **$10.47 cash**, but the app's records show a single **$20** open UMH trade. The Aug 12 UMH trade was marked "sold" on Aug 14 and the cash was written back into the ledger — but the shares were never actually sold at the broker. Then the Aug 17 buy added another $20 of UMH on top, so you're doubled up in one name.

Cause: the sell path treats "broker returned nothing" as a successful sale. When the close-position request comes back empty (no order id, or the position lookup momentarily reads zero), the app still stamps the trade closed at a cached price and books the cash. Nothing ever re-checks that the shares actually left the account.

## Fix 1 — today's cleanup, then back to normal the day after tomorrow

- **Today, at the existing pre-close time (moved a few minutes earlier so a failed sell can be retried before the bell):** read the real UMH position and the real live price, then sell the excess so about **one $20 stake stays**. The exact dollar and share amount is computed at that moment from live data, not from the ~$19.9 estimate above.
- **Tomorrow morning:** no buy. The proceeds are still unsettled under T+1, so the morning pass records "waiting on settled cash" and takes no position.
- **Tomorrow's pre-close:** normal strategy resumes on the carried $20 UMH — sell it if another name now scores higher, hold it if it's still top of your formula.
- **Day after tomorrow:** the cash has settled and the regular twice-daily cycle runs fully, with no new deposit needed.

The books are corrected in the same pass: one open UMH trade at the real average entry ($16.2289), the phantom Aug 14 settle row reversed, and ledger cash reconciled to the broker's actual cash.

## Fix 2 — live truth instead of assumptions

- **Sells must be confirmed.** After a sell order, re-read the position. Still holding shares → retry once inside the remaining pre-close window. If it still hasn't sold, the trade stays **open** with a reason recorded — no push notification, just a note on the home page holding card.
- **Buys must be confirmed too.** A buy only becomes a trade row and a ledger entry after the broker reports a real fill with a real fill price.
- **Balance comes from the broker plus the T+1 rule.** Available-to-trade cash = live broker cash minus anything not yet settled; selling $20 today does not show as $20 spendable until it clears. The home page shows both live equity/cash and "available to trade today".
- **Never buy a name already held.** Checked against the live broker position, not just the app's rows.
- **Daily reconciliation.** The self-check compares broker positions and cash against the app's trades and ledger and reports drift once, without trading to "fix" it.

## Fix 3 — new home tab

The opening tab becomes the dashboard, in this order:

1. **Live account** — real broker equity and cash, plus available-to-trade after T+1, and saved profit.
2. **What you're holding now** — each position with entry, live price, dollar and percent P&L, and a status note: held because it still scores highest, couldn't sell and why, unsettled, or any other flag.
3. **Up next** — names that get bought at the next pass if they still pass the score test, with the stake each would take (and "waiting on settled cash" when that's the reason nothing buys).
4. **Suggestions (best 3)** — long-term / add-to-monitored candidates, only when there are any.
5. **Profit & loss graph** — one chart with **1D / 1W / 1M / 3M** toggles, built from stored trade and ledger history (no extra market-data cost).

Detail that lives elsewhere today (full ranked table, self-check log, capital ladder) stays on its own tabs so the home tab stays fast.

## Fix 4 — scoring and the "permanent hold" nudge

The scan is genuinely rescoring every session (677 names scored, fresh runs each trading day), so UMH sitting at the top is the math repeatedly picking it, not a stuck value. To make that visible, the holding card shows today's score and rank plus how many sessions it has held that rank, so you can see the number moving.

Added: when a name stays in the top ranks for enough consecutive sessions (default 10, adjustable in Settings), you get a one-time notification suggesting it as a **permanent hold** candidate, separate from the existing swing-setup alert.

## Technical notes

- `broker.server.ts`: add `sellQty` (partial sale) and `listPositions`/live quote reads; `sellPosition` returns a verified result including post-sale quantity.
- `closeTrade` in `scan.server.ts`: never marks closed unless the position is confirmed gone; retries once, then leaves the trade open with a `status_note` and no push.
- `trades`: add a nullable `status_note` column for hold/failed-sell/unsettled reasons surfaced on the home card.
- `managePaperTrades` entry loop: filter the plan by live `positionQty`; skip buys when settled cash is short (already the "sat out" path) — that covers tomorrow morning automatically.
- Pre-close hook timing: increase `exit_buffer_minutes` slightly so a retry fits before the bell; cron unchanged in shape.
- `health.server.ts`: reconciliation check (broker positions/cash vs `trades` + `ledger_entries`), reported once, never auto-traded.
- One-time correction pass for today: partial sell of the excess computed from live qty/price, reverse the phantom Aug 14 settle row, restate the open UMH trade at the real average entry.
- New server fn returning broker account + positions + available-to-trade (T+1 aware) for the dashboard; P&L series derived from `trades.exit_date/profit` and `ledger_entries`.
- `notify.server.ts` `generateInsights`: add a `permanent-hold` notification keyed by ticker so it fires once; new `permanent_hold_days` setting (default 10).
