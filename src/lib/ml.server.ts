/**
 * Predictive layer (Random Forest) that sits alongside the ASTR score.
 *
 * It never replaces the existing scoring engine: it produces a second opinion
 * that can be compared with — or blended into — the ASTR ranking. Every
 * evaluation is strictly walk-forward (train on the past, test on the future
 * only), so the numbers are honest out-of-sample results.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {
  FEATURE_NAMES,
  FEATURE_SET_VERSION,
  MIN_FEATURE_BARS,
  featureRecord,
  featuresAt,
} from "./features";
import { DEFAULT_FOREST_PARAMS, predictForest, trainForest, type ForestParams } from "./forest";
import { HISTORY_DAYS, loadSettings, scoreConfig, volumeShare, type Settings } from "./scan.server";
import { scoreSecurity, type Bar } from "./scoring";

type RawBars = [string, number, number, number, number, number][];

export interface SampleRow {
  ticker: string;
  date: string;
  features: number[];
  astr_score: number | null;
  forward_return: number | null;
  benchmark_return: number | null;
  close: number;
}

export interface Dataset {
  rows: SampleRow[];
  calendar: string[];
  tickers: number;
  holding_days: number;
  as_of: string | null;
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

function pct(now: number, then: number): number {
  if (!then) return 0;
  return ((now - then) / then) * 100;
}

function rocAt(bars: Bar[], index: number, lookback: number): number {
  const now = bars[index]?.close;
  const then = bars[index - lookback]?.close;
  if (now === undefined || !then) return 0;
  return pct(now, then);
}

async function loadSeries(universe: number) {
  const { data, error } = await supabaseAdmin.rpc("scan_input", {
    p_days: HISTORY_DAYS,
    p_limit: universe,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { ticker: string; bars: RawBars }[];
  return rows.map((r) => ({ ticker: r.ticker, bars: toBars(r.bars) }));
}

/**
 * Feature rows for every (ticker, date) we have enough history for, with the
 * forward return that follows. Rows whose forward window is not complete yet
 * keep `forward_return === null` — those are the live prediction candidates.
 */
export async function buildDataset(options: { universe?: number } = {}): Promise<Dataset> {
  const s = await loadSettings();
  const holding = Math.max(1, Number(s.ml_holding_days ?? 1));
  const series = await loadSeries(options.universe ?? Math.min(600, Number(s.max_universe) || 400));
  const config = scoreConfig(s, await volumeShare(s));

  const proxyTicker = String(s.market_proxy).toUpperCase();
  const proxy = series.find((r) => r.ticker === proxyTicker);
  const proxyByDate = new Map<string, { index: number; close: number }>();
  proxy?.bars.forEach((b, i) => proxyByDate.set(b.date, { index: i, close: b.close }));

  const calendar = series.reduce<string[]>(
    (best, r) => (r.bars.length > best.length ? r.bars.map((b) => b.date) : best),
    [],
  );

  const rows: SampleRow[] = [];

  for (const item of series) {
    const bars = item.bars;
    if (bars.length < MIN_FEATURE_BARS) continue;
    for (let i = MIN_FEATURE_BARS - 1; i < bars.length; i++) {
      const date = bars[i]!.date;
      const proxyPoint = proxyByDate.get(date);
      const marketRoc = proxy && proxyPoint
        ? {
            roc5: rocAt(proxy.bars, proxyPoint.index, 5),
            roc20: rocAt(proxy.bars, proxyPoint.index, 20),
          }
        : { roc5: 0, roc20: 0 };

      const features = featuresAt(bars, i, marketRoc);
      if (!features) continue;

      const window = bars.slice(0, i + 1);
      const scored = scoreSecurity(window, marketRoc.roc5, config);
      const exitBar = bars[i + holding];
      const close = bars[i]!.close;

      let benchmark: number | null = null;
      if (proxy && proxyPoint) {
        const pExit = proxy.bars[proxyPoint.index + holding];
        if (pExit) benchmark = pct(pExit.close, proxyPoint.close);
      }

      rows.push({
        ticker: item.ticker,
        date,
        features,
        astr_score: scored ? scored.score : null,
        forward_return: exitBar ? pct(exitBar.close, close) : null,
        benchmark_return: benchmark,
        close,
      });
    }
  }

  return {
    rows,
    calendar,
    tickers: series.length,
    holding_days: holding,
    as_of: calendar[calendar.length - 1] ?? null,
  };
}

