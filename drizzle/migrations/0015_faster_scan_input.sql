CREATE OR REPLACE FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer)
 RETURNS TABLE(ticker text, bars jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH RECURSIVE dates(bar_date, n) AS (
    (SELECT max(bar_date), 1 FROM public.daily_bars)
    UNION ALL
    SELECT (SELECT max(d.bar_date) FROM public.daily_bars d WHERE d.bar_date < dates.bar_date), dates.n + 1
    FROM dates WHERE dates.n < p_days AND dates.bar_date IS NOT NULL
  ), cutoff AS (
    SELECT min(bar_date) AS c FROM dates WHERE bar_date IS NOT NULL
  ), picked AS (
    SELECT d.ticker FROM public.daily_bars d, cutoff
    WHERE d.bar_date >= cutoff.c
    GROUP BY d.ticker
    HAVING count(*) >= 55
    ORDER BY d.ticker
    LIMIT p_limit OFFSET p_offset
  )
  SELECT b.ticker,
         jsonb_agg(jsonb_build_array(b.bar_date, b.open, b.high, b.low, b.close, b.volume) ORDER BY b.bar_date) AS bars
  FROM public.daily_bars b
  JOIN picked p ON p.ticker = b.ticker
  CROSS JOIN cutoff
  WHERE b.bar_date >= cutoff.c
  GROUP BY b.ticker
  ORDER BY b.ticker
$function$;