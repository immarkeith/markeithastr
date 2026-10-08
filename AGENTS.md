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

## Running this repo in the Base44 sandbox

`docker compose -f docker-compose.base44.yml up -d --build` starts everything
(one service). Then:

- **Entry point**: host port 3000 → the Vite dev server on 8080 inside the
  container. The project's `@lovable.dev/vite-tanstack-config` pins the dev port
  to 8080, so the mapping lives in compose rather than in `vite.config.ts`.
- **Package manager is bun**, not npm (`bun.lock`, `bunfig.toml`). `npm install`
  cannot read `bun.lock`. Dependencies are installed from the lockfile by the
  compose startup command, into the bind-mounted `node_modules`.
- **No local database.** All data lives in the owner's hosted Supabase project
  (`SUPABASE_URL` in the committed `.env`). `migration/` and `drizzle/` are
  SQL to paste into the Supabase SQL editor, not something to run in compose.
- **`SUPABASE_SERVICE_ROLE_KEY` is required** for the app to be usable: every
  read goes through server functions using the service-role client
  (`src/integrations/supabase/client.server.ts` throws without it), so `/` and
  every other data page fail while `/unlock` still renders. It is a real user
  credential delivered through `/run/base44/app.env`.
- **No passcode by default.** `SITE_PASSWORD` unset ⇒ `gateConfigured()` is
  false and the app stays open (no lock screen). Set `SITE_PASSWORD` *and*
  `SESSION_SECRET` (32+ chars) together to enforce the lock screen.
- **Verify**: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/unlock`
  → 200, and `docker compose -f docker-compose.base44.yml ps` → healthy.
  `GET /api/public/hooks/health` is a POST-only, secret-guarded scheduled hook —
  not a health endpoint, do not use it for checks.
