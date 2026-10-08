/**
 * Phase B — Parameter Stability & Qualification Threshold engine.
 *
 * For every research lane this answers two questions from cached history only
 * (no new market-data calls, no live trading impact):
 *
 * 1. STABILITY — is the lane's current formula robust or brittle? Each
 *    numerical parameter is nudged (weights ±5 points renormalized, score gate
 *    ±5, RSI bounds ±5, ATR bounds ±0.5, relative-volume floor ±0.2) and the
 *    perturbed formula is re-run over the out-of-sample window with NO daily
 *    pick cap — every qualifying setup counts. A formula whose edge collapses
 *    under small nudges is brittle; one that keeps a positive expectancy is
 *    robust.
 *
 * 2. QUALIFICATION THRESHOLD — each researcher gets its OWN minimum fit bar,
 *    calibrated from its own evidence: the lowest score cutoff where its
 *    out-of-sample forward expectancy is positive with enough samples. It is a
 *    learned starting point, re-calibrated on every run — never a hardcoded
 *    constant. Stored on the researcher's own params so the Analyze tab can
 *    compare a stock's fit against that researcher's own bar.
 *
 * Results are persisted as a research_runs row (kind = "stability") so the UI
 * reads the latest pass without recompute.
 *
 * Server-only. Research only — nothing here touches live trading.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

import {
  buildPanel,
  LANES,
  laneSeedParams,
  legFrom,
  listResearchers,
  normalize,
  passesFilters,
  scoreWith,
  type Lane,
  type LaneParams,
  type Leg,
  type PanelRow,
} from "./department.server";
import { loadSettings, volumeShare, type Settings } from "./scan.server";

export interface PerturbationResult {
  label: string;
  /** Out-of-sample average forward return under the nudged formula. */
  avg_return_pct: number;
  picks: number;
  /** Change in the lane's own objective versus its un-nudged baseline. */
  objective_delta: number;
  held_up: boolean;
}

export interface LaneStability {
  lane: string;
  name: string;
  /** 0–100: share of small nudges the formula survives. */
  stability: number;
  verdict: "robust" | "watch" | "brittle";
  baseline: Leg;
  perturbations: PerturbationResult[];
  /** The lane's own calibrated qualification bar (null = not enough evidence). */
  qualified_min_score: number | null;
  threshold_evidence: {
    picks: number;
    avg_return_pct: number;
    win_rate: number;
    sessions: number;
  } | null;
  params: LaneParams;
}

export interface StabilityReport {
  as_of: string | null;
  sessions: number;
  tickers: number;
  lanes: LaneStability[];
  warnings: string[];
  created_at?: string;
}

const round = (n: number, d = 3) => Number(n.toFixed(d));

/** Every qualifying setup counts — no daily pick cap. */
function uncappedPicks(
  rowsByDate: Map<string, PanelRow[]>,
  dates: string[],
  p: LaneParams,
  s: Settings,
  share: number,
): PanelRow[] {
  const out: PanelRow[] = [];
  for (const date of dates) {
    for (const row of rowsByDate.get(date) ?? []) {
      if (row.forward_return === null) continue;
      if (!passesFilters(row, p, s, share)) continue;
      if (scoreWith(row, p.weights) < p.min_score_to_trade) continue;
      out.push(row);
    }
  }
  return out;
}

/** Small, explainable nudges to every numerical parameter of the formula. */
function perturbations(base: LaneParams): { label: string; params: LaneParams }[] {
  const out: { label: string; params: LaneParams }[] = [];
  const keys = Object.keys(base.weights) as (keyof typeof base.weights)[];
  for (const key of keys) {
    for (const delta of [5, -5]) {
      const weights = normalize({ ...base.weights, [key]: Math.max(0, (base.weights[key] ?? 0) + delta) });
      out.push({
        label: `${String(key).replace(/_/g, " ")} weight ${delta > 0 ? "+" : ""}${delta}`,
        params: { ...base, weights },
      });
    }
  }
  for (const delta of [5, -5]) {
    const gate = base.min_score_to_trade + delta;
    if (gate >= 20 && gate <= 95) {
      out.push({
        label: `score gate ${delta > 0 ? "+" : ""}${delta} (to ${gate})`,
        params: { ...base, min_score_to_trade: gate },
      });
    }
  }
  if (base.rsi_max !== null) {
    for (const delta of [5, -5]) {
      out.push({
        label: `RSI ceiling ${delta > 0 ? "+" : ""}${delta} (to ${base.rsi_max + delta})`,
        params: { ...base, rsi_max: base.rsi_max + delta },
      });
    }
  }
  if (base.rsi_min !== null) {
    for (const delta of [5, -5]) {
      out.push({
        label: `RSI floor ${delta > 0 ? "+" : ""}${delta} (to ${base.rsi_min + delta})`,
        params: { ...base, rsi_min: base.rsi_min + delta },
      });
    }
  }
  if (base.atr_pct_max !== null) {
    for (const delta of [0.5, -0.5]) {
      out.push({
        label: `ATR cap ${delta > 0 ? "+" : ""}${delta}% (to ${round(base.atr_pct_max + delta, 1)}%)`,
        params: { ...base, atr_pct_max: round(base.atr_pct_max + delta, 2) },
      });
    }
  }
  if (base.atr_pct_min !== null) {
    for (const delta of [0.5, -0.5]) {
      const v = round(base.atr_pct_min + delta, 2);
      if (v >= 0) {
        out.push({
          label: `ATR floor ${delta > 0 ? "+" : ""}${delta}% (to ${v}%)`,
          params: { ...base, atr_pct_min: v },
        });
      }
    }
  }
  if (base.rel_volume_min !== null) {
    for (const delta of [0.2, -0.2]) {
      const v = round(base.rel_volume_min + delta, 2);
      if (v > 0) {
        out.push({
          label: `volume floor ${delta > 0 ? "+" : ""}${delta}x (to ${v}x)`,
          params: { ...base, rel_volume_min: v },
        });
      }
    }
  }
  return out;
}

