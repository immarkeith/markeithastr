CREATE TABLE public.master_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature text NOT NULL UNIQUE,
  kind text NOT NULL,
  label text NOT NULL,
  factor text,
  band_low numeric,
  band_high numeric,
  filter_key text,
  filter_value numeric,
  weight numeric,
  discovered_by text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'observation',
  confirmations integer NOT NULL DEFAULT 0,
  failures integer NOT NULL DEFAULT 0,
  last_edge numeric,
  best_edge numeric,
  skeptic_note text,
  first_seen_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  promoted_on date,
  retired_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.master_rules TO service_role;
ALTER TABLE public.master_rules ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER master_rules_updated_at BEFORE UPDATE ON public.master_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.master_formula_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary text NOT NULL,
  reason text NOT NULL,
  discovered_by text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  skeptic_note text,
  before_performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  tests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.master_formula_versions TO service_role;
ALTER TABLE public.master_formula_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lead_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date date NOT NULL UNIQUE,
  master_version text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  factor_contributions jsonb NOT NULL DEFAULT '{}'::jsonb,
  entry_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  exit_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  horizons jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  winning_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  losing_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  contributing_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  edge numeric,
  verdict text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.lead_tests TO service_role;
ALTER TABLE public.lead_tests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.backup_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date date NOT NULL,
  lane text NOT NULL,
  researcher_name text NOT NULL,
  formula_version text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  picks jsonb NOT NULL DEFAULT '[]'::jsonb,
  entry_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  exit_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  horizons jsonb NOT NULL DEFAULT '{}'::jsonb,
  market_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  worked jsonb NOT NULL DEFAULT '[]'::jsonb,
  failed jsonb NOT NULL DEFAULT '[]'::jsonb,
  repeatable boolean NOT NULL DEFAULT false,
  discoveries jsonb NOT NULL DEFAULT '[]'::jsonb,
  problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalate boolean NOT NULL DEFAULT false,
  edge numeric,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_date, lane)
);
GRANT ALL ON public.backup_tests TO service_role;
ALTER TABLE public.backup_tests ENABLE ROW LEVEL SECURITY;
