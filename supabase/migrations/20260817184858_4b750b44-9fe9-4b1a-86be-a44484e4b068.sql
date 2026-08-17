ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS status_note text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS hold_days integer NOT NULL DEFAULT 0;