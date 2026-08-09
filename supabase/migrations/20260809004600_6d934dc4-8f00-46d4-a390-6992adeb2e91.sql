CREATE TABLE IF NOT EXISTS public.hook_tokens (
  id integer PRIMARY KEY DEFAULT 1,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.hook_tokens FROM anon, authenticated;
GRANT ALL ON public.hook_tokens TO service_role;
ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.hook_tokens (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Re-schedule every hook job so it sends the private token instead of the publishable key
SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('astr-daily-cycle','astr-health-market-hours','astr-health-offhours','astr-preopen-recheck','astr-preclose-exit');

SELECT cron.schedule('astr-daily-cycle', '30 21 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/daily-cycle',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-market-hours', '*/15 13-20 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-preopen-recheck', '35 13 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preopen',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-preclose-exit', '50 19 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preclose',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);