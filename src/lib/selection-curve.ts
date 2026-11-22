/** Same-day Layer 2 replay only; no strategy books, trade rows, or invented marks. */
import { STAKE, type HistoryCurve } from './history-reconstruction';
export const SELECTION_LANES = ['lead', 'trend', 'contrarian', 'consistency', 'growth', 'risk', 'skeptic'] as const;
export interface SelectionRecord {
  lane: string; session_date: string; selected_at: string; ticker: string | null;
  comparable_universe: number; universe_basis: string; engine_version: string;
}
export interface CurveEvaluation {
  lane: string; session_date: string; ticker: string; horizon_sessions: number; status: string;
  entry_date: string | null; exit_date: string | null; entry_price: number | null;
  exit_price: number | null; return_pct: number | null; matured_at: string | null;
}
export interface SelectionCurve extends HistoryCurve {
  pending: number; excluded: number; no_pick: number; missing_evaluations: number;
  has_gaps: boolean;
}
export function buildSelectionHistoryCurve(lane: string, selections: readonly SelectionRecord[], evaluations: readonly CurveEvaluation[], calendar: readonly string[], asOf: string): SelectionCurve {
  const sessions = [...new Set(calendar.filter(d => d <= asOf.slice(0, 10)))].sort();
  const next = new Map(sessions.map((d, i) => [d, sessions[i + 1]]));
  const outcomes = new Map<string, CurveEvaluation>();
  for (const r of evaluations.filter(r => r.lane === lane && r.horizon_sessions === 1)) {
    if (outcomes.has(r.session_date)) throw new Error('Duplicate same-day evaluation');
    outcomes.set(r.session_date, r);
  }
  const profits = new Map<string, number>();
  let trades = 0, wins = 0, pending = 0, excluded = 0, no_pick = 0, missing_evaluations = 0;
  const seen = new Set<string>();
  for (const s of selections.filter(s => s.lane === lane && s.session_date <= asOf.slice(0, 10))) {
    if (seen.has(s.session_date)) throw new Error('Duplicate daily selection');
    seen.add(s.session_date);
    if (!s.ticker) { no_pick++; continue; }
    const r = outcomes.get(s.session_date);
    if (!r) { missing_evaluations++; continue; }
    if (r.status === 'pending') { pending++; continue; }
    const entry = r.entry_price, exit = r.exit_price;
    const valid = r.status === 'matured' && r.ticker === s.ticker && r.entry_date === next.get(s.session_date)
      && r.entry_date !== null && r.exit_date === r.entry_date && r.exit_date <= asOf.slice(0, 10)
      && Number.isFinite(Date.parse(s.selected_at)) && Date.parse(s.selected_at) < Date.parse(`${r.entry_date}T13:30:00Z`)
      && r.matured_at !== null && Number.isFinite(Date.parse(r.matured_at)) && Date.parse(r.matured_at) <= Date.parse(asOf)
      && entry !== null && exit !== null && Number.isFinite(entry) && Number.isFinite(exit) && entry > 0 && exit > 0
      && r.return_pct !== null && Number.isFinite(r.return_pct)
      && Math.abs(((exit - entry) / entry) * 100 - r.return_pct) <= 0.00011;
    if (!valid || entry === null || exit === null || r.exit_date === null) { excluded++; continue; }
    const profit = STAKE * (exit - entry) / entry;
    profits.set(r.exit_date, (profits.get(r.exit_date) ?? 0) + profit);
    trades++; if (profit > 0) wins++;
  }
  let cumulative = 0;
  const points = sessions.map(date => {
    cumulative += profits.get(date) ?? 0;
    return { date, equity: Number(cumulative.toFixed(4)) };
  });
  return { lane, points, trades, wins, total_pnl: Number(cumulative.toFixed(2)), pending, excluded, no_pick, missing_evaluations, has_gaps: excluded + missing_evaluations > 0 };
}
