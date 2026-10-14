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
