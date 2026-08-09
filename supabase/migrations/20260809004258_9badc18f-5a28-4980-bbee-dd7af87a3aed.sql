-- Remove permissive public SELECT policies
DROP POLICY IF EXISTS "settings readable" ON public.app_settings;
DROP POLICY IF EXISTS "health readable" ON public.health_checks;
DROP POLICY IF EXISTS "ledger readable" ON public.ledger_entries;
DROP POLICY IF EXISTS "notifications readable" ON public.notifications;
DROP POLICY IF EXISTS "runs readable" ON public.scan_runs;
DROP POLICY IF EXISTS "scores readable" ON public.scan_scores;
DROP POLICY IF EXISTS "strategies readable" ON public.strategies;
DROP POLICY IF EXISTS "watchlist readable" ON public.watchlist_candidates;
DROP POLICY IF EXISTS "trades readable" ON public.trades;

-- Revoke Data API privileges from anon/authenticated; server (service_role) only
REVOKE ALL ON public.app_settings FROM anon, authenticated;
REVOKE ALL ON public.health_checks FROM anon, authenticated;
REVOKE ALL ON public.ledger_entries FROM anon, authenticated;
REVOKE ALL ON public.notifications FROM anon, authenticated;
REVOKE ALL ON public.scan_runs FROM anon, authenticated;
REVOKE ALL ON public.scan_scores FROM anon, authenticated;
REVOKE ALL ON public.strategies FROM anon, authenticated;
REVOKE ALL ON public.watchlist_candidates FROM anon, authenticated;
REVOKE ALL ON public.trades FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

GRANT ALL ON public.app_settings TO service_role;
GRANT ALL ON public.health_checks TO service_role;
GRANT ALL ON public.ledger_entries TO service_role;
GRANT ALL ON public.notifications TO service_role;
GRANT ALL ON public.scan_runs TO service_role;
GRANT ALL ON public.scan_scores TO service_role;
GRANT ALL ON public.strategies TO service_role;
GRANT ALL ON public.watchlist_candidates TO service_role;
GRANT ALL ON public.trades TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;

-- Ensure RLS is on everywhere (default deny for anon/authenticated)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;