ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS auto_live_trading boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_max_trade_dollars numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS auto_max_daily_trades integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_daily_loss_limit numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS auto_volatility_kill_switch boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_spy_move_limit_pct numeric NOT NULL DEFAULT 1.8;
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS auto_managed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owning_researcher text;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_position_type_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_position_type_check
  CHECK (position_type = ANY (ARRAY['SAME_DAY'::text, 'LONG_TERM'::text, 'AUTO_TIMED'::text])) NOT VALID;