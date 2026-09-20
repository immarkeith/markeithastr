-- ASTR fresh setup 3 of 4 (database structure)
-- Run parts in order, each in its own new query.

--
-- Name: model_predictions_model_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX model_predictions_model_idx ON public.model_predictions USING btree (model_version_id, as_of_date);


--
-- Name: notifications_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_created_idx ON public.notifications USING btree (created_at DESC);


--
-- Name: paper_slots_lane_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX paper_slots_lane_idx ON public.paper_slots USING btree (lane) WHERE (lane IS NOT NULL);


--
-- Name: research_findings_lane_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_findings_lane_idx ON public.research_findings USING btree (lane, created_at DESC);


--
-- Name: research_notebook_lane_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX research_notebook_lane_idx ON public.research_notebook USING btree (lane, created_at DESC);


--
-- Name: scan_runs_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scan_runs_date_idx ON public.scan_runs USING btree (run_date DESC);


--
-- Name: scan_scores_run_rank_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scan_scores_run_rank_idx ON public.scan_scores USING btree (run_id, rank);


--
-- Name: scan_scores_ticker_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX scan_scores_ticker_idx ON public.scan_scores USING btree (ticker);


--
-- Name: trades_entry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_entry_idx ON public.trades USING btree (entry_date DESC);


--
-- Name: trades_open_live_position_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_open_live_position_type_idx ON public.trades USING btree (position_type, ticker) WHERE ((status = 'open'::text) AND (mode = 'live'::text));


--
-- Name: trades_strategy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trades_strategy_idx ON public.trades USING btree (strategy_id, status);


--
-- Name: verification_reports_dedupe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX verification_reports_dedupe_idx ON public.verification_reports USING btree (dedupe_key);


--
-- Name: verification_reports_lane_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_reports_lane_idx ON public.verification_reports USING btree (lane, created_at DESC);


--
-- Name: master_rules master_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER master_rules_updated_at BEFORE UPDATE ON public.master_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: research_dead_ends research_dead_ends_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER research_dead_ends_updated_at BEFORE UPDATE ON public.research_dead_ends FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: researchers researchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER researchers_updated_at BEFORE UPDATE ON public.researchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: capital_ladder_state update_capital_ladder_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_capital_ladder_state_updated_at BEFORE UPDATE ON public.capital_ladder_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: paper_slots update_paper_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_paper_slots_updated_at BEFORE UPDATE ON public.paper_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: research_candidates update_research_candidates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_research_candidates_updated_at BEFORE UPDATE ON public.research_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ledger_entries ledger_entries_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;


--
-- Name: ledger_entries ledger_entries_trade_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE SET NULL;


--
-- Name: model_predictions model_predictions_model_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_predictions
    ADD CONSTRAINT model_predictions_model_version_id_fkey FOREIGN KEY (model_version_id) REFERENCES public.model_versions(id) ON DELETE CASCADE;


--
-- Name: paper_slots paper_slots_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paper_slots
    ADD CONSTRAINT paper_slots_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;


--
-- Name: scan_scores scan_scores_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scores
    ADD CONSTRAINT scan_scores_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.scan_runs(id) ON DELETE CASCADE;


--
-- Name: trades trades_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.strategies(id) ON DELETE SET NULL;


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_bars bars readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "bars readable" ON public.daily_bars FOR SELECT TO authenticated, anon USING (true);


--
-- Name: capital_ladder_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capital_ladder_events ENABLE ROW LEVEL SECURITY;

--
-- Name: capital_ladder_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capital_ladder_state ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_bars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_bars ENABLE ROW LEVEL SECURITY;

--
-- Name: health_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: hook_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hook_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: master_formula_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_formula_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: master_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: model_predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: model_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: paper_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.paper_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: research_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: research_dead_ends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_dead_ends ENABLE ROW LEVEL SECURITY;

--
-- Name: research_findings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_findings ENABLE ROW LEVEL SECURITY;

