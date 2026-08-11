/**
 * Strategy Research Engine.
 *
 * Runs continuously alongside the live strategy without ever changing it: it
 * forms hypotheses (weight tilts, score gates, indicator filters, pick counts),
 * replays each one over cached history with a clean in-sample / out-of-sample
 * split, and files the survivors as *candidates* for you to approve or dismiss.
 * Nothing is applied automatically.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { HISTORY_DAYS, loadSettings, updateSettings, type Settings } from "./scan.server";
import { snapshot, type Bar, type Weights } from "./scoring";

type RawBars = [string, number, number, number, number, number][];

interface PanelRow {
  ticker: string;
  date: string;
  /** Factor percentages (0-100), weight-independent so any mix is cheap to score. */
  pct: Record<keyof Weights, number>;
  close: number;
  avg_dollar_volume: number;
  atr_pct: number;
  rsi14: number;
  rel_volume: number;
  forward_return: number | null;
  benchmark_return: number | null;
}

export interface CandidateParams {
  weights: Weights;
  min_score_to_trade: number;
  num_day_trades: number;
  rsi_max: number | null;
  atr_pct_min: number | null;
  atr_pct_max: number | null;
  rel_volume_min: number | null;
}

export interface CandidateResult {
  name: string;
  hypothesis: string;
  change_summary: string;
  params: CandidateParams;
  in_sample: Leg;
  out_of_sample: Leg;
  first_half: Leg;
  second_half: Leg;
  up_market: Leg;
  down_market: Leg;
  expected_improvement: number;
  robustness: number;
  confidence: number;
  warnings: string[];
}

export interface Leg {
  picks: number;
  win_rate: number;
  avg_return_pct: number;
  total_return_pct: number;
  avg_vs_benchmark_pct: number;
}

