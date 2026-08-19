# Why nothing was sold today, and the fix

## What actually happened today (Wed Aug 19, confirmed against your live account)

- The pre-close pass **did run** — at 3:45 PM ET, plus the backup pass at 3:52 PM ET. Both completed successfully.
- But it **did not attempt to sell anything**, because the app's book showed no open position. The UMH stake was already sold yesterday (Aug 18, 3:45 PM ET, $15.45, -$0.99).
- Meanwhile your broker account **does** hold a position: **MLR, 0.2656 shares, $14.94 market value**, bought at **9:15 AM ET today for $15** at $56.44. Cash is $35.55, equity $50.49.
- That 9:15 buy was never written to the app's trades or ledger. The 9:32 pass then only "matched the cash ledger to the live balance (35.55)" — it treated the missing $15 as a cash discrepancy rather than as a position.

So MLR is currently sitting overnight, unmanaged and unrecorded. This is the same failure shape as the Aug 17 doubled UMH: a 9:15 ET order that exists at the broker but not in the app.

Two independent defects, both confirmed in the code:

1. **Exits are book-driven only.** The pre-close pass reads open positions from the app's `trades` table. A share the app doesn't know about is never even considered for sale.
2. **Reconciliation ignores unknown names.** The broker reconciliation only trims positions that already have a matching trade row; anything with no row is skipped outright, so it can't catch this either.

The source of the 9:15 order is still unconfirmed. It is not one of the scheduled jobs — the only job at 13:15 UTC is the read-only self-check, which recorded no repairs, and the buying job runs at 13:32. Confirming the origin is the plan's first step.

## Fix 1 — adopt broker truth for exits

The pre-close pass stops trusting the app's book as the list of what's held:

- Read live broker positions first. Any position with no matching trade row gets **adopted**: a trade row is created retroactively from the broker's own average entry price, fill quantity, and a `status_note` saying it was reconstructed from the broker.
- Once adopted, it goes through the normal pre-close decision — sold if it no longer ranks, held if it still tops the score.
- Nothing at the broker can be silently ignored again, whichever way the order got there.

## Fix 2 — find and shut down the 9:15 order path

Add order-origin tracing so this is provably closed, not guessed at:

- Every buy records the broker order id (already stored) plus which code path requested it.
- A startup/self-check comparison lists broker orders for the day that have no matching app record, and reports them as an issue instead of absorbing them into a cash adjustment.
- The 9:32 cash-alignment step stops writing an `adjust` entry when the gap is explained by an un-adopted position — it adopts the position instead.

## Fix 3 — tomorrow's handling of MLR

- Tomorrow (Thu Aug 20) at the 9:32 pass, MLR is adopted into the book at its real $56.44 entry, and **no new buy** is placed while a position is already carried.
- Tomorrow's pre-close (3:45 PM ET, backup 3:52 PM) rescores and either sells MLR or holds it — with the sell confirmed at the broker and retried once if the first order doesn't fill.
- If the sell happens, proceeds clear under T+1 and Friday morning sits out, as designed.

## Technical notes

- `reconcileBroker` in `src/lib/scan.server.ts`: replace the `if (mine.length === 0) continue;` skip with an adoption path that inserts a `trades` row (mode `live`, status `open`, `dollars` = market value, `entry_price` = `avg_entry_price`, `entry_at` = broker order fill time when available) plus a matching `deploy` ledger entry, then falls through to the existing trim logic.
- Cash alignment (step 2 of `reconcileBroker`): compute the expected ledger cash *after* adoption so the adopted stake is no longer double-counted as an unexplained gap; keep the `adjust` write only for a genuine residual.
- `managePaperTrades({ phase: "exit" })`: after loading `trades`, cross-check `listPositions("live")` and log/adopt any live position missing from `openTrades` before the exit loop runs.
- `runPreCloseExits`: call reconciliation (already does) and assert that every live broker position has a trade row before deciding exits; report any that could not be adopted as a health issue.
- `health.server.ts`: new check comparing today's broker orders (`/v2/orders?status=all&after=<today>`) against `trades` + `ledger_entries`, reported as an issue (no auto-trade), which is what will name the 9:15 order's source the next time it fires.
- No schema change needed; `status_note` already exists for the "reconstructed from broker" annotation.
