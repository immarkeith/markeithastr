CREATE TABLE IF NOT EXISTS public.market_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  cik text NOT NULL,
  filed_on date NOT NULL,
  form text NOT NULL,
  items text[] NOT NULL DEFAULT '{}',
  category text NOT NULL,
  sentiment text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  confidence text NOT NULL DEFAULT 'medium',
  reason text NOT NULL,
  accession text NOT NULL UNIQUE,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.market_events TO service_role;
ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS market_events_ticker_idx ON public.market_events (ticker, filed_on DESC);