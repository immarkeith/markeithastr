/**
 * Pure day-by-day simulator for one researcher's paper book (no I/O).
 * Rules: the researcher holds at most one stock, buys its own top pick at the
 * session close, holds exactly `holdDays` sessions, sells at that close, and
 * the whole book is marked to each session's close. A session where the held
 * stock has no stored bar keeps its last real mark (no invented movement).
 */
import { paperSettlementDate, nextTranche, type Tranche } from "./settlement-rules";

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

export function simulateLane(days: LedgerDay[], holdDays: number, base: number, settlementFrom?: string): LedgerPoint[] {
  let cash = base;
  let pos: { ticker: string; shares: number; mark: number; held: number; tranche: Tranche | null } | null = null;
  const pending: { amount: number; available: string; tranche: Tranche | null }[] = [];
  const pools = { A: base / 2, B: base / 2 };
  let last: Tranche | null = null;
  let activated = false;
  let prevEquity = base;
  const out: LedgerPoint[] = [];
  for (const day of days) {
    const actions: string[] = [];
    const t1 = settlementFrom === undefined || day.date >= settlementFrom;
    if (t1 && !activated) {
      // Existing saved history stays unchanged; the new rules begin on the next unsaved session.
      pools.A = cash / 2;
      pools.B = cash / 2;
      activated = true;
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      const item = pending[i];
      if (!item || item.available > day.date) continue;
      cash += item.amount;
      if (item.tranche) pools[item.tranche] += item.amount;
      else { pools.A += item.amount / 2; pools.B += item.amount / 2; }
      pending.splice(i, 1);
    }
    if (pos) {
      const c = day.closes.get(pos.ticker);
      if (c !== undefined) pos.mark = c;
      else actions.push(`pending mark ${pos.ticker}`);
      pos.held += 1;
      if (pos.held >= holdDays && c !== undefined) {
        const proceeds = pos.shares * c;
        if (t1) pending.push({ amount: proceeds, available: paperSettlementDate(day.date), tranche: pos.tranche });
        else cash = proceeds;
        actions.push(`sell ${pos.ticker}`);
        pos = null;
      }
    }
    if (!pos && day.pick) {
      const c = day.closes.get(day.pick);
      const tranche: Tranche | null = t1 && holdDays <= 1 ? nextTranche(last) : null;
      const stake = tranche ? Math.min(cash, pools[tranche]) : cash;
      if (c !== undefined && c > 0 && stake > 0) {
        pos = { ticker: day.pick, shares: stake / c, mark: c, held: 0, tranche };
        cash -= stake;
        if (tranche) { pools[tranche] -= stake; last = tranche; }
        actions.push(`buy ${day.pick}`);
        if (t1 && holdDays === 0) {
          pending.push({ amount: stake, available: paperSettlementDate(day.date), tranche });
          actions.push(`sell ${day.pick}`);
          pos = null;
        }
      } else if (c !== undefined && c > 0 && stake <= 0) {
        actions.push("waiting for settled cash");
      }
    }
    const equity = cash + pending.reduce((sum, item) => sum + item.amount, 0) + (pos ? pos.shares * pos.mark : 0);
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
