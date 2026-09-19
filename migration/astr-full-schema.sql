-- ASTR — complete database setup (consolidated from 23 migrations)
-- Run once, top to bottom, in a fresh Postgres/Supabase SQL editor.

-- ======================================================================
-- 20260805025819_404f14d7-5a99-408e-a3cc-0dca428093da.sql
-- ======================================================================
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
-- ======================================================================
-- 20260805030211_099815d9-1bdc-4c05-b242-7587c01d1a48.sql
-- ======================================================================
CREATE OR REPLACE FUNCTION public.scan_input(p_days INT, p_limit INT, p_offset INT)
RETURNS TABLE (ticker TEXT, bars JSONB)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH dates AS (
    SELECT DISTINCT bar_date FROM public.daily_bars ORDER BY bar_date DESC LIMIT p_days
  ), b AS (
    SELECT d.ticker, d.bar_date, d.open, d.high, d.low, d.close, d.volume
    FROM public.daily_bars d
    JOIN dates ON dates.bar_date = d.bar_date
  )
  SELECT b.ticker,
         jsonb_agg(
           jsonb_build_array(b.bar_date, b.open, b.high, b.low, b.close, b.volume)
           ORDER BY b.bar_date
         ) AS bars
  FROM b
  GROUP BY b.ticker
  HAVING count(*) >= 55
  ORDER BY b.ticker
  LIMIT p_limit OFFSET p_offset
$$;

REVOKE ALL ON FUNCTION public.scan_input(INT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scan_input(INT, INT, INT) TO service_role;

CREATE OR REPLACE FUNCTION public.bar_dates_present()
RETURNS TABLE (bar_date DATE, ticker_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.bar_date, count(*) AS ticker_count
  FROM public.daily_bars d
  GROUP BY d.bar_date
  ORDER BY d.bar_date DESC
$$;

REVOKE ALL ON FUNCTION public.bar_dates_present() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bar_dates_present() TO service_role, anon, authenticated;

UPDATE public.app_settings SET max_universe = 1000 WHERE id = 1;
-- ======================================================================
-- 20260805030235_53c7694a-37c8-43ab-a270-4ef6ca83ebd5.sql
-- ======================================================================
CREATE OR REPLACE FUNCTION public.scan_input(p_days INT, p_limit INT, p_offset INT)
RETURNS TABLE (ticker TEXT, bars JSONB)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH dates AS (
    SELECT DISTINCT bar_date FROM public.daily_bars ORDER BY bar_date DESC LIMIT p_days
  ), b AS (
    SELECT d.ticker, d.bar_date, d.open, d.high, d.low, d.close, d.volume
    FROM public.daily_bars d
    JOIN dates ON dates.bar_date = d.bar_date
  )
  SELECT b.ticker,
         jsonb_agg(
           jsonb_build_array(b.bar_date, b.open, b.high, b.low, b.close, b.volume)
           ORDER BY b.bar_date
         ) AS bars
  FROM b
  GROUP BY b.ticker
  HAVING count(*) >= 55
  ORDER BY b.ticker
  LIMIT p_limit OFFSET p_offset
$$;

CREATE OR REPLACE FUNCTION public.bar_dates_present()
RETURNS TABLE (bar_date DATE, ticker_count BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT d.bar_date, count(*) AS ticker_count
  FROM public.daily_bars d
  GROUP BY d.bar_date
  ORDER BY d.bar_date DESC
$$;
-- ======================================================================
-- 20260806000543_9c84a6f9-429f-4ee3-93cf-2c52ef299f16.sql
-- ======================================================================
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'paper';
UPDATE public.trades SET mode = 'live' WHERE mode = 'paper';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS paper_mode boolean NOT NULL DEFAULT true;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS auto_run boolean NOT NULL DEFAULT true;
-- ======================================================================
-- 20260807000438_cb644a48-8fd8-47f3-8bf8-3570eafc4d92.sql
-- ======================================================================
CREATE TABLE public.notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text not null,
  ticker text,
  severity text not null default 'info',
  action text,
  meta jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  pushed_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications readable" ON public.notifications FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX notifications_created_idx ON public.notifications (created_at DESC);

CREATE TABLE public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  label text,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  failures int not null default 0
);
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS exit_buffer_minutes int not null default 8,
  ADD COLUMN IF NOT EXISTS preopen_recheck_minutes int not null default 5,
  ADD COLUMN IF NOT EXISTS notify_push boolean not null default true;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'astr-preopen-recheck',
  '35 13 * * 1-5',
  $$ SELECT net.http_post(
      url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preopen',
      headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
      body := '{}'::jsonb
    ) $$
);

SELECT cron.schedule(
  'astr-preclose-exit',
  '50 19 * * 1-5',
  $$ SELECT net.http_post(
      url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preclose',
      headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
      body := '{}'::jsonb
    ) $$
);
-- ======================================================================
-- 20260808000703_3bb9e07e-7b23-4eaf-868b-70a9bc0c48d0.sql
-- ======================================================================
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS notify_day_pick boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_swing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_theme boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_trades boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_health boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS active_strategy_id uuid,
  ADD COLUMN IF NOT EXISTS strategy_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.strategies TO anon;
GRANT SELECT ON public.strategies TO authenticated;
GRANT ALL ON public.strategies TO service_role;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "strategies readable" ON public.strategies;
CREATE POLICY "strategies readable" ON public.strategies FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL DEFAULT true,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  repairs jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text
);

