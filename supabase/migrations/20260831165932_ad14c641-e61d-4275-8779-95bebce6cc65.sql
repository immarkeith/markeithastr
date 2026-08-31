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