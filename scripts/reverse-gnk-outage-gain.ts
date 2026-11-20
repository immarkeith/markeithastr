/** Approved 2026-11-20: reverse GNK's unverified $0.30 practice gain. Append-only cash correction; paper only. */
import { supabaseAdmin as db } from '../src/integrations/supabase/client.server';
import { logRepair } from '../src/lib/repair-log.server';
import { runIntegrityCheck } from '../src/lib/integrity.server';
import { rebuildLabGraph } from '../src/lib/lab-graph.server';

const id = 'e14dae3a-8b53-46aa-b24c-97264a338247';
const { data: before, error } = await db.from('trades').select('*').eq('id', id).single();
if (error || !before) throw new Error(error?.message ?? 'missing');
if (before.mode !== 'paper' || before.broker_order_id) throw new Error('Not a practice trade; stopped.');
if (Number(before.profit) === 0) { console.log('Already reversed.'); process.exit(0); }
if (Number(before.profit) !== 0.3) throw new Error(`Unexpected profit ${before.profit}; stopped.`);
const note = `Needs review — Oct 2026 market-data outage; entry fill unverified. Unverified $0.30 practice gain reversed 2026-11-20 (user approved); original prices preserved. Original note: ${before.status_note ?? 'none'}`;
const { error: le } = await db.from('ledger_entries').insert({ entry_date: '2026-11-20', kind: 'reserve', amount: -0.3, available_on: '2026-11-20', note: '[Correction] reversed unverified outage gain GNK (original reserve kept)', trade_id: id, strategy_id: before.strategy_id });
if (le) throw new Error(le.message);
const { error: ue } = await db.from('trades').update({ profit: 0, kept: 0, status_note: note }).eq('id', id).eq('mode', 'paper').eq('profit', 0.3);
if (ue) throw new Error(ue.message);
const { data: after } = await db.from('trades').select('*').eq('id', id).single();
const verified = Number(after?.profit) === 0 && after?.entry_price === before.entry_price && after?.exit_price === before.exit_price;
await logRepair({ repair_type: 'settle_stale_paper', target: id, before_status: before, after_status: { ...after, action: 'reverse_unverified_gain' }, verified, verification_note: 'Offsetting -0.30 reserve appended; original rows kept.', source: 'approved_outage_repair' });
await rebuildLabGraph();
const r = await runIntegrityCheck('manual');
console.log(JSON.stringify({ verified, verdict: r.verdict, errors: r.report.discrepancies.filter(d => d.severity === 'error') }, null, 2));
