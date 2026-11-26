import { expect, test } from 'bun:test';
import { ledgerSeries, ledgerWindow, recordedLedger } from './ledger-chart';

const points = [{ date: '2026-11-12', equity: 10 }, { date: '2026-11-13', equity: 12 }];
test('Today ends on the saved Friday close on Sunday, not a fabricated weekend point', () => {
  expect(ledgerWindow(points, '2026-11-15', '2026-11-15', true)).toEqual({ from: '2026-11-13', until: '2026-11-13' });
});
test('a single saved session keeps its change from the previous recorded close', () => {
  expect(ledgerSeries(points, '2026-11-13', '2026-11-13', 1, false)).toEqual([{ day: '2026-11-13', daily: 2, cumulative: 2 }]);
});
test('an empty window stays empty rather than reconstructing trades', () => {
  expect(ledgerSeries(points, '2026-12-01', '2026-12-31', 1, false)).toEqual([]);
});
test('weekly display retains the actual saved session date and final level', () => {
  expect(ledgerSeries(points, '2026-11-01', '2026-11-30', 1, true)).toEqual([{ day: '2026-11-13', daily: 2, cumulative: 2 }]);
});
test('a stale ledger outside the requested period does not reverse its date range', () => {
  expect(ledgerWindow(points, '2026-11-20', '2026-11-26')).toEqual({ from: '2026-11-20', until: '2026-11-26' });
});
test('trade reconstructions cannot impersonate a recorded researcher ledger', () => {
  expect(recordedLedger({ source: 'trade_reconstruction', points })).toBeNull();
  expect(recordedLedger({ points })).toBeNull();
  const saved = { source: 'ledger', points };
  expect(recordedLedger(saved)).toBe(saved);
});