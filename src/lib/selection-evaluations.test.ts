import { describe, expect, test } from 'bun:test';
import { aggregateSelectionRates, CARD_HORIZONS, type EvaluationMetricRow } from './selection-evaluations';
const row = (patch: Partial<EvaluationMetricRow> = {}): EvaluationMetricRow => ({
  lane: 'trend', session_date: '2026-01-02', horizon_sessions: 20, status: 'matured',
  entry_date: '2026-01-05', exit_date: '2026-02-02', matured_at: '2026-02-02T22:00:00Z',
  return_pct: 4, excess_return_pct: 2, ...patch,
});
const asOf = '2026-11-21T09:55:00Z';
describe('Layer 2 card metrics', () => {
  test('1M is 20 sessions and 3M is 60, not calendar months', () => {
    expect(CARD_HORIZONS).toEqual({ '1M': 20, '3M': 60, '9M': 180 });
    const rates = aggregateSelectionRates([row(), row({ horizon_sessions: 60, return_pct: -3 })], asOf)['trend'];
    expect(rates?.[0]?.win_rate).toBe(100);
    expect(rates?.[1]?.win_rate).toBe(0);
  });
  test('positive returns win; zero and negative returns do not', () => {
    const rate = aggregateSelectionRates([row(), row({ return_pct: 0 }), row({ return_pct: -1 })], asOf)['trend']?.[0];
    expect(rate).toMatchObject({ wins: 1, completed: 3, win_rate: 33.3, avg_return_pct: 1 });
  });
  test('pending and missing or quarantined outcomes never enter the denominator', () => {
    const rate = aggregateSelectionRates([row(), row({ status: 'pending' }), row({ status: 'missing_bar' }), row({ status: 'quarantined' })], asOf)['trend']?.[0];
    expect(rate).toMatchObject({ completed: 1, pending: 1, excluded: 2, win_rate: 100 });
  });
  test('future exits and maturity timestamps cannot leak into results', () => {
    const rate = aggregateSelectionRates([row({ exit_date: '2026-11-23' }), row({ matured_at: '2026-11-21T10:00:00Z' }), row({ entry_date: '2026-01-02' })], asOf)['trend']?.[0];
    expect(rate).toMatchObject({ completed: 0, excluded: 3, win_rate: null });
  });
  test('missing benchmark stays unavailable rather than averaging in a zero', () => {
    const rate = aggregateSelectionRates([row(), row({ excess_return_pct: null, return_pct: -1 })], asOf)['trend']?.[0];
    expect(rate).toMatchObject({ completed: 2, benchmark_completed: 1, avg_excess_return_pct: 2, excess_wins: 1 });
  });
  test('unrecorded 9M horizons are not presented as maturing predictions', () => {
    const rate = aggregateSelectionRates([row()], asOf)['trend']?.[2];
    expect(rate).toMatchObject({ available: false, completed: 0, pending: 0, win_rate: null });
  });
  test('all records beyond 1000 count and inputs remain immutable', () => {
    const rows = Array.from({ length: 1501 }, () => row());
    const original = JSON.stringify(rows);
    expect(aggregateSelectionRates(rows, asOf)['trend']?.[0]?.completed).toBe(1501);
    expect(JSON.stringify(rows)).toBe(original);
  });
  test('lanes are isolated and nonfinite returns excluded', () => {
    const rates = aggregateSelectionRates([row(), row({ lane: 'lead', return_pct: -1 }), row({ return_pct: NaN })], asOf);
    expect(rates['trend']?.[0]).toMatchObject({ completed: 1, wins: 1, excluded: 1 });
    expect(rates['lead']?.[0]).toMatchObject({ completed: 1, wins: 0 });
  });
});