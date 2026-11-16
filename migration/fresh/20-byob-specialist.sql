CREATE TABLE IF NOT EXISTS public.byob_models (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ticker text NOT NULL,
 version integer NOT NULL DEFAULT 1,
 status text NOT NULL CHECK (status IN ('insufficient_data','provisional','qualified','disqualified')),
 formula_type text,
 parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
 best_horizon_days integer,
 training_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 validation_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 holdout_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 regime_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 qualification_reason text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 result jsonb NOT NULL,
 data_fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(ticker,version),
 UNIQUE(ticker,data_fingerprint)
);
GRANT ALL ON public.byob_models TO service_role;
ALTER TABLE public.byob_models ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS byob_ticker_version ON public.byob_models(ticker,version DESC);