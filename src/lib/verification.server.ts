/**
 * Research Verification layer.
 *
 * Each Research Scientist (the six lanes in department.server.ts) gets a
 * conceptual Research Assistant whose only job is INDEPENDENT VERIFICATION of
 * that scientist's current recommendation. Assistants never invent a strategy
 * and never override their scientist.
 *
 * There is exactly ONE Backtesting Verification Engine (`verifySignal` below).
 * All six assistants call it with their own strategy id, formula version and
 * signal, and results are kept strictly separated by lane/strategy version.
 *
 * Bias control:
 *  - A historical signal is only counted when the SAME formula would have fired
 *    it using bars up to and including that day (the panel is built forward,
 *    each row scored from its own trailing window only).
 *  - Comparable signals must be strictly BEFORE the signal date, and their
 *    forward window must already have completed, so nothing uses information
 *    that was unknowable at the time.
 *  - The universe is whatever the cached bar table holds today, which is a
 *    survivorship limitation; it is reported, not hidden.
 *
 * Nothing here can change the live strategy or place an order.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

import {
  HORIZONS,
  LANES,
  buildPanel,
  laneSeedParams,
  listResearchers,
  normalize,
  passesFilters,
  scoreWith,
  signature,
  type Horizon,
  type LaneParams,
  type PanelRow,
} from "./department.server";
import { FACTOR_LABELS_ALL, type FactorKey } from "./factors";
import { HISTORY_DAYS, loadSettings, volumeShare, type Settings } from "./scan.server";

/** Bump when the engine's maths changes — reports record which version made them. */
export const BACKTEST_VERSION = "bve-1";
export const DATA_SOURCE = "cached daily bars (Alpaca IEX)";

export type Conclusion =
  | "SUPPORTED"
  | "WEAKLY SUPPORTED"
  | "NEUTRAL"
  | "CONTRADICTED"
  | "INSUFFICIENT DATA";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

const round = (n: number, d = 2) => Number(n.toFixed(d));

