CREATE INDEX IF NOT EXISTS daily_bars_date_idx ON public.daily_bars (bar_date);
CREATE OR REPLACE FUNCTION public.bar_dates_present_since(p_start date)
RETURNS TABLE(bar_date date, ticker_count bigint)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
 SELECT d.bar_date, count(*) AS ticker_count
 FROM public.daily_bars d
 WHERE d.bar_date >= p_start
 GROUP BY d.bar_date
 ORDER BY d.bar_date DESC
$$;
GRANT EXECUTE ON FUNCTION public.bar_dates_present_since(date) TO service_role;
COMMENT ON FUNCTION public.bar_dates_present_since(date) IS 'Bounded coverage for operational health; original full-history function remains available for historical callers.';