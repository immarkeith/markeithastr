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