-- ASTR fresh setup 4 of 4 (database structure)
-- Run parts in order, each in its own new query.

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: TABLE research_findings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_findings TO anon;
GRANT ALL ON TABLE public.research_findings TO authenticated;
GRANT ALL ON TABLE public.research_findings TO service_role;


--
-- Name: TABLE research_notebook; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_notebook TO anon;
GRANT ALL ON TABLE public.research_notebook TO authenticated;
GRANT ALL ON TABLE public.research_notebook TO service_role;


--
-- Name: TABLE research_runs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.research_runs TO anon;
GRANT ALL ON TABLE public.research_runs TO authenticated;
GRANT ALL ON TABLE public.research_runs TO service_role;


--
-- Name: TABLE researchers; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.researchers TO anon;
GRANT ALL ON TABLE public.researchers TO authenticated;
GRANT ALL ON TABLE public.researchers TO service_role;


--
-- Name: TABLE scan_runs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scan_runs TO service_role;


--
-- Name: TABLE scan_scores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.scan_scores TO service_role;


--
-- Name: TABLE strategies; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.strategies TO service_role;


--
-- Name: TABLE trades; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.trades TO service_role;


--
-- Name: TABLE verification_reports; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.verification_reports TO anon;
GRANT ALL ON TABLE public.verification_reports TO authenticated;
GRANT ALL ON TABLE public.verification_reports TO service_role;


--
-- Name: TABLE watchlist_candidates; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.watchlist_candidates TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--
