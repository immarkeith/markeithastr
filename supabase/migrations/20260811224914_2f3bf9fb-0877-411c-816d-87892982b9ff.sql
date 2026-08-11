CREATE TABLE public.capital_ladder_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  stocks_per_day integer NOT NULL DEFAULT 1,
  position_dollars numeric NOT NULL DEFAULT 20,
  stable_days integer NOT NULL DEFAULT 0,
  breach_days integer NOT NULL DEFAULT 0,
  pending_target text,
  hold_level boolean NOT NULL DEFAULT false,
  last_evaluated_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.capital_ladder_state TO service_role;

ALTER TABLE public.capital_ladder_state ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_capital_ladder_state_updated_at
BEFORE UPDATE ON public.capital_ladder_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.capital_ladder_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL,
  from_stocks integer NOT NULL,
  from_dollars numeric NOT NULL,
  to_stocks integer NOT NULL,
  to_dollars numeric NOT NULL,
  capital numeric NOT NULL,
  required numeric NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.capital_ladder_events TO service_role;

ALTER TABLE public.capital_ladder_events ENABLE ROW LEVEL SECURITY;

INSERT INTO public.capital_ladder_state (id, stocks_per_day, position_dollars)
VALUES (1, 1, 20);