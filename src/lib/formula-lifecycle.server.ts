/** Private Phase 1 registry only. No route, scheduler, broker or existing scorer imports this module. */
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { Database, Json } from '@/integrations/supabase/types';
import {
  ArchiveInputSchema, CandidateInputSchema, FORMULA_LANES, FormulaLaneSchema,
  FormulaSpecSchema, SeasonalityPatternSchema, assertPromotion,
  type FormulaLane, type PromotionEvidence,
} from './formula-evolution.types';

type FormulaVersion = Database['public']['Tables']['researcher_formula_versions']['Row'];
function json(value: unknown): Json { return JSON.parse(JSON.stringify(value)) as Json; }
function checked(row: FormulaVersion): FormulaVersion {
  FormulaSpecSchema.parse(row.formula_spec);
  return row;
}

export async function getV0Benchmark(lane: FormulaLane): Promise<FormulaVersion> {
  const { data, error } = await supabaseAdmin.from('researcher_formula_versions')
    .select('*').eq('lane', FormulaLaneSchema.parse(lane)).eq('version_number', 0).single();
  if (error || !data) throw new Error(error?.message ?? 'Benchmark not installed');
  return checked(data);
}

export async function getActiveBestFormula(lane: FormulaLane): Promise<FormulaVersion> {
  const { data: pointer, error: pointerError } = await supabaseAdmin.from('researcher_formula_champions')
    .select('formula_id').eq('lane', FormulaLaneSchema.parse(lane)).single();
  if (pointerError || !pointer) throw new Error(pointerError?.message ?? 'Champion not installed');
  const { data, error } = await supabaseAdmin.from('researcher_formula_versions')
    .select('*').eq('lane', lane).eq('id', pointer.formula_id).single();
  if (error || !data) throw new Error(error?.message ?? 'Champion definition missing');
  if (data.status !== 'ACTIVE_BEST' && data.status !== 'V0_BENCHMARK') throw new Error('Invalid champion state');
  return checked(data);
}

/** Idempotent verification, not lazy seeding. Literal benchmark seeds belong to the migration. */
export async function verifyFormulaInitialization() {
  const results = [];
  for (const lane of FORMULA_LANES) {
    const benchmark = await getV0Benchmark(lane);
    const champion = await getActiveBestFormula(lane);
    results.push({ lane, benchmark_id: benchmark.id, champion_id: champion.id, champion_status: champion.status });
  }
  return results;
}

export async function registerCandidateFormula(input: unknown) {
  const c = CandidateInputSchema.parse(input);
  const { data, error } = await supabaseAdmin.rpc('formula_register_candidate', {
    p_lane: c.lane, p_name: c.hypothesis_name, p_spec: json(c.formula_spec),
    p_holding: c.target_holding_days, p_start: c.evaluation_start, p_policy: json(c.promotion_policy),
  });
  if (error || !data) throw new Error(error?.message ?? 'Candidate registration failed');
  return checked(data);
}

export async function retireCandidateToExperiment(input: unknown) {
  const a = ArchiveInputSchema.parse(input);
  const { data, error } = await supabaseAdmin.rpc('formula_archive_candidate', {
    p_id: a.candidate_id, p_reason: a.reason, p_sessions: a.evaluated_sessions,
    p_opportunities: a.opportunities, p_metrics: json(a.metrics), p_regime: json(a.regime_context),
    ...(a.seasonal_niche === null ? {} : { p_niche: a.seasonal_niche }), p_resurrectable: a.resurrectable,
  });
  if (error || !data) throw new Error(error?.message ?? 'Candidate archive failed');
  return data;
}

/** Evidence must come from the protected Phase 2 validator, not an AI claim or UI toggle. */
export async function promoteCandidateToActiveBest(candidateId: string, input: PromotionEvidence) {
  const { data: candidate, error: candidateError } = await supabaseAdmin.from('researcher_formula_versions')
    .select('*').eq('id', candidateId).single();
  if (candidateError || !candidate) throw new Error(candidateError?.message ?? 'Candidate not found');
  if (candidate.status !== 'CANDIDATE') throw new Error('Only candidates may be promoted');
  const lane = FormulaLaneSchema.parse(candidate.lane);
  const champion = await getActiveBestFormula(lane);
  const evidence = assertPromotion(candidate.promotion_policy, input);
  if (evidence.candidate_id !== candidateId || evidence.champion_id !== champion.id ||
    evidence.holding_sessions !== candidate.target_holding_days) throw new Error('Validation identities or holding duration changed');
  const { data, error } = await supabaseAdmin.rpc('formula_promote_candidate', {
    p_id: candidateId, p_expected_champion: champion.id, p_evidence: json(evidence),
  });
  if (error || !data) throw new Error(error?.message ?? 'Candidate promotion failed');
  return data;
}

export async function recordSeasonalityPattern(input: unknown) {
  const p = SeasonalityPatternSchema.parse(input);
  if (p.status !== 'HYPOTHESIS') throw new Error('Seasonal validation is not implemented in Phase 1');
  const { data, error } = await supabaseAdmin.from('researcher_seasonality_patterns')
    .insert({ ...p, evidence: json(p.evidence) }).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Seasonal evidence registration failed');
  return data.id;
}