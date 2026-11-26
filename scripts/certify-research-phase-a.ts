/** Read-only. Run on the trusted host whose configured database is being certified. */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { certifyResearchRecords, type RecordedResearchRow, type RecordedResearchCurve } from '../src/lib/research-certification';
const rows: RecordedResearchRow[] = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabaseAdmin.from('researcher_daily_ledger').select('lane,session_date,equity,pnl,pnl_pct,daily_return_pct').order('lane').order('session_date').range(offset, offset + 999);
  if (error) throw new Error(error.message);
  rows.push(...(data ?? []).map(row => ({ ...row, equity: Number(row.equity), pnl: Number(row.pnl), pnl_pct: Number(row.pnl_pct), daily_return_pct: Number(row.daily_return_pct) })));
  if ((data ?? []).length < 1000) break;
}
const { data: saved, error } = await supabaseAdmin.from('research_runs').select('summary').eq('kind', 'lab_graph').order('created_at', { ascending: false }).limit(1).maybeSingle();
if (error) throw new Error(error.message);
const summary = saved?.summary as { payload?: { equity_curves?: RecordedResearchCurve[] } } | null;
const sessions: string[] = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error: pricesError } = await supabaseAdmin.from('daily_bars').select('bar_date').eq('ticker', 'SPY').order('bar_date').range(offset, offset + 999);
  if (pricesError) throw new Error(pricesError.message);
  sessions.push(...(data ?? []).map(row => row.bar_date));
  if ((data ?? []).length < 1000) break;
}
console.log(JSON.stringify({ checked_at: new Date().toISOString(), scope: 'configured database only; not a deployment certification', ...certifyResearchRecords(rows, summary?.payload?.equity_curves ?? [], sessions, ['trend', 'contrarian', 'consistency', 'growth', 'risk', 'skeptic', 'lead']) }, null, 2));