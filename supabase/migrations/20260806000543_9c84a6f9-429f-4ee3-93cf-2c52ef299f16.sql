ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'paper';
UPDATE public.trades SET mode = 'live' WHERE mode = 'paper';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS paper_mode boolean NOT NULL DEFAULT true;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS auto_run boolean NOT NULL DEFAULT true;