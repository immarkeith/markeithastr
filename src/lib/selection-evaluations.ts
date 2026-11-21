/** Read-only Layer 2 metrics; never infer outcomes from selections or trades. */
export const CARD_HORIZONS = { '1M': 20, '3M': 60, '9M': 180 } as const;
export interface SelectionRate {
  horizon: keyof typeof CARD_HORIZONS;
  wins: number;
  completed: number;
  win_rate: number | null;
  pending: number;
  excluded: number;
  available: boolean;
  avg_return_pct: number | null;
  avg_excess_return_pct: number | null;
  benchmark_completed: number;
  excess_wins: number;
}
export interface EvaluationMetricRow {
  lane: string;
  session_date: string;
  horizon_sessions: number;
  status: string;
  entry_date: string | null;
  exit_date: string | null;
  matured_at: string | null;
  return_pct: number | null;
  excess_return_pct: number | null;
}

export function aggregateSelectionRates(rows: readonly EvaluationMetricRow[], asOf: string): Record<string, SelectionRate[]> {
  const day = asOf.slice(0, 10);
  const out: Record<string, SelectionRate[]> = {};
  for (const lane of new Set(rows.map(r => r.lane))) {
    out[lane] = (Object.keys(CARD_HORIZONS) as SelectionRate['horizon'][]).map(horizon => {
      const cohort = rows.filter(r => r.lane === lane && r.horizon_sessions === CARD_HORIZONS[horizon] && r.session_date <= day);
      const completed = cohort.filter(r => r.status === 'matured' && r.return_pct !== null && Number.isFinite(r.return_pct)
        && r.entry_date !== null && r.entry_date > r.session_date && r.exit_date !== null && r.exit_date >= r.entry_date
        && r.exit_date <= day && r.matured_at !== null && r.matured_at <= asOf);
      const benchmark = completed.filter(r => r.excess_return_pct !== null && Number.isFinite(r.excess_return_pct));
      const wins = completed.filter(r => (r.return_pct ?? 0) > 0).length;
      const pending = cohort.filter(r => r.status === 'pending').length;
      const mean = (values: number[]) => values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)) : null;
      return {
        horizon, wins, completed: completed.length,
        win_rate: completed.length ? Number((100 * wins / completed.length).toFixed(1)) : null,
        pending, excluded: cohort.length - pending - completed.length, available: cohort.length > 0,
        avg_return_pct: mean(completed.map(r => r.return_pct ?? 0)),
        avg_excess_return_pct: mean(benchmark.map(r => r.excess_return_pct ?? 0)),
        benchmark_completed: benchmark.length,
        excess_wins: benchmark.filter(r => (r.excess_return_pct ?? 0) > 0).length,
      };
    });
  }
  return out;
}