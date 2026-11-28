CREATE TABLE IF NOT EXISTS public.researcher_formula_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lane text NOT NULL CHECK (lane IN ('lead','trend','contrarian','consistency','growth','risk','skeptic')),
 version_number integer NOT NULL CHECK (version_number >= 0),
 version_tag text NOT NULL,
 status text NOT NULL CHECK (status IN ('V0_BENCHMARK','CANDIDATE','ACTIVE_BEST','ARCHIVED_EXPERIMENT','RETIRED')),
 target_holding_days integer NOT NULL CHECK (target_holding_days IN (1,3,5,10,20,60,180)),
 formula_spec jsonb NOT NULL,
 promotion_policy jsonb,
 evaluation_start date,
 review_after_sessions integer NOT NULL DEFAULT 30 CHECK (review_after_sessions = 30),
 validation_evidence jsonb,
 in_sample_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 out_of_sample_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
 skeptic_stress_score numeric,
 promoted_at timestamptz,
 retired_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(lane,version_number), UNIQUE(lane,id),
 CHECK ((version_number = 0) = (status = 'V0_BENCHMARK')),
 CHECK (version_number = 0 OR (evaluation_start IS NOT NULL AND promotion_policy IS NOT NULL))
);
GRANT ALL ON public.researcher_formula_versions TO service_role;
ALTER TABLE public.researcher_formula_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY formula_versions_server_only ON public.researcher_formula_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS formula_one_benchmark ON public.researcher_formula_versions(lane) WHERE status = 'V0_BENCHMARK';
CREATE UNIQUE INDEX IF NOT EXISTS formula_one_active ON public.researcher_formula_versions(lane) WHERE status = 'ACTIVE_BEST';

