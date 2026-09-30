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
  // Tickers the free feed has no older bars for (recent IPOs, thin IEX names).
  // Persisted so we never retry them — otherwise the same empty tickers get
  // requested every pass and the job loops forever without making progress.
  const { data: doneRow } = await supabaseAdmin
    .from("research_runs")
    .select("summary")
    .eq("kind", "history_deepen_done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const doneTickers = new Set<string>(
    Array.isArray((doneRow?.summary as { tickers?: unknown } | null)?.tickers)
      ? ((doneRow!.summary as { tickers: string[] }).tickers ?? [])
      : [],
  );
  const shallow: { ticker: string; earliest: string }[] = [];
  for (const { ticker } of scores ?? []) {
    if (shallow.length >= (opts.tickers ?? 20)) break;
    if (doneTickers.has(ticker)) continue;
    const { data } = await supabaseAdmin.from("daily_bars").select("bar_date").eq("ticker", ticker).order("bar_date").limit(1).maybeSingle();
    if (data && data.bar_date > target) shallow.push({ ticker, earliest: data.bar_date });
  }
  let rows = 0;
  const newlyDone: string[] = [];
  for (const s of shallow) {
    try {
      const bars = (await alpacaBars([s.ticker], target, s.earliest)).filter((b) => b.bar_date < s.earliest);
      for (let i = 0; i < bars.length; i += 1000) {
        await supabaseAdmin.from("daily_bars").upsert(bars.slice(i, i + 1000), { onConflict: "ticker,bar_date", ignoreDuplicates: true });
      }
      rows += bars.length;
      if (bars.length === 0) newlyDone.push(s.ticker);
    } catch (e) {
      console.error("history deepen failed", s.ticker, e instanceof Error ? e.message : e);
      // A failing ticker must not be retried every pass either.
      newlyDone.push(s.ticker);
    }
  }
  if (newlyDone.length > 0) {
    await supabaseAdmin.from("research_runs").insert({
      kind: "history_deepen_done",
      summary: { tickers: [...doneTickers, ...newlyDone] },
    });
  }
  return { deepened: shallow.length, rows };
}
