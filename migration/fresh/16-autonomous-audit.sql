-- ASTR Phase 1 — autonomous audit & safe-repair infrastructure
--
-- ADDITIVE ONLY: two new tables plus optional scheduling. Never deletes or
-- rewrites existing data.
--
-- Part 1 (tables) is plain SQL that runs on any PostgreSQL 13+ server.
-- Part 2 (scheduling) is OPTIONAL and portable-by-detection: it configures
-- pg_cron jobs only when pg_cron is actually installed, and otherwise skips
-- with a NOTICE telling you to point an external scheduler at the same
-- endpoints. pg_cron/pg_net are what Supabase happens to ship; nothing here
-- requires them.
--
-- Before running, replace YOUR-APP.example.com with your app's host. The same
-- host is used for the health and integrity hook URLs.

-- 1. Repair log — every allowlisted repair the autonomous health loop performs,
--    with before/after state and post-repair verification status.
CREATE TABLE IF NOT EXISTS public.audit_repair_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at timestamptz DEFAULT now() NOT NULL,
  repair_type text NOT NULL,
  target text,
  before_status jsonb DEFAULT '{}'::jsonb NOT NULL,
  after_status jsonb DEFAULT '{}'::jsonb NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  verification_note text,
  source text DEFAULT 'health_loop' NOT NULL
);

ALTER TABLE public.audit_repair_log ENABLE ROW LEVEL SECURITY;

-- 2. Integrity results — daily/weekly audit snapshots from the Lead Self-Audit
--    engine, stored so the Audit Desk can show a history without re-running.
CREATE TABLE IF NOT EXISTS public.audit_integrity_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at timestamptz DEFAULT now() NOT NULL,
  cadence text NOT NULL,                  -- 'daily' | 'weekly'
  overall_verdict text NOT NULL,           -- 'PASS' | 'WARNING' | 'FAIL'
  pillars jsonb NOT NULL,
  discrepancies jsonb DEFAULT '[]'::jsonb NOT NULL,
  summary text
);

ALTER TABLE public.audit_integrity_results ENABLE ROW LEVEL SECURITY;

-- 3. Optional schedule (portable). Health every 5 minutes during market hours
--    (13:00–20:59 UTC = 9 AM–4 PM EDT) and hourly otherwise; daily integrity
--    audit on weekdays at 22:00 UTC; weekly deep audit Saturday 12:00 UTC.
--    Each job calls an app hook with the shared secret from public.hook_tokens.
DO $do$
DECLARE
  v_app_url text := 'https://YOUR-APP.example.com';
  v_health_url text;
  v_integrity_url text;
BEGIN
  IF to_regclass('public.hook_tokens') IS NULL THEN
    RAISE NOTICE 'public.hook_tokens is missing (run 01-structure first) — skipping the schedule.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not installed — skipping the automatic schedule. Point any external scheduler at % (health) and % (integrity) with header x-hook-secret = the token in public.hook_tokens where id = 1.', v_app_url || '/api/public/hooks/health', v_app_url || '/api/public/hooks/integrity';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net is not installed — pg_cron can schedule the jobs but they will have no HTTP client to call the app. Install pg_net or use an external scheduler.';
  END IF;

  v_health_url := v_app_url || '/api/public/hooks/health';
  v_integrity_url := v_app_url || '/api/public/hooks/integrity';

  PERFORM cron.unschedule(j.jobid) FROM cron.job j
   WHERE j.jobname IN (
     'astr-health-market-hours',
     'astr-health-offhours',
     'astr-integrity-daily',
     'astr-integrity-weekly'
   );

  PERFORM cron.schedule('astr-health-market-hours', '*/5 13-20 * * 1-5', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
      body := '{}'::jsonb
    );
  $job$, v_health_url));

  PERFORM cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
      body := '{}'::jsonb
    );
  $job$, v_health_url));

  PERFORM cron.schedule('astr-integrity-daily', '0 22 * * 1-5', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
      body := '{}'::jsonb
    );
  $job$, v_integrity_url));

  PERFORM cron.schedule('astr-integrity-weekly', '0 12 * * 6', format($job$
    SELECT net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
      body := jsonb_build_object('cadence','weekly')
    );
  $job$, v_integrity_url));
END
$do$;
