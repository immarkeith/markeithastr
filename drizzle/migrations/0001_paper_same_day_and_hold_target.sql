ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS same_day_price numeric,
  ADD COLUMN IF NOT EXISTS same_day_profit numeric,
  ADD COLUMN IF NOT EXISTS same_day_pct numeric,
  ADD COLUMN IF NOT EXISTS same_day_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_target_date date;
