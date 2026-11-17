/** Research-price ingestion only: no broker, ledger replay or trade writes.
 * bun scripts/expand-research-history.ts [--from=2020-07-27] [--until=2024-01-01]
 * Windows are restartable; existing prices are never overwritten.
 * A completed download does NOT certify point-in-time full-market eligibility.
 */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { alpacaBars } from '../src/lib/market-data.server';
import { validDailyBar } from '../src/lib/market-data-validation';

const option = (name: string, fallback: string) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const from = option('from', '2020-07-27');
const until = option('until', '2024-01-01');
if (![from, until].every(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d))) || from >= until) throw new Error('Invalid history window');
const manifest = option('symbols-file', '');
let cohort: string[];
if (manifest) {
  const saved = await Bun.file(manifest).json() as { symbols?: unknown };
  if (!Array.isArray(saved.symbols) || !saved.symbols.every(s => typeof s === 'string' && /^[A-Z]{1,5}$/.test(s))) throw new Error('Invalid cohort manifest');
  cohort = saved.symbols as string[];
} else {
  const { data, error } = await supabaseAdmin.rpc('scan_input', { p_days: 180, p_limit: 20000, p_offset: 0 });
  if (error) throw new Error(error.message);
  cohort = (data ?? []).map(r => r.ticker);
}
const symbols = [...new Set([...cohort, 'SPY'])].sort();
if (symbols.length < 300) throw new Error('Established research cohort is incomplete');
console.log(JSON.stringify({ stage: 'start', from, until, cohort: symbols.length, feed: 'alpaca_iex_adjustment_all', existing_rows: 'preserved', full_market_verified: false }));
for (let cursor = from; cursor < until;) {
  const next = new Date(`${cursor}T00:00:00Z`);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const stop = next.toISOString().slice(0, 10) < until ? next.toISOString().slice(0, 10) : until;
  const counts = new Map<string, Set<string>>();
  let returned = 0;
  let invalid = 0;
  for (let i = 0; i < symbols.length; i += 100) {
    let bars: Awaited<ReturnType<typeof alpacaBars>> = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      try { bars = await alpacaBars(symbols.slice(i, i + 100), cursor, stop); break; }
      catch (failure) {
        if (attempt === 2) throw failure;
        await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
    const valid = bars.filter(b => b.bar_date >= cursor && b.bar_date < stop && validDailyBar(b));
    invalid += bars.length - valid.length;
    for (const b of valid) {
      const tickers = counts.get(b.bar_date) ?? new Set<string>();
      tickers.add(b.ticker); counts.set(b.bar_date, tickers);
    }
    for (let j = 0; j < valid.length; j += 500) {
      const { error: writeError } = await supabaseAdmin.from('daily_bars').upsert(valid.slice(j, j + 500), { onConflict: 'ticker,bar_date', ignoreDuplicates: true });
      if (writeError) throw new Error(writeError.message);
    }
    returned += valid.length;
  }
  console.log(JSON.stringify({ stage: 'window_complete', from: cursor, until: stop, returned, invalid, sessions: counts.size, min_returned_symbols: counts.size ? Math.min(...[...counts.values()].map(s => s.size)) : 0, cohort: symbols.length }));
  cursor = stop;
}
console.log(JSON.stringify({ stage: 'download_complete', from, until, cohort: symbols.length, replay_performed: false, full_market_verified: false }));