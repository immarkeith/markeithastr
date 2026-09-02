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