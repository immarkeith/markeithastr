import { describe, expect, test } from 'bun:test';
import { eligibleAt, evaluate, selectionReplaySince, warmedUp, type Bar } from './selection-replay';

const bar = (date: string, open: number, close: number): Bar => ({ date, open, close, volume: 1_000_000 });

describe('historical replay rules', () => {
  test('a full bootstrap ignores the latest-pick watermark used by nightly replay', () => {
    expect(selectionReplaySince('2026-10-19', true)).toBeUndefined();
    expect(selectionReplaySince(null, false)).toBeUndefined();
    expect(selectionReplaySince('2026-10-19', false)).toBe('2025-06-06');
  });
  test('200-day average needs 200 preceding sessions', () => {
    expect(warmedUp(200)).toBe(false);
    expect(warmedUp(201)).toBe(true);
  });
  test('price below $10 on the selection day is ineligible', () => {
    const h = Array.from({ length: 201 }, (_, i) => bar(`d${i}`, 20, i === 200 ? 9.99 : 20));
    expect(eligibleAt(h, 10, 5_000_000)).toBe(false);
  });
  test('entry is next session open, exit is session T+H close', () => {
    const s = ['a', 'b', 'c', 'd', 'e', 'f'];
    const m = new Map(s.map((d, i) => [d, bar(d, 100 + i, 101 + i)]));
    const e = evaluate(s, 0, 5, m, m);
    expect(e).toMatchObject({ status: 'matured', entry_date: 'b', entry_price: 101, exit_date: 'f', exit_price: 106 });
  });
  test('same-day result buys T+1 open and sells T+1 close', () => {
    const s = ['a', 'b'];
    const m = new Map([['b', bar('b', 50, 51)]]);
    expect(evaluate(s, 0, 1, m, m)).toMatchObject({ entry_price: 50, exit_price: 51, return_pct: 2 });
  });
  test('future sessions not yet stored stay pending', () => {
    expect(evaluate(['a', 'b'], 0, 5, new Map(), new Map())).toEqual({ status: 'pending' });
  });
  test('a missing exit bar is never filled in', () => {
    const s = ['a', 'b', 'c'];
    expect(evaluate(s, 0, 2, new Map([['b', bar('b', 1, 1)]]), new Map())).toEqual({ status: 'pending', entry_date: 'b', exit_date: 'c' });
  });
  test('an invalid exit price cannot manufacture a settled loss', () => {
    const m = new Map([['b', bar('b', 10, 0)]]);
    expect(evaluate(['a', 'b'], 0, 1, m, m).status).toBe('pending');
  });
});
