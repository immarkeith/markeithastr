-- ASTR fresh setup 9 of 9: automatic daily schedule
--
-- BEFORE RUNNING: replace BOTH placeholders below.
--   https://YOUR-APP.vercel.app  -> your live app address
--   PASTE_A_LONG_RANDOM_SECRET_HERE -> any 32+ random characters (keep it private)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

INSERT INTO public.hook_tokens (id, token)
VALUES (1, 'PASTE_A_LONG_RANDOM_SECRET_HERE')
ON CONFLICT (id) DO UPDATE SET token = EXCLUDED.token;

SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('astr-preopen-recheck','astr-preclose-exit','astr-daily-cycle',
                  'astr-health-market-hours','astr-health-offhours');

SELECT cron.schedule('astr-preopen-recheck', '35 13 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/preopen',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

SELECT cron.schedule('astr-preclose-exit', '50 19 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/preclose',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

SELECT cron.schedule('astr-daily-cycle', '30 21 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/daily-cycle',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);

SELECT cron.schedule('astr-health-market-hours', '*/15 13-20 * * 1-5', $job$
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
