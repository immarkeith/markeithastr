/**
 * Pure day-by-day simulator for one researcher's paper book (no I/O).
 * Rules: the researcher holds at most one stock, buys its own top pick at the
 * session close, holds exactly `holdDays` sessions, sells at that close, and
 * the whole book is marked to each session's close. A session where the held
 * stock has no stored bar keeps its last real mark (no invented movement).
 */
export interface LedgerDay {
  date: string;
  closes: Map<string, number>;
  pick: string | null;
}

export interface LedgerPoint {
  date: string;
  equity: number;
  pnl: number;
  pnl_pct: number;
  daily_return_pct: number;
  held: string | null;
  action: string | null;
}

const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function simulateLane(days: LedgerDay[], holdDays: number, base: number): LedgerPoint[] {
  let cash = base;
  let pos: { ticker: string; shares: number; mark: number; held: number } | null = null;
  let prevEquity = base;
  const out: LedgerPoint[] = [];
  for (const day of days) {
    const actions: string[] = [];
    if (pos) {
      const c = day.closes.get(pos.ticker);
      if (c !== undefined) pos.mark = c;
      pos.held += 1;
      if (pos.held >= holdDays && c !== undefined) {
        cash = pos.shares * c;
        actions.push(`sell ${pos.ticker}`);
        pos = null;
      }
    }
    if (!pos && day.pick) {
      const c = day.closes.get(day.pick);
      if (c !== undefined && c > 0) {
        pos = { ticker: day.pick, shares: cash / c, mark: c, held: 0 };
        cash = 0;
        actions.push(`buy ${day.pick}`);
      }
    }
    const equity = cash + (pos ? pos.shares * pos.mark : 0);
    out.push({
      date: day.date,
      equity: r4(equity),
      pnl: r4(equity - base),
      pnl_pct: r4((equity / base - 1) * 100),
      daily_return_pct: r4(prevEquity > 0 ? (equity / prevEquity - 1) * 100 : 0),
      held: pos?.ticker ?? null,
      action: actions.length ? actions.join(", ") : null,
    });
    prevEquity = equity;
  }
  return out;
}
