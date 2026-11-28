import { test, expect } from 'bun:test';
import { buildSelectionHistoryCurve, type SelectionRecord, type CurveEvaluation } from './selection-curve';
const calendar = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
const asOf = '2026-11-22T09:15:00Z';
const pick: SelectionRecord = { lane: 'lead', session_date: '2026-11-16', selected_at: '2026-11-16T21:05:00Z', ticker: 'ABC', comparable_universe: 563, universe_basis: 'unverified', engine_version: 'sel-v1' };
const result: CurveEvaluation = { lane: 'lead', session_date: pick.session_date, ticker: 'ABC', horizon_sessions: 1, status: 'matured', entry_date: '2026-11-17', exit_date: '2026-11-17', entry_price: 100, exit_price: 110, return_pct: 10, matured_at: '2026-11-17T22:00:00Z' };
const build = (p: SelectionRecord[] = [pick], r: CurveEvaluation[] = [result]) => buildSelectionHistoryCurve('lead', p, r, calendar, asOf);
test('$20 fixed stake yields $2 at next-session close, never selection day', () => {
  expect(build().points).toEqual([{ date: calendar[0], equity: 0 }, { date: calendar[1], equity: 2 }, { date: calendar[2], equity: 2 }, { date: calendar[3], equity: 2 }]);
  expect(build().total_pnl).toBe(2); expect(build().trades).toBe(1);
});
test('levels carry forward without repeatedly adding an old mark', () => {
  expect(build().points.at(-1)?.equity).toBe(2);
});
test('no-pick days are flat and not wins or trades', () => {
  const c = build([{ ...pick, ticker: null }], []);
  expect(c.no_pick).toBe(1); expect(c.trades).toBe(0); expect(c.points.at(-1)?.equity).toBe(0);
});
test('pending and missing prices do not fabricate breakeven outcomes', () => {
  const p = { ...pick, session_date: '2026-11-17' };
  const c = build([pick, p], [{ ...result, status: 'pending' }, { ...result, session_date: p.session_date, status: 'missing_bar' }]);
  expect(c.pending).toBe(1); expect(c.excluded).toBe(1); expect(c.trades).toBe(0); expect(c.has_gaps).toBe(true);
});
test('negative and zero returns are non-wins', () => {
  expect(build([pick], [{ ...result, exit_price: 90, return_pct: -10 }]).total_pnl).toBe(-2);
  expect(build([pick], [{ ...result, exit_price: 100, return_pct: 0 }]).wins).toBe(0);
  expect(build().wins).toBe(1);
});
test('look-ahead, wrong horizon, and late selections are excluded', () => {
  for (const r of [{ ...result, entry_date: pick.session_date }, { ...result, exit_date: '2026-11-18' }, { ...result, matured_at: '2026-11-23T00:00:00Z' }]) expect(build([pick], [r]).trades).toBe(0);
  expect(build([{ ...pick, selected_at: '2026-11-17T16:00:00Z' }]).excluded).toBe(1);
  expect(build([pick], [{ ...result, horizon_sessions: 20 }]).missing_evaluations).toBe(1);
});
test('X08 winter selections at 9:15 Eastern are valid but the opening bell is too late', () => {
  expect(build([{ ...pick, selected_at: '2026-11-17T14:15:00Z' }]).trades).toBe(1);
  expect(build([{ ...pick, selected_at: '2026-11-17T14:30:00Z' }]).excluded).toBe(1);
});
test('X08 summer uses the 13:30 UTC opening bell', () => {
  const p = { ...pick, session_date: '2026-07-06', selected_at: '2026-07-07T13:15:00Z' };
  const r = { ...result, session_date: p.session_date, entry_date: '2026-07-07', exit_date: '2026-07-07', matured_at: '2026-07-07T21:00:00Z' };
  expect(buildSelectionHistoryCurve('lead', [p], [r], ['2026-07-06', '2026-07-07'], asOf).trades).toBe(1);
  expect(buildSelectionHistoryCurve('lead', [{ ...p, selected_at: '2026-07-07T13:30:00Z' }], [r], ['2026-07-06', '2026-07-07'], asOf).excluded).toBe(1);
});
test('invalid prices or inconsistent recorded return are excluded', () => {
  for (const r of [{ ...result, entry_price: 0 }, { ...result, exit_price: NaN }, { ...result, return_pct: 99 }]) expect(build([pick], [r]).excluded).toBe(1);
});
test('lane and ticker identity remain isolated', () => {
  expect(build([pick], [{ ...result, lane: 'risk' }]).trades).toBe(0);
  expect(build([pick], [{ ...result, ticker: 'XYZ' }]).excluded).toBe(1);
});
test('duplicate evidence cannot silently double-count or replace a pick', () => {
  expect(() => build([pick, pick])).toThrow('Duplicate daily selection');
  expect(() => build([pick], [result, result])).toThrow('Duplicate same-day evaluation');
});
test('more than 1000 records are preserved', () => {
  const dates = Array.from({ length: 1002 }, (_, i) => new Date(Date.UTC(2020, 0, i + 1)).toISOString().slice(0, 10));
  const picks = dates.slice(0, -1).map(d => ({ ...pick, session_date: d, selected_at: `${d}T21:05:00Z` }));
  const rows = picks.map((p, i) => ({ ...result, session_date: p.session_date, entry_date: dates[i + 1] ?? null, exit_date: dates[i + 1] ?? null, matured_at: '2024-01-01T00:00:00Z' }));
  const c = buildSelectionHistoryCurve('lead', picks, rows, dates, asOf);
  expect(c.trades).toBe(1001); expect(c.total_pnl).toBe(2002);
});
