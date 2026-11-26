import { expect, test } from 'bun:test';
import { completedResearchSession, selectionTimestamp } from './research-session';

test('selection records follow the winter exchange close by five minutes', () => {
  expect(selectionTimestamp('2026-11-25')).toBe('2026-11-25T21:05:00.000Z');
});
test('summer selection records respect daylight saving time', () => {
  expect(selectionTimestamp('2026-06-22')).toBe('2026-06-22T20:05:00.000Z');
});
test('early closes select five minutes after 1 PM Eastern', () => {
  expect(selectionTimestamp('2026-11-27')).toBe('2026-11-27T18:05:00.000Z');
  expect(selectionTimestamp('2026-07-02')).toBe('2026-07-02T17:05:00.000Z');
});
test('Thanksgiving cannot produce a research selection', () => {
  expect(() => selectionTimestamp('2026-11-26')).toThrow('closed market');
  expect(completedResearchSession('2026-11-26', new Date('2026-11-26T23:00:00Z'))).toBe(false);
});
test('an incomplete session is not eligible for replay', () => {
  expect(completedResearchSession('2026-11-25', new Date('2026-11-25T20:59:00Z'))).toBe(false);
  expect(completedResearchSession('2026-11-25', new Date('2026-11-25T21:05:00Z'))).toBe(true);
});