function median(list: number[]): number {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Short, stable id for a formula. Changing a formula creates a new version. */
export function strategyVersion(lane: string, p: LaneParams): string {
  const sig = signature(lane, p);
  let h = 2166136261;
  for (let i = 0; i < sig.length; i++) {
    h ^= sig.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `v${(h >>> 0).toString(36)}`;
}

// ------------------------------------------------------------- the signal

export interface ScientistSignal {
  lane: string;
  scientist_name: string;
  assistant_id: string;
  strategy_id: string;
  strategy_version: string;
  ticker: string;
  /** Trading date the recommendation belongs to. */
  signal_date: string;
  signal_at: string;
  direction: "BUY" | "HOLD";
  signal_strength: number;
  reason: string;
  params: LaneParams;
  entry_conditions: Record<string, number | string | null>;
  exit_conditions: Record<string, number | string | null>;
}

// ------------------------------------------------- the verification engine

export interface HorizonStat {
  horizon: Horizon;
  signals: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
}

export interface EngineResults {
  comparable_signals: number;
  same_ticker_signals: number;
  distinct_days: number;
  distinct_tickers: number;
  tolerance: number;
  wins: number;
  losses: number;
  win_rate: number;
  avg_return: number;
  median_return: number;
  best_return: number;
  worst_return: number;
  max_drawdown: number;
  profit_factor: number | null;
  avg_holding_return: number;
  by_horizon: HorizonStat[];
  similar_volatility: { signals: number; win_rate: number; avg_return: number };
  similar_market: { signals: number; win_rate: number; avg_return: number };
  history_start: string | null;
  history_end: string | null;
  sample_period: string;
  lookback_sessions: number;
}

export interface EngineRequest {
  /** Strategy identity — results are never mixed across these. */
  strategy_id: string;
  strategy_version: string;
  formula: LaneParams;
  ticker: string;
  signal_date: string;
  direction: "BUY" | "HOLD";
  signal_strength: number;
  /** Only rows strictly before this date are eligible. */
  rows: PanelRow[];
  settings: Settings;
  share: number;
  /** Was the market itself rising into the signal date? */
  market_up: boolean;
  /** Today's daily-range percentage, for the similar-volatility slice. */
  atr_pct: number;
}

/**
 * The one shared engine.
 *
 * It answers: "when THIS formula produced a comparable signal in the past, what
 * happened afterward?" — never "has this ticker gone up".
 */
export function verifySignal(req: EngineRequest): {
  results: EngineResults;
  limitations: string[];
  data_quality: "high" | "medium" | "low" | "insufficient";
} {
  const p = req.formula;
  const limitations: string[] = [];

  // Every row that this exact formula would have accepted, on days that ended
  // before the signal date and whose forward window has already completed.
  const eligible = req.rows.filter(
    (r) =>
      r.date < req.signal_date &&
      r.forward_return !== null &&
      passesFilters(r, p, req.settings, req.share),
  );
  const scored = eligible
    .map((r) => ({ row: r, score: scoreWith(r, p.weights) }))
    .filter((x) => x.score >= p.min_score_to_trade);

  // Comparable means a similar signal strength under the same formula. Start
  // tight and widen only as far as needed for a usable sample.
  let tolerance = 4;
  let matches = scored.filter((x) => Math.abs(x.score - req.signal_strength) <= tolerance);
  for (const t of [6, 8, 12]) {
    if (matches.length >= 30) break;
    tolerance = t;
    matches = scored.filter((x) => Math.abs(x.score - req.signal_strength) <= tolerance);
  }
  if (tolerance > 4) {
    limitations.push(
      `Comparable-signal band widened to ±${tolerance} score points to reach a usable sample.`,
    );
  }

  matches.sort((a, b) => (a.row.date < b.row.date ? -1 : 1));
  const rets = matches.map((m) => m.row.forward_return!);
  const wins = rets.filter((r) => r > 0);
  const losses = rets.filter((r) => r <= 0);

  // Drawdown of an equity curve that took every comparable signal in order.
  let equity = 0;
  let peak = 0;
  let maxDd = 0;
  for (const r of rets) {
    equity += r;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, peak - equity);
  }

  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));

  const byHorizon: HorizonStat[] = HORIZONS.map((h) => {
    const vals = matches
      .map((m) => m.row.forward[h])
      .filter((v): v is number => typeof v === "number");
    return {
      horizon: h,
      signals: vals.length,
      win_rate: vals.length ? round((vals.filter((v) => v > 0).length / vals.length) * 100, 1) : 0,
      avg_return: vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length, 2) : 0,
      median_return: vals.length ? round(median(vals), 2) : 0,
    };
  });

  const slice = (subset: typeof matches) => {
    const list = subset.map((m) => m.row.forward_return!);
    return {
      signals: list.length,
      win_rate: list.length ? round((list.filter((v) => v > 0).length / list.length) * 100, 1) : 0,
      avg_return: list.length ? round(list.reduce((a, b) => a + b, 0) / list.length, 2) : 0,
    };
  };

  const volBand = Math.max(0.4, req.atr_pct * 0.25);
  const similarVol = slice(matches.filter((m) => Math.abs(m.row.atr_pct - req.atr_pct) <= volBand));
  const similarMarket = slice(
    matches.filter((m) => (m.row.benchmark_return ?? 0) >= 0 === req.market_up),
  );

  const days = new Set(matches.map((m) => m.row.date));
  const tickers = new Set(matches.map((m) => m.row.ticker));
  const dates = [...days].sort();
  const allDates = [...new Set(req.rows.map((r) => r.date))].sort();
  const historyStart = allDates[0] ?? null;
  const historyEnd = allDates[allDates.length - 1] ?? null;

  const results: EngineResults = {
    comparable_signals: matches.length,
    same_ticker_signals: matches.filter((m) => m.row.ticker === req.ticker).length,
    distinct_days: days.size,
    distinct_tickers: tickers.size,
    tolerance,
    wins: wins.length,
    losses: losses.length,
    win_rate: rets.length ? round((wins.length / rets.length) * 100, 1) : 0,
    avg_return: rets.length ? round(rets.reduce((a, b) => a + b, 0) / rets.length, 2) : 0,
    median_return: rets.length ? round(median(rets), 2) : 0,
    best_return: rets.length ? round(Math.max(...rets), 2) : 0,
    worst_return: rets.length ? round(Math.min(...rets), 2) : 0,
    max_drawdown: round(maxDd, 2),
    profit_factor: rets.length >= 20 && grossLoss > 0 ? round(grossWin / grossLoss, 2) : null,
    avg_holding_return: round(
      byHorizon.reduce((a, h) => a + h.avg_return, 0) / (byHorizon.length || 1),
      2,
    ),
    by_horizon: byHorizon,
    similar_volatility: similarVol,
    similar_market: similarMarket,
    history_start: historyStart,
    history_end: historyEnd,
    sample_period: dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : "no comparable days",
    lookback_sessions: allDates.length,
  };

  const quality: "high" | "medium" | "low" | "insufficient" =
    matches.length >= 100 && days.size >= 25
      ? "high"
      : matches.length >= 40 && days.size >= 12
        ? "medium"
        : matches.length >= 15
          ? "low"
          : "insufficient";

  limitations.push(
    `History available is ${allDates.length} cached trading sessions (${historyStart ?? "?"} → ${historyEnd ?? "?"}). Longer windows such as 5 or 10 years are not verified because that history is not stored — no data was invented to fill the gap.`,
  );
  limitations.push(
    "Universe is the tickers currently cached, so names that have since been delisted are absent (survivorship limitation).",
  );
  if (results.profit_factor === null) {
    limitations.push("Profit factor withheld — fewer than 20 comparable signals.");
  }
  if (results.same_ticker_signals < 5) {
    limitations.push(
      `Only ${results.same_ticker_signals} comparable signal(s) on ${req.ticker} itself; the rest come from comparable stocks under the same formula.`,
    );
  }

  return { results, limitations, data_quality: quality };
}

