import { describe, expect, test } from 'bun:test';
import { historyCoverage } from './history-coverage';

describe('historical universe gate', () => {
  test('requires the requested 80% of a 10000-stock universe', () => {
    expect(historyCoverage(8000, 10000).passes).toBe(true);
    expect(historyCoverage(7999, 10000).passes).toBe(false);
  });
  test('verified not-yet-listed stocks are not counted as missing', () => {
    expect(historyCoverage(6400, 10000, 2000)).toEqual({ comparable: 8000, required: 6400, available: 6400, fraction: 0.8, passes: true });
  });
  test('without verified listing evidence missing bars stay in the denominator', () => {
    expect(historyCoverage(6400, 10000).passes).toBe(false);
  });
});