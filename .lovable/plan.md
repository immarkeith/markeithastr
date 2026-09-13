# Research Lab — Same-Day vs 3-Day paper tracking

Paper research only. The live ASTR bot keeps its exact rules: buy in the morning, sell before the close, same-day, live money untouched.

## What changes for you

1. A research paper position is bought in the morning and **held for 3 trading days** instead of being sold that afternoon.
2. At the normal pre-close exit time on the buy day, the system records what the trade **would have** made if it had been sold then (dollars and percent) — and keeps holding.
3. On the third trading day (weekends and market holidays never count) the position is sold for real in the paper book, the 3-day profit is recorded, the stocks are re-scored, and the next pick is bought.
4. Every performance number in the Research Lab now shows two values side by side: **Same-Day** (the hypothetical) and **3-Day** (what the held position actually did) — P&L, portfolio value/cash, win rate, return %.
5. The profit graph stays one graph with two lines and a small legend: Same-Day in one colour, 3-Day in another.
6. Everything else in the Lab stays as it is: 1 Lead Researcher, 6 backup scientists, 2 rotating each market day, 3 tests a day, Master Formula, dead-end memory, verification reports. Nothing is removed or redesigned.
7. On the Scoreboard, the "Research flow" section is wired to the Lead Researcher's real recorded decisions — Master Formula version, which rules were added, which are still under observation, which were retired, and the Lead's own daily test verdict — instead of the thin balanced-strategy line it shows now.

## Timing examples

```text
Mon buy → Mon pre-close: record hypothetical same-day result, keep holding
        → Tue (day 2) hold → Wed (day 3) pre-close: sell, record 3-day result, rescore, rebuy

Fri buy → Fri pre-close: record hypothetical, keep holding
        → Mon (day 2) hold → Tue (day 3) pre-close: sell, record, rescore, rebuy
```

Buy day counts as trading day 1. Holidays and weekends are skipped using the existing trading calendar.

## Technical detail

**Migration** — add nullable columns to `trades` (used by paper rows only, live rows leave them null):
`same_day_price`, `same_day_profit`, `same_day_pct`, `same_day_at`, `hold_target_date`. Grants/RLS unchanged.

**`src/lib/race.server.ts`**
- `openSlotTrade`: set `hold_target_date` = 2 trading days after entry via existing `nextTradingDay` helper.
- Exit phase: for each open paper trade, if `same_day_profit` is null and today is the entry date, write the hypothetical same-day result from the current mark and **do not** sell. Sell only when `today >= hold_target_date` (or the slot is disabled/manually cleared), using the existing atomic `closeSlotTrade` so a sell can never book twice.
- `safetyCloseStalePaper`: no longer closes any overnight position — it closes positions **past** their hold target date, plus records a missing same-day stamp if a pre-close pass was skipped. Still idempotent.
- Entry phase unchanged, so the freed cash rescore/rebuy happens on the same pass that sold — respecting T+1 settlement as today.
- `raceStandings`: each entrant gains a `same_day` block (total P&L, win rate, return %, hypothetical portfolio value, per-day series keyed on entry date) alongside the existing realised 3-day numbers; unrealised marking stays as is for open 3-day positions.

**`src/components/PnlChart.tsx`** — accept an optional second series (`compareRows`, `compareLabel`), draw both paths in distinct token colours, add a two-item legend. Existing single-series callers keep working unchanged.

**`src/routes/lab.tsx`** — SlotCard metric boxes and the Lead/backup tiles render `SD` / `3D` value pairs; layout, ordering, and slot tools untouched.

**`src/components/ResearchDepartment.tsx`** — the daily test cards surface the already-recorded `same_day` and 3-day horizon numbers as a labelled pair (data already stored in `lead_tests` / `backup_tests`).

**Master Formula / Lead logic** — the Lead can read both horizons, but promotion still needs 3 confirmations and the Skeptic's review; no rule is added because a 3-day number looks better.

**`src/lib/scoreboard.functions.ts` + `src/routes/scoreboard.tsx`** — include `masterFormulaOverview()` (version history, active/observation/retired rules, latest `lead_tests` verdict) and render it in the Lead Researcher decision card; assistant cards stay as they are.

Live paths (`scan.server.ts`, `capital.server.ts`, `broker.server.ts`, live trade rows) are not touched.
