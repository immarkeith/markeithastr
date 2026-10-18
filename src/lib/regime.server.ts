/**
 * Phase C — Historical Market Regime engine.
 *
 * Classifies every cached session into an overlapping two-dimensional regime:
 *
 *   DIRECTION (from SPY closes, strictly partitioned — no contradictions):
 *     Bull     : close > SMA200 AND SMA50 > SMA200 AND SMA50 20-day slope > 0
 *     Bear     : close < SMA200 AND SMA50 < SMA200 AND SMA50 20-day slope < 0
 *     Sideways : everything else (the explicit remainder — no gaps)
 *
 *   VOLATILITY (20-day realized vol of SPY daily returns, percentile-ranked
 *   against its own trailing 252-session window):
 *     Low    : percentile < 33
 *     Normal : 33 <= percentile <= 67
 *     High   : percentile > 67
 *
 * Together these form a 9-cell matrix (3 directions x 3 volatility tiers).
 * A session's regime uses ONLY data up to and including that session's close —
 * point-in-time, zero look-ahead.
 *
 * Each researcher lane is then evaluated per cell on its own uncapped
 * out-of-sample setups, with explicit evidence standards (criteria, never
 * guarantees):
 *     n < 15   -> INSUFFICIENT
 *     15-29    -> PRELIMINARY
 *     30-59    -> MODERATE
 *     >= 60    -> STRONG
 * A cell is only called FAVORABLE / VULNERABLE when its tier is MODERATE or
 * better AND the t-statistic clears the Benjamini-Hochberg-adjusted threshold
 * across all 9 cells (q = 0.05). Small samples can never be called a proven
 * edge — they are labeled honestly instead.
 *
 * Provisional per-lane risk limits (max drawdown observed within the cell)
 * are reported and clearly marked PROVISIONAL — they are starting settings
 * that may only evolve after a change is itself tested against history.
 *
 * Transaction costs are never silently zero: an explicit round-trip cost
 * assumption (default 10 bps) is subtracted from every setup's forward
 * return, and the assumption is reported with the results.
 *
 * Server-only. Research only — nothing here touches live trading.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

import {
  buildPanel,
  LANES,
  laneSeedParams,
  listResearchers,
  normalize,
  passesFilters,
  scoreWith,
  type LaneParams,
  type PanelRow,
} from "./department.server";
import { loadSettings, volumeShare } from "./scan.server";

// ---------------------------------------------------------------------------
// Regime classification
// ---------------------------------------------------------------------------

export type Direction = "bull" | "bear" | "sideways";
export type VolTier = "low" | "normal" | "high";

export interface SessionRegime {
  date: string;
  direction: Direction;
  volatility: VolTier;
  /** 20-session realized volatility, annualized (RV20 * sqrt(252)), in %. */
  annualized_vol_pct: number;
  /** Percent of the 200-day SMA the close sat at (+ = above). */
  sma200_distance_pct: number;
}

/** FEATURES.md §9.1 — fixed annualized-volatility band edges. */
export const VOL_LOW_MAX_PCT = 15;
export const VOL_NORMAL_MAX_PCT = 28;
/** FEATURES.md §9.1 — trend axis edge: |distance from 200-day SMA| in %. */
export const SMA_BAND_PCT = 5;

interface SpyBar {
  date: string;
  close: number;
}

function sma(closes: number[], end: number, period: number): number | null {
  if (end - period + 1 < 0) return null;
  let sum = 0;
  for (let i = end - period + 1; i <= end; i++) sum += closes[i]!;
  return sum / period;
}