// ------------------------------------------------------------- evaluation ----

export interface SystemMetrics {
  id: string;
  label: string;
  picks: number;
  win_rate: number;
  avg_return_pct: number;
  total_return_pct: number;
  median_return_pct: number;
  best_pct: number;
  worst_pct: number;
  avg_vs_benchmark_pct: number;
  max_drawdown_pct: number;
  profit_factor: number;
  sharpe: number;
  directional_accuracy: number | null;
  rank_ic: number | null;
}

interface Pick {
  ticker: string;
  date: string;
  ret: number;
  benchmark: number | null;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function metricsFrom(
  id: string,
  label: string,
  picks: Pick[],
  extras: { directional_accuracy?: number | null; rank_ic?: number | null } = {},
): SystemMetrics {
  const rets = picks.map((p) => p.ret);
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r < 0);
  const total = rets.reduce((a, b) => a + b, 0);
  const avg = rets.length ? total / rets.length : 0;
  const sd =
    rets.length > 1
      ? Math.sqrt(rets.reduce((a, b) => a + (b - avg) ** 2, 0) / (rets.length - 1))
      : 0;

  // Equity curve by date, so drawdown reflects the order trades happened in.
  const byDate = new Map<string, number>();
  for (const p of picks) byDate.set(p.date, (byDate.get(p.date) ?? 0) + p.ret);
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const date of [...byDate.keys()].sort()) {
    equity += byDate.get(date)!;
    peak = Math.max(peak, equity);
    maxDd = Math.min(maxDd, equity - peak);
  }

  const vsBench = picks.filter((p) => p.benchmark !== null);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  return {
    id,
    label,
    picks: picks.length,
    win_rate: rets.length ? round((wins.length / rets.length) * 100, 1) : 0,
    avg_return_pct: round(avg),
    total_return_pct: round(total),
    median_return_pct: round(median(rets)),
    best_pct: rets.length ? round(Math.max(...rets)) : 0,
    worst_pct: rets.length ? round(Math.min(...rets)) : 0,
    avg_vs_benchmark_pct: vsBench.length
      ? round(vsBench.reduce((a, p) => a + (p.ret - (p.benchmark ?? 0)), 0) / vsBench.length)
      : 0,
    max_drawdown_pct: round(maxDd),
    profit_factor: grossLoss > 0 ? round(grossWin / grossLoss) : grossWin > 0 ? 99 : 0,
    sharpe: sd > 0 ? round((avg / sd) * Math.sqrt(252), 2) : 0,
    directional_accuracy: extras.directional_accuracy ?? null,
    rank_ic: extras.rank_ic ?? null,
  };
}

function spearman(a: number[], b: number[]): number | null {
  if (a.length < 5) return null;
  const rank = (values: number[]) => {
    const order = values.map((v, i) => ({ v, i })).sort((x, y) => x.v - y.v);
    const ranks = new Array(values.length).fill(0);
    order.forEach((o, r) => {
      ranks[o.i] = r + 1;
    });
    return ranks as number[];
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const mean = (n + 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - mean) * (rb[i]! - mean);
    da += (ra[i]! - mean) ** 2;
    db += (rb[i]! - mean) ** 2;
  }
  if (da === 0 || db === 0) return null;
  return round(num / Math.sqrt(da * db), 3);
}

export interface Bucket {
  bucket: string;
  rows: number;
  avg_return_pct: number;
  win_rate: number;
}

