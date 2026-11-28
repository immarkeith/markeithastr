-- Real database tests. Everything, including candidate registrations/promotions, rolls back.
-- Run against an installed Phase 1 database: psql -X -v ON_ERROR_STOP=1 -f scripts/test-formula-evolution.sql
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE baseline public.researcher_formula_versions; a public.researcher_formula_versions; b public.researcher_formula_versions; c public.researcher_formula_versions;
 spec jsonb; policy jsonb := '{"min_trades":30,"min_sharpe_gain":0.1,"min_total_return_gain_pct":1}';
 metrics jsonb := '{"total_return_pct":10,"annualized_return_pct":8,"sharpe":1,"sortino":1.2,"max_drawdown_pct":10,"profit_factor":1.3,"win_rate_pct":55,"trade_count":50,"trades_per_year":50,"alpha_vs_spy_pct":2,"friction_bps":10,"costs_included":true}';
 improved jsonb; evidence jsonb; archive_id uuid; caught boolean; before_count integer;
BEGIN
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions WHERE status='V0_BENCHMARK')=7, 'Seven permanent baselines required';
 ASSERT (SELECT count(*) FROM public.researcher_formula_champions)=7, 'Seven champion pointers required';
 ASSERT NOT has_table_privilege('anon','public.researcher_formula_versions','SELECT'), 'Anon cannot read private formulas';
 ASSERT NOT has_table_privilege('authenticated','public.researcher_formula_versions','INSERT'), 'Browser cannot register candidates';
 ASSERT NOT has_function_privilege('anon','public.formula_promote_candidate(uuid,uuid,jsonb)','EXECUTE'), 'Anon cannot promote';
 SELECT * INTO baseline FROM public.researcher_formula_versions WHERE lane='trend' AND version_number=0;
 ASSERT baseline.formula_spec->'weights' = '{"trend":35,"momentum":30,"relative_strength":20,"volume":15}'::jsonb, 'Verified Trend seed';
 ASSERT baseline.formula_spec->'gates'->'rsi_max' = 'null'::jsonb, 'Experiment filter is not a default';
 caught := false;
 BEGIN UPDATE public.researcher_formula_versions SET version_tag='tampered' WHERE id=baseline.id; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'V0 edits must fail';
 caught := false;
 BEGIN DELETE FROM public.researcher_formula_versions WHERE id=baseline.id; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'V0 deletion must fail';
 SELECT count(*) INTO before_count FROM public.researcher_formula_versions;
 -- The same ON CONFLICT initializer cannot create duplicate baselines or pointers.
 INSERT INTO public.researcher_formula_versions(lane,version_number,version_tag,status,target_holding_days,formula_spec) VALUES('trend',0,'v0_benchmark','V0_BENCHMARK',3,baseline.formula_spec) ON CONFLICT(lane,version_number) DO NOTHING;
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions)=before_count, 'Initializer is idempotent';
 spec:=jsonb_set(baseline.formula_spec,'{provenance,kind}','"candidate"');
 a:=public.formula_register_candidate('trend','test archived',spec,180,'2021-06-01',policy);
 b:=public.formula_register_candidate('trend','test champion',spec,5,'2021-06-01',policy);
 c:=public.formula_register_candidate('trend','test successor',spec,5,'2021-06-01',policy);
 ASSERT a.version_number < b.version_number AND b.version_number < c.version_number, 'Monotonic independent version allocation';
 ASSERT a.review_after_sessions=30 AND a.target_holding_days=180, '30-session review supports immature 180-session evidence';
 caught:=false;
 BEGIN UPDATE public.researcher_formula_versions SET formula_spec=jsonb_set(spec,'{weights}','{"trend":100}') WHERE id=a.id; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Candidate definition cannot mutate';
 archive_id:=public.formula_archive_candidate(a.id,'Insufficient mature outcomes; not permanently defective',30,0,'{}','{"season":"summer"}',NULL,true);
 SET CONSTRAINTS ALL IMMEDIATE;
 SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=a.id)='ARCHIVED_EXPERIMENT', 'Archived state saved';
 ASSERT (SELECT formula_spec=spec AND resurrectable AND evaluated_sessions=30 AND opportunities=0 FROM public.researcher_formula_experiments WHERE id=archive_id), 'Definition, evidence and reconsideration preserved';
 caught:=false;
 BEGIN UPDATE public.researcher_formula_experiments SET rejection_reason='rewritten' WHERE id=archive_id; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Archive evidence immutable';
 improved:=metrics || '{"total_return_pct":12,"sharpe":1.2}';
 evidence:=jsonb_build_object('candidate_id',b.id,'champion_id',baseline.id,'holding_sessions',5,'validation_run_id','rollback-test','data_fingerprint','test-not-production-performance','protected_validation',true,'point_in_time',true,'stress_passed',true,'folds',jsonb_build_array(
 jsonb_build_object('train_start','2021-06-01','train_end','2022-12-30','validation_start','2023-01-03','validation_end','2023-12-29','outcomes_through','2024-01-10','regime','mixed','candidate',improved,'champion',metrics),
 jsonb_build_object('train_start','2022-01-03','train_end','2023-12-29','validation_start','2024-01-02','validation_end','2024-12-31','outcomes_through','2025-01-10','regime','mixed','candidate',improved,'champion',metrics)));
 caught:=false;
 BEGIN PERFORM public.formula_promote_candidate(b.id,baseline.id,jsonb_set(evidence,'{folds,0,candidate,max_drawdown_pct}','11')); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Higher return does not excuse drawdown deterioration';
 caught:=false;
 BEGIN PERFORM public.formula_promote_candidate(b.id,baseline.id,jsonb_set(evidence,'{folds,0,train_end}','"2023-01-03"')); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Training cannot overlap validation';
 PERFORM public.formula_promote_candidate(b.id,baseline.id,evidence);
 SET CONSTRAINTS ALL IMMEDIATE;
 SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT formula_id FROM public.researcher_formula_champions WHERE lane='trend')=b.id, 'Promotion reads back through champion registry';
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=baseline.id)='V0_BENCHMARK', 'First promotion cannot modify V0';
 caught:=false;
 BEGIN PERFORM public.formula_promote_candidate(c.id,baseline.id,evidence); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Stale champion evidence must fail';
 evidence:=evidence || jsonb_build_object('candidate_id',c.id,'champion_id',b.id);
 PERFORM public.formula_promote_candidate(c.id,b.id,evidence);
 SET CONSTRAINTS ALL IMMEDIATE;
 SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=b.id)='RETIRED', 'Superseded champion retires';
 ASSERT (SELECT formula_id FROM public.researcher_formula_champions WHERE lane='trend')=c.id, 'Successor is current champion';
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions WHERE lane='trend' AND status='ACTIVE_BEST')=1, 'Exactly one active champion';
 caught:=false;
 BEGIN UPDATE public.researcher_formula_champions SET formula_id=a.id WHERE lane='trend'; SET CONSTRAINTS ALL IMMEDIATE; EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Archived candidate cannot become champion';
 caught:=false;
 BEGIN INSERT INTO public.researcher_seasonality_patterns(lane,pattern_type,identifier,evidence_summary,evidence) VALUES('trend','CALENDAR_MONTH','June','test','[{"year":2021},{"year":2021}]'); EXCEPTION WHEN raise_exception THEN caught:=true; END;
 ASSERT caught, 'Duplicate-year observations cannot establish seasonality';
 RAISE NOTICE 'Phase 1 database lifecycle, evidence and access assertions passed; changes will roll back';
END $$;
ROLLBACK;