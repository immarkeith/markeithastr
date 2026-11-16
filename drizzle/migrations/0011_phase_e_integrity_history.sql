CREATE TABLE IF NOT EXISTS public.audit_integrity_results (
 id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 checked_at timestamptz DEFAULT now() NOT NULL,
 cadence text NOT NULL,
 overall_verdict text NOT NULL,
 pillars jsonb NOT NULL,
 discrepancies jsonb DEFAULT '[]'::jsonb NOT NULL,
 summary text
);
GRANT ALL ON public.audit_integrity_results TO service_role;
ALTER TABLE public.audit_integrity_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_integrity_results_checked_at_idx ON public.audit_integrity_results (checked_at DESC);