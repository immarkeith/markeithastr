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