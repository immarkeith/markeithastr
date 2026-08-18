ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.hook_tokens FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.hook_tokens TO service_role;
GRANT ALL ON public.push_subscriptions TO service_role;