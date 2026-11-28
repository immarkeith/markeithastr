import { describe, expect, test } from 'bun:test';
import { ArchiveInputSchema, CandidateInputSchema, FORMULA_LANES, FormulaSpecSchema, HoldingSessionsSchema,
  PromotionEvidenceSchema, SeasonalityPatternSchema, assertPromotion, candidateReview } from './formula-evolution.types';

const candidateId = '00000000-0000-4000-8000-000000000001';
const championId = '00000000-0000-4000-8000-000000000002';
const spec = { schema_version: 1, engine: 'astr-weighted-factors-v1', weights: { trend: 35, momentum: 30, relative_strength: 20, volume: 15 },
  gates: { min_score_to_trade: 60, num_day_trades: 1, rsi_min: null, rsi_max: null, atr_pct_min: null, atr_pct_max: null, rel_volume_min: null },
  lookbacks: {}, bands: [], provenance: { source: 'unit-test', revision: 'test', kind: 'candidate' } };
const metrics = { total_return_pct: 10, annualized_return_pct: 8, sharpe: 1, sortino: 1.2, max_drawdown_pct: 10,
  profit_factor: 1.3, win_rate_pct: 55, trade_count: 50, trades_per_year: 50, alpha_vs_spy_pct: 2, friction_bps: 10, costs_included: true };
const better = { ...metrics, total_return_pct: 12, sharpe: 1.2 };
const policy = { min_trades: 30, min_sharpe_gain: 0.1, min_total_return_gain_pct: 1 };
function evidence() { return { candidate_id: candidateId, champion_id: championId, holding_sessions: 5, validation_run_id: 'test-run',
  data_fingerprint: 'authentic-fixture', protected_validation: true, point_in_time: true, stress_passed: true,
  folds: [
    { train_start: '2021-06-01', train_end: '2022-12-30', validation_start: '2023-01-03', validation_end: '2023-12-29', outcomes_through: '2024-01-10', regime: 'mixed', candidate: { ...better }, champion: { ...metrics } },
    { train_start: '2022-01-03', train_end: '2023-12-29', validation_start: '2024-01-02', validation_end: '2024-12-31', outcomes_through: '2025-01-10', regime: 'mixed', candidate: { ...better }, champion: { ...metrics } },
  ] }; }
describe('Phase 1 formula contracts', () => {
  test('seven independent operating lanes, no legacy momentum/influence managers', () => {
    expect([...FORMULA_LANES]).toEqual(['lead', 'trend', 'contrarian', 'consistency', 'growth', 'risk', 'skeptic']);
  });
  test('verified Trend seed weights and neutral original gates parse', () => { expect(FormulaSpecSchema.parse(spec).weights).toEqual({ trend: 35, momentum: 30, relative_strength: 20, volume: 15 }); });
  test('invalid total weights are rejected', () => { expect(() => FormulaSpecSchema.parse({ ...spec, weights: { trend: 70 } })).toThrow(); });
  test('reversed filters are rejected', () => { expect(() => FormulaSpecSchema.parse({ ...spec, gates: { ...spec.gates, rsi_min: 80, rsi_max: 55 } })).toThrow(); });
  test('all approved holding durations including 180 sessions parse', () => { for (const n of [1, 3, 5, 10, 20, 60, 180]) expect(HoldingSessionsSchema.parse(n)).toBe(n); expect(() => HoldingSessionsSchema.parse(0)).toThrow(); });
  test('candidate cannot impersonate original benchmark', () => { expect(() => CandidateInputSchema.parse({ lane: 'trend', hypothesis_name: 'x', formula_spec: { ...spec, provenance: { ...spec.provenance, kind: 'original_seed' } }, target_holding_days: 5, evaluation_start: '2021-06-01', promotion_policy: policy })).toThrow(); });
  test('29 sessions remains testing; 30 requires review rather than automatic deletion', () => { expect(candidateReview(29, 20, 20)).toBe('TESTING'); expect(candidateReview(30, 20, 20)).toBe('REVIEW_REQUIRED'); });
  test('30 sessions with immature 180-session outcomes is insufficient evidence, not failure', () => { expect(candidateReview(30, 20, 0)).toBe('INSUFFICIENT_EVIDENCE'); });
  test('no opportunities cannot imply permanent defectiveness', () => { expect(candidateReview(30, 0, 0)).toBe('INSUFFICIENT_EVIDENCE'); });
  test('archiving keeps seasonal context and allows reconsideration', () => { const a = ArchiveInputSchema.parse({ candidate_id: candidateId, reason: 'Review paused: immature outcomes', evaluated_sessions: 30, opportunities: 0, metrics: {}, regime_context: { regime: 'summer' }, seasonal_niche: 'summer', resurrectable: true }); expect(a.resurrectable).toBe(true); expect(a.regime_context).toEqual({ regime: 'summer' }); });
  test('promotion requires meaningful return and risk-adjusted gains', () => { expect(assertPromotion(policy, evidence()).folds).toHaveLength(2); const e = evidence(); for (const f of e.folds) f.candidate.sharpe = 1; expect(() => assertPromotion(policy, e)).toThrow(); });
  test('higher return cannot excuse greater drawdown', () => { const e = evidence(); for (const f of e.folds) f.candidate.max_drawdown_pct = 11; expect(() => assertPromotion(policy, e)).toThrow(); });
  test('friction must be identical and included', () => { const e = evidence(); for (const f of e.folds) f.candidate.friction_bps = 0; expect(() => assertPromotion(policy, e)).toThrow(); });
  test('insufficient samples cannot promote', () => { const e = evidence(); for (const f of e.folds) f.candidate.trade_count = 29; expect(() => assertPromotion(policy, e)).toThrow(); });
  test('validation cannot overlap its training window', () => { const e = evidence(); const f = e.folds[0]; if (!f) throw new Error('Fixture missing'); f.train_end = f.validation_start; expect(() => PromotionEvidenceSchema.parse(e)).toThrow(); });
  test('validation periods cannot overlap each other', () => { const e = evidence(); const f = e.folds[1]; if (!f) throw new Error('Fixture missing'); f.validation_start = '2023-01-03'; expect(() => PromotionEvidenceSchema.parse(e)).toThrow(); });
  test('validation claims without point-in-time protection fail', () => { expect(() => PromotionEvidenceSchema.parse({ ...evidence(), point_in_time: false })).toThrow(); });
  test('seasonal evidence requires multiple distinct years', () => { const observation = { year: 2021, period: 'June', observations: 20, return_in_pct: -2, return_out_pct: 1, source: 'daily_bars' }; const p = { lane: 'trend', pattern_type: 'CALENDAR_MONTH', identifier: 'June', evidence_summary: 'fixture', evidence: [observation, { ...observation, year: 2022 }], status: 'HYPOTHESIS' }; expect(SeasonalityPatternSchema.parse(p).evidence).toHaveLength(2); expect(() => SeasonalityPatternSchema.parse({ ...p, evidence: [observation, observation] })).toThrow(); });
});