import { z } from 'zod';

export const FORMULA_LANES = ['lead', 'trend', 'contrarian', 'consistency', 'growth', 'risk', 'skeptic'] as const;
export const FormulaLaneSchema = z.enum(FORMULA_LANES);
export type FormulaLane = z.infer<typeof FormulaLaneSchema>;
export const LifecycleStatusSchema = z.enum(['V0_BENCHMARK', 'CANDIDATE', 'ACTIVE_BEST', 'ARCHIVED_EXPERIMENT', 'RETIRED']);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;
export const HOLDING_SESSIONS = [1, 3, 5, 10, 20, 60, 180] as const;
export const HoldingSessionsSchema = z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(10), z.literal(20), z.literal(60), z.literal(180)]);
export const CANDIDATE_REVIEW_SESSIONS = 30;

const finite = z.number().finite();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
const gateSchema = z.object({
  min_score_to_trade: finite.min(0).max(100), num_day_trades: finite.int().positive(),
  rsi_min: finite.min(0).max(100).nullable(), rsi_max: finite.min(0).max(100).nullable(),
  atr_pct_min: finite.nonnegative().nullable(), atr_pct_max: finite.nonnegative().nullable(),
  rel_volume_min: finite.nonnegative().nullable(),
}).strict().refine(g => g.rsi_min === null || g.rsi_max === null || g.rsi_min <= g.rsi_max, 'Reversed RSI gates')
  .refine(g => g.atr_pct_min === null || g.atr_pct_max === null || g.atr_pct_min <= g.atr_pct_max, 'Reversed ATR gates');

/** Data, not executable JavaScript. New indicator execution belongs to Phase 2. */
export const FormulaSpecSchema = z.object({
  schema_version: z.literal(1), engine: z.literal('astr-weighted-factors-v1'),
  weights: z.record(z.string().min(1), finite.min(0).max(100)).refine(weights =>
    Object.keys(weights).length > 0 && Math.abs(Object.values(weights).reduce((a, b) => a + b, 0) - 100) < 0.001,
  'Weights must total 100'),
  gates: gateSchema,
  lookbacks: z.record(z.string().min(1), finite.int().positive()),
  bands: z.array(z.object({ factor: z.string().min(1), low: finite, high: finite }).strict()
    .refine(b => b.low <= b.high, 'Reversed band')),
  provenance: z.object({ source: z.string().min(1), revision: z.string().min(1), kind: z.enum(['original_seed', 'candidate']) }).strict(),
}).strict();
export type FormulaSpec = z.infer<typeof FormulaSpecSchema>;

export const FormulaMetricsSchema = z.object({
  total_return_pct: finite, annualized_return_pct: finite, sharpe: finite, sortino: finite,
  max_drawdown_pct: finite.min(0).max(100), profit_factor: finite.nonnegative(), win_rate_pct: finite.min(0).max(100),
  trade_count: finite.int().nonnegative(), trades_per_year: finite.nonnegative(), alpha_vs_spy_pct: finite,
  friction_bps: finite.nonnegative(), costs_included: z.literal(true),
}).strict();
export type FormulaMetrics = z.infer<typeof FormulaMetricsSchema>;

/** Freeze the comparison policy before looking at validation results. No invented default improvement threshold. */
export const PromotionPolicySchema = z.object({ min_trades: finite.int().positive(), min_sharpe_gain: finite.positive(), min_total_return_gain_pct: finite.positive() }).strict();
export type PromotionPolicy = z.infer<typeof PromotionPolicySchema>;
export const ValidationFoldSchema = z.object({
  train_start: isoDate, train_end: isoDate, validation_start: isoDate, validation_end: isoDate,
  outcomes_through: isoDate, candidate: FormulaMetricsSchema, champion: FormulaMetricsSchema,
  regime: z.string().min(1),
}).strict().refine(f => f.train_start <= f.train_end && f.train_end < f.validation_start &&
  f.validation_start <= f.validation_end && f.validation_end <= f.outcomes_through, 'Training, validation and outcome dates must be chronological');
