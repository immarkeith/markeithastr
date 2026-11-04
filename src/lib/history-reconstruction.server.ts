/**
 * One-time historical reconstruction of researcher performance (Research Lab).
 *
 * - Universe: every listed US equity Alpaca knows, active AND inactive, so
 *   companies that later delisted are included (no survivorship bias).
 *   Eligibility is decided point-in-time each morning by the same price and
 *   trailing-liquidity filters the researchers use today.
 * - Bars are streamed from Alpaca's free IEX feed (split/dividend adjusted),
 *   scored in memory and discarded; only each researcher's best pick per
 *   session is kept, so the database does not grow by ~200 MB of bars.
 * - Results are saved in research_runs (kind "lab_history"), never in the
 *   trades table, and never touch live trading, the paper books, or the 113
 *   quarantined records.
 *
 * Resumable: progress lives in research_runs (kind "lab_history_progress").
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

import { LANES, laneSeedParams, listResearchers, passesFilters, scoreWith, type LaneParams, type PanelRow } from "./department.server";
import { extraFactors, marketContext } from "./factors";
import { buildHistoryCurve, mergePick, type BestPicks, type HistoryCurve } from "./history-reconstruction";
import { assemble, bandBonus, type MasterRule } from "./master-formula.server";
import { alpacaAllListedEquities, alpacaBars } from "./market-data.server";
import { loadSettings, volumeShare } from "./scan.server";
import { scoreSecurity, snapshot, type Bar, type Weights } from "./scoring";

export const HISTORY_KIND = "lab_history";
const PROGRESS_KIND = "lab_history_progress";
export const WARMUP_START = "2020-07-27";
export const TRADE_START = "2021-01-04";
const BATCH = 100;
const UNIT: Weights = { trend: 100, momentum: 100, volume: 100, relative_strength: 100, volatility_quality: 100 };
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

interface Progress {
  universe: string[];
  cursor: number;
  end: string;
  best: BestPicks;
  started_at: string;
}

interface LaneSetup {
  lane: string;
  p: LaneParams;
  bands: ReturnType<typeof assemble>["bands"];
}

async function laneSetups() {
  const settings = await loadSettings();
  const share = await volumeShare(settings);
  const researchers = await listResearchers();
  const out: LaneSetup[] = [];
  for (const lane of LANES) {
    const seed = laneSeedParams(lane, settings);
    const saved = researchers.find((r) => r.lane === lane.lane)?.params as Partial<LaneParams> | undefined;
    const p: LaneParams = saved && typeof saved === "object"
      ? { ...seed, ...saved, weights: { ...seed.weights, ...((saved.weights as object) ?? {}) } as LaneParams["weights"] }
      : seed;
    for (const k of Object.keys(p.weights) as (keyof LaneParams["weights"])[]) if (!Number.isFinite(Number(p.weights[k]))) p.weights[k] = seed.weights[k] ?? 0;
    if (!Number.isFinite(Number(p.min_score_to_trade))) p.min_score_to_trade = seed.min_score_to_trade;
    out.push({ lane: lane.lane, p, bands: [] });
  }
  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const master = assemble((ruleRows ?? []) as unknown as MasterRule[], {
    weights: { trend: +settings.weight_trend, momentum: +settings.weight_momentum, volume: +settings.weight_volume, relative_strength: +settings.weight_relative_strength, volatility_quality: +settings.weight_volatility_quality },
    min_score_to_trade: +settings.min_score_to_trade, num_day_trades: 1, rsi_max: null, rsi_min: null, atr_pct_min: null, atr_pct_max: null, rel_volume_min: null,
  });
  out.unshift({ lane: "lead", p: master, bands: master.bands });
  return { settings, share, lanes: out, proxy: (settings.market_proxy || "SPY").toUpperCase() };
}

async function loadProgress(): Promise<{ id: string; p: Progress } | null> {
  const { data } = await supabaseAdmin.from("research_runs").select("id, summary").eq("kind", PROGRESS_KIND).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { id: String(data.id), p: data.summary as unknown as Progress };
}

function toBars(rows: { ticker: string; bar_date: string; open: number; high: number; low: number; close: number; volume: number }[]) {
  const map = new Map<string, Bar[]>();
  for (const b of rows) {
    const list = map.get(b.ticker) ?? [];
    list.push({ date: b.bar_date, open: +b.open, high: +b.high, low: +b.low, close: +b.close, volume: +b.volume });
    map.set(b.ticker, list);
  }
  for (const list of map.values()) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return map;
}

/** Process one batch of symbols; returns how far through the universe we are. */
export async function reconstructStep(opts: { restart?: boolean } = {}) {
  const setup = await laneSetups();
  let prog = opts.restart ? null : await loadProgress();
  if (!prog) {
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const universe = (await alpacaAllListedEquities()).filter((t) => t !== setup.proxy);
    const p: Progress = { universe, cursor: 0, end: yesterday, best: {}, started_at: new Date().toISOString() };
    if (opts.restart) await supabaseAdmin.from("research_runs").delete().eq("kind", PROGRESS_KIND);
    const { data, error } = await supabaseAdmin.from("research_runs").insert({ kind: PROGRESS_KIND, summary: p as unknown as Json }).select("id").single();
    if (error) throw new Error(error.message);
    prog = { id: String(data.id), p };
  }
  const { p } = prog;
  if (p.cursor >= p.universe.length) return { done: true, cursor: p.cursor, total: p.universe.length };

  const proxyBars = toBars(await alpacaBars([setup.proxy], WARMUP_START, p.end)).get(setup.proxy) ?? [];
  const proxyIdx = new Map(proxyBars.map((b, i) => [b.date, i]));
  const symbols = p.universe.slice(p.cursor, p.cursor + BATCH);
  const byTicker = toBars(await alpacaBars(symbols, WARMUP_START, p.end));

  for (const [ticker, bars] of byTicker) {
    for (let i = 56; i < bars.length; i++) {
      const bar = bars[i]!;
      if (bar.date < TRADE_START) continue;
      const pIdx = proxyIdx.get(bar.date);
      if (pIdx === undefined) continue;
      const window = bars.slice(Math.max(0, i - 80), i); // through yesterday only
      const snap = snapshot(window);
      if (!snap) continue;
      const back = proxyBars[pIdx - 5]?.close;
      const marketRoc5 = back ? pct(proxyBars[pIdx]!.close, back) : 0;
      const scored = scoreSecurity(window, marketRoc5, { weights: UNIT, minPrice: 0, minAvgDollarVolume: 0 });
      if (!scored) continue;
      const f = scored.factors;
      const row: PanelRow = {
        ticker, date: bar.date,
        pct: { trend: f["trend"]?.weighted_points ?? 0, momentum: f["momentum"]?.weighted_points ?? 0, volume: f["volume"]?.weighted_points ?? 0, relative_strength: f["relative_strength"]?.weighted_points ?? 0, volatility_quality: f["volatility_quality"]?.weighted_points ?? 0, ...extraFactors(window, marketContext(proxyBars, pIdx)) } as PanelRow["pct"],
        close: snap.close, avg_dollar_volume: snap.avgDollarVolume20, atr_pct: (snap.atr14 / snap.close) * 100, rsi14: snap.rsi14, rel_volume: snap.relVolume,
        forward_return: null, forward: {}, same_day: null, benchmark_return: null,
      } as PanelRow;
      for (const l of setup.lanes) {
        if (!passesFilters(row, l.p, setup.settings, setup.share)) continue;
        const s = scoreWith(row, l.p.weights) + bandBonus(row as never, l.bands);
        if (s < l.p.min_score_to_trade) continue;
        mergePick(p.best, l.lane, bar.date, { ticker, score: +s.toFixed(2), open: bar.open, close: bar.close });
      }
    }
  }
  p.cursor += symbols.length;
  const { error } = await supabaseAdmin.from("research_runs").update({ summary: p as unknown as Json }).eq("id", prog.id);
  if (error) throw new Error(error.message);

  const done = p.cursor >= p.universe.length;
  if (done) {
    const sessions = proxyBars.map((b) => b.date).filter((d) => d >= TRADE_START);
    const curves: HistoryCurve[] = setup.lanes.map((l) => buildHistoryCurve(l.lane, p.best[l.lane] ?? {}, sessions));
    await supabaseAdmin.from("research_runs").insert({
      kind: HISTORY_KIND,
      config: { from: TRADE_START, to: p.end, universe: p.universe.length, stake: 20, exit: "same_day", feed: "alpaca_iex_adjusted" } as unknown as Json,
      summary: { curves, generated_at: new Date().toISOString() } as unknown as Json,
    });
  }
  return { done, cursor: p.cursor, total: p.universe.length, tickers_with_bars: byTicker.size };
}

export interface LabHistory {
  from: string;
  to: string;
  universe: number;
  generated_at: string;
  curves: HistoryCurve[];
}

export async function readLabHistory(): Promise<LabHistory | null> {
  const { data } = await supabaseAdmin.from("research_runs").select("config, summary").eq("kind", HISTORY_KIND).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  const c = data.config as { from: string; to: string; universe: number };
  const s = data.summary as unknown as { curves: HistoryCurve[]; generated_at: string };
  return { from: c.from, to: c.to, universe: c.universe, generated_at: s.generated_at, curves: s.curves };
}
