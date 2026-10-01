/**
 * Phase C: autonomous metric discovery + streak backtesting (paper research only).
 * Reads ONLY the shared daily_bars history. Never touches live trading, orders,
 * balances, settings or rankings — results are evidence for manual review.
 *
 * Point-in-time: every metric for day D uses bars up to D-1 close plus D open;
 * the outcome is D open -> D close (same-day trade). Bins are fixed in advance
 * (no peeking). Dates before the cutoff are "learn", after are "holdout"; a
 * finding is only "validated" when holdout agrees with learn.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const KIND = "phase_c_discovery";
const VERSION = 1;
const PER_PASS = 12;

type Agg = Record<string, Record<string, { ln: number; ls: number; tn: number; ts: number }>>;
type State = { version: number; tickers: string[]; idx: number; cutoff: string; agg: Agg; base: { ln: number; ls: number; tn: number; ts: number } };

const BINS: Record<string, { edges: number[]; labels: string[] }> = {
  streak: { edges: [1, 3, 7, 15], labels: ["1 day", "2-3 days", "4-7 days", "8-15 days", "16+ days"] },
  gap: { edges: [-2, -0.5, 0.5, 2], labels: ["gap < -2%", "-2 to -0.5%", "flat", "0.5 to 2%", "gap > 2%"] },
  mom5: { edges: [-5, -1, 1, 5], labels: ["< -5%", "-5 to -1%", "-1 to 1%", "1 to 5%", "> 5%"] },
  mom20: { edges: [-10, -3, 3, 10], labels: ["< -10%", "-10 to -3%", "-3 to 3%", "3 to 10%", "> 10%"] },
  volratio: { edges: [0.6, 0.9, 1.3, 2], labels: ["< 0.6x", "0.6-0.9x", "0.9-1.3x", "1.3-2x", "> 2x"] },
  range: { edges: [1.5, 3, 5, 8], labels: ["< 1.5%", "1.5-3%", "3-5%", "5-8%", "> 8%"] },
  offhigh: { edges: [-20, -10, -5, -1], labels: ["> 20% below", "10-20% below", "5-10% below", "1-5% below", "at 20d high"] },
};
const NAMES: Record<string, string> = {
  streak: "Qualification streak (close above 20d avg with positive 5d momentum)",
  gap: "Opening gap vs prior close",
  mom5: "5-day momentum",
  mom20: "20-day momentum",
  volratio: "Prior-day volume vs 20d average",
  range: "Prior-day high-low range",
  offhigh: "Distance from 20-day high",
};

function bin(f: string, v: number) {
  const e = BINS[f]!.edges;
  let i = 0;
  while (i < e.length && v > e[i]) i++;
  return BINS[f]!.labels[i]!;
}

async function loadState(): Promise<State | null> {
  const { data } = await supabaseAdmin.from("research_runs").select("summary").eq("kind", KIND).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const s = data?.summary as State | null;
  return s && s.version === VERSION ? s : null;
}

async function saveState(s: State, report?: unknown) {
  await supabaseAdmin.from("research_runs").delete().eq("kind", KIND);
  await supabaseAdmin.from("research_runs").insert({ kind: KIND, summary: { ...s, report } as never });
}

async function bars(ticker: string) {
  const out: { bar_date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin.from("daily_bars").select("bar_date,open,high,low,close,volume").eq("ticker", ticker).order("bar_date").range(from, from + 999);
    if (!data?.length) break;
    for (const r of data) out.push({ bar_date: r.bar_date, open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume });
    if (data.length < 1000) break;
  }
  return out;
}

function add(a: Agg, f: string, label: string, learn: boolean, r: number) {
  const c = ((a[f] ??= {})[label] ??= { ln: 0, ls: 0, tn: 0, ts: 0 });
  if (learn) { c.ln++; c.ls += r; } else { c.tn++; c.ts += r; }
}

export async function runDiscoveryStep(opts: { restart?: boolean } = {}) {
  let s = opts.restart ? null : await loadState();
  if (!s) {
    const { data: run } = await supabaseAdmin.from("scan_runs").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: sc } = run ? await supabaseAdmin.from("scan_scores").select("ticker").eq("run_id", run.id).order("rank").limit(200) : { data: [] };
    const { data: last } = await supabaseAdmin.from("daily_bars").select("bar_date").order("bar_date", { ascending: false }).limit(1).maybeSingle();
    const cutoff = new Date(new Date(last?.bar_date ?? Date.now()).getTime() - 365 * 864e5).toISOString().slice(0, 10);
    s = { version: VERSION, tickers: (sc ?? []).map((x) => x.ticker), idx: 0, cutoff, agg: {}, base: { ln: 0, ls: 0, tn: 0, ts: 0 } };
  }
  const batch = s.tickers.slice(s.idx, s.idx + PER_PASS);
  for (const t of batch) {
    const b = await bars(t);
    let streak = 0;
    for (let i = 21; i < b.length; i++) {
      const p = b[i - 1]!;
      const w = b.slice(i - 21, i - 1);
      const sma = w.reduce((x, y) => x + y.close, 0) / w.length;
      const qualified = p.close > sma && p.close > b[i - 6]!.close;
      streak = qualified ? streak + 1 : 0;
      const d = b[i]!;
      if (!(d.open > 0) || !(p.close > 0)) continue;
      const r = ((d.close - d.open) / d.open) * 100;
      if (!Number.isFinite(r) || Math.abs(r) > 50) continue; // bad print guard
      const learn = d.bar_date < s.cutoff;
      const avgVol = w.reduce((x, y) => x + y.volume, 0) / w.length;
      const hi = Math.max(...w.map((x) => x.high), p.high);
      if (learn) { s.base.ln++; s.base.ls += r; } else { s.base.tn++; s.base.ts += r; }
      if (streak > 0) add(s.agg, "streak", bin("streak", streak), learn, r);
      add(s.agg, "gap", bin("gap", ((d.open - p.close) / p.close) * 100), learn, r);
      add(s.agg, "mom5", bin("mom5", ((p.close - b[i - 6]!.close) / b[i - 6]!.close) * 100), learn, r);
      add(s.agg, "mom20", bin("mom20", ((p.close - b[i - 21]!.close) / b[i - 21]!.close) * 100), learn, r);
      if (avgVol > 0) add(s.agg, "volratio", bin("volratio", p.volume / avgVol), learn, r);
      add(s.agg, "range", bin("range", ((p.high - p.low) / p.close) * 100), learn, r);
      add(s.agg, "offhigh", bin("offhigh", ((p.close - hi) / hi) * 100), learn, r);
    }
  }
  s.idx += batch.length;
  const done = s.idx >= s.tickers.length;
  const report = buildReport(s);
  await saveState(s, report);
  return { done, processed: s.idx, total: s.tickers.length, report };
}

export function buildReport(s: State) {
  const bl = s.base.ln ? s.base.ls / s.base.ln : 0;
  const bt = s.base.tn ? s.base.ts / s.base.tn : 0;
  const findings: { metric: string; bucket: string; learnEdge: number; holdoutEdge: number; learnN: number; holdoutN: number; verdict: string }[] = [];
  for (const [f, buckets] of Object.entries(s.agg)) {
    for (const label of BINS[f]!.labels) {
      const c = buckets[label];
      if (!c) continue;
      const le = c.ln ? c.ls / c.ln - bl : 0;
      const he = c.tn ? c.ts / c.tn - bt : 0;
      let verdict = "Not enough data";
      if (c.ln >= 200 && c.tn >= 80) {
        verdict = Math.sign(le) === Math.sign(he) && Math.abs(he) >= 0.05 && Math.abs(le) >= 0.05
          ? (he > 0 ? "Validated edge (positive)" : "Validated warning (negative)")
          : "Failed holdout — dropped";
      }
      findings.push({ metric: NAMES[f]!, bucket: label, learnEdge: +le.toFixed(3), holdoutEdge: +he.toFixed(3), learnN: c.ln, holdoutN: c.tn, verdict });
    }
  }
  const streak = findings.filter((x) => x.metric === NAMES["streak"]);
  const sv = streak.filter((x) => x.verdict.startsWith("Validated"));
  const long = sv.filter((x) => x.bucket === "8-15 days" || x.bucket === "16+ days");
  const streakConclusion = long.length === 0
    ? "No validated evidence yet that long streaks predict continuation or exhaustion."
    : long.every((x) => x.holdoutEdge > 0) ? "Long qualification streaks tended to CONTINUE (holdout confirmed)."
    : long.every((x) => x.holdoutEdge < 0) ? "Long qualification streaks tended toward EXHAUSTION (holdout confirmed)."
    : "Mixed: some long-streak buckets continued, others faded.";
  return {
    cutoff: s.cutoff,
    baseline: { learn: +bl.toFixed(3), holdout: +bt.toFixed(3), learnN: s.base.ln, holdoutN: s.base.tn },
    streakConclusion,
    specialists: [
      { role: "Streak Analyst", focus: "Why stocks keep qualifying and whether streak length predicts continuation or exhaustion", findings: streak },
      { role: "Metric Scout", focus: "Searches gap, momentum, volume, range and distance-from-high for same-day edges", findings: findings.filter((x) => x.metric !== NAMES["streak"] && x.verdict.startsWith("Validated")) },
      { role: "Skeptic", focus: "Drops anything that fails the holdout year", findings: findings.filter((x) => x.verdict.startsWith("Failed")) },
    ],
    note: "Paper research only. Nothing here changes live trading; any change needs your manual approval.",
  };
}
