-- ASTR Phase 1: autonomous audit & safe-repair infrastructure
-- Additive: two new tables + adjusted cron schedule. Never deletes existing
-- data. Run once in the Supabase SQL editor.
--
-- Replace https://YOUR-APP.vercel.app with your live app address.

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

-- 3. Adjust the health schedule from every 15 minutes to every 5 minutes
--    during market hours (13:00–20:59 UTC = 9 AM–4 PM EDT).
SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('astr-health-market-hours','astr-health-offhours');

SELECT cron.schedule('astr-health-market-hours', '*/5 13-20 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

SELECT cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

-- 4. Daily integrity audit — 22:00 UTC weekdays (6 PM EDT), after the daily
--    cycle closes. Runs the four-pillar Lead Self-Audit and stores the result.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'astr-integrity-daily';

SELECT cron.schedule('astr-integrity-daily', '0 22 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/integrity',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

-- 5. Weekly deep integrity audit — Saturday 12:00 UTC (8 AM EDT), a quiet
--    weekend window for a deeper reconstruction lookback.
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'astr-integrity-weekly';

SELECT cron.schedule('astr-integrity-weekly', '0 12 * * 6', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/integrity',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := jsonb_build_object('cadence','weekly')
  );
$job$);