GRANT SELECT ON public.health_checks TO anon;
GRANT SELECT ON public.health_checks TO authenticated;
GRANT ALL ON public.health_checks TO service_role;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "health readable" ON public.health_checks;
CREATE POLICY "health readable" ON public.health_checks FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.strategies (name, description, params, builtin)
SELECT 'Balanced rotation (default)',
       'The original ASTR mix: trend 25, momentum 25, volume 20, relative strength 15, volatility quality 15. Buys the best-scoring name shortly after the open and sells before the close. Good all-round starting point.',
       '{"weight_trend":25,"weight_momentum":25,"weight_volume":20,"weight_relative_strength":15,"weight_volatility_quality":15,"min_score_to_trade":60,"num_day_trades":2}'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.strategies);

INSERT INTO public.strategies (name, description, params, builtin)
SELECT 'Trend follower',
       'Leans hard on trend (40) and relative strength (20), lighter on short-term momentum. Fewer, steadier picks; tends to hold market leaders instead of chasing one-day spikes.',
       '{"weight_trend":40,"weight_momentum":15,"weight_volume":15,"weight_relative_strength":20,"weight_volatility_quality":10,"min_score_to_trade":62,"num_day_trades":2}'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.strategies WHERE name = 'Trend follower');

INSERT INTO public.strategies (name, description, params, builtin)
SELECT 'Momentum burst',
       'Momentum 40 and volume 25 dominate. Picks the fastest movers with heavy participation — more day-trade signals, bigger swings both ways.',
       '{"weight_trend":15,"weight_momentum":40,"weight_volume":25,"weight_relative_strength":10,"weight_volatility_quality":10,"min_score_to_trade":58,"num_day_trades":2}'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.strategies WHERE name = 'Momentum burst');

INSERT INTO public.strategies (name, description, params, builtin)
SELECT 'Careful / low volatility',
       'Volatility quality 30 with a higher score bar (68). Skips wild names, trades less often, aimed at smoother equity curves on a small account.',
       '{"weight_trend":25,"weight_momentum":20,"weight_volume":15,"weight_relative_strength":10,"weight_volatility_quality":30,"min_score_to_trade":68,"num_day_trades":1}'::jsonb,
       true
WHERE NOT EXISTS (SELECT 1 FROM public.strategies WHERE name = 'Careful / low volatility');

