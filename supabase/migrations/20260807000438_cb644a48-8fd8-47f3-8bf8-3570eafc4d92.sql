CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  ticker text,
  severity text not null default 'info',
  action text,
  meta jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  pushed_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications readable" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);

CREATE TABLE public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  label text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failures int not null default 0
);
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS exit_buffer_minutes int not null default 8,
  ADD COLUMN IF NOT EXISTS preopen_recheck_minutes int not null default 5,
  ADD COLUMN IF NOT EXISTS notify_push boolean not null default true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'astr-preopen-recheck',
  '35 13 * * 1-5',
  $$ SELECT net.http_post(
      url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preopen',
      headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
      body := '{}'::jsonb
    ) $$
);

SELECT cron.schedule(
  'astr-preclose-exit',
  '50 19 * * 1-5',
  $$ SELECT net.http_post(
      url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preclose',
      headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
      body := '{}'::jsonb
    ) $$
);