--
-- Name: research_notebook; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_notebook ENABLE ROW LEVEL SECURITY;

--
-- Name: research_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: researchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.researchers ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: scan_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scan_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: trades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: watchlist_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watchlist_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION bar_dates_present(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.bar_dates_present() FROM PUBLIC;
GRANT ALL ON FUNCTION public.bar_dates_present() TO anon;
GRANT ALL ON FUNCTION public.bar_dates_present() TO authenticated;
GRANT ALL ON FUNCTION public.bar_dates_present() TO service_role;


--
-- Name: FUNCTION scan_input(p_days integer, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.app_settings TO sandbox_exec;


--
-- Name: TABLE backup_tests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.backup_tests TO anon;
GRANT ALL ON TABLE public.backup_tests TO authenticated;
GRANT ALL ON TABLE public.backup_tests TO service_role;
GRANT SELECT,INSERT ON TABLE public.backup_tests TO sandbox_exec;


--
-- Name: TABLE capital_ladder_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.capital_ladder_events TO anon;
GRANT ALL ON TABLE public.capital_ladder_events TO authenticated;
GRANT ALL ON TABLE public.capital_ladder_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.capital_ladder_events TO sandbox_exec;


--
-- Name: TABLE capital_ladder_state; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.capital_ladder_state TO anon;
GRANT ALL ON TABLE public.capital_ladder_state TO authenticated;
GRANT ALL ON TABLE public.capital_ladder_state TO service_role;
GRANT SELECT,INSERT ON TABLE public.capital_ladder_state TO sandbox_exec;


--
-- Name: TABLE daily_bars; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.daily_bars TO anon;
GRANT ALL ON TABLE public.daily_bars TO authenticated;
GRANT ALL ON TABLE public.daily_bars TO service_role;
GRANT SELECT,INSERT ON TABLE public.daily_bars TO sandbox_exec;


--
-- Name: TABLE health_checks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.health_checks TO service_role;
GRANT SELECT,INSERT ON TABLE public.health_checks TO sandbox_exec;


--
-- Name: TABLE hook_tokens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.hook_tokens TO service_role;
GRANT SELECT,INSERT ON TABLE public.hook_tokens TO sandbox_exec;


--
-- Name: TABLE lead_tests; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.lead_tests TO anon;
GRANT ALL ON TABLE public.lead_tests TO authenticated;
GRANT ALL ON TABLE public.lead_tests TO service_role;
GRANT SELECT,INSERT ON TABLE public.lead_tests TO sandbox_exec;


--
-- Name: TABLE ledger_entries; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ledger_entries TO service_role;
GRANT SELECT,INSERT ON TABLE public.ledger_entries TO sandbox_exec;


--
-- Name: TABLE master_formula_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.master_formula_versions TO anon;
GRANT ALL ON TABLE public.master_formula_versions TO authenticated;
GRANT ALL ON TABLE public.master_formula_versions TO service_role;
GRANT SELECT,INSERT ON TABLE public.master_formula_versions TO sandbox_exec;


--
-- Name: TABLE master_rules; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.master_rules TO anon;
GRANT ALL ON TABLE public.master_rules TO authenticated;
GRANT ALL ON TABLE public.master_rules TO service_role;
GRANT SELECT,INSERT ON TABLE public.master_rules TO sandbox_exec;


--
-- Name: TABLE model_predictions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.model_predictions TO anon;
GRANT ALL ON TABLE public.model_predictions TO authenticated;
GRANT ALL ON TABLE public.model_predictions TO service_role;
GRANT SELECT,INSERT ON TABLE public.model_predictions TO sandbox_exec;


--
-- Name: TABLE model_versions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.model_versions TO anon;
GRANT ALL ON TABLE public.model_versions TO authenticated;
GRANT ALL ON TABLE public.model_versions TO service_role;
GRANT SELECT,INSERT ON TABLE public.model_versions TO sandbox_exec;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notifications TO service_role;
GRANT SELECT,INSERT ON TABLE public.notifications TO sandbox_exec;
