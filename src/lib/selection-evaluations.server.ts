import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { aggregateSelectionRates, type EvaluationMetricRow } from './selection-evaluations';

/** Stable composite-key paging preserves every lane and session past the API cap. */
export async function selectionEvaluationWinRates(asOf = new Date().toISOString()) {
  const rows: EvaluationMetricRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('research_selection_evaluations')
      .select('lane, session_date, horizon_sessions, status, entry_date, exit_date, matured_at, return_pct, excess_return_pct')
      .in('horizon_sessions', [20, 60, 180])
      .order('lane').order('session_date').order('horizon_sessions')
      .range(offset, offset + 999);
    if (error) throw new Error(`Selection metrics unavailable: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return aggregateSelectionRates(rows, asOf);
}