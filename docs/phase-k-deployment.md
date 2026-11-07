# Phase K deployment (portable, no platform lock-in)

Everything Phase K needs lives in this repository and in standard PostgreSQL.
Nothing is required from a vendor-specific dev platform: no Lovable/Base44/Bolt
runtime, no proprietary build step, no secrets that exist only in a sandbox.
The app is a normal Bun + Vite (TanStack Start) application, the queue is a
normal PostgreSQL schema, and the code work runs in a normal GitHub Actions
workflow.

- Runner: `.github/workflows/astr-engineer.yml`
- Patch engine: `scripts/engineer-runner.ts` · verification: `scripts/engineer-verify.ts`
- App surfaces: `/engineer` (mission control) and `/engineer/recovery`
- Schema: `supabase/migrations/20261103010000_engineer_phase_k.sql`
  (identical fresh-rebuild copy: `migration/fresh/17-engineer-phase-k.sql`)
- Audit schema: `migration/fresh/16-autonomous-audit.sql`

## 1. Database migrations

Target: **PostgreSQL 13 or newer** (`gen_random_uuid()` is core from 13). No
extension is required for either file.

Run them in this order, once each, in your database's SQL console:

1. `migration/fresh/16-autonomous-audit.sql` — two additive tables
   (`audit_repair_log`, `audit_integrity_results`) plus an **optional** schedule.
2. `supabase/migrations/20261103010000_engineer_phase_k.sql` — six additive
   tables, the atomic lease RPCs and the privilege block.

Both files are idempotent (`CREATE TABLE IF NOT EXISTS`,
`CREATE OR REPLACE FUNCTION`) and additive: they never read, alter or delete
existing trading, research or market-data tables. Re-running them is safe.

If you already applied an earlier copy of the engineer migration, re-run it:
it now also revokes PostgreSQL's default `EXECUTE ... TO PUBLIC` on the three
lease RPCs, so an unauthenticated client holding only the publishable key can
no longer lease or requeue tasks through them.

Before running file 16, replace `YOUR-APP.example.com` with your app's host —
it is only used by the scheduling block.

### Portability guarantees in the SQL

| Concern | How it is handled |
| --- | --- |
| `gen_random_uuid()` | Core PostgreSQL 13+. No `pgcrypto` install needed. |
| RLS | `ENABLE ROW LEVEL SECURITY` with no policies = deny-all for every non-owner role on any PostgreSQL server. |
| `anon` / `authenticated` / `service_role` | Supabase role names. The privilege block at the end of the migration applies `REVOKE`/`GRANT` only for roles that already exist, so the file is a no-op instead of an error on plain PostgreSQL. |
| `pg_cron` / `pg_net` (Supabase scheduling) | Not required. File 16 detects them and configures the schedule only when present; otherwise it raises a `NOTICE` and tells you to use any external scheduler. Files `14` and `15` are plain `cron.schedule` helpers — run them only where `pg_cron` exists, or skip them and use an external scheduler (see below). |
| `SECURITY DEFINER` functions | Pin `search_path = public, pg_temp`, so a caller cannot hijack object resolution. |

### If you are not on Supabase

Grant the three RPCs to your own application role after running
`supabase/migrations/20261103010000_engineer_phase_k.sql`:

```sql
GRANT EXECUTE ON FUNCTION public.claim_next_engineer_task(text)         TO <app_role>;
GRANT EXECUTE ON FUNCTION public.heartbeat_engineer_task(uuid, text)    TO <app_role>;
GRANT EXECUTE ON FUNCTION public.sweep_stalled_engineer_tasks()         TO <app_role>;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO <app_role>;
```

The app connects with that role's credentials through `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` (any PostgreSQL-compatible REST or direct
connection works; the server code only uses ordinary SQL semantics).

### Scheduling without pg_cron

Call the same hooks from system cron, a container scheduler, or any uptime
service. Each request needs the shared secret from `public.hook_tokens`
(row `id = 1`):

```bash
# health loop — every 5 min in market hours, hourly otherwise
curl -fsS -X POST "https://<your-app>/api/public/hooks/health" \
  -H "Content-Type: application/json" \
  -H "x-hook-secret: <token from hook_tokens where id = 1>" -d '{}'

# daily + weekly integrity audit
curl -fsS -X POST "https://<your-app>/api/public/hooks/integrity" \
  -H "Content-Type: application/json" \
  -H "x-hook-secret: <token>" -d '{"cadence":"weekly"}'
```

## 2. GitHub Actions secrets

Repository → **Settings → Secrets and variables → Actions → New repository
secret**. These are the *exact* names the workflow reads; a different name is
simply not passed to the job.

