-- Layer 1: immutable daily selections. Layer 2: forward evaluations (mature without touching Layer 1).
CREATE TABLE IF NOT EXISTS public.research_daily_selections (
  lane text NOT NULL,
  session_date date NOT NULL,
  selected_at timestamptz NOT NULL,
  ticker text,
  score numeric,
  selection_close numeric,
  eligible_universe integer NOT NULL,
  comparable_universe integer NOT NULL,
  ranked_count integer NOT NULL,
  runners_up jsonb NOT NULL DEFAULT '[]'::jsonb,
  universe_basis text NOT NULL,
  engine_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lane, session_date)
);
CREATE TABLE IF NOT EXISTS public.research_selection_evaluations (
  lane text NOT NULL,
  session_date date NOT NULL,
  horizon_sessions integer NOT NULL,
  ticker text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  entry_date date,
  entry_price numeric,
  exit_date date,
  exit_price numeric,
  return_pct numeric,
  benchmark_return_pct numeric,
  excess_return_pct numeric,
  matured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lane, session_date, horizon_sessions),
  FOREIGN KEY (lane, session_date) REFERENCES public.research_daily_selections(lane, session_date) ON DELETE RESTRICT
);
GRANT ALL ON public.research_daily_selections TO service_role;
GRANT ALL ON public.research_selection_evaluations TO service_role;
ALTER TABLE public.research_daily_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_selection_evaluations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.research_selection_frozen() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'research_daily_selections rows are immutable';
END $$;
DROP TRIGGER IF EXISTS research_selection_frozen ON public.research_daily_selections;
CREATE TRIGGER research_selection_frozen BEFORE UPDATE OR DELETE ON public.research_daily_selections
  FOR EACH ROW EXECUTE FUNCTION public.research_selection_frozen();

-- A matured evaluation is final; only pending rows may change.
CREATE OR REPLACE FUNCTION public.research_evaluation_final() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'matured research evaluations are final';
  END IF;
  IF NEW.lane <> OLD.lane OR NEW.session_date <> OLD.session_date OR NEW.horizon_sessions <> OLD.horizon_sessions OR NEW.ticker <> OLD.ticker THEN
    RAISE EXCEPTION 'evaluation identity cannot change';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS research_evaluation_final ON public.research_selection_evaluations;
CREATE TRIGGER research_evaluation_final BEFORE UPDATE OR DELETE ON public.research_selection_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.research_evaluation_final();