UPDATE public.app_settings SET min_avg_dollar_volume = 5000000, updated_at = now() WHERE id = 1;
ALTER TABLE public.app_settings ALTER COLUMN min_avg_dollar_volume SET DEFAULT 5000000;