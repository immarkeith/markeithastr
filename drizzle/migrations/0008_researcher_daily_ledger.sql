CREATE TABLE IF NOT EXISTS public.researcher_daily_ledger (
  lane TEXT NOT NULL,
  session_date DATE NOT NULL,
  strategy_id UUID,
  equity NUMERIC NOT NULL,
  pnl NUMERIC NOT NULL,
  pnl_pct NUMERIC NOT NULL,
  daily_return_pct NUMERIC NOT NULL,
  held_ticker TEXT,
  action TEXT,
  engine_version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lane, session_date)
);
GRANT ALL ON public.researcher_daily_ledger TO service_role;
ALTER TABLE public.researcher_daily_ledger ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.researcher_daily_ledger IS 'Stage 3: each researcher''s saved chronological daily result. Research Lab graphs read this directly. Paper research only.';