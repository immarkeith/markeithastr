REVOKE ALL ON public.researcher_formula_versions,public.researcher_formula_champions,public.researcher_formula_experiments,public.researcher_seasonality_patterns FROM PUBLIC,anon,authenticated;
COMMENT ON TABLE public.researcher_formula_versions IS 'Private paper formula registry with immutable V0 and definitions; atomic promotion requires protected chronological multi-metric evidence. No connection to existing operational scorers.';
DO $$
DECLARE v public.researcher_formula_versions; a public.researcher_formula_versions; b public.researcher_formula_versions; c public.researcher_formula_versions; spec jsonb; e jsonb; m jsonb := '{"total_return_pct":10,"annualized_return_pct":8,"sharpe":1,"sortino":1.2,"max_drawdown_pct":10,"profit_factor":1.3,"win_rate_pct":55,"trade_count":50,"trades_per_year":50,"alpha_vs_spy_pct":2,"friction_bps":10,"costs_included":true}'; policy jsonb := '{"min_trades":30,"min_sharpe_gain":0.1,"min_total_return_gain_pct":1}'; caught boolean; archive_id uuid; n integer;
BEGIN
 BEGIN
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions WHERE status='V0_BENCHMARK')=7;
 ASSERT (SELECT count(*) FROM public.researcher_formula_champions)=7;
 ASSERT NOT has_table_privilege('anon','public.researcher_formula_versions','SELECT');
 ASSERT NOT has_table_privilege('authenticated','public.researcher_formula_versions','INSERT');
 ASSERT NOT has_function_privilege('anon','public.formula_promote_candidate(uuid,uuid,jsonb)','EXECUTE');
 SELECT * INTO STRICT v FROM public.researcher_formula_versions WHERE lane='trend' AND version_number=0;
 ASSERT v.formula_spec->'weights' = '{"trend":35,"momentum":30,"relative_strength":20,"volume":15}'::jsonb;
 ASSERT v.formula_spec->'gates'->'rsi_max' = 'null'::jsonb;
 caught:=false; BEGIN UPDATE public.researcher_formula_versions SET version_tag='tampered' WHERE id=v.id; EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'V0 edit not blocked';
 caught:=false; BEGIN DELETE FROM public.researcher_formula_versions WHERE id=v.id; EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'V0 deletion not blocked';
 SELECT count(*) INTO n FROM public.researcher_formula_versions;
 INSERT INTO public.researcher_formula_versions(lane,version_number,version_tag,status,target_holding_days,formula_spec) VALUES('trend',0,'v0_benchmark','V0_BENCHMARK',3,v.formula_spec) ON CONFLICT(lane,version_number) DO NOTHING;
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions)=n,'Duplicate baseline';
 spec:=jsonb_set(v.formula_spec,'{provenance,kind}','"candidate"');
 a:=public.formula_register_candidate('trend','rollback archive',spec,180,'2021-06-01',policy);
 b:=public.formula_register_candidate('trend','rollback first',spec,5,'2021-06-01',policy);
 c:=public.formula_register_candidate('trend','rollback second',spec,5,'2021-06-01',policy);
 ASSERT a.version_number < b.version_number AND b.version_number < c.version_number;
 ASSERT a.review_after_sessions=30 AND a.target_holding_days=180;
 caught:=false; BEGIN UPDATE public.researcher_formula_versions SET formula_spec=jsonb_set(spec,'{weights}','{"trend":100}') WHERE id=a.id; EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Definition changed';
 archive_id:=public.formula_archive_candidate(a.id,'Insufficient evidence, not permanently defective',30,0,'{}','{"season":"summer"}',NULL,true);
 SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=a.id)='ARCHIVED_EXPERIMENT';
 ASSERT (SELECT formula_spec=spec AND resurrectable AND evaluated_sessions=30 AND opportunities=0 FROM public.researcher_formula_experiments WHERE id=archive_id);
 caught:=false; BEGIN UPDATE public.researcher_formula_experiments SET rejection_reason='rewritten' WHERE id=archive_id; EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Evidence changed';
 e:=jsonb_build_object('candidate_id',b.id,'champion_id',v.id,'holding_sessions',5,'validation_run_id','rollback-test','data_fingerprint','synthetic-test-only','protected_validation',true,'point_in_time',true,'stress_passed',true,'folds',jsonb_build_array(
 jsonb_build_object('train_start','2021-06-01','train_end','2022-12-30','validation_start','2023-01-03','validation_end','2023-12-29','outcomes_through','2024-01-10','regime','mixed','candidate',m || '{"total_return_pct":12,"sharpe":1.2}','champion',m),
 jsonb_build_object('train_start','2022-01-03','train_end','2023-12-29','validation_start','2024-01-02','validation_end','2024-12-31','outcomes_through','2025-01-10','regime','mixed','candidate',m || '{"total_return_pct":12,"sharpe":1.2}','champion',m)));
 caught:=false; BEGIN PERFORM public.formula_promote_candidate(b.id,v.id,jsonb_set(e,'{folds,0,candidate,max_drawdown_pct}','11')); EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Worse drawdown promoted';
 caught:=false; BEGIN PERFORM public.formula_promote_candidate(b.id,v.id,jsonb_set(e,'{folds,0,train_end}','"2023-01-03"')); EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Overlapping validation accepted';
 PERFORM public.formula_promote_candidate(b.id,v.id,e);
 SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT formula_id FROM public.researcher_formula_champions WHERE lane='trend')=b.id;
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=v.id)='V0_BENCHMARK';
 caught:=false; BEGIN PERFORM public.formula_promote_candidate(c.id,v.id,e); EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Stale evidence promoted';
 e:=e || jsonb_build_object('candidate_id',c.id,'champion_id',b.id);
 PERFORM public.formula_promote_candidate(c.id,b.id,e);
 SET CONSTRAINTS ALL IMMEDIATE; SET CONSTRAINTS ALL DEFERRED;
 ASSERT (SELECT status FROM public.researcher_formula_versions WHERE id=b.id)='RETIRED';
 ASSERT (SELECT formula_id FROM public.researcher_formula_champions WHERE lane='trend')=c.id;
 ASSERT (SELECT count(*) FROM public.researcher_formula_versions WHERE lane='trend' AND status='ACTIVE_BEST')=1;
 caught:=false; BEGIN UPDATE public.researcher_formula_champions SET formula_id=a.id WHERE lane='trend'; SET CONSTRAINTS ALL IMMEDIATE; EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Archive became champion';
 caught:=false; BEGIN INSERT INTO public.researcher_seasonality_patterns(lane,pattern_type,identifier,evidence_summary,evidence) VALUES('trend','CALENDAR_MONTH','June','test','[{"year":2021},{"year":2021}]'); EXCEPTION WHEN raise_exception THEN caught:=true; END; ASSERT caught,'Duplicate seasonal years accepted';
 RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='rollback verified test data';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN RAISE NOTICE 'Database invariant tests passed; all temporary formulas rolled back';
 END;
END $$;