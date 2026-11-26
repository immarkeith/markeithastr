import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

/** Cheap source-change detection. Force replay after historical price corrections. */
export async function researchWatermark(): Promise<string> {
  const entries: unknown[] = [];
  for (const [table, columns, order] of [
    ['daily_bars', 'bar_date', 'bar_date'],
    ['researcher_daily_ledger', 'session_date,created_at', 'created_at'],
    ['research_daily_selections', 'session_date,created_at', 'created_at'],
    ['research_selection_evaluations', 'matured_at', 'matured_at'],
    ['research_runs', 'id,created_at', 'created_at'],
  ] as const) {
    let query = supabaseAdmin.from(table).select(columns).order(order, { ascending: false, nullsFirst: false }).limit(1);
    if (table === 'research_runs') query = query.in('kind', ['lab_graph', 'lab_history']);
    const { data, error } = await query;
    if (error) throw new Error(`Research watermark unavailable: ${error.message}`);
    entries.push([table, data]);
  }
  // Changes to formulas, holding configuration or eligibility invalidate a receipt.
  for (const table of ['app_settings', 'researchers', 'master_rules', 'paper_slots'] as const) {
    const { data, error } = await supabaseAdmin.from(table).select('*').order('id');
    if (error) throw new Error(`Research configuration unavailable: ${error.message}`);
    entries.push([table, data]);
  }
  const start = new Date(); start.setUTCDate(start.getUTCDate() - 120);
  const { data, error } = await supabaseAdmin.rpc('bar_dates_present_since', { p_start: start.toISOString().slice(0, 10) });
  if (error) throw new Error(`Research coverage watermark unavailable: ${error.message}`);
  entries.push(['recent_bar_coverage', data]);
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}