## Base44 Dev Environment

- **Start**: `docker compose -f docker-compose.base44.yml up -d`
- **Preview**: port 3000, health path `/`
- **Runtime**: `oven/bun:1` — uses `bun install --frozen-lockfile` then `bun run dev -- --port 3000 --host 0.0.0.0`
- **Env vars**: `.env` (Supabase credentials, on disk but not in git) + `/run/base44/app.env` (platform secrets, e.g. `SUPABASE_SERVICE_ROLE_KEY`)
- **Required at boot**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` (all in `.env` or platform secrets)
- **Optional but needed for live trading**: `ALPACA_LIVE_KEY_ID`, `ALPACA_LIVE_SECRET_KEY`
- **Optional security**: `SITE_PASSWORD` (passcode gate), `SESSION_SECRET` (cookie encryption, ≥32 chars, required if `SITE_PASSWORD` is set)
- **Verification**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` → 200; check `docker compose -f docker-compose.base44.yml logs web` for errors
- **Functional regression**: `docker compose -f docker-compose.base44.yml exec -T web bun run test` uses offline fixtures and mocked providers, never real orders. `bun run typecheck` and `bun run build` also run in this service.
- **Audit semantics**: Paper historical rebuild rows have no funded ledger; exclude them from cash reconciliation. Match live reads on both `mode=live` and null `strategy_id`. Reserves are part of equity but not tradeable cash; broker cash already includes them.
- **Recovery boundary**: Historical progress markers are not verified checkpoints. See `docs/functional-audit.md` for unresolved concurrency, schedule, and recovery work. Never repair a balance by inventing an adjustment.
- **Provider blocker (2026-10-14)**: The current database project/key pairing returns `Invalid API key`. Presence checks alone do not verify an integration. Do not claim database audits pass until real reads succeed.
- **Build validation**: Build with `NITRO_PRESET` unset; the explicit Nitro Vercel preset must create `.vercel/output/config.json` and `__server.func/.vc-config.json`. This does not verify external Vercel dashboard settings.
- **Preview flag**: Compose forwards `BASE44_PREVIEW_MODE` bare. No hardcoded preview flag and no auth bypass. Shared accounting/build behavior is independent of it.
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