export const PromotionEvidenceSchema = z.object({
  candidate_id: z.string().uuid(), champion_id: z.string().uuid(), holding_sessions: HoldingSessionsSchema,
  validation_run_id: z.string().min(1), data_fingerprint: z.string().min(1),
  protected_validation: z.literal(true), point_in_time: z.literal(true),
  folds: z.array(ValidationFoldSchema).min(2), stress_passed: z.literal(true),
}).strict().refine(e => e.folds.every((f, i) => i === 0 || (e.folds[i - 1]?.validation_end ?? '') < f.validation_start), 'Validation folds must not overlap');
export type PromotionEvidence = z.infer<typeof PromotionEvidenceSchema>;
export const CandidateInputSchema = z.object({
  lane: FormulaLaneSchema, hypothesis_name: z.string().trim().min(1).max(200),
  formula_spec: FormulaSpecSchema, target_holding_days: HoldingSessionsSchema,
  evaluation_start: isoDate, promotion_policy: PromotionPolicySchema,
}).strict().refine(c => c.formula_spec.provenance.kind === 'candidate', 'Candidate provenance required');
export type CandidateInput = z.infer<typeof CandidateInputSchema>;
export const ArchiveInputSchema = z.object({
  candidate_id: z.string().uuid(), reason: z.string().trim().min(1), evaluated_sessions: finite.int().nonnegative(),
  opportunities: finite.int().nonnegative(), metrics: z.record(z.unknown()), regime_context: z.record(z.unknown()),
  seasonal_niche: z.string().nullable(), resurrectable: z.boolean(),
}).strict();
export type ExperimentArchiveRecord = z.infer<typeof ArchiveInputSchema>;
export const SeasonalityPatternSchema = z.object({
  lane: FormulaLaneSchema, pattern_type: z.enum(['CALENDAR_MONTH', 'QUARTERLY', 'SECTOR_CYCLE', 'EVENT_WINDOW']),
  identifier: z.string().min(1), evidence_summary: z.string().min(1),
  evidence: z.array(z.object({ year: finite.int().min(1900), period: z.string().min(1), observations: finite.int().positive(),
    return_in_pct: finite, return_out_pct: finite, source: z.string().min(1) }).strict()).min(2),
  status: z.enum(['HYPOTHESIS', 'VALIDATED', 'REJECTED']),
}).strict().refine(p => new Set(p.evidence.map(e => e.year)).size >= 2, 'Seasonal evidence requires separate years');
export type SeasonalityPattern = z.infer<typeof SeasonalityPatternSchema>;

export function assertPromotion(policyInput: unknown, evidenceInput: unknown): PromotionEvidence {
  const p = PromotionPolicySchema.parse(policyInput);
  const e = PromotionEvidenceSchema.parse(evidenceInput);
  for (const f of e.folds) {
    const a = f.candidate, b = f.champion;
    if (a.trade_count < p.min_trades || b.trade_count < p.min_trades || a.friction_bps !== b.friction_bps ||
      a.sharpe - b.sharpe < p.min_sharpe_gain || a.total_return_pct - b.total_return_pct < p.min_total_return_gain_pct ||
      a.sortino < b.sortino || a.max_drawdown_pct > b.max_drawdown_pct || a.profit_factor < b.profit_factor ||
      a.annualized_return_pct < b.annualized_return_pct || a.alpha_vs_spy_pct < b.alpha_vs_spy_pct) {
      throw new Error('Candidate lacks meaningful, comparable multi-metric improvement');
    }
  }
  return e;
}

/** The review window never invents results for a holding period that has not matured. */
export function candidateReview(evaluatedSessions: number, opportunities: number, maturedOutcomes: number) {
  for (const n of [evaluatedSessions, opportunities, maturedOutcomes]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid evaluation counts');
  }
  if (evaluatedSessions < CANDIDATE_REVIEW_SESSIONS) return 'TESTING' as const;
  if (opportunities === 0 || maturedOutcomes === 0) return 'INSUFFICIENT_EVIDENCE' as const;
  return 'REVIEW_REQUIRED' as const;
}