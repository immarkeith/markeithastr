import { expect, test } from 'bun:test';
import { beforeSignal, inputBoundary } from './research-boundary';

test('entry-session and future prices cannot enter historical research inputs', () => {
  const bars = [{ date: '2026-11-12', close: 100 }, { date: '2026-11-13', close: 200 }, { date: '2026-11-16', close: 300 }];
  expect(beforeSignal(bars, '2026-11-13')).toEqual([{ date: '2026-11-12', close: 100 }]);
});
test('recorded cutoff includes the latest actual ticker and proxy input', () => {
  expect(inputBoundary('2026-11-11', '2026-11-12')).toBe('2026-11-12');
  expect(inputBoundary('2026-11-12', '2026-11-11')).toBe('2026-11-12');
});
test('missing market evidence is not invented provenance', () => {
  expect(inputBoundary('2026-11-12', undefined)).toBeNull();
});