CREATE TABLE IF NOT EXISTS public.researcher_formula_champions (
 lane text PRIMARY KEY CHECK (lane IN ('lead','trend','contrarian','consistency','growth','risk','skeptic')),
 formula_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lane,formula_id) REFERENCES public.researcher_formula_versions(lane,id) ON DELETE RESTRICT
);
GRANT ALL ON public.researcher_formula_champions TO service_role;
ALTER TABLE public.researcher_formula_champions ENABLE ROW LEVEL SECURITY;
CREATE POLICY formula_champions_server_only ON public.researcher_formula_champions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.researcher_formula_experiments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lane text NOT NULL,
 formula_id uuid NOT NULL UNIQUE,
 hypothesis_name text NOT NULL,
 formula_spec jsonb NOT NULL,
 target_holding_days integer NOT NULL,
 rejection_reason text NOT NULL CHECK (length(btrim(rejection_reason)) > 0),
 evaluated_sessions integer NOT NULL CHECK (evaluated_sessions >= 0),
 opportunities integer NOT NULL CHECK (opportunities >= 0),
 metrics_achieved jsonb NOT NULL,
 regime_context jsonb NOT NULL,
 seasonal_niche text,
 resurrectable boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(lane,formula_id) REFERENCES public.researcher_formula_versions(lane,id) ON DELETE RESTRICT
);
GRANT ALL ON public.researcher_formula_experiments TO service_role;
ALTER TABLE public.researcher_formula_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY formula_experiments_server_only ON public.researcher_formula_experiments FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.researcher_seasonality_patterns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lane text NOT NULL REFERENCES public.researcher_formula_champions(lane) ON DELETE RESTRICT,
 pattern_type text NOT NULL CHECK (pattern_type IN ('CALENDAR_MONTH','QUARTERLY','SECTOR_CYCLE','EVENT_WINDOW')),
 identifier text NOT NULL,
 evidence_summary text NOT NULL,
 evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence) = 'array' AND jsonb_array_length(evidence) >= 2),
 status text NOT NULL DEFAULT 'HYPOTHESIS' CHECK (status IN ('HYPOTHESIS','VALIDATED','REJECTED')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.researcher_seasonality_patterns TO service_role;
ALTER TABLE public.researcher_seasonality_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY formula_seasonality_server_only ON public.researcher_seasonality_patterns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.formula_assert_spec(p_spec jsonb) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric; g jsonb;
BEGIN
 IF p_spec->>'schema_version' IS DISTINCT FROM '1' OR p_spec->>'engine' IS DISTINCT FROM 'astr-weighted-factors-v1' OR jsonb_typeof(p_spec->'weights') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid formula definition'; END IF;
 SELECT sum(value::numeric) INTO total FROM jsonb_each_text(p_spec->'weights');
 IF total IS NULL OR abs(total - 100) >= 0.001 OR EXISTS(SELECT 1 FROM jsonb_each_text(p_spec->'weights') WHERE value::numeric < 0 OR value::numeric > 100) THEN RAISE EXCEPTION 'Weights must total 100'; END IF;
 g := p_spec->'gates';
 IF jsonb_typeof(g) IS DISTINCT FROM 'object' OR NOT (g ?& ARRAY['min_score_to_trade','num_day_trades','rsi_min','rsi_max','atr_pct_min','atr_pct_max','rel_volume_min']) OR (g->>'min_score_to_trade')::numeric NOT BETWEEN 0 AND 100 OR (g->>'num_day_trades')::integer < 1 THEN RAISE EXCEPTION 'Invalid formula gates'; END IF;
 IF (g->>'rsi_min')::numeric > (g->>'rsi_max')::numeric OR (g->>'atr_pct_min')::numeric > (g->>'atr_pct_max')::numeric THEN RAISE EXCEPTION 'Reversed formula gates'; END IF;
 IF jsonb_typeof(p_spec->'lookbacks') IS DISTINCT FROM 'object' OR jsonb_typeof(p_spec->'bands') IS DISTINCT FROM 'array' OR length(coalesce(p_spec->'provenance'->>'source','')) = 0 OR length(coalesce(p_spec->'provenance'->>'revision','')) = 0 THEN RAISE EXCEPTION 'Formula provenance and windows required'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.formula_assert_promotion(p_policy jsonb,p_evidence jsonb) RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE f jsonb; a jsonb; b jsonb; k text; previous_end date; min_trades integer;
BEGIN
 min_trades := (p_policy->>'min_trades')::integer;
 IF min_trades IS NULL OR min_trades < 1 OR coalesce((p_policy->>'min_sharpe_gain')::numeric,0) <= 0 OR coalesce((p_policy->>'min_total_return_gain_pct')::numeric,0) <= 0 THEN RAISE EXCEPTION 'Positive predeclared promotion policy required'; END IF;
 IF p_evidence->>'protected_validation' IS DISTINCT FROM 'true' OR p_evidence->>'point_in_time' IS DISTINCT FROM 'true' OR p_evidence->>'stress_passed' IS DISTINCT FROM 'true' OR length(coalesce(p_evidence->>'validation_run_id','')) = 0 OR length(coalesce(p_evidence->>'data_fingerprint','')) = 0 OR jsonb_typeof(p_evidence->'folds') IS DISTINCT FROM 'array' OR jsonb_array_length(p_evidence->'folds') < 2 THEN RAISE EXCEPTION 'Protected walk-forward evidence required'; END IF;
 FOR f IN SELECT value FROM jsonb_array_elements(p_evidence->'folds') LOOP
  IF NOT (f ?& ARRAY['train_start','train_end','validation_start','validation_end','outcomes_through','regime']) OR (f->>'train_start')::date > (f->>'train_end')::date OR (f->>'train_end')::date >= (f->>'validation_start')::date OR (f->>'validation_start')::date > (f->>'validation_end')::date OR (f->>'validation_end')::date > (f->>'outcomes_through')::date OR (previous_end IS NOT NULL AND previous_end >= (f->>'validation_start')::date) THEN RAISE EXCEPTION 'Chronological non-overlapping validation required'; END IF;
  previous_end := (f->>'validation_end')::date; a := f->'candidate'; b := f->'champion';
  FOREACH k IN ARRAY ARRAY['total_return_pct','annualized_return_pct','sharpe','sortino','max_drawdown_pct','profit_factor','win_rate_pct','trade_count','trades_per_year','alpha_vs_spy_pct','friction_bps'] LOOP
   IF jsonb_typeof(a->k) IS DISTINCT FROM 'number' OR jsonb_typeof(b->k) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Complete numeric metrics required'; END IF;
  END LOOP;
  IF a->>'costs_included' IS DISTINCT FROM 'true' OR b->>'costs_included' IS DISTINCT FROM 'true' OR (a->>'friction_bps')::numeric <> (b->>'friction_bps')::numeric OR (a->>'trade_count')::numeric < min_trades OR (b->>'trade_count')::numeric < min_trades OR (a->>'sharpe')::numeric - (b->>'sharpe')::numeric < (p_policy->>'min_sharpe_gain')::numeric OR (a->>'total_return_pct')::numeric - (b->>'total_return_pct')::numeric < (p_policy->>'min_total_return_gain_pct')::numeric OR (a->>'sortino')::numeric < (b->>'sortino')::numeric OR (a->>'max_drawdown_pct')::numeric > (b->>'max_drawdown_pct')::numeric OR (a->>'profit_factor')::numeric < (b->>'profit_factor')::numeric OR (a->>'annualized_return_pct')::numeric < (b->>'annualized_return_pct')::numeric OR (a->>'alpha_vs_spy_pct')::numeric < (b->>'alpha_vs_spy_pct')::numeric THEN RAISE EXCEPTION 'Insufficient multi-metric improvement'; END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.formula_version_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Formula history cannot be deleted'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.lane,0));
 PERFORM public.formula_assert_spec(NEW.formula_spec);
 IF TG_OP = 'INSERT' THEN
  IF NEW.status NOT IN ('V0_BENCHMARK','CANDIDATE') THEN RAISE EXCEPTION 'New formula must be benchmark or candidate'; END IF;
 ELSE
  IF OLD.status = 'V0_BENCHMARK' THEN RAISE EXCEPTION 'V0 benchmark is immutable'; END IF;
  IF (to_jsonb(NEW) - ARRAY['status','validation_evidence','out_of_sample_metrics','skeptic_stress_score','promoted_at','retired_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','validation_evidence','out_of_sample_metrics','skeptic_stress_score','promoted_at','retired_at']) THEN RAISE EXCEPTION 'Formula definition and predeclared policy are immutable'; END IF;
  IF NOT ((OLD.status = 'CANDIDATE' AND NEW.status IN ('ACTIVE_BEST','ARCHIVED_EXPERIMENT')) OR (OLD.status = 'ACTIVE_BEST' AND NEW.status = 'RETIRED')) THEN RAISE EXCEPTION 'Invalid formula lifecycle transition'; END IF;
  IF NEW.status = 'ACTIVE_BEST' THEN
   PERFORM public.formula_assert_promotion(NEW.promotion_policy,NEW.validation_evidence);
   IF NEW.validation_evidence->>'candidate_id' IS DISTINCT FROM NEW.id::text OR NEW.validation_evidence->>'holding_sessions' IS DISTINCT FROM NEW.target_holding_days::text OR NEW.validation_evidence->>'champion_id' IS DISTINCT FROM (SELECT formula_id::text FROM public.researcher_formula_champions WHERE lane = NEW.lane) THEN RAISE EXCEPTION 'Validation does not match candidate or current champion'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER formula_version_guard BEFORE INSERT OR UPDATE OR DELETE ON public.researcher_formula_versions FOR EACH ROW EXECUTE FUNCTION public.formula_version_guard();

CREATE OR REPLACE FUNCTION public.formula_evidence_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Formula evidence cannot be edited or deleted'; END $$;
CREATE TRIGGER formula_archive_guard BEFORE UPDATE OR DELETE ON public.researcher_formula_experiments FOR EACH ROW EXECUTE FUNCTION public.formula_evidence_guard();
CREATE TRIGGER formula_season_guard BEFORE UPDATE OR DELETE ON public.researcher_seasonality_patterns FOR EACH ROW EXECUTE FUNCTION public.formula_evidence_guard();
CREATE TRIGGER formula_champion_delete_guard BEFORE DELETE ON public.researcher_formula_champions FOR EACH ROW EXECUTE FUNCTION public.formula_evidence_guard();

CREATE OR REPLACE FUNCTION public.formula_champion_consistency() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v public.researcher_formula_versions; active_count integer;
BEGIN
 SELECT f.* INTO v FROM public.researcher_formula_champions c JOIN public.researcher_formula_versions f ON f.id = c.formula_id AND f.lane = c.lane WHERE c.lane = NEW.lane;
 IF NOT FOUND OR v.status NOT IN ('V0_BENCHMARK','ACTIVE_BEST') THEN RAISE EXCEPTION 'Each lane must have an eligible champion'; END IF;
 SELECT count(*) INTO active_count FROM public.researcher_formula_versions WHERE lane = NEW.lane AND status = 'ACTIVE_BEST';
 IF (v.status = 'V0_BENCHMARK' AND active_count <> 0) OR (v.status = 'ACTIVE_BEST' AND active_count <> 1) THEN RAISE EXCEPTION 'Champion pointer and active formula disagree'; END IF;
 IF NEW.status = 'ARCHIVED_EXPERIMENT' AND TG_TABLE_NAME = 'researcher_formula_versions' AND NOT EXISTS(SELECT 1 FROM public.researcher_formula_experiments WHERE formula_id = NEW.id) THEN RAISE EXCEPTION 'Archived candidate requires preserved evidence'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER formula_version_consistency AFTER INSERT OR UPDATE ON public.researcher_formula_versions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.formula_champion_consistency();

CREATE OR REPLACE FUNCTION public.formula_pointer_consistency() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE status_value text; active_count integer;
BEGIN
 SELECT status INTO status_value FROM public.researcher_formula_versions WHERE lane = NEW.lane AND id = NEW.formula_id;
 SELECT count(*) INTO active_count FROM public.researcher_formula_versions WHERE lane = NEW.lane AND status = 'ACTIVE_BEST';
 IF status_value NOT IN ('V0_BENCHMARK','ACTIVE_BEST') OR (status_value = 'V0_BENCHMARK' AND active_count <> 0) OR (status_value = 'ACTIVE_BEST' AND active_count <> 1) THEN RAISE EXCEPTION 'Invalid champion pointer'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER formula_pointer_consistency AFTER INSERT OR UPDATE ON public.researcher_formula_champions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.formula_pointer_consistency();

CREATE OR REPLACE FUNCTION public.formula_register_candidate(p_lane text,p_name text,p_spec jsonb,p_holding integer,p_start date,p_policy jsonb) RETURNS public.researcher_formula_versions LANGUAGE plpgsql SET search_path = public AS $$
DECLARE result public.researcher_formula_versions; next_version integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_lane,0));
 IF NOT EXISTS(SELECT 1 FROM public.researcher_formula_champions WHERE lane = p_lane) THEN RAISE EXCEPTION 'Lane benchmark not installed'; END IF;
 IF length(btrim(p_name)) = 0 OR p_spec->'provenance'->>'kind' IS DISTINCT FROM 'candidate' OR coalesce((p_policy->>'min_trades')::integer,0) <= 0 OR coalesce((p_policy->>'min_sharpe_gain')::numeric,0) <= 0 OR coalesce((p_policy->>'min_total_return_gain_pct')::numeric,0) <= 0 THEN RAISE EXCEPTION 'Candidate hypothesis, provenance and positive frozen policy required'; END IF;
 SELECT coalesce(max(version_number),0)+1 INTO next_version FROM public.researcher_formula_versions WHERE lane = p_lane;
 INSERT INTO public.researcher_formula_versions(lane,version_number,version_tag,status,target_holding_days,formula_spec,evaluation_start,promotion_policy) VALUES(p_lane,next_version,p_name,'CANDIDATE',p_holding,p_spec,p_start,p_policy) RETURNING * INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.formula_archive_candidate(p_id uuid,p_reason text,p_sessions integer,p_opportunities integer,p_metrics jsonb,p_regime jsonb,p_niche text,p_resurrectable boolean) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v public.researcher_formula_versions; result uuid;
