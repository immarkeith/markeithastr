import { test, expect } from 'bun:test';
import { HISTORY_VERSION, parseLabHistory } from './lab-history';
import { SELECTION_LANES } from './selection-curve';
const snapshot = {
  from: '2026-11-19', to: '2026-11-20', selection_to: '2026-11-19',
  universe: 563, universe_basis: 'comparable cached cohort', selection_sessions: 1, market_sessions: 2,
  generated_at: '2026-11-21T00:00:00Z', version: HISTORY_VERSION,
  curves: SELECTION_LANES.map(lane => ({ lane, points: [{ date: '2026-11-19', equity: 0 }, { date: '2026-11-20', equity: 2 }],
    trades: 1, wins: 1, total_pnl: 2, pending: 0, excluded: 0, no_pick: 0, missing_evaluations: 0, has_gaps: false })),
};
test('valid seven-lane saved evidence retains its exact values', () => {
  expect(parseLabHistory(snapshot)).toEqual(snapshot);
});
test('null, incomplete, and old snapshots are unavailable rather than fabricated zero results', () => {
  for (const value of [null, {}, { ...snapshot, universe: null }, { ...snapshot, selection_sessions: undefined }, { ...snapshot, version: 'legacy' }]) expect(parseLabHistory(value)).toBeNull();
});
test('invalid or incomplete curve evidence is rejected', () => {
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.slice(1) })).toBeNull();
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.map(c => ({ ...c, total_pnl: NaN })) })).toBeNull();
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.map(c => ({ ...c, points: null })) })).toBeNull();
});
test('duplicate lanes and reversed sessions cannot be served', () => {
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.map(c => ({ ...c, lane: 'lead' })) })).toBeNull();
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.map(c => ({ ...c, points: [...c.points].reverse() })) })).toBeNull();
});
test('wins and session counts must be consistent with stored evidence', () => {
  expect(parseLabHistory({ ...snapshot, curves: snapshot.curves.map(c => ({ ...c, wins: 2 })) })).toBeNull();
  expect(parseLabHistory({ ...snapshot, market_sessions: 3 })).toBeNull();
});