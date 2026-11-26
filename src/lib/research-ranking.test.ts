import { expect, test } from 'bun:test';
import { buildPanel, scoreWith, passesFilters, type LaneParams, type PanelRow } from './department.server';
import { FACTOR_KEYS } from './factors';
import type { Settings } from './scan.server';

const params: LaneParams = { weights: { trend: 40, momentum: 60 }, min_score_to_trade: 0, num_day_trades: 1, rsi_max: null, rsi_min: null, atr_pct_min: null, atr_pct_max: null, rel_volume_min: null };
const row: PanelRow = { ticker: 'A', date: '2026-11-25', pct: Object.fromEntries(FACTOR_KEYS.map(key => [key, key === 'trend' ? 50 : key === 'momentum' ? 80 : 0])) as PanelRow['pct'], close: 20, avg_dollar_volume: 1e9, atr_pct: 3.5, rsi14: 40, rel_volume: 2, forward_return: 999, forward: { 1: 999 }, same_day: 999, benchmark_return: 999 };

test('research scores use factor contributions, never forward outcomes', () => {
  expect(scoreWith(row, params.weights)).toBe(68);
  expect(scoreWith({ ...row, forward_return: -999, forward: { 1: -999 }, same_day: -999, benchmark_return: -999 }, params.weights)).toBe(68);
});
test('configured research RSI and ATR gates reject values above their boundary', () => {
  const settings = { min_price: 10, min_avg_dollar_volume: 1e6 } as Settings;
  const gated = { ...params, rsi_max: 40, atr_pct_max: 3.5 };
  expect(passesFilters(row, gated, settings, 1)).toBe(true);
  expect(passesFilters({ ...row, rsi14: 40.01 }, gated, settings, 1)).toBe(false);
  expect(passesFilters({ ...row, atr_pct: 3.51 }, gated, settings, 1)).toBe(false);
});

test('incremental research features equal full-history features and ignore future bars', async () => {
  const dates = Array.from({ length: 220 }, (_, i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
  const bars: [string, number, number, number, number, number][] = dates.map((date, i) => {
    const close = 100 + i / 10 + Math.sin(i) * 2;
    return [date, close - 0.2, close + 2, close - 2, close, 1e6];
  });
  const cutoff = dates[209];
  if (!cutoff) throw new Error('Fixture needs its cutoff');
  const raw = [{ ticker: 'A', bars }, { ticker: 'SPY', bars }];
  const full = await buildPanel(2, 'SPY', 220, raw);
  const incremental = await buildPanel(2, 'SPY', 220, raw, cutoff);
  expect(incremental.rows.length).toBe(20);
  expect(incremental.rows).toEqual(full.rows.filter(point => point.date > cutoff));
  const future = [...bars, ['2027-01-01', 10000, 11000, 9000, 10500, 1e9] as [string, number, number, number, number, number]];
  const extended = await buildPanel(2, 'SPY', 221, [{ ticker: 'A', bars: future }, { ticker: 'SPY', bars: future }]);
  const original = full.rows.find(point => point.date === cutoff && point.ticker === 'A');
  const after = extended.rows.find(point => point.date === cutoff && point.ticker === 'A');
  if (!original || !after) throw new Error('Required historical research feature is missing');
  expect(original.pct.trend).toBeGreaterThan(0);
  expect(original.pct).toEqual(after.pct);
  expect(original.rsi14).toBe(after.rsi14);
});