BEGIN
 SELECT * INTO v FROM public.researcher_formula_versions WHERE id = p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v.lane,0));
 SELECT * INTO v FROM public.researcher_formula_versions WHERE id = p_id FOR UPDATE;
 IF v.status <> 'CANDIDATE' THEN RAISE EXCEPTION 'Only a candidate may be archived'; END IF;
 INSERT INTO public.researcher_formula_experiments(lane,formula_id,hypothesis_name,formula_spec,target_holding_days,rejection_reason,evaluated_sessions,opportunities,metrics_achieved,regime_context,seasonal_niche,resurrectable) VALUES(v.lane,v.id,v.version_tag,v.formula_spec,v.target_holding_days,p_reason,p_sessions,p_opportunities,p_metrics,p_regime,p_niche,p_resurrectable) RETURNING id INTO result;
 UPDATE public.researcher_formula_versions SET status = 'ARCHIVED_EXPERIMENT',retired_at = now() WHERE id = v.id;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.formula_promote_candidate(p_id uuid,p_expected_champion uuid,p_evidence jsonb) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v public.researcher_formula_versions; current_id uuid;
BEGIN
 SELECT * INTO v FROM public.researcher_formula_versions WHERE id = p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Candidate not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v.lane,0));
 SELECT * INTO v FROM public.researcher_formula_versions WHERE id = p_id FOR UPDATE;
 SELECT formula_id INTO current_id FROM public.researcher_formula_champions WHERE lane = v.lane FOR UPDATE;
 IF v.status <> 'CANDIDATE' OR current_id IS DISTINCT FROM p_expected_champion THEN RAISE EXCEPTION 'Candidate or champion changed; validate again'; END IF;
 PERFORM public.formula_assert_promotion(v.promotion_policy,p_evidence);
 UPDATE public.researcher_formula_versions SET status = 'RETIRED',retired_at = now() WHERE id = current_id AND status = 'ACTIVE_BEST';
 UPDATE public.researcher_formula_versions SET status = 'ACTIVE_BEST',validation_evidence = p_evidence,out_of_sample_metrics = jsonb_build_object('folds',p_evidence->'folds'),promoted_at = now() WHERE id = p_id;
 UPDATE public.researcher_formula_champions SET formula_id = p_id,revision = revision+1,updated_at = now() WHERE lane = v.lane;
 RETURN p_id;