export interface WalkForwardResult {
  as_of: string | null;
  folds: number;
  train_days: number;
  test_days: number;
  holding_days: number;
  tickers: number;
  train_rows: number;
  test_rows: number;
  picks_per_day: number;
  target: string;
  systems: SystemMetrics[];
  buckets: Bucket[];
  regimes: { regime: string; rows: number; avg_return_pct: number; win_rate: number }[];
  importance: { feature: string; weight: number }[];
  warnings: string[];
  in_sample: { avg_return_pct: number; win_rate: number };
  model_version: string | null;
}

function forestParams(s: Settings): ForestParams {
  return {
    ...DEFAULT_FOREST_PARAMS,
    trees: Math.min(200, Math.max(10, Number(s.ml_trees ?? 60))),
    targetReturnPct: Number(s.ml_min_return_pct ?? 1),
  };
}

function targetKey(s: Settings): "predicted_return" | "prob_positive" | "prob_target" {
  const target = String(s.ml_target ?? "return");
  if (target === "prob_positive") return "prob_positive";
  if (target === "prob_target") return "prob_target";
  return "predicted_return";
}

function bucketLabel(rank: number, total: number): string {
  const q = Math.min(4, Math.floor((rank / Math.max(1, total)) * 5));
  return ["Top 20%", "2nd 20%", "Middle 20%", "4th 20%", "Bottom 20%"][q]!;
}

/**
 * Rolling walk-forward test: repeatedly train on a block of past sessions and
 * evaluate on the sessions that follow it, then compare ASTR-only, model-only
 * and blended rankings on exactly the same out-of-sample days.
 */
