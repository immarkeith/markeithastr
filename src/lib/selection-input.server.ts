import { supabaseAdmin } from '@/integrations/supabase/client.server';
export type SelectionInput = { ticker: string; bars: [string, number, number, number, number, number][] };
/** Walk the ticker/date primary key, not repeated full-cache GROUP BY queries. */
export async function loadSelectionInput(): Promise<SelectionInput[]> {
  const tickers: string[] = [];
  let cursor = '';
  for (;;) {
    const { data, error } = await supabaseAdmin.from('daily_bars').select('ticker').gt('ticker', cursor).order('ticker').limit(1);
    if (error) throw new Error(`Selection universe unavailable: ${error.message}`);
    const ticker = data?.[0]?.ticker;
    if (!ticker) break;
    tickers.push(ticker); cursor = ticker;
  }
  const out: SelectionInput[] = [];
  for (let i = 0; i < tickers.length; i += 8) {
    const batch = await Promise.all(tickers.slice(i, i + 8).map(async ticker => {
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