function toBars(raw: RawBars): Bar[] {
  return raw.map(([date, open, high, low, close, volume]) => ({
    date,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function pct(now: number, then: number): number {
  if (!then) return 0;
  return ((now - then) / then) * 100;
}

// The factor scorers live in scoring.ts behind scoreSecurity; scoring once with
// all weights at 100 turns each factor's weighted points into its raw
// percentage, which can then be recombined with any weight set for free.
const UNIT_WEIGHTS: Weights = {
  trend: 100,
  momentum: 100,
  volume: 100,
  relative_strength: 100,
  volatility_quality: 100,
};

async function buildPanel(universe: number, holding: number, proxyTicker: string) {
  const { data, error } = await supabaseAdmin.rpc("scan_input", {
    p_days: HISTORY_DAYS,
    p_limit: universe,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  const series = ((data ?? []) as { ticker: string; bars: RawBars }[]).map((r) => ({
    ticker: r.ticker,
    bars: toBars(r.bars),
  }));

  const { scoreSecurity } = await import("./scoring");
  const proxy = series.find((r) => r.ticker === proxyTicker.toUpperCase());
  const proxyIndex = new Map<string, number>();
  proxy?.bars.forEach((b, i) => proxyIndex.set(b.date, i));

  const rows: PanelRow[] = [];
  const dates = new Set<string>();

  for (const item of series) {
    const bars = item.bars;
    if (bars.length < 56) continue;
    for (let i = 54; i < bars.length; i++) {
      const date = bars[i]!.date;
      const window = bars.slice(0, i + 1);
      const snap = snapshot(window);
      if (!snap) continue;

      let marketRoc5 = 0;
      let benchmark: number | null = null;
      const pIdx = proxyIndex.get(date);
      if (proxy && pIdx !== undefined) {
        const now = proxy.bars[pIdx]!.close;
        const back = proxy.bars[pIdx - 5]?.close;
        if (back) marketRoc5 = pct(now, back);
        const exit = proxy.bars[pIdx + holding];
        if (exit) benchmark = pct(exit.close, now);
      }

      const scored = scoreSecurity(window, marketRoc5, {
        weights: UNIT_WEIGHTS,
        minPrice: 0,
        minAvgDollarVolume: 0,
      });
      if (!scored) continue;

      const exitBar = bars[i + holding];
      dates.add(date);
      rows.push({
        ticker: item.ticker,
        date,
        pct: {
          trend: scored.factors['trend']!.weighted_points,
          momentum: scored.factors['momentum']!.weighted_points,
          volume: scored.factors['volume']!.weighted_points,
          relative_strength: scored.factors['relative_strength']!.weighted_points,
          volatility_quality: scored.factors['volatility_quality']!.weighted_points,
        },
        close: snap.close,
        avg_dollar_volume: snap.avgDollarVolume20,
        atr_pct: (snap.atr14 / snap.close) * 100,
        rsi14: snap.rsi14,
        rel_volume: snap.relVolume,
        forward_return: exitBar ? pct(exitBar.close, snap.close) : null,
        benchmark_return: benchmark,
      });
    }
  }

  return { rows, dates: [...dates].sort(), tickers: series.length };
}

function scoreWith(row: PanelRow, weights: Weights): number {
  return (
    (row.pct.trend / 100) * weights.trend +
    (row.pct.momentum / 100) * weights.momentum +
    (row.pct.volume / 100) * weights.volume +
    (row.pct.relative_strength / 100) * weights.relative_strength +
    (row.pct.volatility_quality / 100) * weights.volatility_quality
  );
}

function passesFilters(row: PanelRow, p: CandidateParams, s: Settings, share: number): boolean {
  if (row.close < Number(s.min_price)) return false;
  if (row.avg_dollar_volume < Number(s.min_avg_dollar_volume) * share) return false;
  if (p.rsi_max !== null && row.rsi14 > p.rsi_max) return false;
  if (p.atr_pct_min !== null && row.atr_pct < p.atr_pct_min) return false;
  if (p.atr_pct_max !== null && row.atr_pct > p.atr_pct_max) return false;
  if (p.rel_volume_min !== null && row.rel_volume < p.rel_volume_min) return false;
  return true;
}

function emptyLeg(): Leg {
  return { picks: 0, win_rate: 0, avg_return_pct: 0, total_return_pct: 0, avg_vs_benchmark_pct: 0 };
}

function legFrom(picks: PanelRow[]): Leg {
  if (picks.length === 0) return emptyLeg();
  const rets = picks.map((p) => p.forward_return!);
  const total = rets.reduce((a, b) => a + b, 0);
  const bench = picks.filter((p) => p.benchmark_return !== null);
  return {
    picks: picks.length,
    win_rate: round((rets.filter((r) => r > 0).length / rets.length) * 100, 1),
    avg_return_pct: round(total / rets.length),
    total_return_pct: round(total),
    avg_vs_benchmark_pct: bench.length
      ? round(
          bench.reduce((a, p) => a + (p.forward_return! - (p.benchmark_return ?? 0)), 0) /
            bench.length,
        )
      : 0,
  };
}

function pickRows(
  rowsByDate: Map<string, PanelRow[]>,
  dates: string[],
  p: CandidateParams,
  s: Settings,
  share: number,
): PanelRow[] {
  const out: PanelRow[] = [];
  for (const date of dates) {
    const rows = (rowsByDate.get(date) ?? [])
      .filter((r) => r.forward_return !== null && passesFilters(r, p, s, share))
      .map((r) => ({ row: r, score: scoreWith(r, p.weights) }))
      .filter((x) => x.score >= p.min_score_to_trade)
      .sort((a, b) => b.score - a.score);
    for (const item of rows.slice(0, Math.max(1, p.num_day_trades))) out.push(item.row);
  }
  return out;
}

function baseParams(s: Settings): CandidateParams {
  return {
    weights: {
      trend: Number(s.weight_trend),
      momentum: Number(s.weight_momentum),
      volume: Number(s.weight_volume),
      relative_strength: Number(s.weight_relative_strength),
      volatility_quality: Number(s.weight_volatility_quality),
    },
    min_score_to_trade: Number(s.min_score_to_trade),
    num_day_trades: Number(s.num_day_trades),
    rsi_max: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  };
}

interface Hypothesis {
  name: string;
  hypothesis: string;
  change_summary: string;
  params: CandidateParams;
}

/** The experiment book: every hypothesis is a small, explainable deviation. */
function hypotheses(base: CandidateParams): Hypothesis[] {
  const tilt = (key: keyof Weights, amount: number): Weights => {
    const next = { ...base.weights };
    const others = (Object.keys(next) as (keyof Weights)[]).filter((k) => k !== key);
    next[key] = Math.max(0, next[key] + amount);
    const share = amount / others.length;
    for (const k of others) next[k] = Math.max(0, next[k] - share);
    return next;
  };

  const list: Hypothesis[] = [];

  for (const key of [
    "trend",
    "momentum",
    "volume",
    "relative_strength",
    "volatility_quality",
  ] as (keyof Weights)[]) {
    for (const amount of [10, -10]) {
      list.push({
        name: `${key} weight ${amount > 0 ? "+" : ""}${amount}`,
        hypothesis: `Does leaning ${amount > 0 ? "more" : "less"} on the ${key.replace("_", " ")} factor pick better names?`,
        change_summary: `${key.replace("_", " ")} weight ${amount > 0 ? "up" : "down"} ${Math.abs(amount)} points, taken evenly from the other factors`,
        params: { ...base, weights: tilt(key, amount) },
      });
    }
  }

  for (const gate of [base.min_score_to_trade - 10, base.min_score_to_trade - 5, base.min_score_to_trade + 5, base.min_score_to_trade + 10]) {
    if (gate < 20 || gate > 95) continue;
    list.push({
      name: `Score gate ${gate}`,
      hypothesis: `Is ${gate} points a better trade/no-trade line than ${base.min_score_to_trade}?`,
      change_summary: `Minimum score to trade moves from ${base.min_score_to_trade} to ${gate}`,
      params: { ...base, min_score_to_trade: gate },
    });
  }

  list.push({
    name: "Avoid overbought",
    hypothesis: "Do entries do better when very overbought names (RSI over 78) are skipped?",
    change_summary: "Adds an RSI-14 ceiling of 78 to the entry filter",
    params: { ...base, rsi_max: 78 },
  });
  list.push({
    name: "Skip the quietest movers",
    hypothesis: "Do names with too little daily range dilute results?",
    change_summary: "Requires ATR of at least 1.5% of price",
    params: { ...base, atr_pct_min: 1.5 },
  });
  list.push({
    name: "Cap the wildest movers",
    hypothesis: "Do very volatile names hurt more than they help?",
    change_summary: "Rejects names with ATR above 7% of price",
    params: { ...base, atr_pct_max: 7 },
  });
  list.push({
    name: "Require volume confirmation",
    hypothesis: "Does insisting on above-average volume improve the hit rate?",
    change_summary: "Requires relative volume of at least 1.2x the 20-day average",
    params: { ...base, rel_volume_min: 1.2 },
  });
  for (const picks of [Math.max(1, base.num_day_trades - 1), base.num_day_trades + 1]) {
    if (picks === base.num_day_trades) continue;
    list.push({
      name: `${picks} pick(s) per day`,
      hypothesis: `Is ${picks} position(s) a day better than ${base.num_day_trades}?`,
      change_summary: `Daily pick count changes from ${base.num_day_trades} to ${picks}`,
      params: { ...base, num_day_trades: picks },
    });
  }

  return list;
}

export interface ResearchResult {
  as_of: string | null;
  sessions: number;
  tickers: number;
  holding_days: number;
  baseline: { in_sample: Leg; out_of_sample: Leg };
  tested: number;
  saved: number;
  candidates: CandidateResult[];
  warnings: string[];
}

/**
 * Full research pass. Splits cached sessions into an older discovery block and
 * a newer confirmation block, so a candidate only survives if it also worked on
 * days it was never tuned on.
 */
export async function runResearch(
  options: { universe?: number; save?: boolean } = {},
): Promise<ResearchResult> {
  const s = await loadSettings();
  const { volumeShare } = await import("./scan.server");
  const share = await volumeShare(s);
  const holding = 1;
  const universe = options.universe ?? Math.min(400, Number(s.max_universe) || 300);

  const panel = await buildPanel(universe, holding, String(s.market_proxy));
  const rowsByDate = new Map<string, PanelRow[]>();
  for (const row of panel.rows) {
    const list = rowsByDate.get(row.date) ?? [];
    list.push(row);
    rowsByDate.set(row.date, list);
  }

  const usable = panel.dates.filter((d) =>
    (rowsByDate.get(d) ?? []).some((r) => r.forward_return !== null),
  );
  const warnings: string[] = [];
  if (usable.length < 20) {
    warnings.push(
      `Only ${usable.length} completed sessions cached — research needs 20+ to say anything useful. Load more market history.`,
    );
  }

  const splitAt = Math.floor(usable.length * 0.6);
  const inDates = usable.slice(0, splitAt);
  const outDates = usable.slice(splitAt);
  const half = Math.floor(outDates.length / 2);

  const base = baseParams(s);
  const basePicksIn = pickRows(rowsByDate, inDates, base, s, share);
  const basePicksOut = pickRows(rowsByDate, outDates, base, s, share);
  const baselineIn = legFrom(basePicksIn);
  const baselineOut = legFrom(basePicksOut);

  const results: CandidateResult[] = [];

  for (const h of hypotheses(base)) {
    const inPicks = pickRows(rowsByDate, inDates, h.params, s, share);
    const outPicks = pickRows(rowsByDate, outDates, h.params, s, share);
    const firstHalf = pickRows(rowsByDate, outDates.slice(0, half), h.params, s, share);
    const secondHalf = pickRows(rowsByDate, outDates.slice(half), h.params, s, share);
    const upPicks = outPicks.filter((p) => (p.benchmark_return ?? 0) >= 0);
    const downPicks = outPicks.filter((p) => (p.benchmark_return ?? 0) < 0);

    const inLeg = legFrom(inPicks);
    const outLeg = legFrom(outPicks);
    const firstLeg = legFrom(firstHalf);
    const secondLeg = legFrom(secondHalf);

    const improvement = round(outLeg.avg_return_pct - baselineOut.avg_return_pct, 3);
    const consistent = firstLeg.avg_return_pct > 0 && secondLeg.avg_return_pct > 0;
    const beatsInBoth =
      inLeg.avg_return_pct > baselineIn.avg_return_pct &&
      outLeg.avg_return_pct > baselineOut.avg_return_pct;

    const candWarnings: string[] = [];
    if (outLeg.picks < 20) candWarnings.push(`Only ${outLeg.picks} confirmation trades — thin evidence.`);
    if (!consistent) candWarnings.push("Not positive in both halves of the confirmation window.");
    if (inLeg.avg_return_pct > outLeg.avg_return_pct * 2 + 0.2)
      candWarnings.push("Much better on the discovery block than the confirmation block — likely curve-fitting.");
    if (h.params.min_score_to_trade < base.min_score_to_trade)
      candWarnings.push("A lower score gate takes more marginal setups; expect more trades and more noise.");

    const robustness = round(
      Math.max(
        0,
        Math.min(
          100,
          (consistent ? 45 : 10) +
            (beatsInBoth ? 25 : 0) +
            Math.min(20, outLeg.picks) +
            (outLeg.avg_vs_benchmark_pct > 0 ? 10 : 0),
        ),
      ),
      0,
    );
    const confidence = round(
      Math.max(
        0,
        Math.min(
          100,
          robustness * 0.6 +
            Math.min(25, Math.max(0, improvement * 40)) +
            (upPicks.length > 0 && downPicks.length > 0 ? 15 : 0),
        ),
      ),
      0,
    );

    results.push({
      name: h.name,
      hypothesis: h.hypothesis,
      change_summary: h.change_summary,
      params: h.params,
      in_sample: inLeg,
      out_of_sample: outLeg,
      first_half: firstLeg,
      second_half: secondLeg,
      up_market: legFrom(upPicks),
      down_market: legFrom(downPicks),
      expected_improvement: improvement,
      robustness,
      confidence,
      warnings: candWarnings,
    });
  }

  results.sort((a, b) => b.expected_improvement - a.expected_improvement);

  // Only genuinely promising, reasonably robust ideas are filed for review.
  const keepers = results.filter(
    (r) => r.expected_improvement > 0.05 && r.out_of_sample.picks >= 10 && r.robustness >= 45,
  );

  let saved = 0;
  if (options.save !== false) {
    await supabaseAdmin.from("research_candidates").delete().eq("status", "proposed");
    for (const r of keepers.slice(0, 8)) {
      const { error } = await supabaseAdmin.from("research_candidates").insert({
        name: r.name,
        hypothesis: r.hypothesis,
        change_summary: r.change_summary,
        params: r.params as unknown as Json,
        evidence: {
          in_sample: r.in_sample,
          out_of_sample: r.out_of_sample,
          first_half: r.first_half,
          second_half: r.second_half,
          up_market: r.up_market,
          down_market: r.down_market,
          baseline_in: baselineIn,
          baseline_out: baselineOut,
          sessions: usable.length,
          tickers: panel.tickers,
        } as unknown as Json,
        expected_improvement: r.expected_improvement,
        robustness: r.robustness,
        confidence: r.confidence,
        warnings: r.warnings as unknown as Json,
        status: "proposed",
        base_version: s.active_strategy_id ?? null,
      });
      if (!error) saved += 1;
    }

    await supabaseAdmin.from("research_runs").insert({
      kind: "strategy_research",
      config: {
        universe: panel.tickers,
        sessions: usable.length,
        in_sample_days: inDates.length,
        out_of_sample_days: outDates.length,
      } as unknown as Json,
      summary: {
        baseline_out: baselineOut,
        tested: results.length,
        kept: saved,
        best: keepers[0]?.name ?? null,
      } as unknown as Json,
      warnings: warnings as unknown as Json,
    });

    if (saved > 0) {
      const { notify } = await import("./notify.server");
      const best = keepers[0]!;
      await notify({
        kind: "research",
        title: `Research found ${saved} idea${saved === 1 ? "" : "s"} worth a look`,
        body: `Best: ${best.name} — ${best.expected_improvement > 0 ? "+" : ""}${best.expected_improvement}% per trade out-of-sample (confidence ${best.confidence}%). Nothing changed until you approve it.`,
        severity: "info",
        action: "/research",
        dedupe_key: `research-${new Date().toISOString().slice(0, 10)}`,
      });
    }
  }

  return {
    as_of: usable[usable.length - 1] ?? null,
    sessions: usable.length,
    tickers: panel.tickers,
    holding_days: holding,
    baseline: { in_sample: baselineIn, out_of_sample: baselineOut },
    tested: results.length,
    saved,
    candidates: keepers.slice(0, 8),
    warnings,
  };
}

export interface CandidateRow {
  id: string;
  name: string;
  hypothesis: string;
  change_summary: string;
  params: CandidateParams;
  evidence: Record<string, unknown>;
  warnings: string[];
  expected_improvement: number | null;
  robustness: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
  decided_at: string | null;
}

export async function listCandidates(): Promise<CandidateRow[]> {
  const { data, error } = await supabaseAdmin
    .from("research_candidates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CandidateRow[];
}

export async function listResearchRuns(limit = 10) {
  const { data } = await supabaseAdmin
    .from("research_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as {
    id: string;
    kind: string;
    config: Json;
    summary: Json;
    warnings: Json;
    created_at: string;
  }[];
}

export async function dismissCandidate(id: string) {
  const { error } = await supabaseAdmin
    .from("research_candidates")
    .update({ status: "dismissed", decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

/**
 * Approving a candidate saves it as a named strategy you can switch to (and
 * switch back from). `activate` also copies its numbers into the live settings.
 */
export async function approveCandidate(id: string, activate: boolean) {
  const { data, error } = await supabaseAdmin
    .from("research_candidates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  const candidate = data as unknown as CandidateRow;
  const p = candidate.params;

  const params: Record<string, number> = {
    weight_trend: p.weights.trend,
    weight_momentum: p.weights.momentum,
    weight_volume: p.weights.volume,
    weight_relative_strength: p.weights.relative_strength,
    weight_volatility_quality: p.weights.volatility_quality,
    min_score_to_trade: p.min_score_to_trade,
    num_day_trades: p.num_day_trades,
  };

  const { data: strategy, error: sErr } = await supabaseAdmin
    .from("strategies")
    .insert({
      name: `Research: ${candidate.name}`,
      description: `${candidate.hypothesis} ${candidate.change_summary}. Out-of-sample avg ${(candidate.expected_improvement ?? 0) > 0 ? "+" : ""}${candidate.expected_improvement}% per trade vs the strategy in place when it was found.`,
      params: params as unknown as Json,
      builtin: false,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(sErr.message);

  if (activate) {
    await updateSettings({ ...params, active_strategy_id: (strategy as { id: string }).id });
  }

  await supabaseAdmin
    .from("research_candidates")
    .update({
      status: activate ? "applied" : "approved",
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { ok: true, activated: activate, strategy_id: (strategy as { id: string }).id };
}
