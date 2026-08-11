ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS hold_qualifying_positions boolean NOT NULL DEFAULT true;
ALTER TABLE public.app_settings ALTER COLUMN preopen_recheck_minutes SET DEFAULT 2;