// ---------------------------------------------------------- the assistants

export interface VerificationReport {
  assistant_id: string;
  lane: string;
  scientist_name: string;
  strategy_id: string;
  strategy_version: string;
  backtest_version: string;
  ticker: string;
  signal_date: string;
  direction: "BUY" | "HOLD";
  signal_strength: number;
  reason: string;
  conclusion: Conclusion;
  confidence: Confidence;
  data_quality: string;
  limitations: string[];
  results: EngineResults;
  cached: boolean;
  created_at?: string;
}

/**
 * The assistant reads the engine's numbers and states a position. It does not
 * pick stocks, change the formula, or decide anything about live money.
 */
function judge(
  results: EngineResults,
  quality: string,
): { conclusion: Conclusion; confidence: Confidence } {
  if (quality === "insufficient") {
    return { conclusion: "INSUFFICIENT DATA", confidence: "LOW" };
  }
  const strong =
    results.win_rate >= 60 && results.avg_return > 0.15 && results.median_return > 0;
  const positive = results.win_rate >= 52 && results.avg_return > 0;
  const negative = results.avg_return < -0.1 || results.win_rate < 45;

  const conclusion: Conclusion = negative
    ? "CONTRADICTED"
    : strong
      ? "SUPPORTED"
      : positive
        ? "WEAKLY SUPPORTED"
        : "NEUTRAL";

  const agrees =
    results.similar_market.signals >= 10 && results.similar_market.avg_return > 0 ? 1 : 0;
  const volAgrees =
    results.similar_volatility.signals >= 10 && results.similar_volatility.avg_return > 0 ? 1 : 0;
  const confidence: Confidence =
    quality === "high" && (conclusion === "SUPPORTED" || conclusion === "CONTRADICTED")
      ? "HIGH"
      : quality === "low"
        ? "LOW"
        : agrees + volAgrees >= 1
          ? "MEDIUM"
          : "LOW";

  return { conclusion, confidence };
}

