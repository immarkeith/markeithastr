import { describe, expect, it } from 'bun:test';
import { resilientCoverage } from './bar-coverage';
const missing = new Error('Could not find the function public.bar_dates_present_since(p_start) in the schema cache');
const rows = [{ bar_date: '2026-11-20', ticker_count: 563 }];
describe('operational coverage resilience', () => {
  it('retries a missing function once and records recovery', async () => {
    let calls = 0, recoveries = 0;
    expect(await resilientCoverage(async () => { if (++calls === 1) throw missing; return rows; }, async () => { throw new Error('fallback should not run'); }, () => { recoveries++; })).toEqual(rows);
    expect(calls).toBe(2); expect(recoveries).toBe(1);
  });
  it('uses exact fallback results after two schema-cache failures', async () => {
    let calls = 0, fallbacks = 0;
    expect(await resilientCoverage(async () => { calls++; throw missing; }, async () => { fallbacks++; return rows; })).toEqual(rows);
    expect(calls).toBe(2); expect(fallbacks).toBe(1);
  });
  it('does not disguise failed fallback reads as empty or healthy', async () => {
    await expect(resilientCoverage(async () => { throw missing; }, async () => { throw new Error('connection failed'); })).rejects.toThrow('connection failed');
  });
  it('never falls back for permission failures', async () => {
    let fallbacks = 0;
    await expect(resilientCoverage(async () => { throw new Error('permission denied'); }, async () => { fallbacks++; return []; })).rejects.toThrow('permission denied');
    expect(fallbacks).toBe(0);
  });
  it('accepts a successfully verified empty window', async () => {
    expect(await resilientCoverage(async () => [], async () => rows)).toEqual([]);
  });
});