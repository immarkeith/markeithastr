CREATE OR REPLACE FUNCTION public.scan_input(p_days INT, p_limit INT, p_offset INT)
RETURNS TABLE (ticker TEXT, bars JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dates AS (
    SELECT DISTINCT bar_date FROM public.daily_bars ORDER BY bar_date DESC LIMIT p_days
  ), b AS (
    SELECT d.ticker, d.bar_date, d.open, d.high, d.low, d.close, d.volume
    FROM public.daily_bars d
    JOIN dates ON dates.bar_date = d.bar_date
  )
  SELECT b.ticker,
         jsonb_agg(
           jsonb_build_array(b.bar_date, b.open, b.high, b.low, b.close, b.volume)
           ORDER BY b.bar_date
         ) AS bars
  FROM b
  GROUP BY b.ticker
  HAVING count(*) >= 55
  ORDER BY b.ticker
  LIMIT p_limit OFFSET p_offset
$$;

REVOKE ALL ON FUNCTION public.scan_input(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_input(INT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.bar_dates_present()
RETURNS TABLE (bar_date DATE, ticker_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.bar_date, count(*) AS ticker_count
  FROM public.daily_bars d
  GROUP BY d.bar_date
  ORDER BY d.bar_date DESC
$$;

REVOKE ALL ON FUNCTION public.bar_dates_present() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bar_dates_present() TO service_role, anon, authenticated;

UPDATE public.app_settings SET max_universe = 1000 WHERE id = 1;