# ASTR

Autonomous market research and trading system. Runs on standard infrastructure:
Bun + Vite (TanStack Start) for the app and plain PostgreSQL 13+ for the
database. No vendor development platform is required to build, run or deploy it
— everything lives in this repository and in standard SQL migrations.

## Run it

```sh
bun install
bun run dev          # http://localhost:3000
```

Runtime configuration is environment variables only (database URL and key,
optional broker/market-data keys, optional passcode gate). The full list, with
where each value comes from, is in
[`migration/fresh/README.md`](migration/fresh/README.md).

## Database

The schema is built from [`migration/fresh/`](migration/fresh/README.md) —
files `01` → `17`, run in order, once each, on any PostgreSQL 13+ server.
Every file except the `pg_cron` schedule helpers (`09`, `14`, `15`) runs
unchanged outside Supabase; the schedule helpers are optional and any external
scheduler can call the same hooks instead.

`drizzle/` holds the historical column migrations and is not used at runtime.

## Phase K — self-development engineer

`/engineer` queues a code change, drafts it on its own branch through GitHub
Actions, verifies the exact commit, and merges only after human approval.
Setup, secret scopes and the provider-neutral model configuration are in
[`docs/phase-k-deployment.md`](docs/phase-k-deployment.md).
