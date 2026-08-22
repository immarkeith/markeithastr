# What happens after you press "Start bot" — 48-hour breakdown

## Starting state (verified now)

- Strategy: **off**. Automation: **off**. Nothing runs until you press Start.
- Open positions: **none** (MLR sold, recorded Aug 21 at $56.88, +$0.12).
- Cash ledger: **$50.54** settled, plus **$0.12** banked profit held aside (never invested).
- Stake setting: `$20` per name, `1` name/day. Morning pass 9:35 AM ET, sell pass 3:45 PM ET with 3:52 PM retry, 15-minute sell buffer.
- Scheduled jobs (all Mon–Fri only): 9:35 AM, 3:45 PM, 3:52 PM, plus a 4:30 PM housekeeping pass and read-only health checks.

## The moment you press Start (Sunday)

Three things happen instantly, then nothing else:

1. `auto_run` and `strategy_enabled` flip to **on**.
2. The capital ladder resets to **1 stock/day at $20**, with the stable-day and breach counters cleared to 0 and the manual level-hold released. This wipes the stale breach that caused the $15 buy.
3. The "BOT STOPPED" banner disappears from Home and Settings.

No scoring, no orders, no data pulls. Markets are closed, and every pass checks the market calendar first.

## Hour-by-hour, Sunday press → Tuesday morning

### Sunday (press day) — $0 traded

| Time (ET) | What runs | Result |
| --- | --- | --- |
| When you press | Start action | Switches on, ladder reset to 1 x $20 |
| Rest of Sunday | Nothing scheduled | Weekend — no cron passes at all |

Health checks may run read-only off-hours; they place no orders and won't notify unless something needs you.

### Monday

| Time (ET) | What runs | Result |
| --- | --- | --- |
| 9:30 | — | Market opens; bot deliberately waits |
| 9:35 | Morning pass | Refresh bars, reconcile with the broker (expects a flat book, $50.54 cash), rescore the whole ~84-name universe on live post-open prices, then place **one market buy of $20.00** on the highest-scoring name that passes the gates (score >= 60, price >= $10, >= $5M avg dollar volume) |
| 9:35 onward | — | Cash: **$30.54** settled, **$20.00** in the position, **$0.12** saved. Capital measured for ladder purposes = ~$50.66, above the $30.00 requirement, so no step-down |
| every 15 min, 9:00–4:00 | Health check | Read-only verification; repairs only bookkeeping, never places orders |
| 3:45 | Sell pass | Rescore on the day's updated data. If the held name is **still the top-ranked eligible stock**, it holds. Otherwise it sells the full position at market |
| 3:52 | Backup pass | Retries the sell if the 3:45 order didn't fill |
| 4:00 | Close | Sale is on Monday's trade date, so it settles under T+1 and is spendable Tuesday |
| 4:30 | Housekeeping | Records the day's result, evaluates the ladder once (1 of 5 stable days toward 2 x $20), banks profit |

If nothing scores above 60, no buy happens and cash stays $50.54 — that's normal, not a fault.

Expected Monday numbers: buy exactly **$20.00**; sell proceeds roughly **$19.50–$20.50** depending on the day's move. Any profit above the $20 stake is moved to saved profit and not reinvested; a loss shrinks the next stake only if capital stays more than $0.50 under $30.00 for two consecutive days.

### Tuesday

| Time (ET) | What runs | Result |
| --- | --- | --- |
| 9:35 | Morning pass | If Monday sold: Monday's proceeds are settled and usable, so it buys **$20** of the new top name. If Monday held: it keeps the position and does not add a second buy — the double-buy guard checks the broker before every order |
| 3:45 / 3:52 | Sell pass + retry | Rescore, sell unless still top-ranked |
| 4:30 | Housekeeping | Ladder counter moves to 2 of 5 stable days |

From here the cycle repeats every trading day, unchanged.

## What it will never do

- Trade on a weekend, market holiday, half-day closure, or outside 9:30–4:00 ET.
- Buy the same name twice in a day, or hold more than 1 position while the ladder is at 1 x $20.
- Spend the $0.12 (and any future) saved profit.
- Raise the stake above $20 or add a second daily name until capital has covered $50.00 for 5 straight trading days.
- Cut the stake to $15 for a rounding-sized miss — a step-down now needs a real shortfall of more than $0.50, two days running.

## Technical notes

- Start action: `startBot` server fn sets `app_settings.auto_run = true`, `strategy_enabled = true`, then calls `resetLadder()` (`stocks_per_day = 1`, `position_dollars = 20`, `stable_days = 0`, `breach_days = 0`, `hold_level = false`).
- Cron (UTC, EDT window): `astr-preopen-recheck` `35 13 * * 1-5`, `astr-preclose-exit` `45 19 * * 1-5`, `astr-preclose-retry` `52 19 * * 1-5`, `astr-daily-cycle` `30 21 * * 1-5`, health `*/15 13-20 * * 1-5`. Every handler re-checks `marketStatus()` and exits on non-trading days; the calendar is the real guard, not the cron expression.
- Ladder capital = settled cash + T+1 receivables + open-position market value + banked profit; `BREACH_TOLERANCE = 0.5`.
- No code changes are required for this — this plan documents the behavior already in place. Approve it and I'll leave the bot stopped and ready for your Sunday press.
