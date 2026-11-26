import { expect, test } from 'bun:test';
import { certifyResearchRecords, ledgerReturnMatches } from './research-certification';
const rows = [
  { lane: 'risk', session_date: '2026-11-12', equity: 100, pnl: 0, pnl_pct: 0, daily_return_pct: 0 },
  { lane: 'risk', session_date: '2026-11-13', equity: 110, pnl: 10, pnl_pct: 10, daily_return_pct: 10 },
];
const curves = [{ lane: 'risk', source: 'ledger', points: [{ date: '2026-11-12', equity: 0 }, { date: '2026-11-13', equity: 10 }] }];
test('saved graph points reconcile with $100 paper-book levels, not summed marks', () => {
  expect(certifyResearchRecords(rows, curves, rows.map(row => row.session_date), ['risk']).verified).toBe(true);
  const corrupt = [{ ...curves[0], lane: 'risk', source: 'ledger', points: [{ date: '2026-11-12', equity: 0 }, { date: '2026-11-13', equity: 110 }] }];
  expect(certifyResearchRecords(rows, corrupt, [], ['risk']).verified).toBe(false);
});
test('missing market sessions and daily-return drift fail certification', () => {
  const changed = rows.map(row => ({ ...row, daily_return_pct: 0 }));
  const report = certifyResearchRecords(changed, curves, ['2026-11-12', '2026-11-13'], ['risk']);
  expect(report.reports[0]?.continuity_errors).toBe(1);
  expect(report.verified).toBe(false);
  expect(certifyResearchRecords(rows, curves, ['2026-11-12', '2026-11-12-extra', '2026-11-13'], ['risk']).reports[0]?.missing_sessions).toBe(1);
});
test('no records or a trade-reconstructed source cannot pass ledger certification', () => {
  expect(certifyResearchRecords([], [], [], ['risk']).verified).toBe(false);
  expect(certifyResearchRecords(rows, [{ ...curves[0], lane: 'risk', source: 'trades', points: curves[0]?.points ?? [] }], [], ['risk']).verified).toBe(false);
});
test('rounded low-equity books allow only the mathematically implied rounding interval', () => {
  expect(ledgerReturnMatches(8.7962, 8.9237, 1.4505)).toBe(true);
  expect(ledgerReturnMatches(8.7962, 8.9237, 2)).toBe(false);
  expect(ledgerReturnMatches(109.3078, 581.8126, 3.0524)).toBe(false);
});