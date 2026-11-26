/** Slice saved researcher levels only. Missing windows never become trade curves. */
export function ledgerWindow(points: { date: string; equity: number }[], from: string, until: string, todayOnly = false) {
  const latest = points.at(-1)?.date;
  // An old ledger outside the requested window stays an empty window, not
  // a backwards date range or an invented latest-session result.
  const end = latest && latest < until && (todayOnly || latest >= from) ? latest : until;
  const start = todayOnly ? end : from;
  return { from: start, until: end };
}

export function recordedLedger<T extends object>(curve: T | null | undefined): T | null {
  return curve && 'source' in curve && curve.source === 'ledger' ? curve : null;
}

export function ledgerSeries(points: { date: string; equity: number }[], from: string, until: string, scale: number, weekly: boolean) {
  const selected = points.filter(p => p.date >= from && p.date <= until);
  const baseline = points.filter(p => p.date < from).at(-1)?.equity ?? selected[0]?.equity ?? 0;
  const rolled = new Map<string, { date: string; equity: number }>();
  for (const p of selected) {
    const d = new Date(`${p.date}T00:00:00Z`);
    if (weekly) d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    rolled.set(weekly ? d.toISOString().slice(0, 10) : p.date, p);
  }
  let previous = baseline;
  return [...rolled.values()].map(p => {
    const result = { day: p.date, daily: (p.equity - previous) * scale, cumulative: (p.equity - baseline) * scale };
    previous = p.equity;
    return result;
  });
}