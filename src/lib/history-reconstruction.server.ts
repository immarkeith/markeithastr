/** Stored same-day selection evidence; legacy prototypes are retained but never served. */
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { Json } from '@/integrations/supabase/types';
import { SELECTION_LANES, buildSelectionHistoryCurve, type SelectionRecord, type CurveEvaluation } from './selection-curve';
import { HISTORY_VERSION, parseLabHistory, type LabHistory } from './lab-history';
export { HISTORY_VERSION, type LabHistory } from './lab-history';
export const HISTORY_KIND = 'lab_history';
export async function rebuildLabHistory(asOf = new Date().toISOString()): Promise<LabHistory | null> {
  const selections: SelectionRecord[] = [];
  const evaluations: CurveEvaluation[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('research_daily_selections')
      .select('lane,session_date,selected_at,ticker,comparable_universe,universe_basis,engine_version')
      .lte('session_date', asOf.slice(0, 10)).order('lane').order('session_date').range(offset, offset + 999);
    if (error) throw new Error(`Selection history unavailable: ${error.message}`);
    selections.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  const dates = [...new Set(selections.map(s => s.session_date))].sort();
  const from = dates[0], selectionTo = dates.at(-1);
  if (!from || !selectionTo) return null;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('research_selection_evaluations')
      .select('lane,session_date,ticker,horizon_sessions,status,entry_date,exit_date,entry_price,exit_price,return_pct,matured_at')
      .eq('horizon_sessions', 1).gte('session_date', from).lte('session_date', selectionTo)
      .order('lane').order('session_date').range(offset, offset + 999);
    if (error) throw new Error(`Selection outcomes unavailable: ${error.message}`);
    evaluations.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  // Authentic stored SPY sessions, not weekdays guessed from a partial holiday list.
  const sessions: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from('daily_bars').select('bar_date')
      .eq('ticker', 'SPY').gte('bar_date', from).lte('bar_date', asOf.slice(0, 10))
      .order('bar_date').range(offset, offset + 999);
    if (error) throw new Error(`Market calendar unavailable: ${error.message}`);
    sessions.push(...(data ?? []).map(b => b.bar_date));
    if ((data ?? []).length < 1000) break;
  }
  const to = sessions.at(-1);
  if (!to || dates.some(d => !sessions.includes(d))) throw new Error('Selection history lacks its market-session evidence');
  const latest = selections.filter(s => s.session_date === selectionTo);
  const h: LabHistory = {
    from, to, selection_to: selectionTo, universe: Math.max(...latest.map(s => s.comparable_universe)),
    universe_basis: [...new Set(selections.map(s => s.universe_basis))].join(', '),
    selection_sessions: dates.length, market_sessions: sessions.length, version: HISTORY_VERSION, generated_at: asOf,
    curves: SELECTION_LANES.map(lane => ({ ...buildSelectionHistoryCurve(lane, selections, evaluations, sessions, asOf), lane })),
  };
  const { error } = await supabaseAdmin.from('research_runs').insert({ kind: HISTORY_KIND,
    config: { version: HISTORY_VERSION, stake: 20, horizon_sessions: 1, entry: 'T+1 open', exit: 'T+1 close', from, to } as Json,
    summary: h as unknown as Json });
  if (error) throw new Error(`Selection snapshot could not be saved: ${error.message}`);
  return h;
}
export async function readLabHistory(): Promise<LabHistory | null> {
  const { data, error } = await supabaseAdmin.from('research_runs').select('summary').eq('kind', HISTORY_KIND)
    .contains('config', { version: HISTORY_VERSION }).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`Selection snapshot unavailable: ${error.message}`);
  // Reads never run provider downloads or replay. Initial setup and nightly job save the snapshot.
  if (!data) return null;
  const history = parseLabHistory(data.summary);
  if (!history) throw new Error('Saved historical selection evidence is incomplete. Awaiting a verified refresh.');
  return history;
}