/** 20-session realized volatility (annualization-free, in %) ending at `end`. */
function realizedVol(closes: number[], end: number, period = 20): number | null {
  if (end - period < 0) return null;
  const rets: number[] = [];
  for (let i = end - period + 1; i <= end; i++) {
    const prev = closes[i - 1]!;
    if (prev > 0) rets.push(Math.log(closes[i]! / prev));
  }
  if (rets.length < period) return null;
  const mean = rets.reduce((a, r) => a + r, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length;
  return Math.sqrt(variance) * 100;
}

/** Annualize a realized-vol figure (in %) the way FEATURES.md §9.1 specifies. */
function annualize(rvPct: number): number {
  return rvPct * Math.sqrt(252);
}

/**
 * Classify every session that has enough history. Sessions without a 200-day
 * SMA and 20-session realized volatility (220 preceding bars) are skipped
 * entirely (INSUFFICIENT_HISTORY) rather than guessed — the caller sees
 * exactly which dates were classifiable.
 */
export function classifySessions(bars: SpyBar[]): {
  regimes: Map<string, SessionRegime>;
  skipped: number;
} {
  const regimes = new Map<string, SessionRegime>();
  const closes = bars.map((b) => b.close);
  let skipped = 0;

  for (let i = 0; i < bars.length; i++) {
    const sma200 = sma(closes, i, 200);
    const rv20 = realizedVol(closes, i);
    if (sma200 === null || rv20 === null) {
      skipped++;
      continue;
    }
    const close = closes[i]!;
    const sma200Distance = ((close - sma200) / sma200) * 100;
    const annualizedVol = annualize(rv20);

    // Direction: the close's distance from the 200-day SMA, per FEATURES.md §9.1.
    const direction: Direction =
      sma200Distance > SMA_BAND_PCT ? "bull" : sma200Distance < -SMA_BAND_PCT ? "bear" : "sideways";
    // Volatility: fixed annualized bands, not a rolling percentile.
    const volatility: VolTier =
      annualizedVol < VOL_LOW_MAX_PCT
        ? "low"
        : annualizedVol <= VOL_NORMAL_MAX_PCT
          ? "normal"
          : "high";

    regimes.set(bars[i]!.date, {
      date: bars[i]!.date,
      direction,
      volatility,
      annualized_vol_pct: Number(annualizedVol.toFixed(1)),
      sma200_distance_pct: Number(sma200Distance.toFixed(2)),
    });
  }
  return { regimes, skipped };
}

// ---------------------------------------------------------------------------
// Per-lane, per-cell evaluation
// ---------------------------------------------------------------------------

export type EvidenceTier = "insufficient" | "preliminary" | "moderate" | "strong";
export type CellVerdict =
  | "favorable"
  | "neutral"
  | "vulnerable"
  | "insufficient_data";

export interface RegimeCell {
  direction: Direction;
  volatility: VolTier;
  setups: number;
  sessions: number;
  /** Mean forward return AFTER the explicit cost assumption. */
  avg_return_pct: number | null;
  win_rate: number | null;
  t_stat: number | null;
  /** Worst peak-to-trough drawdown of the cell's cumulative setup returns. */
  max_drawdown_pct: number | null;
  evidence: EvidenceTier;
  verdict: CellVerdict;
  /** BH-adjusted significance flag across this lane's 9 cells. */
  significant: boolean;
}

export interface LaneRegimeProfile {
  lane: string;
  name: string;
  cells: RegimeCell[];
  /** PROVISIONAL starting risk limits — may only change after a tested proposal. */
  provisional_max_drawdown_pct: number;
}

export interface RegimeReport {
  as_of: string | null;
  spy_sessions: number;
  unclassified_sessions: number;
  /** Explicit round-trip cost subtracted from every setup (percent). */
  cost_assumption_pct: number;
  regime_counts: Record<`${Direction}/${VolTier}`, number>;
  lanes: LaneRegimeProfile[];
  warnings: string[];
  /** Latest benchmark RV20 annualized (RV20 * sqrt(252)), in percent. */
  spy_annualized_vol_pct: number | null;
  /** High-Volatility Precedence: annualized vol above threshold (or High tier). */
  high_vol_precedence: boolean;
  /** When precedence is active: the signaled position-size trim, in percent. */
  position_trim_pct: number | null;
  /** When precedence is active: the signaled Skeptic weighting multiplier. */
  skeptic_weight_multiplier: number | null;
  created_at?: string;
}

const DIRECTIONS: Direction[] = ["bull", "bear", "sideways"];
const VOLS: VolTier[] = ["low", "normal", "high"];

/** Explicit cost model: 10 bps round-trip until real spread data says otherwise. */
const COST_ASSUMPTION_PCT = 0.1;
/**
 * High-Volatility Precedence: when the benchmark's annualized 20-session
 * realized volatility exceeds this level, High volatility takes precedence and
 * signals a position-size trim plus a doubled Skeptic weighting.
 * Annualization: RV20 (in %) * sqrt(252).
 */
export const HIGH_VOL_ANNUALIZED_PCT = 28;
export const HIGH_VOL_TRIM_PCT = 50;
export const HIGH_VOL_SKEPTIC_WEIGHT_MULTIPLIER = 2;
/** Provisional per-lane risk limit — clearly a starting setting, not a finding. */
const PROVISIONAL_MAX_DD_PCT = 10;

function evidenceTier(n: number): EvidenceTier {
  if (n < 15) return "insufficient";
  if (n < 30) return "preliminary";
  if (n < 60) return "moderate";
  return "strong";
}

function tStat(returns: number[]): number | null {
  const n = returns.length;
  if (n < 2) return null;
  const mean = returns.reduce((a, r) => a + r, 0) / n;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
  if (variance <= 0) return null;
  return mean / Math.sqrt(variance / n);
}

function maxDrawdown(returns: number[]): number | null {
  if (returns.length === 0) return null;
  let equity = 0;
  let peak = 0;
  let worst = 0;
  for (const r of returns) {
    equity += r;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > worst) worst = dd;
  }
  return worst;
}