/**
 * Calibrate one lane's own qualification bar: sweep score cutoffs over its
 * out-of-sample setups and take the LOWEST cutoff whose forward expectancy is
 * positive with at least 20 samples. Returns null when no cutoff qualifies —
 * the honest answer is then "this formula has no proven bar yet".
 */
function calibrateThreshold(
  scored: { score: number; forward_return: number }[],
): { cutoff: number; picks: number; avg: number; win: number } | null {
  if (scored.length < 40) return null;
  const scores = scored.map((s) => s.score).sort((a, b) => a - b);
  let best: { cutoff: number; picks: number; avg: number; win: number } | null = null;
  for (let pct = 30; pct <= 90; pct += 5) {
    const cutoff = scores[Math.floor((scores.length * pct) / 100)]!;
    const above = scored.filter((s) => s.score >= cutoff);
    if (above.length < 20) continue;
    const avg = above.reduce((a, s) => a + s.forward_return, 0) / above.length;
    const win = (above.filter((s) => s.forward_return > 0).length / above.length) * 100;
    if (avg > 0) {
      best = { cutoff: round(cutoff, 1), picks: above.length, avg: round(avg), win: round(win, 1) };
      break; // lowest qualifying cutoff — the bar, not the optimum
    }
  }
  return best;
}

export async function runStabilityCheck(
  options: { universe?: number; save?: boolean } = {},
): Promise<StabilityReport> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const universe = options.universe ?? Math.min(300, Number(s.max_universe) || 250);

  const panel = await buildPanel(universe, String(s.market_proxy));
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
      `Only ${usable.length} completed sessions cached — stability results need 20+ to mean anything.`,
    );
  }
  const splitAt = Math.floor(usable.length * 0.6);
  const outDates = usable.slice(splitAt);

  const researchers = await listResearchers();
  const learnedBy = new Map(researchers.map((r) => [r.lane, r]));

  const lanes: LaneStability[] = [];
  for (const lane of LANES.filter((l) => l.lane !== "skeptic")) {
    const learned = learnedBy.get(lane.lane);
    if (learned?.enabled === false) continue;
    const learnedParams = learned?.params as LaneParams | undefined;
    const params: LaneParams =
      learnedParams && learnedParams.weights && Object.keys(learnedParams.weights).length
        ? { ...laneSeedParams(lane, s), ...learnedParams, weights: normalize(learnedParams.weights) }
        : laneSeedParams(lane, s);

    const basePicks = uncappedPicks(rowsByDate, outDates, params, s, share);
    const baseLeg = legFrom(basePicks);
    const baseObjective = lane.objective(baseLeg);

    const results: PerturbationResult[] = [];
    for (const p of perturbations(params)) {
      const leg = legFrom(uncappedPicks(rowsByDate, outDates, p.params, s, share));
      const objective = lane.objective(leg);
      const heldUp =
        leg.picks >= 10 &&
        leg.avg_return_pct > 0 &&
        (baseObjective <= 0 || objective >= baseObjective * 0.5);
      results.push({
        label: p.label,
        avg_return_pct: leg.avg_return_pct,
        picks: leg.picks,
        objective_delta: round(objective - baseObjective),
        held_up: heldUp,
      });
    }

    const held = results.filter((r) => r.held_up).length;
    const stability = results.length ? Math.round((held / results.length) * 100) : 0;
    const verdict: LaneStability["verdict"] =
      stability >= 70 ? "robust" : stability >= 40 ? "watch" : "brittle";

    // Threshold calibration over every uncapped setup this formula flags.
    const scored = basePicks.map((r) => ({
      score: scoreWith(r, params.weights),
      forward_return: r.forward_return!,
    }));
    const threshold = calibrateThreshold(scored);

    lanes.push({
      lane: lane.lane,
      name: lane.name,
      stability,
      verdict,
      baseline: baseLeg,
      perturbations: results,
      qualified_min_score: threshold?.cutoff ?? null,
      threshold_evidence: threshold
        ? {
            picks: threshold.picks,
            avg_return_pct: threshold.avg,
            win_rate: threshold.win,
            sessions: outDates.length,
          }
        : null,
      params,
    });
  }

  const report: StabilityReport = {
    as_of: usable[usable.length - 1] ?? null,
    sessions: usable.length,
    tickers: panel.tickers,
    lanes,
    warnings,
  };

  if (options.save !== false) {
    await supabaseAdmin.from("research_runs").insert({
      kind: "stability",
      summary: report as unknown as Json,
    });
    // Each researcher's calibrated bar lives on its own params — a learned
    // starting point that later runs keep updating.
    for (const lane of lanes) {
      const existing = learnedBy.get(lane.lane);
      if (!existing) continue;
      const params = {
        ...(existing.params as Record<string, unknown>),
        qualified_min_score: lane.qualified_min_score,
        threshold_evidence: lane.threshold_evidence,
      };
      await supabaseAdmin
        .from("researchers")
        .update({ params: params as unknown as Json })
        .eq("lane", lane.lane);
    }
  }

  return report;
}

/** Latest saved stability pass, or null before the first run. */
export async function latestStability(): Promise<StabilityReport | null> {
  const { data, error } = await supabaseAdmin
    .from("research_runs")
    .select("summary, created_at")
    .eq("kind", "stability")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data.summary as unknown as StabilityReport),
    created_at: data.created_at as string,
  };
}
