-- Phase E audit history only. Additive and portable; no trading data changes.
CREATE TABLE IF NOT EXISTS public.audit_integrity_results (
 id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 checked_at timestamptz DEFAULT now() NOT NULL,
 cadence text NOT NULL,
 overall_verdict text NOT NULL,
 pillars jsonb NOT NULL,
 discrepancies jsonb DEFAULT '[]'::jsonb NOT NULL,
 summary text
);
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
  GRANT ALL ON public.audit_integrity_results TO service_role;
 END IF;
END $$;
ALTER TABLE public.audit_integrity_results ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS audit_integrity_results_checked_at_idx ON public.audit_integrity_results (checked_at DESC);
-- On plain PostgreSQL grant access to the authorized app server role.