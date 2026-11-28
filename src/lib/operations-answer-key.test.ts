import { expect, test } from 'bun:test';
import { RESEARCH_ROSTER, RESEARCHERS } from './research-roster';
import { SELECTION_LANES } from './selection-curve';
import { researchFoundationDates, RESEARCH_START_DATE } from './research-foundation';
import { EVAL_HORIZONS, evaluate, type Bar } from './selection-replay';
import { formatDisplayTime } from './device-time';
import { graphPayloadChanged, maintenanceDue, MAINTENANCE_INTERVAL_MS } from './maintenance-rules';
import { isTradingDay, sessionCloseMinutes } from './market-calendar';

test('X01 assignments contain exactly the seven operating graph lanes', () => {
  expect(RESEARCH_ROSTER.map(r => r.lane)).toEqual([...SELECTION_LANES]);
  expect(RESEARCHERS).toEqual(RESEARCH_ROSTER.map(r => r.name));
  expect(RESEARCHERS.includes('Skeptic Researcher')).toBe(true);
  expect(RESEARCHERS.map(String)).not.toContain('Momentum Researcher');
  expect(RESEARCHERS.map(String)).not.toContain('Influence Researcher');
});
test('X02 the 180-session outcome matures at T+180, never sooner', () => {
  expect(EVAL_HORIZONS).toEqual([1, 5, 10, 20, 60, 180]);
  const sessions = Array.from({ length: 181 }, (_, i) => `session-${i}`);
  const bars = new Map<string, Bar>([['session-1', { date: 'session-1', open: 100, close: 105, volume: 1 }], ['session-180', { date: 'session-180', open: 115, close: 120, volume: 1 }]]);
  expect(evaluate(sessions, 0, 180, bars, bars)).toMatchObject({ status: 'matured', entry_date: 'session-1', exit_date: 'session-180', return_pct: 20 });
  expect(evaluate(sessions.slice(0, 180), 0, 180, bars, bars).status).toBe('pending');
});
test('X03 common June 2021 foundation does not impose a density percentage', () => {
  expect(RESEARCH_START_DATE).toBe('2021-06-01');
  const dates = ['2021-05-28', '2021-06-01', '2021-10-25', '2022-03-08', '2026-11-26'];
  expect(researchFoundationDates(dates, RESEARCH_START_DATE, new Date('2026-11-28T05:00:00Z'))).toEqual(['2021-06-01', '2021-10-25', '2022-03-08']);
});
test('X05 unchanged actual payloads do not produce a new graph snapshot', () => {
  const previous = { risk: [100, 101], trend: [100, 99] };
  expect(graphPayloadChanged(previous, structuredClone(previous))).toBe(false);
  expect(graphPayloadChanged(previous, { trend: [100, 99], risk: [100, 101] })).toBe(false);
  expect(graphPayloadChanged(previous, { risk: [100, 102], trend: [100, 99] })).toBe(true);
});
test('X06 local display follows the device zone and fallback is clearly Eastern', () => {
  const iso = '2026-11-28T05:38:00Z';
  expect(formatDisplayTime(iso, 'America/Los_Angeles')).toContain('9:38');
  expect(formatDisplayTime(iso, 'America/New_York')).toContain('12:38');
  expect(formatDisplayTime(iso)).toContain('Eastern');
  expect(formatDisplayTime(iso, 'Not/AZone')).toContain('Eastern');
});
test('X06 historical and future holidays extend beyond the former two-year list', () => {
  expect(isTradingDay('2021-11-25')).toBe(false);
  expect(isTradingDay('2028-11-23')).toBe(false);
  expect(sessionCloseMinutes('2028-11-24')).toBe(780);
  expect(isTradingDay('2025-01-09')).toBe(false);
  expect(isTradingDay('2021-12-31')).toBe(true);
  expect(isTradingDay('2026-11-25')).toBe(true);
});
test('X07 five-minute bounded monitoring remains due overnight and weekends', () => {
  expect(MAINTENANCE_INTERVAL_MS).toBe(300_000);
  const saturday = Date.parse('2026-11-28T05:38:00Z');
  expect(maintenanceDue(saturday - 300_000, saturday)).toBe(true);
  expect(maintenanceDue(saturday - 299_999, saturday)).toBe(false);
  expect(maintenanceDue(null, saturday)).toBe(true);
});