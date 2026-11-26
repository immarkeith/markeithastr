export interface RecordedResearchRow {
  lane: string; session_date: string; equity: number; pnl: number; pnl_pct: number; daily_return_pct: number;
}
export interface RecordedResearchCurve {
  lane: string; source: string; points: { date: string; equity: number }[];
}

/** Stored levels and returns each have four-decimal rounding uncertainty. */
export function ledgerReturnMatches(previous: number, current: number, dailyReturn: number): boolean {
  if (![previous, current, dailyReturn].every(Number.isFinite) || previous <= 0.00005) return false;
  const lower = ((current - 0.00005) / (previous + 0.00005) - 1) * 100 - 0.00005;
  const upper = ((current + 0.00005) / (previous - 0.00005) - 1) * 100 + 0.00005;
  return dailyReturn >= lower - 1e-8 && dailyReturn <= upper + 1e-8;
}

/** Independent arithmetic/source reconciliation, not historical market qualification. */
export function certifyResearchRecords(rows: RecordedResearchRow[], curves: RecordedResearchCurve[], sessions: string[], lanes: readonly string[], base = 100) {
  const reports = lanes.map(lane => {
    const recorded = rows.filter(row => row.lane === lane);
    const first = recorded[0]?.session_date ?? null;
    const last = recorded.at(-1)?.session_date ?? null;
    const dates = new Set(recorded.map(row => row.session_date));
    let identity_errors = 0, continuity_errors = 0, date_errors = 0;
    for (let i = 0; i < recorded.length; i++) {
      const row = recorded[i]; if (!row) continue;
      if (![row.equity, row.pnl, row.pnl_pct, row.daily_return_pct].every(Number.isFinite) || Math.abs(row.equity - base - row.pnl) > 0.00011 || Math.abs((row.equity / base - 1) * 100 - row.pnl_pct) > 0.00011) identity_errors++;
      const prior = recorded[i - 1];
      if (prior && !ledgerReturnMatches(prior.equity, row.equity, row.daily_return_pct)) continuity_errors++;
      if (prior && prior.session_date >= row.session_date) date_errors++;
    }
    const missing_sessions = first && last ? sessions.filter(date => date >= first && date <= last && !dates.has(date)).length : 0;
    const curve = curves.find(curve => curve.lane === lane && curve.source === 'ledger');
    let snapshot_errors = curve ? Math.abs(curve.points.length - recorded.length) : 1;
    for (let i = 0; i < (curve?.points.length ?? 0); i++) {
      const point = curve?.points[i], row = recorded[i];
      if (!point || !row || point.date !== row.session_date || !Number.isFinite(point.equity) || Math.abs(point.equity - row.pnl) > 0.00001) snapshot_errors++;
    }
    return { lane, rows: recorded.length, first, last, identity_errors, continuity_errors, date_errors, missing_sessions, snapshot_errors };
  });
  return {
    verified: reports.length > 0 && reports.every(report => report.rows > 0 && report.identity_errors + report.continuity_errors + report.date_errors + report.missing_sessions + report.snapshot_errors === 0),
    reports,
    historical_market_qualification: 'unverified' as const,
  };
}