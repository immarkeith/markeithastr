/** Bounded, resumable extension of the shared history. Never changes a formula. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { alpacaBars } from "./market-data.server";
import { reliableBar, RELIABLE_HISTORY_START } from "./history-quality";

export async function deepenHistory(opts: { tickers?: number; years?: number } = {}) {
  const { data: run, error: runError } = await supabaseAdmin
    .from("scan_runs")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (runError) throw new Error(runError.message);
  if (!run) return { deepened: 0, rows: 0, failed: 0 };
  const { data: scores, error: scoreError } = await supabaseAdmin
    .from("scan_scores")
    .select("ticker")
    .eq("run_id", run.id)
    .order("rank")
    .limit(200);
  if (scoreError) throw new Error(scoreError.message);
  const requested = opts.years
    ? new Date(Date.now() - opts.years * 365.25 * 864e5).toISOString().slice(0, 10)
    : RELIABLE_HISTORY_START;
  const target = requested < RELIABLE_HISTORY_START ? RELIABLE_HISTORY_START : requested;
  // Exhausted histories are retried after 30 days. Transient failures are NOT
  // classified as exhausted; old forever-skip markers are deliberately ignored.
  const { data: doneRow, error: doneError } = await supabaseAdmin
    .from("research_runs")
    .select("summary, created_at")
    .eq("kind", "history_deepen_exhausted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (doneError) throw new Error(doneError.message);
  const summary = doneRow?.summary as { target?: string; tickers?: string[] } | null;
  const done = new Set(
    summary?.target === target &&
      doneRow &&
      Date.now() - Date.parse(doneRow.created_at) < 30 * 864e5
      ? (summary.tickers ?? [])
      : [],
  );
  const shallow: { ticker: string; earliest: string }[] = [];
  for (const { ticker } of scores ?? []) {
    if (shallow.length >= (opts.tickers ?? 8)) break;
    if (done.has(ticker)) continue;
    const { data, error } = await supabaseAdmin
      .from("daily_bars")
      .select("bar_date")
      .eq("ticker", ticker)
      .order("bar_date")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.bar_date > target)
      shallow.push({
        ticker,
        earliest: data?.bar_date ?? new Date(Date.now() - 864e5).toISOString().slice(0, 10),
      });
  }
  let rows = 0;
  let failed = 0;
  const exhausted: string[] = [];
  for (const item of shallow) {
    try {
      const bars = (await alpacaBars([item.ticker], target, item.earliest)).filter(
        (b) => b.bar_date < item.earliest && reliableBar(b),
      );
      for (let i = 0; i < bars.length; i += 1000) {
        const { error } = await supabaseAdmin
          .from("daily_bars")
          .upsert(bars.slice(i, i + 1000), {
            onConflict: "ticker,bar_date",
            ignoreDuplicates: true,
          });
        if (error) throw new Error(error.message);
      }
      rows += bars.length;
      if (!bars.length) exhausted.push(item.ticker);
    } catch (error) {
      failed++;
      console.error(
        "History extension failed:",
        item.ticker,
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (exhausted.length) {
    const { error } = await supabaseAdmin
      .from("research_runs")
      .insert({
        kind: "history_deepen_exhausted",
        summary: { target, tickers: [...done, ...exhausted] },
      });
    if (error) throw new Error(error.message);
  }
  return { deepened: shallow.length, rows, failed };
}