END $$;

REVOKE ALL ON FUNCTION public.formula_assert_spec(jsonb),public.formula_assert_promotion(jsonb,jsonb),public.formula_version_guard(),public.formula_evidence_guard(),public.formula_champion_consistency(),public.formula_pointer_consistency(),public.formula_register_candidate(text,text,jsonb,integer,date,jsonb),public.formula_archive_candidate(uuid,text,integer,integer,jsonb,jsonb,text,boolean),public.formula_promote_candidate(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.formula_assert_spec(jsonb),public.formula_assert_promotion(jsonb,jsonb),public.formula_version_guard(),public.formula_evidence_guard(),public.formula_champion_consistency(),public.formula_pointer_consistency(),public.formula_register_candidate(text,text,jsonb,integer,date,jsonb),public.formula_archive_candidate(uuid,text,integer,integer,jsonb,jsonb,text,boolean),public.formula_promote_candidate(uuid,uuid,jsonb) TO service_role;

-- Original specialist seed weights, not currently evolved params or optional experiment gates.
-- Lead is its configured core seed, NOT an assertion that dynamic master rules were absent in 2021.
-- All default holds are the existing 3-session fallback; earlier lane-specific holds were illustrative.
INSERT INTO public.researcher_formula_versions(lane,version_number,version_tag,status,target_holding_days,formula_spec)
SELECT seed.lane,0,'v0_benchmark','V0_BENCHMARK',3,
 jsonb_build_object('schema_version',1,'engine','astr-weighted-factors-v1','weights',seed.weights,
 'gates',jsonb_build_object('min_score_to_trade',s.min_score_to_trade,'num_day_trades',greatest(1,s.num_day_trades),'rsi_min',NULL,'rsi_max',NULL,'atr_pct_min',NULL,'atr_pct_max',NULL,'rel_volume_min',NULL),
 'lookbacks','{}'::jsonb,'bands','[]'::jsonb,'provenance',jsonb_build_object('source',CASE WHEN seed.lane='lead' THEN 'app_settings configured core seed; master rules excluded' ELSE 'department.server.ts LANES.seed / laneSeedParams' END,'revision','6179678','kind','original_seed'))
FROM public.app_settings s CROSS JOIN LATERAL (VALUES
 ('lead',jsonb_build_object('trend',s.weight_trend,'momentum',s.weight_momentum,'volume',s.weight_volume,'relative_strength',s.weight_relative_strength,'volatility_quality',s.weight_volatility_quality)),
 ('trend','{"trend":35,"momentum":30,"relative_strength":20,"volume":15}'::jsonb),
 ('contrarian','{"pullback":30,"oversold_reversal":30,"down_streak":15,"volume_dryup":10,"trend":15}'::jsonb),
 ('consistency','{"return_stability":30,"positive_days":25,"low_drawdown":20,"atr_stability":10,"trend":15}'::jsonb),
 ('growth','{"growth_acceleration":30,"long_relative_strength":30,"sustained_advance":25,"momentum":15}'::jsonb),
 ('risk','{"reward_per_risk":30,"downside_protection":25,"worst_day":15,"liquidity_depth":15,"volatility_quality":15}'::jsonb),
 ('skeptic','{"trend":25,"momentum":25,"volatility_quality":20,"low_drawdown":15,"worst_day":15}'::jsonb)
) seed(lane,weights) WHERE s.id = 1 ON CONFLICT(lane,version_number) DO NOTHING;
INSERT INTO public.researcher_formula_champions(lane,formula_id) SELECT lane,id FROM public.researcher_formula_versions WHERE status = 'V0_BENCHMARK' ON CONFLICT(lane) DO NOTHING;
DO $$ BEGIN IF (SELECT count(*) FROM public.researcher_formula_champions) <> 7 THEN RAISE EXCEPTION 'All seven lane benchmarks are required'; END IF; END $$;
COMMENT ON TABLE public.researcher_formula_champions IS 'Paper-only registry; initially points to immutable V0 without changing its status. Disconnected from existing researcher books and broker execution.';
COMMENT ON COLUMN public.researcher_formula_versions.review_after_sessions IS '30 evaluated market sessions triggers review, not automatic failure; seasonality and immature long-horizon evidence must be considered.';