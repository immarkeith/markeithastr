# ASTR — self-hosting database setup

`astr-full-schema.sql` is every migration this app has ever run, merged in
order into one script. On a brand-new Postgres/Supabase project, paste it into
the SQL editor and run it once. It creates all tables, views, row-level
security policies and grants.

After running it:

1. Insert a hook secret (32+ random characters):
   `insert into public.hook_tokens (id, token) values (1, '<your-secret>')
    on conflict (id) do update set token = excluded.token;`
2. Set the app environment variables (Supabase URL + keys, Alpaca keys,
   SITE_PASSWORD, SESSION_SECRET, VAPID keys, MARKET_DATA_API_KEY).
3. Schedule the four market hooks (Mon–Fri, US Eastern) with the
   `x-hook-secret` header set to the token above:
   - 9:35 AM  -> POST /api/public/hooks/preopen
   - 3:50 PM  -> POST /api/public/hooks/preclose
   - 5:30 PM  -> POST /api/public/hooks/daily-cycle
   - every 15 min during market hours -> POST /api/public/hooks/health

Historic data (positions, ledger, trade log, research tests, settings) is
exported separately from the current database and imported after this script.
