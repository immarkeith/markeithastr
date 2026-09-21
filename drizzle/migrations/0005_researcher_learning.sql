-- Per-researcher continuous learning: completed research examples with their
-- starting characteristics, and each researcher's own learned beliefs about
-- which characteristics help or hurt. Research only: nothing here is read by
-- the live scanner, the live scoring path or any live position logic.

CREATE TABLE IF NOT EXISTS public.researcher_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL,
  source text NOT NULL,
  source_id text NOT NULL,
  ticker text NOT NULL,
  example_date date NOT NULL,
  horizon text NOT NULL,
  score numeric,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  regime text,
  return_pct numeric,
  benchmark_return_pct numeric,
  successful boolean,
  resolved_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT researcher_examples_unique UNIQUE (lane, source, source_id, horizon)
);

GRANT ALL ON public.researcher_examples TO service_role;
ALTER TABLE public.researcher_examples ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS researcher_examples_lane_idx
  ON public.researcher_examples (lane, horizon, example_date DESC);

CREATE TABLE IF NOT EXISTS public.researcher_beliefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL,
  horizon text NOT NULL,
  kind text NOT NULL,
  characteristic text NOT NULL,
  band text NOT NULL,
  direction text NOT NULL,
  hypothesis text NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  avg_return_in numeric,
  avg_return_out numeric,
  lift numeric,
  win_rate_in numeric,
  win_rate_out numeric,
  first_half_lift numeric,
  second_half_lift numeric,
  up_market_lift numeric,
  down_market_lift numeric,
  confidence numeric NOT NULL DEFAULT 30,
  confirmations integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'forming',
  note text,
  first_seen_on date NOT NULL DEFAULT CURRENT_DATE,
  last_tested_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT researcher_beliefs_unique UNIQUE (lane, horizon, kind, characteristic, band)
);

GRANT ALL ON public.researcher_beliefs TO service_role;
ALTER TABLE public.researcher_beliefs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS researcher_beliefs_lane_idx
  ON public.researcher_beliefs (lane, status, confidence DESC);

DROP TRIGGER IF EXISTS researcher_beliefs_updated_at ON public.researcher_beliefs;
CREATE TRIGGER researcher_beliefs_updated_at
  BEFORE UPDATE ON public.researcher_beliefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();