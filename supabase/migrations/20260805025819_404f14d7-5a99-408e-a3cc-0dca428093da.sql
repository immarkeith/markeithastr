-- SETTINGS -----------------------------------------------------------------
CREATE TABLE public.app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'polygon',
  min_price NUMERIC NOT NULL DEFAULT 10,
  min_avg_dollar_volume NUMERIC NOT NULL DEFAULT 20000000,
  weight_trend NUMERIC NOT NULL DEFAULT 25,
  weight_momentum NUMERIC NOT NULL DEFAULT 25,
  weight_volume NUMERIC NOT NULL DEFAULT 20,
  weight_relative_strength NUMERIC NOT NULL DEFAULT 15,
  weight_volatility_quality NUMERIC NOT NULL DEFAULT 15,
  min_score_to_trade NUMERIC NOT NULL DEFAULT 60,
  num_day_trades INT NOT NULL DEFAULT 2,
  dollars_per_day_trade NUMERIC NOT NULL DEFAULT 25,
  profit_keep_pct NUMERIC NOT NULL DEFAULT 0.5,
  settlement_days INT NOT NULL DEFAULT 1,
  streak_suggest_days INT NOT NULL DEFAULT 5,
  swing_dollars NUMERIC NOT NULL DEFAULT 25,
  swing_max_hold_days INT NOT NULL DEFAULT 7,
  market_proxy TEXT NOT NULL DEFAULT 'SPY',
  max_universe INT NOT NULL DEFAULT 3000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.app_settings (id) VALUES (1);

-- DAILY BARS ---------------------------------------------------------------
CREATE TABLE public.daily_bars (
  ticker TEXT NOT NULL,
  bar_date DATE NOT NULL,
  open NUMERIC NOT NULL,
  high NUMERIC NOT NULL,
  low NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  volume NUMERIC NOT NULL,
  PRIMARY KEY (ticker, bar_date)
);
CREATE INDEX daily_bars_date_idx ON public.daily_bars (bar_date);
GRANT SELECT ON public.daily_bars TO anon, authenticated;
GRANT ALL ON public.daily_bars TO service_role;
ALTER TABLE public.daily_bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bars readable" ON public.daily_bars FOR SELECT TO anon, authenticated USING (true);

-- SCAN RUNS ----------------------------------------------------------------
CREATE TABLE public.scan_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete',
  universe_size INT NOT NULL DEFAULT 0,
  scored_count INT NOT NULL DEFAULT 0,
  bars_as_of DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX scan_runs_date_idx ON public.scan_runs (run_date DESC);
GRANT SELECT ON public.scan_runs TO anon, authenticated;
GRANT ALL ON public.scan_runs TO service_role;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs readable" ON public.scan_runs FOR SELECT TO anon, authenticated USING (true);

-- SCAN SCORES --------------------------------------------------------------
CREATE TABLE public.scan_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.scan_runs(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  rank INT NOT NULL,
  score NUMERIC NOT NULL,
  close NUMERIC NOT NULL,
  sma20 NUMERIC,
  tradeable BOOLEAN NOT NULL DEFAULT false,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  invalidation TEXT,
  UNIQUE (run_id, ticker)
);
CREATE INDEX scan_scores_run_rank_idx ON public.scan_scores (run_id, rank);
CREATE INDEX scan_scores_ticker_idx ON public.scan_scores (ticker);
GRANT SELECT ON public.scan_scores TO anon, authenticated;
GRANT ALL ON public.scan_scores TO service_role;
ALTER TABLE public.scan_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scores readable" ON public.scan_scores FOR SELECT TO anon, authenticated USING (true);

-- WATCHLIST ----------------------------------------------------------------
CREATE TABLE public.watchlist_candidates (
  ticker TEXT PRIMARY KEY,
  streak_days INT NOT NULL DEFAULT 0,
  best_pick_ever BOOLEAN NOT NULL DEFAULT false,
  last_seen_date DATE,
  status TEXT NOT NULL DEFAULT 'suggested',
  approved_at TIMESTAMPTZ,
  hold_until DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.watchlist_candidates TO anon, authenticated;
GRANT ALL ON public.watchlist_candidates TO service_role;
ALTER TABLE public.watchlist_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist readable" ON public.watchlist_candidates FOR SELECT TO anon, authenticated USING (true);

-- TRADES -------------------------------------------------------------------
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'day',
  entry_date DATE NOT NULL,
  entry_price NUMERIC NOT NULL,
  dollars NUMERIC NOT NULL,
  exit_date DATE,
  exit_price NUMERIC,
  profit NUMERIC,
  kept NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX trades_entry_idx ON public.trades (entry_date DESC);
GRANT SELECT ON public.trades TO anon, authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trades readable" ON public.trades FOR SELECT TO anon, authenticated USING (true);

-- LEDGER -------------------------------------------------------------------
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  kind TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  available_on DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ledger_entries_date_idx ON public.ledger_entries (entry_date DESC);
GRANT SELECT ON public.ledger_entries TO anon, authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger readable" ON public.ledger_entries FOR SELECT TO anon, authenticated USING (true);