# Functional audit — 2026-10-14

## Scope and status

This is **not a production sign-off**. The repository fixes and offline tests
are implemented; external data verification and the full recovery system remain
blocked/pending. No remote database, scheduled job, Vercel dashboard setting,
real broker order, or push subscription was changed by this work.

### Implemented

- Both Home and Lab graph queries read again every 300,000 ms, including in the
  background. Polling calls reads only; it never invokes trading, replay, or
  recovery. Browsers may throttle timers in suspended tabs; this is not an
  unattended server scheduler.
- Today uses New York's date and only the daily open-position move. Overnight
  movement is shares × (current price − prior close), not a resized notional.
- 1W/1M/3M remain the existing rolling 7/31/92-day windows. YTD is calendar-based.
  Long ranges aggregate weeks, including the current incomplete week immediately.
  Graphs recognize realized profit by exit date plus current open-position profit
  (versus entry). They are **not** historical daily equity/total-return series;
  there are no persisted intraday equity snapshots to reconstruct those honestly.
- Dashboard history, Lab closed/same-day history, and audit ledger reads paginate
  rather than silently discarding everything after 400/1,000 records.
- Real Home/control data requires both `mode = live` and `strategy_id IS NULL`.
  Research histories require their own strategy and `mode = paper`.
- The capital identity uses integer cents:
  **signed deposits + withdrawals + explicit adjustments + realized P&L =
  all ledger cash (including pending and reserves) + open cost basis**.
  Cancellation is an internal transfer, not extra starting capital. Historical
  rebuild trades have no funded ledger and are excluded from cash reconciliation.
  Explicit adjustments are disclosed funding, not independently verified broker
  evidence. Tolerance is one cent; market unrealized P&L is not settled cash.
- Live sale settlement now returns the unretained profit as well as principal;
  retained profit is counted once in reserves. Funded paper uses the same
  cent-rounded calculation. Releasing paper reserves is an internal settlement,
  not a new investor deposit. Broker cash reconciliation includes reserves already
  present in broker cash, avoiding a second cash adjustment for saved profit.
- Audit errors/unavailable evidence cannot produce PASS. The stats pillar checks
  recorded P&L against independently reconstructed price/share arithmetic; raw-bar
  checks include exit prices. Missing lookahead boundaries produce warnings.
- Executed-live entry/exit alerts originate after trade/ledger persistence, with
  trade evidence and a deduplication key, including manual and long-term sales.
  Paper/research-only alerts are suppressed. Recommendations, actual health
  issues, and due live holding reviews retain their separate categories/preferences.
  Notification delivery failure never causes a filled order to be retried.
- History extension is bounded to eight tickers per run, asks back to 2016 (or the
  requested shorter window), and only accepts finite, consistent OHLCV bars.
  Provider entitlements/listing dates may limit available depth. Transient errors
  are retryable, not permanent "done" markers. Empty histories are reconsidered
  after 30 days. Cache updates use unique ticker/date upserts, not destructive
  delete-then-insert. Replay checks write errors before saving a progress marker
  and uses previous-session market context, not the outcome session's close.
- Deep department/stability evaluation requests up to 2,520 cached sessions and
  uses the existing bounded indicator lookback at each historical date. Routine
  live/Lab rankings retain the smaller window instead of recomputing a decade on
  every refresh. Historical alternatives and thresholds remain proposals; active
  researcher parameters and Master rule statuses are not auto-applied or retired.
- Nitro explicitly targets Vercel, and `vercel.json` specifies Bun's frozen
  install and repository build. No duplicate build plugins were added.
- Icons are now genuine 192×192 and 512×512 PNGs. The existing artwork was resized,
  not redesigned. The unsupported maskable declaration was removed; a proper
  safe-zone maskable design remains separate from this functional work.

## Verification

