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
test('daily audit is 6 PM Eastern', () => {
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-16T23:00:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-07-06T22:00:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-16T22:00:00Z'))).toBe(false);
});
test('weekly audit is Saturday 10 AM Eastern', () => {
  expect(scheduledPassDue('lab-refresh', new Date('2026-11-21T15:00:00Z'))).toBe(true);
  expect(scheduledPassDue('lab-refresh', new Date('2026-07-11T14:00:00Z'))).toBe(true);
});
test('key check is 8 AM and daily cycle is 5:30 PM Eastern', () => {
  expect(scheduledPassDue('key-check', new Date('2026-11-16T13:00:00Z'))).toBe(true);
  expect(scheduledPassDue('daily-cycle', new Date('2026-11-16T22:30:00Z'))).toBe(true);
  expect(scheduledPassDue('daily-cycle', new Date('2026-11-16T21:30:00Z'))).toBe(false);
});