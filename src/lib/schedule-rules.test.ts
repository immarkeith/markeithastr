import { expect, test } from 'bun:test';
import { scheduledPassDue } from './schedule-rules';

test('9:35 Eastern entry follows winter time', () => {
  expect(scheduledPassDue('preopen', new Date('2026-11-16T14:35:00Z'))).toBe(true);
  expect(scheduledPassDue('preopen', new Date('2026-11-16T13:35:00Z'))).toBe(false);
});
test('9:35 Eastern entry follows summer time', () => {
  expect(scheduledPassDue('preopen', new Date('2026-07-06T13:35:00Z'))).toBe(true);
  expect(scheduledPassDue('preopen', new Date('2026-07-06T14:35:00Z'))).toBe(false);
});
test('3:45 exit and 3:52 retry stay before winter close', () => {
  expect(scheduledPassDue('preclose', new Date('2026-11-16T20:45:00Z'))).toBe(true);
  expect(scheduledPassDue('preclose', new Date('2026-11-16T20:52:00Z'))).toBe(true);
  expect(scheduledPassDue('preclose', new Date('2026-11-16T19:45:00Z'))).toBe(false);
});
test('half-day exit is 12:45 Eastern, not after the bell', () => {
  expect(scheduledPassDue('preclose', new Date('2026-11-27T17:45:00Z'))).toBe(true);
  expect(scheduledPassDue('preclose', new Date('2026-11-27T20:45:00Z'))).toBe(false);
});
test('holidays and weekends cannot run entry passes', () => {
  expect(scheduledPassDue('preopen', new Date('2026-11-26T14:35:00Z'))).toBe(false);
  expect(scheduledPassDue('preopen', new Date('2026-11-15T14:35:00Z'))).toBe(false);
});
test('X05 graph refresh is inside actual regular hours, never evening', () => {
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-16T14:30:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-07-06T13:30:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-16T21:00:00Z'))).toBe(false);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-16T23:00:00Z'))).toBe(false);
});
test('X05 weekends, holidays and early-close afternoons never refresh', () => {
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-21T15:00:00Z'))).toBe(false);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-26T15:00:00Z'))).toBe(false);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-27T17:59:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-27T18:00:00Z'))).toBe(false);
});
test('X06 authoritative exchange closures and changed hours override static assumptions', () => {
  const now = new Date('2026-11-25T17:00:00Z');
  expect(scheduledPassDue('lab-refresh', now, null)).toBe(false);
  expect(scheduledPassDue('lab-refresh', now, { openMinutes: 570, closeMinutes: 660 })).toBe(false);
  expect(scheduledPassDue('lab-refresh', now, { openMinutes: 570, closeMinutes: 960 })).toBe(true);
});
test('key check is 8 AM and daily cycle is 5:30 PM Eastern', () => {
  expect(scheduledPassDue('key-check', new Date('2026-11-16T13:00:00Z'))).toBe(true);
  expect(scheduledPassDue('daily-cycle', new Date('2026-11-16T22:30:00Z'))).toBe(true);
  expect(scheduledPassDue('daily-cycle', new Date('2026-11-16T21:30:00Z'))).toBe(false);
});