/** Normal approximation of the two-sided p-value for a t-statistic. */
function pValue(t: number, n: number): number {
  // Abramowitz-Stegun error-function approximation; adequate at n >= 15.
  const x = Math.abs(t) / Math.sqrt(n - 1);
  const z = x / Math.sqrt(1 + x * x);
  const t1 = 0.254829592, t2 = -0.284496736, t3 = 1.421413741;
  const t4 = -1.453152027, t5 = 1.061405429, p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const u = Math.abs(z) / Math.SQRT2;
  const w = 1 / (1 + p * u);
  const erf =
    sign *
    (1 - ((((t5 * w + t4) * w + t3) * w + t2) * w + t1) * w * Math.exp(-u * u));
  const oneSided = (1 - erf) / 2;
  return Math.min(1, oneSided * 2);
}

/** Benjamini-Hochberg q=0.05 across the lane's cells with valid p-values. */
function bhSignificant(cells: { t_stat: number | null; setups: number }[]): boolean[] {
  const indexed = cells
    .map((c, i) => ({ i, p: c.t_stat === null ? null : pValue(c.t_stat, c.setups) }))
    .filter((c): c is { i: number; p: number } => c.p !== null)
    .sort((a, b) => a.p - b.p);
  const m = indexed.length;
  const flags = new Array<boolean>(cells.length).fill(false);
  let cutoff = -1;
  for (let rank = 0; rank < m; rank++) {
    if (indexed[rank]!.p <= ((rank + 1) / m) * 0.05) cutoff = rank;
  }
  for (let rank = 0; rank <= cutoff; rank++) flags[indexed[rank]!.i] = true;
  return flags;
}

const round = (n: number, d = 3) => Number(n.toFixed(d));

