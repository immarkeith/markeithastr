ALTER TABLE public.paper_slots ADD COLUMN IF NOT EXISTS lane TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS paper_slots_lane_idx ON public.paper_slots (lane) WHERE lane IS NOT NULL;