export async function runWalkForward(
  options: { universe?: number; folds?: number; save?: boolean } = {},
): Promise<WalkForwardResult> {
  const s = await loadSettings();
  const dataset = await buildDataset(options.universe === undefined ? {} : { universe: options.universe });
  const params = forestParams(s);
  const key = targetKey(s);
  const wantTrainDays = Math.max(20, Number(s.ml_train_days ?? 40));
  const testDays = Math.max(1, Number(s.ml_test_days ?? 10));
  const perDay = Math.max(1, Number(s.num_day_trades ?? 2));
  const combineWeight = Math.min(1, Math.max(0, Number(s.ml_combine_weight ?? 0.5)));
  const minScore = Number(s.min_score_to_trade ?? 60);

  const labelled = dataset.rows.filter((r) => r.forward_return !== null);
  const dates = [...new Set(labelled.map((r) => r.date))].sort();
  const warnings: string[] = [];

  // Scoring burns 55 sessions of warm-up, so the training block is clamped to
  // what the cache can actually supply rather than failing outright.
  const trainDays = Math.max(15, Math.min(wantTrainDays, dates.length - testDays));
  if (trainDays < wantTrainDays) {
    warnings.push(
      `Only ${dates.length} usable sessions cached, so training was shortened to ${trainDays} sessions (you asked for ${wantTrainDays}). Load more market history for a firmer result.`,
    );
  }

  const byDate = new Map<string, typeof labelled>();
  for (const row of labelled) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }

  const astrPicks: Pick[] = [];
  const rfPicks: Pick[] = [];
  const mixPicks: Pick[] = [];
  const predActual: { pred: number; actual: number; astr: number | null }[] = [];
  const bucketRows: { bucket: string; ret: number }[] = [];
  const regimeRows: { regime: string; ret: number }[] = [];
  const importanceAcc = new Array(FEATURE_NAMES.length).fill(0);
  let folds = 0;
  let trainRows = 0;
  let testRows = 0;
  let inSampleRet = 0;
  let inSampleWins = 0;
  let inSampleCount = 0;
  const maxFolds = options.folds ?? 4;

  const step = Math.max(1, testDays);
  for (
    let start = Math.max(0, dates.length - (trainDays + testDays * maxFolds));
    start + trainDays < dates.length && folds < maxFolds;
    start += step
  ) {
    const trainDates = new Set(dates.slice(start, start + trainDays));
    const testDates = dates.slice(start + trainDays, start + trainDays + testDays);
    if (testDates.length === 0) break;

    const train = labelled.filter((r) => trainDates.has(r.date));
    if (train.length < 200) continue;

    const forest = trainForest(
      train.map((r) => r.features),
      train.map((r) => r.forward_return!),
      { ...params, seed: params.seed + folds * 17 },
    );
    forest.importance.forEach((v, i) => {
      importanceAcc[i] += v;
    });
    trainRows += train.length;
    folds += 1;

    // In-sample yardstick: same picking rule applied to training days.
    for (const date of trainDates) {
      const rows = (byDate.get(date) ?? []).map((row) => ({
        row,
        value: predictForest(forest, row.features)[key],
      }));
      rows.sort((a, b) => b.value - a.value);
      for (const p of rows.slice(0, perDay)) {
        inSampleRet += p.row.forward_return!;
        if (p.row.forward_return! > 0) inSampleWins += 1;
        inSampleCount += 1;
      }
    }

    for (const date of testDates) {
      const rows = byDate.get(date) ?? [];
      if (rows.length === 0) continue;
      testRows += rows.length;

      const scoredRows = rows.map((row) => {
        const prediction = predictForest(forest, row.features);
        return { row, prediction, value: prediction[key] };
      });

      // Model-only ranking + calibration buckets.
      const rankedByModel = [...scoredRows].sort((a, b) => b.value - a.value);
      rankedByModel.forEach((item, i) => {
        bucketRows.push({
          bucket: bucketLabel(i, rankedByModel.length),
          ret: item.row.forward_return!,
        });
        predActual.push({
          pred: item.value,
          actual: item.row.forward_return!,
          astr: item.row.astr_score,
        });
        const bench = item.row.benchmark_return;
        const regime = bench === null ? "Unknown" : bench >= 0 ? "Market up" : "Market down";
        regimeRows.push({ regime, ret: item.row.forward_return! });
      });

      const take = (list: typeof scoredRows) =>
        list.slice(0, perDay).map((item) => ({
          ticker: item.row.ticker,
          date,
          ret: item.row.forward_return!,
          benchmark: item.row.benchmark_return,
        }));

      // ASTR-only ranking (unchanged live rule: score gate then rank).
      const rankedByAstr = scoredRows
        .filter((item) => (item.row.astr_score ?? 0) >= minScore)
        .sort((a, b) => (b.row.astr_score ?? 0) - (a.row.astr_score ?? 0));

      // Blended ranking: percentile of ASTR score mixed with model percentile.
      const astrOrder = [...scoredRows].sort(
        (a, b) => (a.row.astr_score ?? 0) - (b.row.astr_score ?? 0),
      );
      const astrPct = new Map(astrOrder.map((item, i) => [item.row, i / Math.max(1, astrOrder.length - 1)]));
      const modelOrder = [...scoredRows].sort((a, b) => a.value - b.value);
      const modelPct = new Map(
        modelOrder.map((item, i) => [item.row, i / Math.max(1, modelOrder.length - 1)]),
      );
      const rankedByMix = [...scoredRows].sort(
        (a, b) =>
          (1 - combineWeight) * (astrPct.get(b.row) ?? 0) +
          combineWeight * (modelPct.get(b.row) ?? 0) -
          ((1 - combineWeight) * (astrPct.get(a.row) ?? 0) +
            combineWeight * (modelPct.get(a.row) ?? 0)),
      );

      astrPicks.push(...take(rankedByAstr));
      rfPicks.push(...take(rankedByModel));
      mixPicks.push(...take(rankedByMix));
    }
  }

  const directional =
    predActual.length > 0
      ? round(
          (predActual.filter((p) => (p.pred > (key === "predicted_return" ? 0 : 0.5) ? 1 : 0) === (p.actual > 0 ? 1 : 0))
            .length /
            predActual.length) *
            100,
          1,
        )
      : null;
  const ic = spearman(
    predActual.map((p) => p.pred),
    predActual.map((p) => p.actual),
  );
  const astrIc = spearman(
    predActual.filter((p) => p.astr !== null).map((p) => p.astr!),
    predActual.filter((p) => p.astr !== null).map((p) => p.actual),
  );

  const systems = [
    metricsFrom("astr", "ASTR score (live rule)", astrPicks, { rank_ic: astrIc }),
    metricsFrom("model", "Random Forest only", rfPicks, {
      directional_accuracy: directional,
      rank_ic: ic,
    }),
    metricsFrom(
      "combined",
      `Blended (${Math.round((1 - combineWeight) * 100)}% ASTR / ${Math.round(combineWeight * 100)}% model)`,
      mixPicks,
    ),
  ];

  const bucketMap = new Map<string, number[]>();
  for (const b of bucketRows) {
    const list = bucketMap.get(b.bucket) ?? [];
    list.push(b.ret);
    bucketMap.set(b.bucket, list);
  }
  const buckets: Bucket[] = ["Top 20%", "2nd 20%", "Middle 20%", "4th 20%", "Bottom 20%"]
    .filter((label) => bucketMap.has(label))
    .map((label) => {
      const rets = bucketMap.get(label)!;
      return {
        bucket: label,
        rows: rets.length,
        avg_return_pct: round(rets.reduce((a, b) => a + b, 0) / rets.length),
        win_rate: round((rets.filter((r) => r > 0).length / rets.length) * 100, 1),
      };
    });

  const regimeMap = new Map<string, number[]>();
  for (const r of regimeRows) {
    const list = regimeMap.get(r.regime) ?? [];
    list.push(r.ret);
    regimeMap.set(r.regime, list);
  }
  const regimes = [...regimeMap.entries()].map(([regime, rets]) => ({
    regime,
    rows: rets.length,
    avg_return_pct: round(rets.reduce((a, b) => a + b, 0) / rets.length),
    win_rate: round((rets.filter((v) => v > 0).length / rets.length) * 100, 1),
  }));

  const importance = importanceAcc
    .map((v, i) => ({ feature: FEATURE_NAMES[i]!, weight: round(folds ? v / folds : 0, 4) }))
    .sort((a, b) => b.weight - a.weight);

  const inSample = {
    avg_return_pct: inSampleCount ? round(inSampleRet / inSampleCount) : 0,
    win_rate: inSampleCount ? round((inSampleWins / inSampleCount) * 100, 1) : 0,
  };

  const model = systems.find((x) => x.id === "model")!;
  if (folds === 0) warnings.push("Not enough cached history to complete a single fold.");
  if (model.picks > 0 && inSample.avg_return_pct > model.avg_return_pct * 2 + 0.2) {
    warnings.push(
      "In-sample results are much stronger than out-of-sample — the model is likely overfitting. Treat the model-only numbers with caution.",
    );
  }
  if (model.picks > 0 && model.picks < 30) {
    warnings.push(`Only ${model.picks} out-of-sample trades — too few to be conclusive.`);
  }
  if (ic !== null && Math.abs(ic) < 0.02) {
    warnings.push("Rank correlation with next-day returns is near zero — no real predictive edge yet.");
  }

  let modelVersion: string | null = null;
  if (options.save !== false && folds > 0) {
    const version = `rf-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
    const { error } = await supabaseAdmin.from("model_versions").insert({
      version,
      kind: "random_forest",
      target: String(s.ml_target ?? "return"),
      holding_days: dataset.holding_days,
      feature_set_version: FEATURE_SET_VERSION,
      data_version: dataset.as_of,
      params: { ...params, train_days: trainDays, test_days: testDays, folds } as unknown as Json,
      metrics: { systems, buckets, regimes, in_sample: inSample } as unknown as Json,
      feature_importance: importance as unknown as Json,
      train_start: dates[0] ?? null,
      train_end: dates[Math.max(0, dates.length - testDays - 1)] ?? null,
      test_start: dates[Math.max(0, dates.length - testDays)] ?? null,
      test_end: dates[dates.length - 1] ?? null,
      notes: warnings.join(" "),
    });
    if (!error) modelVersion = version;
    await supabaseAdmin.from("research_runs").insert({
      kind: "walk_forward",
      config: {
        universe: dataset.tickers,
        train_days: trainDays,
        test_days: testDays,
        folds,
        target: s.ml_target,
      } as unknown as Json,
      summary: { systems, in_sample: inSample, rank_ic: ic } as unknown as Json,
      warnings: warnings as unknown as Json,
    });
  }

  return {
    as_of: dataset.as_of,
    folds,
    train_days: trainDays,
    test_days: testDays,
    holding_days: dataset.holding_days,
    tickers: dataset.tickers,
    train_rows: trainRows,
    test_rows: testRows,
    picks_per_day: perDay,
    target: String(s.ml_target ?? "return"),
    systems,
    buckets,
    regimes,
    importance: importance.slice(0, 10),
    warnings,
    in_sample: inSample,
    model_version: modelVersion,
  };
}

// -------------------------------------------------------- live predictions ----

export interface LivePrediction {
  ticker: string;
  close: number;
  astr_score: number | null;
  predicted_return: number;
  prob_positive: number;
  prob_target: number;
  combined_score: number | null;
}

/**
 * Trains on all completed history and predicts the newest cached session.
 * Stored in `model_predictions` so accuracy can be graded once the forward
 * return is known.
 */
export async function predictLatest(
  options: { universe?: number } = {},
): Promise<{ as_of: string | null; rows: LivePrediction[]; trained_rows: number }> {
  const s = await loadSettings();
  const dataset = await buildDataset(options.universe === undefined ? {} : { universe: options.universe });
  const labelled = dataset.rows.filter((r) => r.forward_return !== null);
  if (labelled.length < 200) return { as_of: dataset.as_of, rows: [], trained_rows: labelled.length };

  const params = forestParams(s);
  const key = targetKey(s);
  const forest = trainForest(
    labelled.map((r) => r.features),
    labelled.map((r) => r.forward_return!),
    params,
  );

  const asOf = dataset.as_of;
  const live = dataset.rows.filter((r) => r.date === asOf);
  const combineWeight = Math.min(1, Math.max(0, Number(s.ml_combine_weight ?? 0.5)));

  const scored = live.map((row) => {
    const prediction = predictForest(forest, row.features);
    return { row, prediction, value: prediction[key] };
  });

  const astrOrder = [...scored].sort((a, b) => (a.row.astr_score ?? 0) - (b.row.astr_score ?? 0));
  const astrPct = new Map(
    astrOrder.map((item, i) => [item.row, i / Math.max(1, astrOrder.length - 1)]),
  );
  const modelOrder = [...scored].sort((a, b) => a.value - b.value);
  const modelPct = new Map(
    modelOrder.map((item, i) => [item.row, i / Math.max(1, modelOrder.length - 1)]),
  );

  const rows: LivePrediction[] = scored
    .map((item) => ({
      ticker: item.row.ticker,
      close: round(item.row.close),
      astr_score: item.row.astr_score,
      predicted_return: round(item.prediction.predicted_return, 3),
      prob_positive: round(item.prediction.prob_positive, 3),
      prob_target: round(item.prediction.prob_target, 3),
      combined_score:
        round(
          100 *
            ((1 - combineWeight) * (astrPct.get(item.row) ?? 0) +
              combineWeight * (modelPct.get(item.row) ?? 0)),
          1,
        ) ?? null,
    }))
    .sort((a, b) => (b.combined_score ?? 0) - (a.combined_score ?? 0));

  if (asOf) {
    const { data: version } = await supabaseAdmin
      .from("model_versions")
      .select("id")
      .order("trained_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabaseAdmin.from("model_predictions").delete().eq("as_of_date", asOf);
    const payload = scored.slice(0, 200).map((item) => ({
      as_of_date: asOf,
      ticker: item.row.ticker,
      model_version_id: (version as { id?: string } | null)?.id ?? null,
      features: featureRecord(item.row.features) as unknown as Json,
      astr_score: item.row.astr_score,
      rf_prediction: round(item.value, 4),
      predicted_return: round(item.prediction.predicted_return, 4),
      prob_positive: round(item.prediction.prob_positive, 4),
      prob_target: round(item.prediction.prob_target, 4),
      combined_score:
        round(
          100 *
            ((1 - combineWeight) * (astrPct.get(item.row) ?? 0) +
              combineWeight * (modelPct.get(item.row) ?? 0)),
          2,
        ),
    }));
    if (payload.length > 0) await supabaseAdmin.from("model_predictions").insert(payload);
  }

  return { as_of: asOf, rows: rows.slice(0, 50), trained_rows: labelled.length };
}

/** Fills in the realised return for past predictions so accuracy can be tracked. */
export async function gradePredictions(): Promise<{ graded: number }> {
  const s = await loadSettings();
  const holding = Math.max(1, Number(s.ml_holding_days ?? 1));
  const { data } = await supabaseAdmin
    .from("model_predictions")
    .select("id, ticker, as_of_date, predicted_return")
    .is("actual_return", null)
    .order("as_of_date", { ascending: true })
    .limit(500);
  const pending = (data ?? []) as {
    id: string;
    ticker: string;
    as_of_date: string;
    predicted_return: number | null;
  }[];
  if (pending.length === 0) return { graded: 0 };

  let graded = 0;
  for (const row of pending) {
    const { data: bars } = await supabaseAdmin
      .from("daily_bars")
      .select("bar_date, close")
      .eq("ticker", row.ticker)
      .gte("bar_date", row.as_of_date)
      .order("bar_date", { ascending: true })
      .limit(holding + 1);
    const list = (bars ?? []) as { bar_date: string; close: number }[];
    const entry = list[0];
    const exit = list[holding];
    if (!entry || !exit) continue;
    const actual = pct(Number(exit.close), Number(entry.close));
    await supabaseAdmin
      .from("model_predictions")
      .update({
        actual_return: round(actual, 3),
        result: actual > 0 ? "up" : actual < 0 ? "down" : "flat",
      })
      .eq("id", row.id);
    graded += 1;
  }
  return { graded };
}

export interface ModelSummary {
  version: string;
  trained_at: string;
  target: string;
  holding_days: number;
  metrics: Json;
  feature_importance: Json;
  notes: string | null;
}

export async function recentModels(limit = 5): Promise<ModelSummary[]> {
  const { data } = await supabaseAdmin
    .from("model_versions")
    .select("version, trained_at, target, holding_days, metrics, feature_importance, notes")
    .order("trained_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as ModelSummary[];
}

export async function predictionAccuracy(): Promise<{
  graded: number;
  directional_accuracy: number | null;
  avg_error: number | null;
  top_decile_avg: number | null;
}> {
  const { data } = await supabaseAdmin
    .from("model_predictions")
    .select("predicted_return, actual_return, combined_score")
    .not("actual_return", "is", null)
    .order("as_of_date", { ascending: false })
    .limit(2000);
  const rows = (data ?? []) as {
    predicted_return: number | null;
    actual_return: number | null;
    combined_score: number | null;
  }[];
  if (rows.length === 0)
    return { graded: 0, directional_accuracy: null, avg_error: null, top_decile_avg: null };

  const correct = rows.filter(
    (r) => (Number(r.predicted_return) > 0) === (Number(r.actual_return) > 0),
  ).length;
  const err =
    rows.reduce((a, r) => a + Math.abs(Number(r.predicted_return) - Number(r.actual_return)), 0) /
    rows.length;
  const ranked = [...rows].sort((a, b) => Number(b.combined_score) - Number(a.combined_score));
  const decile = ranked.slice(0, Math.max(1, Math.floor(ranked.length / 10)));

  return {
    graded: rows.length,
    directional_accuracy: round((correct / rows.length) * 100, 1),
    avg_error: round(err, 3),
    top_decile_avg: round(
      decile.reduce((a, r) => a + Number(r.actual_return), 0) / decile.length,
      3,
    ),
  };
}
