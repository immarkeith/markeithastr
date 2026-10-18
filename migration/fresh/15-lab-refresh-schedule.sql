-- ASTR: five-minute background refresh for the Research Lab graph snapshot.
-- Replace https://YOUR-APP.vercel.app with your app address, then run once.
-- */5 during 13-20 UTC (9:00am-4:00pm ET) on trading days only, matching the
-- existing health jobs' window. The endpoint itself is secret-checked and
-- fail-safe (falls back to a full rebuild on validation failure).

SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = 'astr-lab-refresh';

SELECT cron.schedule('astr-lab-refresh', '*/5 13-20 * * 1-5', $job$
  SELECT net.http_post(
    url := 'https://astr-alpha.vercel.app/lab',
    headers := jsonb_build_object('ContentType','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$job$);
