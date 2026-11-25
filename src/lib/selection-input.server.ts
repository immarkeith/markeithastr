import { supabaseAdmin } from '@/integrations/supabase/client.server';
export type SelectionInput = { ticker: string; bars: [string, number, number, number, number, number][] };
/** Every distinct cached ticker, walked through the primary key (no row cap). */
export async function distinctCachedTickers(): Promise<string[]> {
  // Walk each alphabetical segment in parallel: one sequential walk over
  // thousands of cached tickers takes longer than the nightly time budget.
  const bounds = ['', ...'BCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  const segments = await Promise.all(bounds.map(async (start, i) => {
    const end = bounds[i + 1];
    const found: string[] = [];
    let cursor = start;
    for (;;) {
      let q = supabaseAdmin.from('daily_bars').select('ticker').order('ticker').limit(1);
      q = found.length === 0 && start ? q.gte('ticker', cursor) : q.gt('ticker', cursor);
      if (end) q = q.lt('ticker', end);
      const { data, error } = await q;
      if (error) throw new Error(`Selection universe unavailable: ${error.message}`);
      const ticker = data?.[0]?.ticker;
      if (!ticker) break;
      found.push(ticker); cursor = ticker;
    }
    return found;
  }));
  return segments.flat();
}

/** Walk the ticker/date primary key, not repeated full-cache GROUP BY queries. */
export async function loadSelectionInput(): Promise<SelectionInput[]> {
  const tickers = await distinctCachedTickers();
  const out: SelectionInput[] = [];
  for (let i = 0; i < tickers.length; i += 16) {
    const batch = await Promise.all(tickers.slice(i, i + 16).map(async ticker => {
      const bars: SelectionInput['bars'] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabaseAdmin.from('daily_bars')
          .select('bar_date,open,high,low,close,volume').eq('ticker', ticker)
          .order('bar_date', { ascending: false }).range(offset, offset + 999);
        if (error) throw new Error(`Selection prices unavailable: ${error.message}`);
        for (const row of data ?? []) bars.push([row.bar_date, Number(row.open), Number(row.high), Number(row.low), Number(row.close), Number(row.volume)]);
        if ((data ?? []).length < 1000) break;
      }
      bars.reverse();
      return { ticker, bars };
    }));
    out.push(...batch.filter(row => row.bars.length >= 55));
  }
  return out;
}