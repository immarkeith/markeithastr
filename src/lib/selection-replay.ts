/**
 * Pure rules for the historical researcher replay (no I/O).
 * Selection at session T close uses only bars dated <= T.
 * Entry = open of session T+1; exit = close of session T+H (H=1 is same-day).
 */
export const WARMUP_SESSIONS = 200;
export const EVAL_HORIZONS = [1, 5, 10, 20, 60] as const;

export interface Bar { date: string; open: number; close: number; volume: number }

/** A stock is rankable on T only with 200 stored sessions before T plus T itself. */
export function warmedUp(barsUpToT: number): boolean {
  return barsUpToT >= WARMUP_SESSIONS + 1;
}

/** Price/liquidity eligibility from bars up to T only. */
export function eligibleAt(history: Bar[], minPrice: number, minDollarVolume: number): boolean {
  if (!warmedUp(history.length)) return false;
  const last = history[history.length - 1];
  if (!last || last.close < minPrice) return false;
  const recent = history.slice(-20);
  const adv = recent.reduce((s, b) => s + b.close * b.volume, 0) / recent.length;
  return adv >= minDollarVolume;
}

export type Evaluation =
  | { status: "pending"; entry_date?: string; exit_date?: string }
  | { status: "missing_bar"; entry_date: string; exit_date: string }
  | { status: "matured"; entry_date: string; entry_price: number; exit_date: string; exit_price: number; return_pct: number; benchmark_return_pct: number | null; excess_return_pct: number | null };

const r4 = (n: number) => Number(n.toFixed(4));

/** sessions = global trading calendar ascending; bars/benchmark keyed by date. */
export function evaluate(sessions: string[], t: number, horizon: number, bars: Map<string, Bar>, benchmark: Map<string, Bar>): Evaluation {
  const entryDate = sessions[t + 1];
  const exitDate = sessions[t + horizon];
  if (!entryDate || !exitDate) return { status: "pending" };
  const entry = bars.get(entryDate);
  const exit = bars.get(exitDate);
  if (!entry || !exit || !Number.isFinite(entry.open) || !Number.isFinite(exit.close) || entry.open <= 0 || exit.close <= 0) return { status: "pending", entry_date: entryDate, exit_date: exitDate };
  const ret = ((exit.close - entry.open) / entry.open) * 100;
  const be = benchmark.get(entryDate), bx = benchmark.get(exitDate);
  const bench = be && bx && be.open > 0 ? ((bx.close - be.open) / be.open) * 100 : null;
  return {
    status: "matured", entry_date: entryDate, entry_price: entry.open, exit_date: exitDate, exit_price: exit.close,
    return_pct: r4(ret), benchmark_return_pct: bench === null ? null : r4(bench), excess_return_pct: bench === null ? null : r4(ret - bench),
  };
}
