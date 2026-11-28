CREATE OR REPLACE FUNCTION public.formula_input_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE g jsonb; item jsonb; k text;
BEGIN
 IF TG_TABLE_NAME = 'researcher_formula_versions' THEN
  g := NEW.formula_spec->'gates';
  IF jsonb_typeof(g->'min_score_to_trade') IS DISTINCT FROM 'number' OR jsonb_typeof(g->'num_day_trades') IS DISTINCT FROM 'number' OR (g->>'num_day_trades')::numeric <> trunc((g->>'num_day_trades')::numeric) THEN RAISE EXCEPTION 'Numeric score and integer pick count required'; END IF;
  FOREACH k IN ARRAY ARRAY['rsi_min','rsi_max','atr_pct_min','atr_pct_max','rel_volume_min'] LOOP
   IF jsonb_typeof(g->k) NOT IN ('number','null') OR (g->>k)::numeric < 0 OR (k IN ('rsi_min','rsi_max') AND (g->>k)::numeric > 100) THEN RAISE EXCEPTION 'Invalid numeric gate'; END IF;
  END LOOP;
  FOR k,item IN SELECT key,value FROM jsonb_each(NEW.formula_spec->'lookbacks') LOOP
   IF jsonb_typeof(item) IS DISTINCT FROM 'number' OR item::numeric < 1 OR item::numeric <> trunc(item::numeric) THEN RAISE EXCEPTION 'Positive integer lookbacks required'; END IF;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.formula_spec->'bands') LOOP
   IF length(coalesce(item->>'factor','')) = 0 OR jsonb_typeof(item->'low') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'high') IS DISTINCT FROM 'number' OR (item->>'low')::numeric > (item->>'high')::numeric THEN RAISE EXCEPTION 'Invalid indicator band'; END IF;
  END LOOP;
  IF NEW.version_number > 0 AND (NEW.formula_spec->'provenance'->>'kind' IS DISTINCT FROM 'candidate' OR jsonb_typeof(NEW.promotion_policy->'min_trades') IS DISTINCT FROM 'number' OR coalesce((NEW.promotion_policy->>'min_trades')::integer,0) <= 0 OR coalesce((NEW.promotion_policy->>'min_sharpe_gain')::numeric,0) <= 0 OR coalesce((NEW.promotion_policy->>'min_total_return_gain_pct')::numeric,0) <= 0) THEN RAISE EXCEPTION 'Candidate provenance and frozen policy required'; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('RETIRED','ARCHIVED_EXPERIMENT') AND (to_jsonb(NEW) - ARRAY['status','retired_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','retired_at']) THEN RAISE EXCEPTION 'Retirement cannot rewrite validation evidence'; END IF;
 ELSIF TG_TABLE_NAME = 'researcher_formula_experiments' THEN
  IF NOT EXISTS(SELECT 1 FROM public.researcher_formula_versions v WHERE v.id = NEW.formula_id AND v.lane = NEW.lane AND v.status = 'CANDIDATE' AND v.formula_spec = NEW.formula_spec AND v.version_tag = NEW.hypothesis_name AND v.target_holding_days = NEW.target_holding_days) THEN RAISE EXCEPTION 'Archive must preserve exact candidate definition'; END IF;
 ELSIF TG_TABLE_NAME = 'researcher_seasonality_patterns' THEN
  IF (SELECT count(DISTINCT value->>'year') FROM jsonb_array_elements(NEW.evidence)) < 2 THEN RAISE EXCEPTION 'Seasonal evidence requires separate years'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.evidence) LOOP
   IF jsonb_typeof(item->'year') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'observations') IS DISTINCT FROM 'number' OR (item->>'observations')::integer < 1 OR length(coalesce(item->>'period','')) = 0 OR length(coalesce(item->>'source','')) = 0 OR jsonb_typeof(item->'return_in_pct') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'return_out_pct') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Authentic seasonal observation fields required'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER formula_input_guard BEFORE INSERT OR UPDATE ON public.researcher_formula_versions FOR EACH ROW EXECUTE FUNCTION public.formula_input_guard();
CREATE TRIGGER formula_archive_input_guard BEFORE INSERT ON public.researcher_formula_experiments FOR EACH ROW EXECUTE FUNCTION public.formula_input_guard();
CREATE TRIGGER formula_season_input_guard BEFORE INSERT ON public.researcher_seasonality_patterns FOR EACH ROW EXECUTE FUNCTION public.formula_input_guard();
REVOKE ALL ON FUNCTION public.formula_input_guard() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.formula_input_guard() TO service_role;

CREATE OR REPLACE FUNCTION public.formula_archive_candidate(p_id uuid,p_reason text,p_sessions integer,p_opportunities integer,p_metrics jsonb,p_regime jsonb,p_niche text DEFAULT NULL,p_resurrectable boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
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