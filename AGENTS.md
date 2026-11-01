<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Base44 sandbox environment (`docker-compose.base44.yml`)

- Start it with `docker compose -f docker-compose.base44.yml up -d` (see
  `.base44/environment.json`). It runs the app from the cloned source with
  `vite dev` on host port 3000, so edits hot-reload. There is no local
  database — ASTR keeps everything in an external Supabase project.
- Supabase project: the committed `.env` points at `nzayozxwyasvcroshddy` (the
  older project the live Lovable site was built against). ASTR's current data
  (today's health checks, this week's trades) lives in
  `kkwgbjovbcbzsvbhcyhq`, which is the project the configured
  `SUPABASE_SERVICE_ROLE_KEY` belongs to — so `.env.base44-defaults` sets
  `SUPABASE_URL` to it. Setting `SUPABASE_URL` as a Base44 secret overrides
  that line (the secrets env file is loaded last).
- The compose command mirrors `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` into
  the `VITE_SUPABASE_*` names, so pasting one value configures both server and
  browser. The browser Supabase client is only used for
  `supabase.auth.getSession()`; every data read/write goes through server
  functions with the service-role key.
- The passcode gate is deliberately OFF in the sandbox (`SITE_PASSWORD`
  unset), so the preview opens straight onto the dashboard. Setting
  `SITE_PASSWORD` also requires `SESSION_SECRET` (32+ chars), otherwise the app
  fails closed on the lock screen.
- Market data, scans and live trading need `ALPACA_LIVE_KEY_ID` /
  `ALPACA_LIVE_SECRET_KEY`; without them the dashboard shows "Alpaca live keys
  are not configured" and no scan can run. Optional extras: `MARKET_DATA_API_KEY`
  (Polygon bars instead of Alpaca IEX) and `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` (phone push alerts).
- No migrations are needed for the sandbox: Supabase is remote and already
  populated. `migration/fresh/*.sql` is the manual rebuild path for a
  brand-new project, and `drizzle/` is unused at runtime
  (`LOVABLE_DB_MIGRATION_URL` is only for `drizzle-kit`).
- Quick checks: `curl -s -o /dev/null -w '%{http_code}' localhost:3000/unlock`
  (200 = SSR alive) and `docker compose -f docker-compose.base44.yml ps`
  (healthcheck renders `/unlock`). Then confirm the dashboard shows real
  figures (Total profit, Trade log rows) rather than an error state.

## Phase 1 — Autonomous monitoring & safe repair

- `migration/fresh/15-autonomous-audit.sql` creates two additive tables
  (`audit_repair_log`, `audit_integrity_results`) and adjusts the pg_cron
  health schedule from every 15 min to every 5 min during market hours, plus
  daily (weekday 22:00 UTC) and weekly (Saturday 12:00 UTC) integrity audit
  jobs. **This migration must be run once in the Supabase SQL editor** (replace
  the `YOUR-APP.vercel.app` placeholder with the live app URL). Until it is run,
  the health loop and integrity checks still work but repair logging and
  integrity-result storage are silently skipped (graceful degradation).
- `src/lib/repair-log.server.ts` — `logRepair()` records each allowlisted
  repair (backfill history, cache missing days, re-run scan, rescore empty
  scan, settle stale paper) to `audit_repair_log` with post-repair
  verification status. Never throws.
- `src/lib/integrity.server.ts` — `runIntegrityCheck()` wraps the existing
  `runLeadSelfAudit()` engine, stores results in `audit_integrity_results`, and
  alerts only on FAIL (warnings are logged but not pushed).
- `src/routes/api/public/hooks/integrity.ts` — the pg_cron hook endpoint for
  daily/weekly integrity audits.
- The Audit Desk (`/audit`, hidden from nav) now shows two additional sections:
  Autonomous Repair Log and Integrity Audit History.
- Safe-repair allowlist (confirmed): re-run missed scan, backfill missing
  `daily_bars`, settle stuck simulated paper position. No formula/weight/
  strategy change is ever automatic — those stay human-approved.

## Research exit marks — inventory (2026-11-01, read-only)

`bun scripts/inventory-research-marks.ts` classifies every closed `profit = 0`
trade against an authentic exact-session close. It never writes. Re-run inside
the container:

```
docker compose -f docker-compose.base44.yml exec -T web bun scripts/inventory-research-marks.ts --probe
```

What the Supabase project `kkwgbjovbcbzsvbhcyhq` actually contains (7,781
trades): **259** closed `$0` trades — **134** with `exit_price = entry_price`,
**125** with genuinely different prices that round to `$0.00`.

- **9 provably contaminated** (Aug–Sep 2026): the booked mark equals the entry
  price while the authentic exact-session close differs. All 9 are recoverable
  from an exact-session close (DIS, ABNB, BBIO, LTR, INSP, IGPT ×3, MLR).
- **125 same-session round trips** ("historical rebuild" rows): entry and exit
  on the same session, and the cached close *confirms* the price. Not a
  fabricated mark, but zero-information rows that still count as non-wins.
- **125 legitimate breakevens**: price moved, the $20–25 stake makes it < $0.01.

The "113 contaminated trades between Aug and Oct 2026" figure does **not** match
this project — only 9 candidates fall in that window and match the shape. It may
come from the older project `nzayozxwyasvcroshddy` (no service-role key is
committed for it, so it cannot be enumerated from the sandbox).

## Researcher equity curves (`src/lib/race.server.ts`, `src/lib/lab-graph.server.ts`)

- A curve point is a **level**: cumulative realized P/L through that date plus
  the marks of positions still held at that session's close. Never add the day's
  full mark onto a running total — that piles the same unrealized dollars up once
  per held session, which is the bug both the full rebuild and the intraday
  incremental path used to have.
- A position's exit session is realized only; its mark stops the session before,
  so the exit price is not counted twice.
- Closed trades are paged (`range`), not `limit(400)`: the row cap silently cut
  the curve off years in the past.
- Known gap: the `daily_bars` read inside `researcherEquityCurve` is a single
  unpaged query, and PostgREST returns at most 1,000 rows, so historical marks
  are effectively absent (`coverage_from`/`coverage_to` null, `has_gaps` true) and
  the chart shows realized steps. Fixing it needs a SQL-side aggregate over
  `daily_bars` (344k rows) rather than a client fetch.
- After changing curve math, the Lab serves a stored snapshot from `research_runs`
  (`refreshLabGraphIntraday()` / `rebuildLabGraph()`), so rebuild before checking
  the chart — `docker compose -f docker-compose.base44.yml exec -T web bun -e
  'import {refreshLabGraphIntraday} from "./src/lib/lab-graph.server"; console.log((await refreshLabGraphIntraday()).mode)'`.

## Research price integrity (ASTR standing rules)

- Operational bar coverage uses a date-bounded RPC with one transient retry; preserve the full-history RPC for historical consumers.
- Cache ingestion upserts returned bars rather than deleting a session, so a partial provider response cannot erase stored history.
- Secondary daily prices are research-only exact-session marks, never broker execution prices or scanner volume inputs; do not mix provider conventions in the shared cache.
- Missing research marks stay pending without P&L or settlement; code recovery never deletes historical data.
