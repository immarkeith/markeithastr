/**
 * Automatic, resumable historical rebuild for PAPER research only.
 * Walks forward through the shared daily_bars history one small step at a
 * time, scoring every researcher point-in-time with the same factor engine the
 * research department uses, and saves a checkpoint after every step.
 * Live trades, balances and Alpaca are never touched.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LANES, laneSeedParams, listResearchers, passesFilters, scoreWith, type LaneParams, type PanelRow } from "./department.server";
import { assemble, bandBonus, type MasterRule } from "./master-formula.server";
import { loadSettings, volumeShare } from "./scan.server";
import { extraFactors, marketContext } from "./factors";
import { snapshot, scoreSecurity, type Bar, type Weights } from "./scoring";

export const STRATEGY_IDS: Record<string, string> = {
  lead: "69b3556c-828a-4543-ad5b-683606de679c",
  trend: "d3ffd675-48e8-4a2b-aef4-0adbc5b3d2a3",
  contrarian: "9c162418-608f-49db-9d18-71e8544bed63",
  consistency: "70c73a78-efcc-442c-93f1-5edfc95505ff",
  growth: "b5396b3e-0fe2-41a2-98be-9c0492dfb57c",
  risk: "861fc7f9-108e-4e6f-8884-daeb4f3c1e11",
  skeptic: "72ab182f-c255-4ed8-accb-232b1bd34b5e",
};

const UNIT: Weights = { trend: 100, momentum: 100, volume: 100, relative_strength: 100, volatility_quality: 100 };
const KIND = "history_rebuild";
const STEP_DAYS = 8;
const LOOKBACK = 65;
const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);

type State = { next: number; holds: Record<string, number>; done: boolean; trades: number };

async function loadState(): Promise<State> {
  const { data } = await supabaseAdmin.from("research_runs").select("summary").eq("kind", KIND).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const s = (data?.summary ?? null) as Partial<State> | null;
  return { next: Number(s?.next ?? 0), holds: (s?.holds as Record<string, number>) ?? {}, done: Boolean(s?.done), trades: Number(s?.trades ?? 0) };
}

async function pageAll<T>(build: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Every real trading day present in the shared history, oldest first.
 * Read from the whole market (not one index ticker) so a thinly covered proxy
 * can never hide the history.
 */
async function tradingDays(proxy: string, today: string): Promise<string[]> {
  try {
    const rows = await pageAll<{ bar_date: string; ticker_count: number }>((f) =>
      supabaseAdmin.rpc("bar_dates_present").gte("ticker_count", 5).lt("bar_date", today).order("bar_date", { ascending: true }).range(f, f + 999),
    );
    const days = rows.map((r) => r.bar_date);
    if (days.length > LOOKBACK) return days;
  } catch { /* fall through to per-ticker discovery */ }
  for (const ticker of [proxy, "AAPL", "QQQ", "FXY", "FLTW", "ALB"]) {
    const rows = await pageAll<{ bar_date: string }>((f) =>
      supabaseAdmin.from("daily_bars").select("bar_date").eq("ticker", ticker).lt("bar_date", today).order("bar_date").range(f, f + 999),
    );
    if (rows.length > LOOKBACK) return rows.map((r) => r.bar_date);
  }
  return [];
}