| Secret | Required by | Scope / value |
| --- | --- | --- |
| `ENGINEER_LLM_API_KEY` | runner + verifier | Key for your OpenAI-compatible provider. Sent as `Authorization: Bearer`. Not a GitHub credential. |
| `GITHUB_ENGINEER_TOKEN` | *optional* | Not needed by the workflow any more: checkout, push and the verification check run use GitHub's built-in `GITHUB_TOKEN`. Add it only if your branch protection requires a different identity. The app-side copy of this PAT is still what merges, reads check runs and dispatches deployment; scope: **Contents: Read and write**, **Pull requests: Read and write**, **Checks: Read**, **Actions: Read**, **Metadata: Read** (always on), plus **Actions: Write** for deploy dispatch. |
| `SUPABASE_URL` | runner + verifier | Database REST endpoint, e.g. `https://<project-ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | runner + verifier | Server credential that may call the lease RPCs. Use a secret, never a publishable key. |

Three secrets are mandatory (`ENGINEER_LLM_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`). The first workflow step checks them and fails with
their names in the error if any is missing — without it the job dies inside
`actions/checkout` with an opaque `Input required and not supplied: token`.

Deliberately **not** present: `ALPACA_LIVE_KEY_ID` / `ALPACA_LIVE_SECRET_KEY`.
`scripts/engineer-runner.ts` and `engineer-verify.ts` abort if either appears in
their environment — the code worker never holds trading credentials.

Optional repository **variables** (not secrets, no credentials):

| Variable | Purpose |
| --- | --- |
| — none required | Everything else is read from `engineer_settings`. |

App-side secrets (Base44 / your host's secret store, **not** GitHub Actions):
`GITHUB_ENGINEER_TOKEN`, `GITHUB_ENGINEER_REPO` (`owner/repo`),
`ENGINEER_LLM_API_KEY`. `GITHUB_ENGINEER_REPO` is used only by the server when
it merges, reads check-runs, or dispatches a deploy — the workflow itself takes
the repository from the Actions checkout, so it does not need that secret.

The workflow is triggered by `workflow_dispatch` or a `repository_dispatch`
event of type `engineer-task-queued`.

## 3. LLM endpoint and model — configurable, no default

No provider is preselected and none is hardcoded. Configuration lives in the
`engineer_settings` singleton row (`id = 1`) and is edited in
**`/engineer` → Provider & deployment settings**:

| Column | Meaning | Default |
| --- | --- | --- |
| `llm_base_url` | Base URL of any **OpenAI-compatible** chat-completions API. The app calls `${llm_base_url}/chat/completions`. | `NULL` (unset) |
| `llm_model` | Model identifier passed in the request body, exactly as your provider names it. | `NULL` (unset) |
| `llm_price_per_million_tokens` | Your provider's rate, used only for cost estimates. | `0` |
| `llm_monthly_budget_usd` | Hard monthly spend ceiling; tasks pause at `budget_paused` when reached. | `5` |
| `target_branch` | Branch the human-approved merge lands on. | `main` |
| `deploy_workflow` | Workflow file to dispatch after merge. | `NULL` = deployment unavailable |
| `deployment_enabled` | Whether deployment dispatch is allowed at all. | `false` |

So the endpoint URL and model are per-deployment values, for example
`https://<host>/v1` + `<your-model-name>`. Until both are set, readiness reports
exactly which field is missing, and **Test connection** in the same panel
verifies reachability with the `ENGINEER_LLM_API_KEY` secret.

The API key is only ever read from the `ENGINEER_LLM_API_KEY` secret — it is
never stored in `engineer_settings`, never logged, and the firewall blocks any
generated patch that tries to reference it.

## 4. Verify before you trust it

Run inside the project (or any machine with Bun):

```bash
bunx tsc --noEmit
bun run build
```

Database smoke test (after the migrations, on any PostgreSQL 13+):

```sql
-- the lease is atomic and owner-scoped
INSERT INTO public.engineer_tasks (prompt) VALUES ('smoke test');
SELECT status, locked_by FROM public.claim_next_engineer_task('runner-1');
SELECT public.heartbeat_engineer_task(
  (SELECT id FROM public.engineer_tasks WHERE locked_by = 'runner-1'), 'runner-1');   -- true
SELECT public.heartbeat_engineer_task(
  (SELECT id FROM public.engineer_tasks WHERE locked_by = 'runner-1'), 'other');       -- false
DELETE FROM public.engineer_tasks WHERE prompt = 'smoke test';
```

Both migrations were validated against a throwaway `postgres:16` container in
two configurations: with `anon`/`authenticated`/`service_role` present (grants
applied, `service_role` holds `EXECUTE`, `anon` holds none) and on vanilla
PostgreSQL with no such roles and no `pg_cron` (clean run, scheduling skipped
with a `NOTICE`). Both files were also re-run a second time to confirm
idempotency.

## 5. Deployment stays gated

1. The runner pushes `engineer/<slug>-<taskid8>` and never merges.
2. `independent-verify` checks out the **exact commit SHA**, asserts
   `git rev-parse HEAD` equals it, re-runs typecheck/lint/build and records the
   result against that SHA. Lint is baseline-aware (errors counted at the task's
   base commit are allowed; only new ones fail) and ignores `prettier/prettier`
   style findings, which the repository already carries by the thousand. The
   verdict is published as the `engineer/independent-verify` check run **on that
   commit** — the check run the approval gate re-reads before merging.
3. Approving in `/engineer` re-reads check-runs for that SHA and refuses if the
   branch tip has moved — fail closed, never "close enough".
4. Only then does the app merge that commit and, if `deployment_enabled` and
   `deploy_workflow` are set, dispatch it. Status shows `deployed` only when a
   run for that SHA is observed to succeed.
