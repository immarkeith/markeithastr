# Fix the doubled UMH position, rebuild the home tab

## What actually happened (confirmed against your live account)

Your broker account right now holds **2.4635 shares of UMH ($39.74 market value)** with only **$10.47 cash**, but the app's records show a single **$20** open UMH trade. The Aug 12 UMH trade was marked "sold" on Aug 14 and the cash was written back into the ledger — but the shares were never actually sold at the broker. Then the Aug 17 buy added another $20 of UMH on top, so you're doubled up in one name.

Cause: the sell path treats "broker returned nothing" as a successful sale. When the close-position request comes back empty (no order id, or the position lookup momentarily reads zero), the app still stamps the trade closed at a cached price and books the cash. Nothing ever re-checks that the shares actually left the account.

## Fix 1 — today's cleanup (one-time)

At today's pre-close pass, sell only the excess: about **1.2295 shares (~$19.9)**, leaving roughly **$20 of UMH to roll into tomorrow** as the carried position. The app's books get corrected so one open $20 UMH trade remains at the real average entry price ($16.2289), the phantom Aug 14 settle entry is reversed, and the ledger cash matches the broker's actual cash.

## Fix 2 — so it can't happen again

- **Sells must be verified.** After a sell, re-read the position at the broker. Shares still there → the trade stays **open**, and you get one notification ("sell didn't go through") instead of a silent fake close. Only a confirmed zero position closes the trade and books the cash.
- **Never buy a name you already hold.** Before any buy, check the live broker position for that ticker as well as open trade rows. Already held → skip it and take the next-ranked eligible name.
- **Daily reconciliation.** The self-check compares broker positions and cash against the app's open trades and ledger. Any drift is reported once as something you need to look at (it will not try to silently "repair" it by trading).

## Fix 3 — new home tab

The opening tab becomes the dashboard, in this order:

1. **Live account** — real balance from the broker: equity, cash available, saved profit.
2. **What you're holding now** — each position with entry, live price, dollar and percent P&L, and why it's being held.
3. **Up next** — the names that get bought at the next pass if they still pass the score test, with the stake each would take.
4. **Suggestions (best 3)** — long-term / add-to-monitored candidates, only when there are any.
5. **Profit & loss graph** — one chart with **1D / 1W / 1M / 3M** toggles, built from the trade and ledger history already stored (no extra market-data cost).

Detail that lives elsewhere today (full ranked table, self-check log, capital ladder) stays on its own tabs so the home tab stays fast; the scan table moves to its own tab rather than being duplicated.

## Fix 4 — scoring and the "permanent hold" nudge

The scan is genuinely rescoring every session (677 names scored, fresh runs each trading day), so UMH sitting at the top is the math repeatedly picking it, not a stuck value. To make that visible, the holding card shows today's score and rank plus how many sessions it has held that rank, so you can see the number moving.

Added: when a name stays in the top ranks for enough consecutive sessions (default 10, adjustable in Settings), you get a one-time notification suggesting it as a **permanent hold** candidate, separate from the existing swing-setup alert.

## Technical notes

- `broker.server.ts`: add a `sellQty` helper (partial sale) and make `sellPosition` return a verified result including post-sale quantity; `closeTrade` in `scan.server.ts` throws/keeps-open unless the position is confirmed flat.
- `managePaperTrades` entry loop: filter the plan by live `positionQty` in addition to `stillOpen`.
- `health.server.ts`: new reconciliation check (broker positions/cash vs `trades` + `ledger_entries`), reported as an issue, never auto-traded.
- One-time correction script/server fn for today: partial sell of the excess, reverse the phantom Aug 14 settle row, restate the open UMH trade at the real average entry.
- New server fn returning broker account + positions with live quotes for the dashboard; P&L series derived from `trades.exit_date/profit` and `ledger_entries`.
- `notify.server.ts` `generateInsights`: add a `permanent-hold` notification keyed by ticker so it fires once; new `permanent_hold_days` setting (default 10).
