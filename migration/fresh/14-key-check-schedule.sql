-- ASTR Phase H: daily 8:00 AM Eastern Alpaca key test (every day, 365 days)
-- Replace https://YOUR-APP.vercel.app with your app address, then run once.
-- 12:00 UTC = 8:00 AM EDT (7:00 AM EST in winter).

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'astr-key-check';

SELECT cron.schedule('astr-key-check', '0 12 * * *', $job$
  SELECT net.http_post(
    url := 'https://YOUR-APP.vercel.app/api/public/hooks/key-check',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);
