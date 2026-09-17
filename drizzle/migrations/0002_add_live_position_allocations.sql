ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS position_type text NOT NULL DEFAULT 'SAME_DAY',
  ADD COLUMN IF NOT EXISTS filled_qty numeric,
  ADD COLUMN IF NOT EXISTS broker_order_id text;

UPDATE public.trades
SET filled_qty = ROUND((dollars / NULLIF(entry_price, 0))::numeric, 6)
WHERE filled_qty IS NULL
  AND entry_price > 0;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_position_type_check
  CHECK (position_type IN ('SAME_DAY', 'LONG_TERM')) NOT VALID;

CREATE INDEX IF NOT EXISTS trades_open_live_position_type_idx
  ON public.trades (position_type, ticker)
  WHERE status = 'open' AND mode = 'live';