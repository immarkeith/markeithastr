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