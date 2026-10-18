/**
 * Event Intelligence (research only). Reads free SEC EDGAR 8-K filings for
 * the day's top scanned candidates, classifies them by the SEC's own item
 * codes, and lets the Lead test whether event information would have improved
 * outcomes. Never read by live trading, scoring, or position logic.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const UA = "ASTR-Event-Intelligence/1.0 (astr-research@markeith.app)";

type Rule = { category: string; sentiment: "bearish" | "bullish" | "watch"; score: number; label: string };
const ITEM_RULES: Record<string, Rule> = {
  "1.01": { category: "agreement", sentiment: "bullish", score: 5, label: "Material agreement signed" },
  "1.03": { category: "bankruptcy", sentiment: "bearish", score: -30, label: "Bankruptcy or receivership" },
  "2.01": { category: "m&a", sentiment: "watch", score: 0, label: "Acquisition or disposal completed" },
  "2.04": { category: "debt", sentiment: "bearish", score: -15, label: "Debt obligation accelerated" },
  "2.05": { category: "layoffs", sentiment: "watch", score: -5, label: "Layoffs / restructuring costs" },
  "2.06": { category: "impairment", sentiment: "bearish", score: -12, label: "Material impairment" },
  "3.01": { category: "delisting", sentiment: "bearish", score: -25, label: "Delisting notice" },
  "4.01": { category: "auditor", sentiment: "watch", score: -5, label: "Auditor change" },
  "4.02": { category: "restatement", sentiment: "bearish", score: -25, label: "Prior financials unreliable" },
  "5.02": { category: "management", sentiment: "watch", score: -3, label: "Officer/director change" },
  "8.01": { category: "other", sentiment: "watch", score: 0, label: "Other material event" },
};

let cikMap: Map<string, string> | null = null;
async function tickerToCik(): Promise<Map<string, string>> {
  if (cikMap) return cikMap;
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`SEC ticker map ${res.status}`);
  const json = (await res.json()) as Record<string, { cik_str: number; ticker: string }>;
  cikMap = new Map(Object.values(json).map((r) => [r.ticker.toUpperCase(), String(r.cik_str).padStart(10, "0")]));
  return cikMap;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull recent 8-Ks for the latest scan's top candidates. Fail-safe. */
export async function scanEvents(opts: { top?: number; lookbackDays?: number } = {}) {
  const top = opts.top ?? 25;
  const since = new Date(Date.now() - (opts.lookbackDays ?? 30) * 864e5).toISOString().slice(0, 10);
  const { data: run } = await supabaseAdmin.from("scan_runs").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!run) return { checked: 0, stored: 0 };
  const { data: scores } = await supabaseAdmin.from("scan_scores").select("ticker").eq("run_id", run.id).order("rank").limit(top);
  const map = await tickerToCik();
  let checked = 0;
  const rows: any[] = [];
  for (const { ticker } of scores ?? []) {
    const cik = map.get(ticker.toUpperCase());
    if (!cik) continue;
    try {
      const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: { "User-Agent": UA } });
      checked++;
      if (!res.ok) continue;
      const j: any = await res.json();
      const r = j?.filings?.recent ?? {};
      const n = (r.form ?? []).length;
      for (let i = 0; i < n; i++) {
        if (r.form[i] !== "8-K" || r.filingDate[i] < since) continue;
        const items = String(r.items?.[i] ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
        const matched = items.map((it: string) => ITEM_RULES[it]).filter(Boolean) as Rule[];
        if (matched.length === 0) continue;
        const score = matched.reduce((a, m) => a + m.score, 0);
        const worst = matched.slice().sort((a, b) => a.score - b.score)[0]!;
        const sentiment = score <= -10 ? "bearish" : score >= 5 ? "bullish" : "watch";
        const acc = String(r.accessionNumber[i]);
        rows.push({
          ticker, cik, filed_on: r.filingDate[i], form: "8-K", items, category: worst.category, sentiment, score,
          confidence: matched.some((m) => Math.abs(m.score) >= 20) ? "high" : "medium",
          reason: matched.map((m) => m.label).join("; "), accession: acc,
          url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc.replace(/-/g, "")}/${r.primaryDocument?.[i] ?? ""}`,
        });
      }
    } catch (e) {
      console.error("sec fetch failed", ticker, e instanceof Error ? e.message : e);
    }
    await sleep(150); // well under SEC's 10 req/s
  }
  if (rows.length) await supabaseAdmin.from("market_events").upsert(rows, { onConflict: "accession", ignoreDuplicates: true });
  return { checked, stored: rows.length };
}

/**
 * Lead test: did stocks with bearish/bullish filings do worse/better over the
 * next 5 sessions than they otherwise would? Uses shared daily_bars only.
 * Result is advisory evidence, never applied to live trading.
 */
export async function evaluateEvents() {
  const { data: events } = await supabaseAdmin.from("market_events").select("ticker, filed_on, sentiment").order("filed_on", { ascending: false }).limit(300);
  const groups: Record<string, number[]> = { bearish: [], bullish: [], watch: [] };
  for (const ev of events ?? []) {
    const { data: bars } = await supabaseAdmin.from("daily_bars").select("bar_date, close").eq("ticker", ev.ticker).gte("bar_date", ev.filed_on).order("bar_date").limit(6);
    if (!bars || bars.length < 6) continue;
    groups[ev.sentiment]?.push((Number(bars[5]!.close) / Number(bars[0]!.close) - 1) * 100);
  }
  const summary = Object.fromEntries(
    Object.entries(groups).map(([k, v]) => [k, { n: v.length, avg_5d_pct: v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null }]),
  );
  const b = summary["bearish"] as { n: number; avg_5d_pct: number | null };
  const ready = b.n >= 20;
  const verdict = !ready
    ? `Collecting: ${b.n}/20 bearish filings with a completed 5-session outcome.`
    : (b.avg_5d_pct ?? 0) < 0
      ? "Bearish filings underperformed. Filtering them looks helpful — needs Skeptic review before any live change."
      : "Bearish filings did not underperform. Lead does not recommend filtering on them yet.";
  await supabaseAdmin.from("research_runs").insert({ kind: "event_intelligence", config: { horizon: "5d" }, summary: { ...summary, verdict, ready }, warnings: [] });
  return { summary, verdict, ready };
}

export async function eventsOverview(opts: { ticker?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 15;
  let query = supabaseAdmin
    .from("market_events")
    .select("ticker, filed_on, form, items, sentiment, score, confidence, reason, url")
    .order("filed_on", { ascending: false })
    .limit(limit);
  if (opts.ticker) query = query.eq("ticker", opts.ticker.toUpperCase());
  const [{ data: events }, { data: runs }] = await Promise.all([
    query,
    supabaseAdmin.from("research_runs").select("summary, created_at").eq("kind", "event_intelligence").order("created_at", { ascending: false }).limit(1),
  ]);
  return { events: events ?? [], latest: (runs?.[0]?.summary as any) ?? null };
}