/** Runs one checkpointed step. Safe to call repeatedly; stops once caught up. */
export async function runHistoryRebuildStep() {
  const settings = await loadSettings();
  const share = await volumeShare(settings);
  const proxy = (settings.market_proxy || "SPY").toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  const days = await tradingDays(proxy, today);
  const state = await loadState();
  // A checkpoint that finished without logging anything came from an empty
  // calendar read, so start over rather than staying stuck at "complete".
  const resume = state.trades === 0 ? LOOKBACK : Math.max(state.next, LOOKBACK);
  const start = resume;
  if (days.length <= LOOKBACK || start >= days.length) {
    return { done: true, processed: 0, total: days.length, position: Math.min(start, days.length), trades: state.trades };
  }
  const stepDays = days.slice(start, start + STEP_DAYS);
  const fetchFrom = days[start - LOOKBACK]!;
  const fetchTo = days[Math.min(days.length - 1, start + STEP_DAYS - 1 + 189)]!; // future bars used for outcomes only


  const raw = await pageAll<{ ticker: string; bar_date: string; open: number; high: number; low: number; close: number; volume: number }>((f) =>
    supabaseAdmin.from("daily_bars").select("ticker, bar_date, open, high, low, close, volume").gte("bar_date", fetchFrom).lte("bar_date", fetchTo).order("ticker").order("bar_date").range(f, f + 999),
  );
  const byTicker = new Map<string, Bar[]>();
  for (const b of raw) {
    const list = byTicker.get(b.ticker) ?? [];
    list.push({ date: b.bar_date, open: +b.open, high: +b.high, low: +b.low, close: +b.close, volume: +b.volume });
    byTicker.set(b.ticker, list);
  }
  const proxyBars = byTicker.get(proxy) ?? [];
  const proxyIdx = new Map(proxyBars.map((b, i) => [b.date, i]));

  const researchers = await listResearchers();
  const laneParams = new Map<string, LaneParams>();
  for (const lane of LANES) {
    const seed = laneSeedParams(lane, settings);
    const saved = researchers.find((r) => r.lane === lane.lane)?.params as Partial<LaneParams> | undefined;
    const p: LaneParams = saved && typeof saved === "object"
      ? { ...seed, ...saved, weights: { ...seed.weights, ...((saved.weights as object) ?? {}) } as LaneParams["weights"] }
      : seed;
    for (const k of Object.keys(p.weights) as (keyof LaneParams["weights"])[]) if (!Number.isFinite(Number(p.weights[k]))) p.weights[k] = seed.weights[k] ?? 0;
    if (!Number.isFinite(Number(p.min_score_to_trade))) p.min_score_to_trade = seed.min_score_to_trade;
    laneParams.set(lane.lane, p);
  }
  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const master = assemble((ruleRows ?? []) as unknown as MasterRule[], {
    weights: { trend: +settings.weight_trend, momentum: +settings.weight_momentum, volume: +settings.weight_volume, relative_strength: +settings.weight_relative_strength, volatility_quality: +settings.weight_volatility_quality },
    min_score_to_trade: +settings.min_score_to_trade, num_day_trades: 1, rsi_max: null, rsi_min: null, atr_pct_min: null, atr_pct_max: null, rel_volume_min: null,
  });

  const trades: Record<string, unknown>[] = [];
  const predictions: Record<string, unknown>[] = [];
  const examples: Record<string, unknown>[] = [];
  const holds = { ...state.holds };
  const lanes = ["lead", ...LANES.map((l) => l.lane)];
  const lastDate = days[days.length - 1]!;

  for (const day of stepDays) {
    const dayIdx = days.indexOf(day);
    const pIdx = proxyIdx.get(day);
    const market = pIdx !== undefined ? marketContext(proxyBars, pIdx) : { roc20: 0, roc60: 0 };
    const back = pIdx !== undefined ? proxyBars[pIdx - 5]?.close : undefined;
    const marketRoc5 = pIdx !== undefined && back ? pct(proxyBars[pIdx]!.close, back) : 0;

    // Point-in-time rows: only bars on or before the previous session feed the
    // scores; the pick is bought at this session's open.
    const rows: { row: PanelRow; bar: Bar; bars: Bar[]; i: number }[] = [];
    for (const [ticker, bars] of byTicker) {
      const i = bars.findIndex((b) => b.date === day);
      if (i < 56) continue;
      const window = bars.slice(0, i); // up to yesterday's close
      try {
        const snap = snapshot(window);
        if (!snap) continue;
        const scored = scoreSecurity(window, marketRoc5, { weights: UNIT, minPrice: 0, minAvgDollarVolume: 0 });
        if (!scored) continue;
        const f = scored.factors;
        rows.push({
          bar: bars[i]!, bars, i,
          row: {
            ticker, date: day,
            pct: { trend: f["trend"]?.weighted_points ?? 0, momentum: f["momentum"]?.weighted_points ?? 0, volume: f["volume"]?.weighted_points ?? 0, relative_strength: f["relative_strength"]?.weighted_points ?? 0, volatility_quality: f["volatility_quality"]?.weighted_points ?? 0, ...extraFactors(window, market) } as PanelRow["pct"],
            close: snap.close, avg_dollar_volume: snap.avgDollarVolume20, atr_pct: (snap.atr14 / snap.close) * 100, rsi14: snap.rsi14, rel_volume: snap.relVolume,
            forward_return: null, forward: {}, same_day: null, benchmark_return: null,
          },
        });
      } catch { /* one bad ticker never stops the step */ }
    }

    for (const lane of lanes) {
      if (holds[lane] !== undefined && dayIdx < holds[lane]! + 3) continue;
      delete holds[lane];
      const p = lane === "lead" ? master : laneParams.get(lane);
      if (!p) continue;
      const bands = lane === "lead" ? master.bands : [];
      let best: (typeof rows)[number] | null = null;
      let bestScore = -Infinity;
      for (const r of rows) {
        if (!passesFilters(r.row, p, settings, share)) continue;
        const s = scoreWith(r.row, p.weights) + bandBonus(r.row as never, bands);
        if (s > bestScore) { bestScore = s; best = r; }
      }
      if (!best || bestScore < p.min_score_to_trade || !(best.bar.open > 0)) continue;
      holds[lane] = dayIdx;

      const exitDate = days[Math.min(days.length - 1, dayIdx + 3)]!;
      const exitBar = best.bars.find((b) => b.date === exitDate) ?? best.bar;
      const entry = best.bar.open;
      const qty = 20 / entry;
      const sameDayPct = +pct(best.bar.close, entry).toFixed(2);
      const closed = exitDate <= lastDate && exitDate > day;
      trades.push({
        ticker: best.row.ticker, kind: "day", entry_date: day, entry_price: entry, dollars: 20, filled_qty: +qty.toFixed(4),
        exit_date: closed ? exitDate : null, exit_price: closed ? exitBar.close : null, profit: closed ? +(qty * (exitBar.close - entry)).toFixed(2) : null,
        same_day_price: best.bar.close, same_day_profit: +(qty * (best.bar.close - entry)).toFixed(2), same_day_pct: sameDayPct,
        status: closed ? "closed" : "open", mode: "paper", position_type: "SAME_DAY", strategy_id: STRATEGY_IDS[lane],
        entry_at: `${day}T13:35:00Z`, exit_at: closed ? `${exitDate}T19:50:00Z` : null, same_day_at: `${day}T19:50:00Z`,
        status_note: "historical rebuild",
      });
      examples.push({
        lane, source: "paper_trade", source_id: `replay_${lane}_${best.row.ticker}_${day}`, ticker: best.row.ticker, example_date: day, horizon: "same_day",
        score: +bestScore.toFixed(1), conditions: { rsi: +best.row.rsi14.toFixed(1), rel_volume: +best.row.rel_volume.toFixed(2), atr_pct: +best.row.atr_pct.toFixed(2) },
        factors: best.row.pct, return_pct: sameDayPct, successful: sameDayPct > 0, resolved_on: day,
      });
      if (lane === "lead") {
        for (const [horizon, n] of [["1M", 21], ["3M", 63]] as const) {
          const evalDate = days[dayIdx + n];
          const evalBar = evalDate ? best.bars.find((b) => b.date === evalDate) : undefined;
          const ret = evalBar ? +pct(evalBar.close, entry).toFixed(2) : null;
          predictions.push({
            prediction_date: day, predicted_at: `${day}T13:35:00Z`, lane: "lead", researcher_name: "Lead Researcher", strategy_id: STRATEGY_IDS["lead"],
            ticker: best.row.ticker, entry_price: entry, score: +bestScore.toFixed(1), horizon, evaluate_on: evalDate ?? day,
            evaluated_at: evalBar ? `${evalDate}T20:00:00Z` : null, exit_price: evalBar?.close ?? null, return_pct: ret,
            successful: ret === null ? null : ret > 0, outcome: ret === null ? "pending" : ret > 0 ? "won" : "lost",
          });
        }
      }
    }
  }

  // Never duplicate a trade that already exists for the same researcher/day/ticker.
  let fresh = trades;
  if (trades.length) {
    const { data: existing } = await supabaseAdmin.from("trades").select("strategy_id, ticker, entry_date").eq("mode", "paper").gte("entry_date", stepDays[0]!).lte("entry_date", stepDays[stepDays.length - 1]!);
    const seen = new Set((existing ?? []).map((t) => `${t.strategy_id}|${t.ticker}|${t.entry_date}`));
    fresh = trades.filter((t) => !seen.has(`${t["strategy_id"]}|${t["ticker"]}|${t["entry_date"]}`));
    if (fresh.length) {
      const { error } = await supabaseAdmin.from("trades").insert(fresh as never);
      if (error) throw new Error("trade insert failed: " + error.message);
    }
  }
  if (predictions.length) await supabaseAdmin.from("research_horizon_predictions").upsert(predictions as never, { onConflict: "lane,ticker,prediction_date,horizon" });
  if (examples.length) await supabaseAdmin.from("researcher_examples").upsert(examples as never, { onConflict: "lane,source,source_id,horizon" });

  const next = start + stepDays.length;
  const done = next >= days.length;
  const total = state.trades + fresh.length;
  await supabaseAdmin.from("research_runs").insert({
    kind: KIND, config: { step_days: STEP_DAYS },
    summary: { next, holds, done, trades: total, through: stepDays[stepDays.length - 1] },
    warnings: [],
  } as never);
  return { done, processed: stepDays.length, total: days.length, position: next, through: stepDays[stepDays.length - 1], trades: total, firstDate: days[LOOKBACK] };
}

/** Runs as many steps as fit safely inside one request. */
export async function runHistoryRebuild(budgetMs = 7000) {
  const t0 = Date.now();
  let last = await runHistoryRebuildStep();
  while (!last.done && Date.now() - t0 < budgetMs / 2) last = await runHistoryRebuildStep();
  return last;
}
