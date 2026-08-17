ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS entry_at timestamptz,
  ADD COLUMN IF NOT EXISTS exit_at timestamptz;

UPDATE public.trades SET entry_at = created_at WHERE entry_at IS NULL;
UPDATE public.trades SET exit_at = created_at WHERE exit_at IS NULL AND status <> 'open' AND exit_date IS NOT NULL;