UPDATE public.app_settings s
SET active_strategy_id = (SELECT id FROM public.strategies WHERE name = 'Balanced rotation (default)' LIMIT 1)
WHERE s.id = 1 AND s.active_strategy_id IS NULL;
-- ======================================================================
-- 20260808001155_f2b720bf-8a30-4ecf-83a7-b2620b9c1b80.sql
-- ======================================================================
SELECT cron.unschedule('astr-health-market-hours') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-market-hours');
SELECT cron.unschedule('astr-health-offhours') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-offhours');

SELECT cron.schedule(
  'astr-health-market-hours',
  '*/15 13-20 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'astr-health-offhours',
  '7 0-12,21-23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_-kQ2Bm-HoM0sBe4oIlsUww_7WiU5WFy"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
-- ======================================================================
-- 20260809003909_ed159488-9b72-4bb7-af31-e191cae8d345.sql
-- ======================================================================
UPDATE public.app_settings SET provider = 'alpaca', updated_at = now() WHERE id = 1;
-- ======================================================================
-- 20260809004258_9badc18f-5a28-4980-bbee-dd7af87a3aed.sql
-- ======================================================================
-- Remove permissive public SELECT policies
DROP POLICY IF EXISTS "settings readable" ON public.app_settings;
DROP POLICY IF EXISTS "health readable" ON public.health_checks;
DROP POLICY IF EXISTS "ledger readable" ON public.ledger_entries;
DROP POLICY IF EXISTS "notifications readable" ON public.notifications;
DROP POLICY IF EXISTS "runs readable" ON public.scan_runs;
DROP POLICY IF EXISTS "scores readable" ON public.scan_scores;
DROP POLICY IF EXISTS "strategies readable" ON public.strategies;
DROP POLICY IF EXISTS "watchlist readable" ON public.watchlist_candidates;
DROP POLICY IF EXISTS "trades readable" ON public.trades;

-- Revoke Data API privileges from anon/authenticated; server (service_role) only
REVOKE ALL ON public.app_settings FROM anon, authenticated;
REVOKE ALL ON public.health_checks FROM anon, authenticated;
REVOKE ALL ON public.ledger_entries FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;
REVOKE ALL ON public.scan_runs FROM anon, authenticated;
REVOKE ALL ON public.scan_scores FROM anon, authenticated;
REVOKE ALL ON public.strategies FROM anon, authenticated;
REVOKE ALL ON public.watchlist_candidates FROM anon, authenticated;
REVOKE ALL ON public.trades FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

GRANT ALL ON public.app_settings TO service_role;
GRANT ALL ON public.health_checks TO service_role;
GRANT ALL ON public.ledger_entries TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.scan_runs TO service_role;
GRANT ALL ON public.scan_scores TO service_role;
GRANT ALL ON public.strategies TO service_role;
GRANT ALL ON public.watchlist_candidates TO service_role;
GRANT ALL ON public.trades TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;

-- Ensure RLS is on everywhere (default deny for anon/authenticated)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
-- ======================================================================
-- 20260809004600_6d934dc4-8f00-46d4-a390-6992adeb2e91.sql
-- ======================================================================
CREATE TABLE IF NOT EXISTS public.hook_tokens (
  id integer PRIMARY KEY DEFAULT 1,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.hook_tokens FROM anon, authenticated;
GRANT ALL ON public.hook_tokens TO service_role;
ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO public.hook_tokens (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Re-schedule every hook job so it sends the private token instead of the publishable key
SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('astr-daily-cycle','astr-health-market-hours','astr-health-offhours','astr-preopen-recheck','astr-preclose-exit');

SELECT cron.schedule('astr-daily-cycle', '30 21 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/daily-cycle',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-market-hours', '*/15 13-20 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-preopen-recheck', '35 13 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preopen',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-preclose-exit', '50 19 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc.lovable.app/api/public/hooks/preclose',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);
-- ======================================================================
-- 20260811193758_ca82a280-3ab6-4f3d-9e19-6ca4b20ac792.sql
-- ======================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.model_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL,
  kind text NOT NULL DEFAULT 'random_forest',
  target text NOT NULL DEFAULT 'return',
  holding_days integer NOT NULL DEFAULT 1,
  feature_set_version text NOT NULL DEFAULT 'fs1',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  train_start date,
  train_end date,
  test_start date,
  test_end date,
  data_version text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  feature_importance jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  trained_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.model_versions TO service_role;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.model_predictions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_version_id uuid REFERENCES public.model_versions(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  ticker text NOT NULL,
  astr_score numeric,
  rf_prediction numeric,
  prob_positive numeric,
  prob_target numeric,
  combined_score numeric,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  predicted_return numeric,
  actual_return numeric,
  benchmark_return numeric,
  result text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX model_predictions_model_idx ON public.model_predictions (model_version_id, as_of_date);
GRANT ALL ON public.model_predictions TO service_role;
ALTER TABLE public.model_predictions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  base_version text,
  change_summary text NOT NULL DEFAULT '',
  hypothesis text NOT NULL DEFAULT '',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_improvement numeric,
  confidence numeric,
  robustness numeric,
  status text NOT NULL DEFAULT 'research',
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  decided_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.research_candidates TO service_role;
ALTER TABLE public.research_candidates ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'walk_forward',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.research_runs TO service_role;
ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_research_candidates_updated_at
BEFORE UPDATE ON public.research_candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS ml_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ml_target text NOT NULL DEFAULT 'return',
  ADD COLUMN IF NOT EXISTS ml_holding_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ml_train_days integer NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS ml_test_days integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS ml_min_return_pct numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ml_trees integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS ml_combine_weight numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS ml_retrain text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS bt_slippage_bps numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS bt_fee_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS research_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fundamentals_available boolean NOT NULL DEFAULT false;
-- ======================================================================
-- 20260811214852_6df5a0cf-ea9e-4b86-870e-438bc84bc388.sql
-- ======================================================================
UPDATE public.app_settings SET min_avg_dollar_volume = 5000000, updated_at = now() WHERE id = 1;
ALTER TABLE public.app_settings ALTER COLUMN min_avg_dollar_volume SET DEFAULT 5000000;
-- ======================================================================
-- 20260811224914_2f3bf9fb-0877-411c-816d-87892982b9ff.sql
-- ======================================================================
CREATE TABLE public.capital_ladder_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  stocks_per_day integer NOT NULL DEFAULT 1,
  position_dollars numeric NOT NULL DEFAULT 20,
  stable_days integer NOT NULL DEFAULT 0,
  breach_days integer NOT NULL DEFAULT 0,
  pending_target text,
  hold_level boolean NOT NULL DEFAULT false,
  last_evaluated_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.capital_ladder_state TO service_role;

ALTER TABLE public.capital_ladder_state ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_capital_ladder_state_updated_at
BEFORE UPDATE ON public.capital_ladder_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.capital_ladder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL,
  from_stocks integer NOT NULL,
  from_dollars numeric NOT NULL,
  to_stocks integer NOT NULL,
  to_dollars numeric NOT NULL,
  capital numeric NOT NULL,
  required numeric NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.capital_ladder_events TO service_role;

ALTER TABLE public.capital_ladder_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.capital_ladder_state (id, stocks_per_day, position_dollars)
VALUES (1, 1, 20);
-- ======================================================================
-- 20260811232605_da183b57-9b63-4ea2-92e8-f698edc777ab.sql
-- ======================================================================
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS hold_qualifying_positions boolean NOT NULL DEFAULT true;
ALTER TABLE public.app_settings ALTER COLUMN preopen_recheck_minutes SET DEFAULT 2;
-- ======================================================================
-- 20260812001956_15f6e343-6d0f-49a4-b4e1-7a48736db7fa.sql
-- ======================================================================
SELECT cron.unschedule('astr-health-market-hours')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-market-hours');

SELECT cron.unschedule('astr-health-offhours')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'astr-health-offhours');

SELECT cron.schedule('astr-health-market-hours', '*/15 13-20 * * 1-5', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc-dev.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('astr-health-offhours', '7 0-12,21-23 * * *', $$
  SELECT net.http_post(
    url := 'https://project--37070edf-73ac-415f-89be-963bbb6afcdc-dev.lovable.app/api/public/hooks/health',
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret',(SELECT token FROM public.hook_tokens WHERE id = 1)),
    body := '{}'::jsonb
  );
$$);
-- ======================================================================
-- 20260817184858_4b750b44-9fe9-4b1a-86be-a44484e4b068.sql
-- ======================================================================
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS status_note text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS hold_days integer NOT NULL DEFAULT 0;
-- ======================================================================
-- 20260817203525_d7ed1486-208a-44c8-87c2-6f8741462498.sql
-- ======================================================================
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS entry_at timestamptz,
  ADD COLUMN IF NOT EXISTS exit_at timestamptz;

UPDATE public.trades SET entry_at = created_at WHERE entry_at IS NULL;
UPDATE public.trades SET exit_at = created_at WHERE exit_at IS NULL AND status <> 'open' AND exit_date IS NOT NULL;
-- ======================================================================
-- 20260817214756_6ef2ddea-3912-403d-a2e9-efbea4a4fa72.sql
-- ======================================================================
ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.hook_tokens FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

GRANT ALL ON public.hook_tokens TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
-- ======================================================================
-- 20260818014325_bddcecaf-8440-4adb-9f3b-3256a2c4df26.sql
-- ======================================================================
ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.hook_tokens FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.hook_tokens TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;
-- ======================================================================
-- 20260824040317_4a99ff85-a176-4617-977b-c4bb71da84d6.sql
-- ======================================================================
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS trades_strategy_idx ON public.trades(strategy_id, status);
CREATE INDEX IF NOT EXISTS ledger_strategy_idx ON public.ledger_entries(strategy_id);

CREATE TABLE IF NOT EXISTS public.paper_slots (
  id integer PRIMARY KEY,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  stocks_per_day integer NOT NULL DEFAULT 1,
  position_dollars numeric NOT NULL DEFAULT 20,
  stable_days integer NOT NULL DEFAULT 0,
  breach_days integer NOT NULL DEFAULT 0,
  last_evaluated_date date,
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.paper_slots TO service_role;
REVOKE ALL ON public.paper_slots FROM anon, authenticated;
ALTER TABLE public.paper_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_slots FORCE ROW LEVEL SECURITY;

CREATE TRIGGER update_paper_slots_updated_at BEFORE UPDATE ON public.paper_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.paper_slots (id, strategy_id) VALUES
  (1, 'fc99a1e4-686c-4a18-b961-22b7f3426059'),
  (2, 'd72c5d37-a356-4881-9e26-4163a6638321'),
  (3, 'bf5f3062-546c-4b2c-a9fe-6cb189ec778c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ledger_entries (kind, amount, note, strategy_id, entry_date, available_on)
SELECT 'deposit', 50, 'Paper test starting cash', s.strategy_id, CURRENT_DATE, CURRENT_DATE
FROM public.paper_slots s
WHERE s.strategy_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries l WHERE l.strategy_id = s.strategy_id
  );
-- ======================================================================
-- 20260831165932_ad14c641-e61d-4275-8779-95bebce6cc65.sql
-- ======================================================================
CREATE TABLE public.researchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL UNIQUE,
  name text NOT NULL,
  focus text NOT NULL DEFAULT '',
  mission text NOT NULL DEFAULT '',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  best_params jsonb,
  best_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  best_edge numeric,
  generation integer NOT NULL DEFAULT 0,
  experiments_run integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.researchers TO service_role;
ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.research_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL,
  generation integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  hypothesis text NOT NULL DEFAULT '',
  change_summary text NOT NULL DEFAULT '',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  edge numeric,
  robustness numeric,
  confidence numeric,
  verdict text NOT NULL DEFAULT 'proposed',
  objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  lead_note text,
  adopted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.research_findings TO service_role;
ALTER TABLE public.research_findings ENABLE ROW LEVEL SECURITY;
CREATE INDEX research_findings_lane_idx ON public.research_findings (lane, created_at DESC);

CREATE TABLE public.research_dead_ends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL,
  signature text NOT NULL,
  label text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  edge numeric,
  hits integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (lane, signature)
);

GRANT ALL ON public.research_dead_ends TO service_role;
ALTER TABLE public.research_dead_ends ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER researchers_updated_at BEFORE UPDATE ON public.researchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER research_dead_ends_updated_at BEFORE UPDATE ON public.research_dead_ends
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.researchers (lane, name, focus, mission) VALUES
 ('trend','Trend Researcher','Momentum, trend strength, breakouts, market direction','Find out whether following strong market momentum produces better short-term results.'),
 ('contrarian','Contrarian Researcher','Oversold names, overreactions, overlooked stocks','Find out whether going against prevailing sentiment produces better results.'),
 ('consistency','Consistency Researcher','Stable, repeatable behaviour and lower volatility','Find out whether consistent stocks beat short-term excitement on a risk-adjusted basis.'),
 ('growth','Growth Researcher','Improving business performance and accelerating results','Find out whether improving growth characteristics produce better results.'),
 ('risk','Risk Researcher','Risk versus reward, drawdowns, liquidity, risk-adjusted return','Find which characteristics offer attractive returns without unnecessary risk.'),
 ('skeptic','Skeptic','Challenging assumptions and finding reasons a strong idea may fail','Actively search for weaknesses, false signals and situations where the other researchers are wrong.');
-- ======================================================================
-- 20260902034607_e92b465a-1a29-4e22-90d9-12d51d950e85.sql
-- ======================================================================
CREATE TABLE public.research_notebook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL,
  generation integer NOT NULL DEFAULT 0,
  experiment_no integer NOT NULL DEFAULT 0,
  variable text NOT NULL DEFAULT '',
  previous_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT '',
  conclusion text NOT NULL DEFAULT '',
  accepted boolean NOT NULL DEFAULT false,
  edge numeric,
  horizons jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.research_notebook TO service_role;
ALTER TABLE public.research_notebook ENABLE ROW LEVEL SECURITY;
CREATE INDEX research_notebook_lane_idx ON public.research_notebook (lane, created_at DESC);
-- ======================================================================
-- 20260908201418_88614540-e3aa-46a1-a7f1-bf5da2a9640f.sql
-- ======================================================================
CREATE TABLE public.verification_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id text NOT NULL,
  lane text NOT NULL,
  scientist_name text NOT NULL,
  strategy_id text NOT NULL,
  strategy_version text NOT NULL,
  backtest_version text NOT NULL,
  ticker text NOT NULL,
  signal_date date NOT NULL,
  signal_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL,
  signal_strength numeric,
  reason text NOT NULL DEFAULT '',
  formula jsonb NOT NULL DEFAULT '{}'::jsonb,
  entry_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  exit_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  lookback_sessions integer NOT NULL DEFAULT 0,
  history_start date,
  history_end date,
  comparable_signals integer NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  conclusion text NOT NULL,
  confidence text NOT NULL,
  data_quality text NOT NULL DEFAULT 'unknown',
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_source text NOT NULL DEFAULT 'cached daily bars',
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX verification_reports_dedupe_idx ON public.verification_reports (dedupe_key);
CREATE INDEX verification_reports_lane_idx ON public.verification_reports (lane, created_at DESC);

GRANT ALL ON public.verification_reports TO service_role;

ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;
