/** One-time continuous researcher replay (paper research only).
 * Archives every saved ledger row into research_runs, clears the ledger,
 * then replays all lanes from LEDGER_START_DATE under one engine version.
 * bun scripts/rebuild-researcher-ledger.ts --confirm
 */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { runResearcherLedger, LEDGER_START_DATE, LEDGER_ENGINE_VERSION } from '../src/lib/researcher-ledger.server';
if (!process.argv.includes('--confirm')) throw new Error('Pass --confirm to replace the researcher ledger');
const rows: unknown[] = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabaseAdmin.from('researcher_daily_ledger').select('*').order('lane').order('session_date').range(from, from + 999);
  if (error) throw new Error(error.message);
  rows.push(...(data ?? []));
  if ((data ?? []).length < 1000) break;
}
const { error: archiveError } = rows.length === 0 ? { error: null } : await supabaseAdmin.from('research_runs').insert({ kind: 'ledger_archive', config: { reason: 'continuous replay', start: LEDGER_START_DATE, engine: LEDGER_ENGINE_VERSION }, summary: { rows } as never });
if (archiveError) throw new Error(archiveError.message);
console.log(JSON.stringify({ stage: 'archived', rows: rows.length }));
const { error: deleteError } = await supabaseAdmin.from('researcher_daily_ledger').delete().gte('session_date', '1900-01-01');
if (deleteError) throw new Error(deleteError.message);
const started = Date.now();
const result = await runResearcherLedger({ fullReplay: true });
console.log(JSON.stringify({ stage: 'replayed', ...result, ms: Date.now() - started }));
