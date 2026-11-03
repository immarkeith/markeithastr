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

- `migration/fresh/16-autonomous-audit.sql` creates two additive tables
  (`audit_repair_log`, `audit_integrity_results`) and an **optional** schedule:
  health every 5 min during market hours (13:00–20:59 UTC weekdays) and hourly
  otherwise, daily integrity at 22:00 UTC, weekly deep audit Saturday 12:00 UTC.
  **Run it once** (replace the `YOUR-APP.example.com` placeholder first). The
  schedule half is portable-by-detection: it configures `pg_cron` jobs only when
  pg_cron is installed and otherwise raises a NOTICE telling you to point any
  external scheduler at the two hook URLs — no vendor extension is required, and
  the tables use only core PostgreSQL 13+. Until it is run, the health loop and
  integrity checks still work but repair logging and integrity-result storage
  are silently skipped (graceful degradation).
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

### Reconciliation applied 2026-11-01

Each candidate was re-priced against the provider's daily bar for its exit
session **and** checked against the entry session's own high/low. A booked entry
price that falls outside the range that session actually traded cannot be
repaired by swapping the exit mark alone — the P&L would be invented.

- **4 repaired** (entry price inside the entry session's range, so the round trip
  is real): MLR `56.88 → 55.23` (−0.58), ABNB `184.70 → 180.10` (−0.62),
  BBIO `84.67 → 83.84` (−0.25), LNN `116.84 → 117.27` (+0.07). `kept` was set
  with `profit` and `status_note` records the old and new mark.
- **5 left as-is, annotated "Needs review"** (entry price impossible for the
  session it was booked in, so no P&L can be derived): INSP (entry 41.43 while
  the 2026-09-16 range was 72.23–75.49), IGPT ×3 (entry 107.895 while the range
  was 92.75–95.11), DIS (entry 100.00 while the range was 103.70–105.25). Do not
  "fix" these by writing the authentic exit close: that would book a fake +75%
  INSP win. They need a decision about the entry price first.
- After any trade-data change, rebuild the stored Lab snapshot
  (`refreshLabGraphIntraday()`), otherwise `/research` keeps serving the old
  numbers.

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

## Phase K — Self-Development AI Engineer (`/engineer`)

Mobile mission control for ASTR's own code work: queue an instruction (text or
browser voice), watch it plan, inspect, patch and verify, then approve the exact
verified commit. Nothing reaches the target branch without that approval.

### One-time setup (required before the queue works)

1. Run `supabase/migrations/20261103010000_engineer_phase_k.sql` in your SQL
   console (the `migration/fresh/17-engineer-phase-k.sql` copy is byte-identical
   — keep them in sync). It is additive: six tables (`engineer_settings`,
   `engineer_checkpoints`, `engineer_change_log`, `engineer_tasks`,
   `engineer_logs`, `engineer_health_events`) plus `claim_next_engineer_task`,
   `heartbeat_engineer_task`, `sweep_stalled_engineer_tasks`. Until it is run the
   page shows a "schema is not installed" banner and the composer is disabled.
   Portable: PostgreSQL 13+ only, no extension, and the `anon` /
   `authenticated` / `service_role` grants apply only when those roles already
   exist — on plain PostgreSQL grant `EXECUTE` on the three RPCs to your own app
   role instead. Full deployment reference: `docs/phase-k-deployment.md`.
2. Set the app secrets `GITHUB_ENGINEER_TOKEN`, `GITHUB_ENGINEER_REPO`
   (`owner/repo`) and `ENGINEER_LLM_API_KEY`. Without GitHub access, tasks queue
   but cannot run and nothing can merge — the UI says so instead of pretending.
3. In `/engineer` → *Provider & deployment settings*, enter any OpenAI-compatible
   base URL and model (no provider is preselected). The API key itself is only
   ever the `ENGINEER_LLM_API_KEY` secret.
4. The GitHub repo needs four Actions secrets — `ENGINEER_LLM_API_KEY`,
   `GITHUB_ENGINEER_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — and
   the workflow `.github/workflows/astr-engineer.yml`. `GITHUB_ENGINEER_REPO`
   is app-side only (the workflow takes the repo from its checkout). Exact
   scopes and the provider-neutral endpoint/model fields are documented in
   `docs/phase-k-deployment.md`; no provider is preselected.

### How a task flows

- `createEngineerTask` classifies the instruction (level 1 minor → level 5
  critical) and records a locked plan + scope. Levels 4-5 stop at
  `scope_review` until the operator authorizes the scope.
- `scripts/engineer-runner.ts` (GitHub Actions) leases one task through the
  atomic RPC, refuses to run if live Alpaca keys are in its environment, reads
  the repo map + relevant files, asks the model for anchored search/replace
  hunks, applies them with a strict single-match assertion, runs the firewall,
  then lint/build with up to three diagnosis-driven repair attempts. It pushes
  `engineer/<slug>-<taskid8>` and never merges.
- Lint is baseline-aware: the repository already carries thousands of
  pre-existing Prettier errors, so only NEW lint errors fail a task (the count
  on the untouched tree is captured first and logged).
- `scripts/engineer-verify.ts` runs in a second, independent job that checks out
  the EXACT commit SHA, re-runs typecheck/lint/build and only then sets
  `verified_sha` + `review_ready`. Approve re-reads check-runs for that SHA and
  refuses if the branch tip moved.
- Approve merges that exact commit through the GitHub merges API, writes a
  checkpoint + change-log rows, and only then considers deployment.

### Deployment is gated, by design

Deployment is only ever a repository workflow dispatch (`deploy_workflow` in
`engineer_settings`, off by default). With no workflow configured the approval
merges and reports `unavailable`; nothing is ever displayed as deployed until a
run for that SHA is observed to succeed (`refreshDeploymentStatus`).

### Safety invariants enforced in code

- Firewall (`src/lib/engineer/firewall.ts`): path blocklist (`broker.server.ts`,
  `.github/**`, `src/lib/engineer/**`, `scripts/engineer-runner.ts`, `.env*`),
  live-trading/credential token scan, destructive-SQL scan (DROP/TRUNCATE/
  unqualified DELETE/UPDATE, dynamic EXECUTE), plus scope-lock diffing.
- Migrations are never executed by ASTR: the migration card is a separate
  approval and you paste the SQL yourself.
- Recovery (`/engineer/recovery`) writes file contents from a checkpoint back as
  a FORWARD commit. It refuses SQL, `supabase/`, `migration/`,
  `src/lib/broker.server.ts`, `.github/` and `src/lib/engineer/`, and never
  touches a database.
- `engineer_checkpoints → engineer_change_log` is `ON DELETE RESTRICT`, so audit
  history cannot be cascade-deleted.
- Health monitor (`src/lib/engineer/health.server.ts`) may only requeue a stalled
  lease; credential/deployment/data/security issues are escalated, never
  auto-repaired.

### Verifying without credentials

- `docker compose -f docker-compose.base44.yml exec -T web bunx tsc --noEmit`
- `docker compose -f docker-compose.base44.yml exec -T web bun run build`
- The engineer logic is testable headlessly (classification, firewall, anchored
  patching, scope lock) — see the checks in this file's history.
- The SQL is validated against throwaway `postgres:16` containers in both
  configurations: with `anon` / `authenticated` / `service_role` created first
  (grants applied, `service_role` gets `EXECUTE`, `anon` gets none), and on
  vanilla PostgreSQL with no such roles and no `pg_cron` (must run clean and
  skip scheduling with a NOTICE). Run both files twice — they are idempotent.
  Then exercise the lease with the smoke test in `docs/phase-k-deployment.md`.