```sh
docker compose -f docker-compose.base44.yml up -d --build
docker compose -f docker-compose.base44.yml exec -T web bun run test
docker compose -f docker-compose.base44.yml exec -T web bun run typecheck
docker compose -f docker-compose.base44.yml exec -T web sh -ec 'env -u NITRO_PRESET bun run build'
```

Offline tests use fixtures/mocked providers, never credentials or real orders.
They cover withdrawals, losses, paper/live isolation, retained/unretained profits,
open positions, cancellation, reserve transfers, leaks/duplicate settlements,
each graph range, daily/partial-week accumulation, a real query observer driven
through three five-minute timer boundaries, non-mutating refreshes, pagination,
actual notification persistence/deduplication/preferences against a mock store,
and the actual live close path against a mock broker/store with repeat-close
rejection. Component-render tests verify fixture totals for all eight ranges.
Icon bytes/dimensions and repository deployment configuration have regression tests.
A GitHub workflow runs tests, type checks, and the Vercel build on push/PR; a
hosted workflow run has not been observed from this environment.

The local production build was exercised **without `NITRO_PRESET`**. It produced
Build Output API v3 in `.vercel/output/config.json` and a `__server.func` with
`runtime: bun1.x`. That proves the repository build target, not the settings or
success of an actual Vercel production deployment.

## Blockers and outstanding functional work

1. **Database access:** the current server credential/project pairing returns
   `Invalid API key`. Even with the app's URL normalization, all protected
   database reads fail. Provide matching project URL, service-role/secret API key,
   and publishable key through the secure Secrets input. No values belong in git
   or chat. Until corrected, actual database schema/counts, graph data/range
   interactions, live book reconciliation, and deployed jobs are not verified.
2. **Providers:** market history fetches, real execution, and phone push delivery
   were not triggered. Real broker orders must not be used as audit fixtures.
   Verify history and push with the user's configured providers/test devices.
3. **Production settings:** the actual Vercel dashboard/project was not available.
   Review its root directory, Production env values, Bun runtime, domain, build
   command, overrides (especially `NITRO_PRESET`), and latest deployment logs.
   Repository config cannot establish that external settings are correct.
4. **Schedules:** the repository contains `pg_cron` schedules in multiple migration
   systems. Fresh setup has placeholder URLs/secrets and hardcoded UTC trading
   times that do not cover both DST seasons. The deployed `cron.job` inventory
   could not be read. Do not execute those files against a remote database or
   blindly add a second refresh/trading job. Propose exact changes after reading
   the actual job inventory and approved deployment domain.
5. **Atomicity/concurrency:** graph polling itself does not write transactions.
   That does not prove every existing trading/replay endpoint is concurrency-safe.
   Trade updates and ledger writes are separate requests, historical replay uses
   check-before-insert, and replay version migration deletes old rebuild rows.
   Transactional claims, unique replay identities, and recovery of interrupted
   writes need an approved database migration and integration tests. Existing
   mutating public GET history endpoints also need an authorization/flow review.
6. **Recovery:** the referenced recovery design is not available in the repository
   or conversation. This work improves self-audit and progress-marker error
   handling only; it does **not** implement verified recovery checkpoints,
   targeted repair orchestration, rollback, data reconstruction, or verified
   restoration. Confirm the repair/restore authorization and trusted evidence
   before implementing a system that can rewrite accounting or research data.
   A progress marker is not a verified checkpoint; a broker order cannot be
   rolled back by restoring database rows.

## Sandbox flag

Compose passes `BASE44_PREVIEW_MODE` through from the platform, never hardcodes
it. The managed Vite host extension remains a passed-through environment value.
The sandbox uses the bind-mounted checkout and a live Vite server on port 3000;
production artifacts are built only for validation, never served in the preview.
If the flag is unset/non-1, application accounting and build behavior are unchanged.
Managed secret values win over the legacy ignored `.env` because
`/run/base44/app.env` is the last env file. No secret keys appear under Compose
`environment:`. Replace the legacy local file via secure managed values before
considering it a team-ready configuration.
