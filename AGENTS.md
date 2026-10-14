## Base44 Dev Environment

- **Start**: `docker compose -f docker-compose.base44.yml up -d`
- **Preview**: port 3000, health path `/`
- **Runtime**: `oven/bun:1` — uses `bun install --frozen-lockfile` then `bun run dev -- --port 3000 --host 0.0.0.0`
- **Env vars**: `.env` (Supabase credentials, on disk but not in git) + `/run/base44/app.env` (platform secrets, e.g. `SUPABASE_SERVICE_ROLE_KEY`)
- **Required at boot**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` (all in `.env` or platform secrets)
- **Optional but needed for live trading**: `ALPACA_LIVE_KEY_ID`, `ALPACA_LIVE_SECRET_KEY`
- **Optional security**: `SITE_PASSWORD` (passcode gate), `SESSION_SECRET` (cookie encryption, ≥32 chars, required if `SITE_PASSWORD` is set)
- **Verification**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200; check `docker compose -f docker-compose.base44.yml logs web` for errors
- **SPA navigation**: The preview browser may fail SPA client-side navigation (TanStack Router hydration); SSR works — verify routes via `curl` if preview navigation fails
- **Supabase migrations**: Run via Supabase dashboard or `psql` — the repo has three parallel migration systems (Supabase migrations, Drizzle, manual SQL in `migration/fresh/`)

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