export async function runRegimeAnalysis(
  options: { universe?: number; save?: boolean } = {},
): Promise<RegimeReport> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const universe = options.universe ?? Math.min(300, Number(s.max_universe) || 250);
  const proxyTicker = String(s.market_proxy);

  // SPY bars straight from the shared cache — same pool everything else uses.
  const { data: spyRows, error: spyError } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, close")
    .eq("ticker", proxyTicker)
    .order("bar_date", { ascending: true })
    .limit(750);
  if (spyError) throw new Error(spyError.message);
  const spyBars: SpyBar[] = (spyRows ?? []).map((r) => ({
    date: r.bar_date as string,
    close: Number(r.close),
  }));

  const warnings: string[] = [];
  const { regimes, skipped } = classifySessions(spyBars);
  // High-Volatility Precedence — point-in-time on the latest classified session.
  const lastDate = spyBars.length ? spyBars[spyBars.length - 1]!.date : null;
  const lastRegime = lastDate ? regimes.get(lastDate) : undefined;
  const spyAnnualizedVol = lastRegime?.annualized_vol_pct ?? null;
  const highVolPrecedence = lastRegime?.volatility === "high";
  if (highVolPrecedence) {
    warnings.push(
      `HIGH_VOL_PRECEDENCE: ${proxyTicker} annualized 20-session volatility is ${spyAnnualizedVol ?? "—"}% (threshold ${HIGH_VOL_ANNUALIZED_PCT}%). High volatility takes precedence — signal: trim position sizes ${HIGH_VOL_TRIM_PCT}% and weight the Skeptic ${HIGH_VOL_SKEPTIC_WEIGHT_MULTIPLIER}x.`,
    );
  }
  if (regimes.size === 0) {
    warnings.push(
      `INSUFFICIENT_HISTORY: ${proxyTicker} cache has ${spyBars.length} sessions; regime classification needs ~221. No cell was evaluated.`,
    );
  } else if (skipped > 0) {
    warnings.push(
      `${skipped} early ${proxyTicker} sessions skipped (insufficient lookback) — point-in-time rule kept, nothing guessed.`,
    );
  }

  const panel = await buildPanel(universe, proxyTicker);
  const rowsByDate = new Map<string, PanelRow[]>();
  for (const row of panel.rows) {
    const list = rowsByDate.get(row.date) ?? [];
    list.push(row);
    rowsByDate.set(row.date, list);
  }
  const usable = panel.dates.filter(
    (d) =>
      regimes.has(d) &&
      (rowsByDate.get(d) ?? []).some((r) => r.forward_return !== null),
  );
  if (usable.length < 20) {
    warnings.push(
      `Only ${usable.length} classifiable sessions with completed outcomes — regime results need 20+ to mean anything.`,
    );
  }
  // Out-of-sample tail, matching the stability engine's split.
  const outDates = usable.slice(Math.floor(usable.length * 0.6));

  const regimeCounts = {} as Record<`${Direction}/${VolTier}`, number>;
  for (const d of DIRECTIONS)
    for (const v of VOLS) regimeCounts[`${d}/${v}`] = 0;
  for (const date of outDates) {
    const r = regimes.get(date)!;
    regimeCounts[`${r.direction}/${r.volatility}`]++;
  }

  const researchers = await listResearchers();
  const learnedBy = new Map(researchers.map((r) => [r.lane, r]));

  const lanes: LaneRegimeProfile[] = [];
  for (const lane of LANES.filter((l) => l.lane !== "skeptic")) {
    const learned = learnedBy.get(lane.lane);
    if (learned?.enabled === false) continue;
    const learnedParams = learned?.params as LaneParams | undefined;
    const params: LaneParams =
      learnedParams && learnedParams.weights && Object.keys(learnedParams.weights).length
        ? { ...laneSeedParams(lane, s), ...learnedParams, weights: normalize(learnedParams.weights) }
        : laneSeedParams(lane, s);

    // Uncapped qualifying setups per session, grouped by that session's cell.
    const byCell = new Map<`${Direction}/${VolTier}`, { returns: number[]; sessions: Set<string> }>();
    for (const date of outDates) {
      const regime = regimes.get(date)!;
      const key = `${regime.direction}/${regime.volatility}` as const;
      const bucket = byCell.get(key) ?? { returns: [], sessions: new Set<string>() };
      for (const row of rowsByDate.get(date) ?? []) {
        if (row.forward_return === null) continue;
        if (!passesFilters(row, params, s, share)) continue;
        if (scoreWith(row, params.weights) < params.min_score_to_trade) continue;
        // Explicit cost assumption — never silently zero.
        bucket.returns.push(row.forward_return - COST_ASSUMPTION_PCT);
        bucket.sessions.add(date);
      }
      byCell.set(key, bucket);
    }

    const rawCells = DIRECTIONS.flatMap((direction) =>
      VOLS.map((volatility) => {
        const bucket = byCell.get(`${direction}/${volatility}`);
        const returns = bucket?.returns ?? [];
        const n = returns.length;
        const avg = n > 0 ? returns.reduce((a, r) => a + r, 0) / n : null;
        const win = n > 0 ? (returns.filter((r) => r > 0).length / n) * 100 : null;
        return {
          direction,
          volatility,
          setups: n,
          sessions: bucket?.sessions.size ?? 0,
          avg_return_pct: avg === null ? null : round(avg),
          win_rate: win === null ? null : round(win, 1),
          t_stat: tStat(returns) === null ? null : round(tStat(returns)!, 2),
          max_drawdown_pct: maxDrawdown(returns) === null ? null : round(maxDrawdown(returns)!, 2),
          evidence: evidenceTier(n),
        };
      }),
    );
    const sig = bhSignificant(rawCells);

    const cells: RegimeCell[] = rawCells.map((c, i) => {
      const tier = c.evidence;
      let verdict: CellVerdict = "insufficient_data";
      if ((tier === "moderate" || tier === "strong") && sig[i]) {
        if (c.avg_return_pct !== null && c.avg_return_pct > 0) verdict = "favorable";
        else if (c.avg_return_pct !== null && c.avg_return_pct < 0) verdict = "vulnerable";
        else verdict = "neutral";
      } else if (tier === "moderate" || tier === "strong") {
        verdict = "neutral";
      }
      return { ...c, verdict, significant: sig[i]! };
    });

    lanes.push({
      lane: lane.lane,
      name: lane.name,
      cells,
      provisional_max_drawdown_pct: PROVISIONAL_MAX_DD_PCT,
    });
  }

  const report: RegimeReport = {
    as_of: outDates[outDates.length - 1] ?? null,
    spy_sessions: spyBars.length,
    unclassified_sessions: skipped,
    cost_assumption_pct: COST_ASSUMPTION_PCT,
    regime_counts: regimeCounts,
    lanes,
    warnings,
    spy_annualized_vol_pct: spyAnnualizedVol,
    high_vol_precedence: highVolPrecedence,
    position_trim_pct: highVolPrecedence ? HIGH_VOL_TRIM_PCT : null,
    skeptic_weight_multiplier: highVolPrecedence ? HIGH_VOL_SKEPTIC_WEIGHT_MULTIPLIER : null,
  };

  if (options.save !== false) {
    await supabaseAdmin.from("research_runs").insert({
      kind: "regime",
      summary: report as unknown as Json,
    });
  }
  return report;
}

/** Latest saved regime pass, or null before the first run. */
export async function latestRegime(): Promise<RegimeReport | null> {
  const { data, error } = await supabaseAdmin
    .from("research_runs")
    .select("summary, created_at")
    .eq("kind", "regime")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...(data.summary as unknown as RegimeReport), created_at: data.created_at as string };
}
