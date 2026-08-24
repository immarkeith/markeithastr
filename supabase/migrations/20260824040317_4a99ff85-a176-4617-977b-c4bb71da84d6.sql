ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS trades_strategy_idx ON public.trades(strategy_id, status);
CREATE INDEX IF NOT EXISTS ledger_strategy_idx ON public.ledger_entries(strategy_id);

CREATE TABLE IF NOT EXISTS public.paper_slots (
  id integer PRIMARY KEY,
  strategy_id uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  stocks_per_day integer NOT NULL DEFAULT 1,
  position_dollars numeric NOT NULL DEFAULT 20,
  stable_days integer NOT NULL DEFAULT 0,
  breach_days integer NOT NULL DEFAULT 0,
  last_evaluated_date date,
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.paper_slots TO service_role;
REVOKE ALL ON public.paper_slots FROM anon, authenticated;
ALTER TABLE public.paper_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_slots FORCE ROW LEVEL SECURITY;

CREATE TRIGGER update_paper_slots_updated_at BEFORE UPDATE ON public.paper_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.paper_slots (id, strategy_id) VALUES
  (1, 'fc99a1e4-686c-4a18-b961-22b7f3426059'),
  (2, 'd72c5d37-a356-4881-9e26-4163a6638321'),
  (3, 'bf5f3062-546c-4b2c-a9fe-6cb189ec778c')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ledger_entries (kind, amount, note, strategy_id, entry_date, available_on)
SELECT 'deposit', 50, 'Paper test starting cash', s.strategy_id, CURRENT_DATE, CURRENT_DATE
FROM public.paper_slots s
WHERE s.strategy_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ledger_entries l WHERE l.strategy_id = s.strategy_id
  );