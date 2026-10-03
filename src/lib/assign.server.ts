/**
 * Assign-to-Researcher + Influence Researcher. Paper research records only:
 * nothing here places orders, touches live positions, rankings or formulas.
 * Records live in research_runs (kind = "assignment") so no schema change is needed.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const KIND = "assignment";
export const HORIZON_DAYS: Record<string, number> = { "1M": 21, "3M": 63, "9M": 189, "1Y+": 252 };

type Bar = { bar_date: string; close: number; volume: number };

async function bars(ticker: string): Promise<Bar[]> {
  const { data } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, close, volume")
    .eq("ticker", ticker)
    .order("bar_date", { ascending: true })
    .limit(5000);
  return (data ?? []) as Bar[];
}

const sma = (v: number[], n: number) => (v.length >= n ? v.slice(-n).reduce((a, b) => a + b, 0) / n : null);
function rsi(v: number[], n = 14) {
  if (v.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = v.length - n; i < v.length; i++) {
    const d = v[i]! - v[i - 1]!;
    if (d > 0) g += d; else l -= d;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

/** Point-in-time snapshot: only bars on/before `asOf`. Missing indicators stay null, never faked. */
function snapshot(all: Bar[], asOf: string) {
  const past = all.filter((b) => b.bar_date <= asOf);
  const closes = past.map((b) => b.close);
  const missing: string[] = [];
  const pick = (name: string, v: number | null) => { if (v === null) missing.push(name); return v; };
  return {
    as_of_bar: past.at(-1)?.bar_date ?? null,
    bars_available: past.length,
    close: past.at(-1)?.close ?? null,
    sma20: pick("SMA20", sma(closes, 20)),
    sma50: pick("SMA50", sma(closes, 50)),
    sma200: pick("SMA200", sma(closes, 200)),
    rsi14: pick("RSI14", rsi(closes)),
    unavailable: missing,
  };
}

function outcome(all: Bar[], from: string, horizon: string) {
  const i = all.findIndex((b) => b.bar_date >= from);
  if (i < 0) return null;
  const n = HORIZON_DAYS[horizon] ?? 21;
  const endIdx = Math.min(i + n, all.length - 1);
  const ret = (all[endIdx]!.close / all[i]!.close - 1) * 100;
  return { entry_date: all[i]!.bar_date, end_date: all[endIdx]!.bar_date, sessions: endIdx - i, complete: i + n < all.length, return_pct: ret };
}

export async function createAssignment(input: {
  ticker: string; researcher: string; tip_date?: string | undefined; horizon?: string | undefined; source?: string | undefined; notes?: string | undefined;
}) {
  const ticker = input.ticker.toUpperCase();
  const all = await bars(ticker);
  const now = new Date().toISOString();
  const asOf = input.tip_date ?? now.slice(0, 10);
  const record = {
    ticker,
    researcher: input.researcher,
    influence: input.researcher === "Influence Researcher",
    assigned_at: now,
    tip_date: input.tip_date ?? null,
    horizon: input.horizon ?? null,
    source: input.source ?? null,
    notes: input.notes ?? null,
    snapshot: snapshot(all, asOf),
    paper_only: true,
  };
  await supabaseAdmin.from("research_runs").insert({ kind: KIND, config: {} as never, summary: record as never, warnings: [] as never } as never);
  return { ok: true, record };
}

export async function listAssignments() {
  const { data } = await supabaseAdmin
    .from("research_runs").select("id, created_at, summary").eq("kind", KIND)
    .order("created_at", { ascending: false }).limit(300);
  const rows = (data ?? []).map((r) => ({ id: r.id as string, ...(r.summary as Record<string, unknown>) })) as Array<
    { id: string; ticker: string; researcher: string; influence: boolean; assigned_at: string; tip_date: string | null; horizon: string | null; source: string | null; notes: string | null; snapshot: ReturnType<typeof snapshot> }
  >;
  const spy = rows.some((r) => r.influence) ? await bars("SPY") : [];
  const cache = new Map<string, Bar[]>();
  const out = [];
  for (const r of rows) {
    let result = null;
    if (r.influence && r.tip_date && r.horizon) {
      if (!cache.has(r.ticker)) cache.set(r.ticker, await bars(r.ticker));
      const o = outcome(cache.get(r.ticker)!, r.tip_date, r.horizon);
      const b = outcome(spy, r.tip_date, r.horizon);
      result = o ? { ...o, spy_pct: b?.return_pct ?? null, beat_spy: b ? o.return_pct > b.return_pct : null } : null;
    }
    out.push({ ...r, result });
  }
  const scored = out.filter((r) => r.result?.complete);
  const byHorizon = Object.keys(HORIZON_DAYS).map((h) => {
    const s = scored.filter((r) => r.horizon === h);
    return {
      horizon: h,
      count: s.length,
      win_rate: s.length ? (s.filter((r) => r.result!.return_pct > 0).length / s.length) * 100 : null,
      beat_spy_rate: s.length ? (s.filter((r) => r.result!.beat_spy).length / s.length) * 100 : null,
      avg_return: s.length ? s.reduce((a, r) => a + r.result!.return_pct, 0) / s.length : null,
    };
  });
  return { assignments: out, influence_profile: byHorizon };
}