function reasonFor(row: PanelRow, params: LaneParams): string {
  const bits = (Object.keys(params.weights) as FactorKey[])
    .filter((k) => (params.weights[k] ?? 0) > 0)
    .map((k) => ({ k, contribution: ((row.pct[k] ?? 0) / 100) * (params.weights[k] ?? 0) }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((x) => `${FACTOR_LABELS_ALL[x.k]} ${Math.round(row.pct[x.k] ?? 0)}/100`);
  return bits.join(", ");
}

function conditions(p: LaneParams) {
  return {
    entry: {
      min_score: p.min_score_to_trade,
      rsi_max: p.rsi_max,
      rsi_min: p.rsi_min,
      atr_pct_min: p.atr_pct_min,
      atr_pct_max: p.atr_pct_max,
      rel_volume_min: p.rel_volume_min,
      picks_per_day: p.num_day_trades,
    },
    exit: { rule: "close the position in the same session (existing intraday rule)", horizon_days: 1 },
  };
}

// ---------------------------------------------------------------- the pass

export interface VerificationRun {
  as_of: string | null;
  sessions: number;
  tickers: number;
  backtest_version: string;
  data_source: string;
  reports: VerificationReport[];
  failures: { lane: string; message: string }[];
  warnings: string[];
}

/**
 * Runs all six assistants over the shared engine. The panel and the historical
 * rows are built ONCE and shared, so six assistants cost one backtest pass, and
 * each assistant is isolated so a slow or failing one cannot block the others.
 */
export async function runVerification(options: { universe?: number } = {}): Promise<VerificationRun> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const universe = options.universe ?? Math.min(300, Number(s.max_universe) || 250);

  const panel = await buildPanel(universe, String(s.market_proxy));
  const warnings: string[] = [];
  if (!panel.rows.length) {
    return {
      as_of: null,
      sessions: 0,
      tickers: 0,
      backtest_version: BACKTEST_VERSION,
      data_source: DATA_SOURCE,
      reports: [],
      failures: [],
      warnings: ["No cached price history to verify against yet."],
    };
  }

  const dates = [...new Set(panel.rows.map((r) => r.date))].sort();
  const latest = dates[dates.length - 1]!;
  const latestRows = panel.rows.filter((r) => r.date === latest);

  // Market direction into the signal date, from the proxy's own recent daily
  // returns already captured on the panel rows.
  const recent = dates.slice(-6);
  const proxyReturns = panel.rows
    .filter((r) => recent.includes(r.date) && r.benchmark_return !== null)
    .map((r) => r.benchmark_return!);
  const marketUp = proxyReturns.length
    ? proxyReturns.reduce((a, b) => a + b, 0) / proxyReturns.length >= 0
    : true;

  const researchers = await listResearchers();
  const signalAt = new Date().toISOString();

  // Each scientist's CURRENT formula and its top-ranked stock for the latest
  // cached session. This is the recommendation the assistant must verify.
  const signals: ScientistSignal[] = [];
  for (const lane of LANES) {
    const row = researchers.find((r) => r.lane === lane.lane);
    if (row && row.enabled === false) continue;
    const params =
      row && row.params && (row.params as LaneParams).weights
        ? (row.params as LaneParams)
        : laneSeedParams(lane, s);
    const ranked = latestRows
      .filter((r) => passesFilters(r, params, s, share))
      .map((r) => ({ row: r, score: scoreWith(r, params.weights) }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0];
    if (!top) {
      warnings.push(`${lane.name} had no stock clearing its own filters on ${latest}.`);
      continue;
    }
    signals.push({
      lane: lane.lane,
      scientist_name: lane.name,
      assistant_id: `${lane.lane}_assistant`,
      strategy_id: lane.lane,
      strategy_version: strategyVersion(lane.lane, params),
      ticker: top.row.ticker,
      signal_date: latest,
      signal_at: signalAt,
      direction: top.score >= params.min_score_to_trade ? "BUY" : "HOLD",
      signal_strength: round(top.score, 1),
      reason: reasonFor(top.row, params),
      params,
      entry_conditions: conditions(params).entry,
      exit_conditions: conditions(params).exit,
    });
  }

  // The sixth scientist, the Skeptic, never picks stocks — it challenges the
  // department's consensus name using the live rule, so the same engine tests
  // whether the crowd's favourite has historical support at all.
  const consensus = new Map<string, { count: number; row: PanelRow }>();
  for (const sig of signals) {
    const row = latestRows.find((r) => r.ticker === sig.ticker && r.date === latest);
    if (!row) continue;
    const prev = consensus.get(sig.ticker);
    consensus.set(sig.ticker, { count: (prev?.count ?? 0) + 1, row });
  }
  const favourite = [...consensus.values()].sort((a, b) => b.count - a.count)[0];
  if (favourite) {
    const skepticParams: LaneParams = {
      weights: normalize({
        trend: Number(s.weight_trend),
        momentum: Number(s.weight_momentum),
        volume: Number(s.weight_volume),
        relative_strength: Number(s.weight_relative_strength),
        volatility_quality: Number(s.weight_volatility_quality),
      }),
      min_score_to_trade: Number(s.min_score_to_trade),
      num_day_trades: Math.max(1, Number(s.num_day_trades)),
      rsi_max: null,
      rsi_min: null,
      atr_pct_min: null,
      atr_pct_max: null,
      rel_volume_min: null,
    };
    const score = round(scoreWith(favourite.row, skepticParams.weights), 1);
    signals.push({
      lane: "skeptic",
      scientist_name: "Skeptic",
      assistant_id: "skeptic_assistant",
      strategy_id: "skeptic",
      strategy_version: strategyVersion("skeptic", skepticParams),
      ticker: favourite.row.ticker,
      signal_date: latest,
      signal_at: signalAt,
      direction: score >= skepticParams.min_score_to_trade ? "BUY" : "HOLD",
      signal_strength: score,
      reason: `Challenge case: ${favourite.count} researcher(s) landed on ${favourite.row.ticker}. Tested against the live rule — ${reasonFor(favourite.row, skepticParams)}`,
      params: skepticParams,
      entry_conditions: conditions(skepticParams).entry,
      exit_conditions: conditions(skepticParams).exit,
    });
  }

  // One assistant per signal, isolated: a failure or a slow one cannot block
  // the rest, and an already-logged verification is reused instead of redone.
  const settled = await Promise.allSettled(
    signals.map((sig) =>
      verifyOne(sig, {
        rows: panel.rows,
        settings: s,
        share,
        marketUp,
        latestRow: latestRows.find((r) => r.ticker === sig.ticker) ?? null,
      }),
    ),
  );

  const reports: VerificationReport[] = [];
  const failures: { lane: string; message: string }[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled") reports.push(res.value);
    else
      failures.push({
        lane: signals[i]?.lane ?? "unknown",
        message: res.reason instanceof Error ? res.reason.message : String(res.reason),
      });
  });

  return {
    as_of: latest,
    sessions: dates.length,
    tickers: panel.tickers,
    backtest_version: BACKTEST_VERSION,
    data_source: DATA_SOURCE,
    reports,
    failures,
    warnings,
  };
}

async function verifyOne(
  sig: ScientistSignal,
  ctx: {
    rows: PanelRow[];
    settings: Settings;
    share: number;
    marketUp: boolean;
    latestRow: PanelRow | null;
  },
): Promise<VerificationReport> {
  const dedupe = [
    sig.assistant_id,
    sig.strategy_version,
    sig.ticker,
    sig.signal_date,
    String(sig.signal_strength),
    BACKTEST_VERSION,
  ].join("|");

  // Duplicate-job guard and cache in one: an identical verification is never
  // recomputed or double-logged.
  const { data: existing } = await supabaseAdmin
    .from("verification_reports")
    .select("*")
    .eq("dedupe_key", dedupe)
    .maybeSingle();
  if (existing) {
    const row = existing as unknown as {
      results: EngineResults;
      limitations: string[];
      conclusion: Conclusion;
      confidence: Confidence;
      data_quality: string;
      created_at: string;
    };
    return {
      ...toReport(sig, row.results, row.limitations, row.conclusion, row.confidence, row.data_quality),
      cached: true,
      created_at: row.created_at,
    };
  }

  const { results, limitations, data_quality } = verifySignal({
    strategy_id: sig.strategy_id,
    strategy_version: sig.strategy_version,
    formula: sig.params,
    ticker: sig.ticker,
    signal_date: sig.signal_date,
    direction: sig.direction,
    signal_strength: sig.signal_strength,
    rows: ctx.rows,
    settings: ctx.settings,
    share: ctx.share,
    market_up: ctx.marketUp,
    atr_pct: ctx.latestRow?.atr_pct ?? 0,
  });
  const { conclusion, confidence } = judge(results, data_quality);

  await supabaseAdmin.from("verification_reports").insert({
    assistant_id: sig.assistant_id,
    lane: sig.lane,
    scientist_name: sig.scientist_name,
    strategy_id: sig.strategy_id,
    strategy_version: sig.strategy_version,
    backtest_version: BACKTEST_VERSION,
    ticker: sig.ticker,
    signal_date: sig.signal_date,
    signal_at: sig.signal_at,
    direction: sig.direction,
    signal_strength: sig.signal_strength,
    reason: sig.reason,
    formula: sig.params as unknown as Json,
    entry_conditions: sig.entry_conditions as unknown as Json,
    exit_conditions: sig.exit_conditions as unknown as Json,
    lookback_sessions: results.lookback_sessions,
    history_start: results.history_start,
    history_end: results.history_end,
    comparable_signals: results.comparable_signals,
    sample_size: results.comparable_signals,
    results: results as unknown as Json,
    conclusion,
    confidence,
    data_quality,
    limitations: limitations as unknown as Json,
    data_source: DATA_SOURCE,
    dedupe_key: dedupe,
  });

  return {
    ...toReport(sig, results, limitations, conclusion, confidence, data_quality),
    cached: false,
  };
}

function toReport(
  sig: ScientistSignal,
  results: EngineResults,
  limitations: string[],
  conclusion: Conclusion,
  confidence: Confidence,
  data_quality: string,
): Omit<VerificationReport, "cached"> {
  return {
    assistant_id: sig.assistant_id,
    lane: sig.lane,
    scientist_name: sig.scientist_name,
    strategy_id: sig.strategy_id,
    strategy_version: sig.strategy_version,
    backtest_version: BACKTEST_VERSION,
    ticker: sig.ticker,
    signal_date: sig.signal_date,
    direction: sig.direction,
    signal_strength: sig.signal_strength,
    reason: sig.reason,
    conclusion,
    confidence,
    data_quality,
    limitations,
    results,
  };
}

// ---------------------------------------------------------------- readers

export interface VerificationLogRow extends VerificationReport {
  id: string;
  created_at: string;
}

/**
 * Latest verification per assistant, plus the full log. The Lead Researcher
 * view reads the same numbers, not just the labels.
 */
export async function verificationOverview() {
  const { data, error } = await supabaseAdmin
    .from("verification_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as VerificationLogRow[];
  const latest: VerificationLogRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.assistant_id)) continue;
    seen.add(row.assistant_id);
    latest.push(row);
  }
  return {
    latest,
    log: rows,
    backtest_version: BACKTEST_VERSION,
    data_source: DATA_SOURCE,
    history_days: HISTORY_DAYS,
  };
}
