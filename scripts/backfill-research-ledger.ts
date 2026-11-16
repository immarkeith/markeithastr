/** Portable, bounded research maintenance; never calls broker or writes trades.
 * bun scripts/backfill-research-ledger.ts [--replay-only]
 * Existing prices are preserved; rerunning resumes safely via duplicate keys.
 */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { alpacaBars } from '../src/lib/market-data.server';
import { validDailyBar } from '../src/lib/market-data-validation';
import { runResearcherLedger } from '../src/lib/researcher-ledger.server';

if (!process.argv.includes('--replay-only')) {
  const { data, error } = await supabaseAdmin.rpc('scan_input', { p_days: 2000, p_limit: 300, p_offset: 0 });
  if (error) throw new Error(error.message);
  const symbols = [...new Set([...(data ?? []).map(r => r.ticker), 'SPY'])];
  if (symbols.length < 300) throw new Error('Research universe is incomplete; refusing a partial backfill.');
  // Provider end is exclusive. Yesterday avoids a partially completed session.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const until = end.toISOString().slice(0, 10);
  for (let cursor = '2024-01-01'; cursor < until;) {
    const next = new Date(`${cursor}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const stop = next.toISOString().slice(0, 10) < until ? next.toISOString().slice(0, 10) : until;
    let bars = await alpacaBars(symbols, cursor, stop);
    bars = bars.filter(b => b.bar_date >= cursor && b.bar_date < stop && validDailyBar(b));
    for (let i = 0; i < bars.length; i += 500) {
      const { error: writeError } = await supabaseAdmin.from('daily_bars').upsert(bars.slice(i, i + 500), { onConflict: 'ticker,bar_date', ignoreDuplicates: true });
      if (writeError) throw new Error(writeError.message);
    }
    console.log(JSON.stringify({ from: cursor, until: stop, returned: bars.length, symbols: symbols.length }));
    cursor = stop;
  }
}
console.log('Saved researcher results:', JSON.stringify(await runResearcherLedger()));