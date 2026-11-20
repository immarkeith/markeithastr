/** Approved outage annotation only; no fabricated sales, cash entries, or P&L.
 * Run with the target host's existing server environment: bun scripts/repair-paper-outages.ts
 */
import { supabaseAdmin as db } from '../src/integrations/supabase/client.server';
import { quarantineStalePaperOutages } from '../src/lib/paper-outage.server';
import { logRepair } from '../src/lib/repair-log.server';
import { nyParts } from '../src/lib/market-calendar';
import { runIntegrityCheck } from '../src/lib/integrity.server';
import { rebuildLabGraph } from '../src/lib/lab-graph.server';

const closedIds = ['92908c90-3566-4448-beb8-37b237d5b254', '82e9cdd1-91f8-4250-88a0-3d0894bee648', '8a68e5f7-9927-4c67-890a-593e342ecc79', '22ebc7a3-8d91-450f-96ad-bc5764ea2269', 'f49e24c9-db51-4d19-961d-5471816b5a6d'];
let annotated = 0;
for (const id of closedIds) {
  const { data: before, error } = await db.from('trades').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  if (!before || before.mode !== 'paper' || !before.strategy_id || before.broker_order_id || before.status !== 'closed' || Number(before.profit) !== 0) throw new Error(`Unexpected paper record ${id}; no change made.`);
  if (/Needs review.*entry/i.test(before.status_note ?? '')) continue;
  const note = `Needs review — Oct 2026 market-data outage; entry/exit fills unverified. Original booked prices and $0 result preserved, excluded from verified performance. Original note: ${before.status_note ?? 'none'}`;
  const { data: changed, error: writeError } = await db.from('trades').update({ status_note: note }).eq('id', id).eq('mode', 'paper').eq('status', 'closed').eq('profit', 0).is('broker_order_id', null).select('id');
  if (writeError) throw new Error(writeError.message);
  if (!changed?.length) throw new Error(`Concurrent change to ${id}; stopped.`);
  const { data: after, error: readError } = await db.from('trades').select('*').eq('id', id).single();
  const verified = !readError && after?.status_note === note && after.profit === before.profit && after.entry_price === before.entry_price && after.exit_price === before.exit_price;
  await logRepair({ repair_type: 'settle_stale_paper', target: id, before_status: before, after_status: { ...after, action: 'annotation_only' }, verified, verification_note: 'Historical prices and cash preserved; excluded from verified results.', source: 'approved_outage_repair' });
  if (!verified) throw new Error(`Annotation readback failed for ${id}`);
  annotated++;
}
const quarantined = await quarantineStalePaperOutages(nyParts().date);
await rebuildLabGraph();
const result = await runIntegrityCheck('manual');
console.log(JSON.stringify({ annotated, quarantined: quarantined.length, verdict: result.verdict, stored: result.stored, pillars: result.report.pillars, errors: result.report.discrepancies.filter(d => d.severity === 'error') }, null, 2));