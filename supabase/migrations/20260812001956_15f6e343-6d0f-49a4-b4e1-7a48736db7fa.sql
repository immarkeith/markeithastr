SELECT cron.unschedule('astr-health-market-hours')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-market-hours');

SELECT cron.unschedule('astr-health-offhours')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-offhours');

SELECT cron.schedule('astr-health-market-hours', '*/15 13-20 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc-dev.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc-dev.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);