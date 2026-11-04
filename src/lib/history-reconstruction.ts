/**
 * Pure math for the one-time historical reconstruction of researcher
 * performance. No database or network access — safe to unit test.
 *
 * Rules:
 * - Point in time: a pick for session t is scored only from bars through t-1.
 * - Entry at session t's real open, exit at session t's real close (SAME_DAY).
 * - Fixed $20 stake per trade, matching the Research Lab paper books.
 * - Curve points are levels (cumulative realized P/L), one per real session.
 */

export const STAKE = 20;

export interface DayPick {
  ticker: string;
  score: number;
  open: number;
  close: number;
}

/** lane -> session date -> best pick that morning */
export type BestPicks = Record<string, Record<string, DayPick>>;

/** Keep the higher-scoring pick; ties go to the alphabetically first ticker. */
export function mergePick(best: BestPicks, lane: string, date: string, pick: DayPick): void {
  const byDate = (best[lane] ??= {});
  const cur = byDate[date];
  if (!cur || pick.score > cur.score || (pick.score === cur.score && pick.ticker < cur.ticker)) {
    byDate[date] = pick;
  }
}

export function tradeProfit(pick: DayPick): number {
  if (!(pick.open > 0) || !(pick.close > 0)) return 0;
  return (STAKE * (pick.close - pick.open)) / pick.open;
}

export interface HistoryCurve {
  lane: string;
  points: { date: string; equity: number }[];
  trades: number;
  wins: number;
  total_pnl: number;
}

/** One level per real session from the start date; no invented points. */
export function buildHistoryCurve(lane: string, picks: Record<string, DayPick>, sessions: string[]): HistoryCurve {
  let cum = 0;
  let trades = 0;
  let wins = 0;
  const points: { date: string; equity: number }[] = [];
  for (const date of sessions) {
    const pick = picks[date];
    if (pick && pick.open > 0 && pick.close > 0) {
      const p = tradeProfit(pick);
      cum += p;
      trades += 1;
      if (p > 0) wins += 1;
    }
    points.push({ date, equity: Number(cum.toFixed(4)) });
  }
  return { lane, points, trades, wins, total_pnl: Number(cum.toFixed(2)) };
}
