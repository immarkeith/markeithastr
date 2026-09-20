-- Live LONG_TERM positions gain an intended holding horizon and a review date.
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS hold_horizon text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS review_date date;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS horizon_history jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Paper-only long-horizon research predictions. Each row is written once at
-- prediction time and later APPENDED to with its evaluation result; the
-- original prediction fields are never overwritten.
CREATE TABLE IF NOT EXISTS public.research_horizon_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  predicted_at timestamptz NOT NULL DEFAULT now(),
  prediction_date date NOT NULL,
  lane text NOT NULL,
  researcher_name text NOT NULL,
  strategy_id uuid REFERENCES public.strategies(id),
  formula_version text,
  formula jsonb NOT NULL DEFAULT '{}'::jsonb,
  ticker text NOT NULL,
  entry_price numeric NOT NULL,
  score numeric,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  horizon text NOT NULL,
  evaluate_on date NOT NULL,
  evaluated_at timestamptz,
  exit_price numeric,
  return_pct numeric,
  benchmark_return_pct numeric,
  successful boolean,
  outcome text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_horizon_predictions_unique UNIQUE (lane, ticker, prediction_date, horizon)
);

GRANT ALL ON public.research_horizon_predictions TO service_role;
ALTER TABLE public.research_horizon_predictions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS research_horizon_predictions_due
  ON public.research_horizon_predictions (outcome, evaluate_on);
CREATE INDEX IF NOT EXISTS research_horizon_predictions_lane
  ON public.research_horizon_predictions (lane, prediction_date DESC);
CREATE INDEX IF NOT EXISTS trades_review_date_idx
  ON public.trades (review_date) WHERE review_date IS NOT NULL;