/**
 * Deepens the ONE shared daily_bars history (used by every researcher and
 * backtest) with multi-year bars from the free Alpaca IEX feed. Bounded per
 * run, never re-downloads existing rows.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { alpacaBars } from "./market-data.server";

export async function deepenHistory(opts: { tickers?: number; years?: number } = {}) {
  const { data: run } = await supabaseAdmin.from("scan_runs").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return { deepened: 0, rows: 0 };
  const { data: scores } = await supabaseAdmin.from("scan_scores").select("ticker").eq("run_id", run.id).order("rank").limit(200);
  const target = new Date(Date.now() - (opts.years ?? 3) * 365 * 864e5).toISOString().slice(0, 10);
  const shallow: { ticker: string; earliest: string }[] = [];
  for (const { ticker } of scores ?? []) {
    if (shallow.length >= (opts.tickers ?? 20)) break;
    const { data } = await supabaseAdmin.from("daily_bars").select("bar_date").eq("ticker", ticker).order("bar_date").limit(1).maybeSingle();
    if (data && data.bar_date > target) shallow.push({ ticker, earliest: data.bar_date });
  }
  let rows = 0;
  for (const s of shallow) {
    try {
      const bars = (await alpacaBars([s.ticker], target, s.earliest)).filter((b) => b.bar_date < s.earliest);
      for (let i = 0; i < bars.length; i += 1000) {
        await supabaseAdmin.from("daily_bars").upsert(bars.slice(i, i + 1000), { onConflict: "ticker,bar_date", ignoreDuplicates: true });
      }
      rows += bars.length;
    } catch (e) {
      console.error("history deepen failed", s.ticker, e instanceof Error ? e.message : e);
    }
  }
  return { deepened: shallow.length, rows };
}
