/**
 * The Lead Researcher's Master Formula.
 *
 * The backup scientists record historical alternatives as proposals; neither
 * their active formulas nor the active Master rule set changes from a replay. The Master
 * Formula is a persistent, versioned collection of individual findings that the
 * Lead Researcher has independently re-tested enough times to trust.
 *
 * Three things happen here every pass:
 *   1. Candidate rules are extracted from whatever the researchers validated.
 *   2. Every rule already on file — active or still under observation — is
 *      re-tested on its own, so a rule earns or loses standing on sustained
 *      evidence rather than on one good or bad day.
 *   3. The Lead Researcher runs its own test of the assembled Master Formula as
 *      a complete strategy, and records the result.
 *
 * Server-only. Everything replays price history already cached in the database.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import type { FactorKey } from "./factors";
import type { Settings } from "./scan.server";
import {
  HORIZONS,
  legFrom,
  normalize,
  passesFilters,
  scoreWith,
  type LaneParams,
  type Leg,
  type PanelRow,
} from "./department.server";

const round = (n: number, d = 3) => Number(n.toFixed(d));

/** How many points a satisfied favourable band adds to a stock's score. */
const BAND_BONUS = 5;
/** Confirmations on separate passes before a rule joins the Master Formula. */
const CONFIRMATIONS_TO_PROMOTE = 3;
/** Sustained failures before an active rule is retired. */
const FAILURES_TO_RETIRE = 4;
/** A finding needs at least this many fresh trades to mean anything. */
const MIN_PICKS = 15;

export type RuleKind = "weight" | "band" | "filter";
export type RuleStatus = "active" | "observation" | "retired";

export interface MasterRule {
  id: string;
  signature: string;
  kind: RuleKind;
  label: string;
  factor: string | null;
  band_low: number | null;
  band_high: number | null;
  filter_key: string | null;
  filter_value: number | null;
  weight: number | null;
  discovered_by: string;
  evidence: Json;
  status: RuleStatus;
  confirmations: number;
  failures: number;
  last_edge: number | null;
  best_edge: number | null;
  skeptic_note: string | null;
  first_seen_on: string;
  promoted_on: string | null;
  retired_on: string | null;
}

export interface RuleCandidate {
  signature: string;
  kind: RuleKind;
  label: string;
  factor?: FactorKey | null;
  band_low?: number | null;
  band_high?: number | null;
  filter_key?: string | null;
  filter_value?: number | null;
  weight?: number | null;
  discovered_by: string;
  skeptic_note?: string | null;
  evidence: Record<string, unknown>;
}

export interface Band {
  factor: FactorKey;
  low: number;
  high: number;
}

export interface MasterParams extends LaneParams {
  bands: Band[];
}

// --------------------------------------------------------------- assembling

const FILTER_KEYS = ["rsi_max", "rsi_min", "atr_pct_min", "atr_pct_max", "rel_volume_min"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

function median(list: number[]): number | null {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/** Turn the active rule set into something the scoring path can actually run. */
export function assemble(rules: MasterRule[], base: LaneParams): MasterParams {
  const active = rules.filter((r) => r.status === "active");
  const weightRules = active.filter((r) => r.kind === "weight" && r.factor && r.weight);

  const weights: Partial<Record<FactorKey, number>> = {};
  if (weightRules.length) {
    const buckets = new Map<FactorKey, number[]>();
    for (const r of weightRules) {
      const key = r.factor as FactorKey;
      buckets.set(key, [...(buckets.get(key) ?? []), Number(r.weight)]);
    }
    for (const [key, values] of buckets) {
      weights[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  } else {
    Object.assign(weights, base.weights);
  }

  const filters: Record<string, number | null> = {};
  for (const key of FILTER_KEYS) {
    const votes = active
      .filter((r) => r.kind === "filter" && r.filter_key === key)
      .map((r) => Number(r.filter_value))
      .filter((v) => Number.isFinite(v));
    filters[key] = median(votes);
  }

  const bands: Band[] = active
    .filter((r) => r.kind === "band" && r.factor && r.band_low !== null && r.band_high !== null)
    .map((r) => ({
      factor: r.factor as FactorKey,
      low: Number(r.band_low),
      high: Number(r.band_high),
    }));

  return {
    weights: normalize(weights),
    min_score_to_trade: base.min_score_to_trade,
    num_day_trades: base.num_day_trades,
    rsi_max: filters['rsi_max'] ?? null,
    rsi_min: filters['rsi_min'] ?? null,
    atr_pct_min: filters['atr_pct_min'] ?? null,
    atr_pct_max: filters['atr_pct_max'] ?? null,
    rel_volume_min: filters['rel_volume_min'] ?? null,
    bands,
  };
}

export function bandBonus(row: PanelRow, bands: Band[]): number {
  let bonus = 0;
  for (const b of bands) {
    const value = row.pct[b.factor] ?? 0;
    if (value >= b.low && value <= b.high) bonus += BAND_BONUS;
  }
  return bonus;
}

/**
 * Master-formula stock selection: weighted score plus favourable-band bonuses.
 *
 * When `ml` is supplied the Lead Researcher is testing the predictive model as
 * an input: each name's final rank is a blend of the pure Master Formula rank
 * and the model's prediction rank for that date, using the model share from
 * settings. The score gate still applies to the pure score, so the model can
 * reorder candidates but never sneak in a name the formula would reject.
 */
export function masterPicks(
  rowsByDate: Map<string, PanelRow[]>,
  dates: string[],
  p: MasterParams,
  s: Settings,
  share: number,
  ml?: { weight: number; predictions: Map<string, number> },
): PanelRow[] {
  const out: PanelRow[] = [];
  for (const date of dates) {
    const scored = (rowsByDate.get(date) ?? [])
      .filter((r) => r.forward_return !== null && passesFilters(r, p, s, share))
      .map((r) => ({ row: r, score: scoreWith(r, p.weights) + bandBonus(r, p.bands) }))
      .filter((x) => x.score >= p.min_score_to_trade);
    let ranked = scored;
    if (ml && ml.weight > 0) {
      const byScore = [...scored].sort((a, b) => b.score - a.score);
      const scoreRank = new Map(byScore.map((x, i) => [x.row.ticker, i]));
      const withPred = scored
        .map((x) => ({ ticker: x.row.ticker, pred: ml.predictions.get(`${date}|${x.row.ticker}`) }))
        .filter((x): x is { ticker: string; pred: number } => typeof x.pred === "number")
        .sort((a, b) => b.pred - a.pred);
      const predRank = new Map(withPred.map((x, i) => [x.ticker, i]));
      const n = Math.max(1, scored.length - 1);
      const pn = Math.max(1, withPred.length - 1);
      ranked = [...scored].sort((a, b) => {
        const blend = (t: string, score: number) => {
          const pr = predRank.get(t);
          if (pr === undefined) return score; // no model view — pure score stands
          const scorePct = 1 - (scoreRank.get(t) ?? 0) / n;
          const predPct = 1 - pr / pn;
          return (1 - ml.weight) * scorePct + ml.weight * predPct;
        };
        return blend(b.row.ticker, b.score) - blend(a.row.ticker, a.score);
      });
    } else {
      ranked = [...scored].sort((a, b) => b.score - a.score);
    }
    for (const item of ranked.slice(0, Math.max(1, p.num_day_trades))) out.push(item.row);
  }
  return out;
}

// ------------------------------------------------------- candidate extraction

/**
 * Pull individual findings out of a validated experiment: which factors it
 * leaned on, the factor band its winners actually sat in, and any entry filter
 * it adopted. Each one is a separate candidate rule, judged on its own.
 */
export function candidatesFrom(input: {
  lane: string;
  laneName: string;
  label: string;
  params: LaneParams;
  picks: PanelRow[];
  evidence: Record<string, unknown>;
  skepticNote: string | null;
}): RuleCandidate[] {
  const out: RuleCandidate[] = [];
  const entries = (Object.entries(input.params.weights) as [FactorKey, number][])
    .filter(([, v]) => (v ?? 0) >= 15)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  for (const [factor, weight] of entries) {
    const rounded = Math.round(weight / 5) * 5;
    out.push({
      signature: `weight|${factor}|${rounded}`,
      kind: "weight",
      label: `${factor.replace(/_/g, " ")} carries about ${rounded}% of the score`,
      factor,
      weight: rounded,
      discovered_by: input.lane,
      skeptic_note: input.skepticNote,
      evidence: { ...input.evidence, found_in: `${input.laneName}: ${input.label}` },
    });
  }

  // The band the winning picks actually occupied, for the finding's lead factor.
  const lead = entries[0]?.[0];
  const winners = input.picks.filter((p) => (p.forward_return ?? 0) > 0);
  if (lead && winners.length >= 8) {
    const values = winners.map((p) => p.pct[lead] ?? 0).sort((a, b) => a - b);
    const low = Math.round(values[Math.floor(values.length * 0.2)]! / 5) * 5;
    const high = Math.round(values[Math.floor(values.length * 0.8)]! / 5) * 5;
    if (high - low >= 5) {
      out.push({
        signature: `band|${lead}|${low}-${high}`,
        kind: "band",
        label: `${lead.replace(/_/g, " ")} between ${low} and ${high} is a favourable condition`,
        factor: lead,
        band_low: low,
        band_high: high,
        discovered_by: input.lane,
        skeptic_note: input.skepticNote,
        evidence: {
          ...input.evidence,
          winners_observed: winners.length,
          found_in: `${input.laneName}: ${input.label}`,
        },
      });
    }
  }

  for (const key of FILTER_KEYS) {
    const value = input.params[key as FilterKey];
    if (value === null || value === undefined) continue;
    out.push({
      signature: `filter|${key}|${value}`,
      kind: "filter",
      label: `${key.replace(/_/g, " ")} of ${value} as an entry condition`,
      filter_key: key,
      filter_value: value,
      discovered_by: input.lane,
      skeptic_note: input.skepticNote,
      evidence: { ...input.evidence, found_in: `${input.laneName}: ${input.label}` },
    });
  }

  return out;
}

// ------------------------------------------------------------------ the cycle

export interface RuleTest {
  signature: string;
  edge: number;
  picks: number;
  passed: boolean;
  reasons: string[];
}

export interface MasterCycleResult {
  version: string;
  version_changed: boolean;
  change_summary: string | null;
  active_rules: number;
  observation_rules: number;
  promoted: string[];
  retired: string[];
  parked: string[];
  lead_test: {
    date: string;
    version: string;
    picks: { ticker: string; score: number; close: number }[];
    horizons: Record<string, number>;
    edge: number;
    verdict: string;
    note: string;
    out_of_sample: Leg;
    contributing_rules: string[];
  } | null;
  summary: string;
}

async function loadRules(): Promise<MasterRule[]> {
  const { data, error } = await supabaseAdmin
    .from("master_rules")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MasterRule[];
}

async function latestVersion() {
  const { data } = await supabaseAdmin
    .from("master_formula_versions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data ?? [])[0] as
    | { version: string; rules: { signature: string }[]; tests: number }
    | undefined;
}

function bumpVersion(previous: string | undefined, changes: number): string {
  if (!previous) return "1.0";
  const [major = 1, minor = 0] = previous.split(".").map((n) => Number(n) || 0);
  if (changes >= 3) return `${major + 1}.0`;
  return `${major}.${minor + 1}`;
}

/**
 * One Master Formula pass, run by the Lead Researcher after the day's backup
 * scientists have reported.
 */
export async function runMasterCycle(input: {
  candidates: RuleCandidate[];
  base: LaneParams;
  baselineOut: Leg;
  rowsByDate: Map<string, PanelRow[]>;
  inDates: string[];
  outDates: string[];
  settings: Settings;
  share: number;
  sessions: number;
  tickers: number;
  latestDate: string | null;
}): Promise<MasterCycleResult> {
  const { base, baselineOut, rowsByDate, outDates, settings, share } = input;
  const today = new Date().toISOString().slice(0, 10);

  // 1. File new candidates. Nothing is ever promoted on first sight.
  const existing = await loadRules();
  const bySig = new Map(existing.map((r) => [r.signature, r]));
  for (const c of input.candidates) {
    if (bySig.has(c.signature)) continue;
    const { data } = await supabaseAdmin
      .from("master_rules")
      .insert({
        signature: c.signature,
        kind: c.kind,
        label: c.label,
        factor: c.factor ?? null,
        band_low: c.band_low ?? null,
        band_high: c.band_high ?? null,
        filter_key: c.filter_key ?? null,
        filter_value: c.filter_value ?? null,
        weight: c.weight ?? null,
        discovered_by: c.discovered_by,
        evidence: c.evidence as unknown as Json,
        skeptic_note: c.skeptic_note ?? null,
        status: "observation",
      })
      .select("*")
      .maybeSingle();
    if (data) bySig.set(c.signature, data as unknown as MasterRule);
  }

  // 2. Re-test every rule on file, one at a time, on days it was not tuned on.
  const rules = [...bySig.values()].filter((r) => r.status !== "retired").slice(0, 30);
  const promoted: string[] = [];
  const retired: string[] = [];
  const parked: string[] = [];
  const tests: RuleTest[] = [];

  for (const rule of rules) {
    const single = assemble([{ ...rule, status: "active" }], base);
    const picks = masterPicks(rowsByDate, outDates, single, settings, share);
    const leg = legFrom(picks);
    const sorted = [...picks].sort((a, b) => b.forward_return! - a.forward_return!);
    const trimmed = legFrom(sorted.slice(3, Math.max(3, sorted.length - 3)));
    const up = legFrom(picks.filter((p) => (p.benchmark_return ?? 0) >= 0));
    const down = legFrom(picks.filter((p) => (p.benchmark_return ?? 0) < 0));
    const edge = round(leg.avg_return_pct - baselineOut.avg_return_pct, 3);

    const reasons: string[] = [];
    if (leg.picks < MIN_PICKS) {
      reasons.push(
        `only ${leg.picks} observations on fresh days — a perfect record on a sample this small is not proof`,
      );
    }
    if (edge <= 0) reasons.push("no edge over the current rule on days it was not tuned on");
    if (trimmed.avg_return_pct <= baselineOut.avg_return_pct) {
      reasons.push("the edge disappears once the luckiest and unluckiest trades are removed");
    }
    if (up.picks >= 5 && up.avg_return_pct <= 0) reasons.push("it does not work when the market rises");
    if (down.picks >= 5 && down.avg_return_pct <= 0) reasons.push("it does not work when the market falls");

    const passed = reasons.length === 0;
    tests.push({ signature: rule.signature, edge, picks: leg.picks, passed, reasons });

    const confirmations = passed ? rule.confirmations + 1 : rule.confirmations;
    const failures = passed ? Math.max(0, rule.failures - 1) : rule.failures + 1;
    let status: RuleStatus = rule.status;
    // Historical confirmations/failures are evidence, never permission to
    // activate or retire a formula rule. Keep the owner's active set intact.
    if (rule.status !== "active") parked.push(rule.label);

    await supabaseAdmin
      .from("master_rules")
      .update({
        confirmations,
        failures,
        status,
        last_edge: edge,
        best_edge: Math.max(Number(rule.best_edge ?? -99), edge),
        promoted_on: status === "active" && rule.status !== "active" ? today : rule.promoted_on,
        retired_on: status === "retired" ? today : rule.retired_on,
        evidence: {
          ...((rule.evidence as Record<string, unknown>) ?? {}),
          last_test: { edge, leg, trimmed, up_market: up, down_market: down, reasons },
        } as unknown as Json,
      })
      .eq("id", rule.id);

    rule.status = status;
    rule.confirmations = confirmations;
    rule.failures = failures;
  }

  const current = [...bySig.values()].map((r) => bySig.get(r.signature) ?? r);
  const activeRules = current.filter((r) => r.status === "active");
  const master = assemble(current, base);

  // 3. Version control: the Master Formula only changes when the active set does.
  const previous = await latestVersion();
  const previousSigs = new Set((previous?.rules ?? []).map((r) => r.signature));
  const nowSigs = new Set(activeRules.map((r) => r.signature));
  const added = [...nowSigs].filter((s) => !previousSigs.has(s));
  const removed = [...previousSigs].filter((s) => !nowSigs.has(s));
  const changes = added.length + removed.length;
  const versionChanged = !previous || changes > 0;
  const version = versionChanged ? bumpVersion(previous?.version, changes) : previous!.version;

  // 4. The Lead Researcher's own daily test of the whole Master Formula.
  const picks = masterPicks(rowsByDate, outDates, master, settings, share);
  const leg = legFrom(picks);
  const inLeg = legFrom(masterPicks(rowsByDate, input.inDates, master, settings, share));
  const halfN = Math.floor(outDates.length / 2);
  const firstHalf = legFrom(masterPicks(rowsByDate, outDates.slice(0, halfN), master, settings, share));
  const secondHalf = legFrom(masterPicks(rowsByDate, outDates.slice(halfN), master, settings, share));
  const upLeg = legFrom(picks.filter((p) => (p.benchmark_return ?? 0) >= 0));
  const downLeg = legFrom(picks.filter((p) => (p.benchmark_return ?? 0) < 0));
  const edge = round(leg.avg_return_pct - baselineOut.avg_return_pct, 3);

  // The Lead's standing test of the predictive model layer: when the model is
  // switched on, blend its stored predictions into the ranking and compare the
  // result with the pure Master Formula on the same out-of-sample days. The
  // verdict is written to the Lead's notebook — the model is an input the Lead
  // tests, never an autopilot, and it is accepted only when it adds edge.
  let mlEvaluation: {
    weight: number;
    covered_dates: number;
    pure_avg_return_pct: number;
    blended_avg_return_pct: number;
    delta: number;
    accepted: boolean;
    conclusion: string;
  } | null = null;
  const mlWeight = Number((settings as unknown as Record<string, unknown>)['ml_combine_weight'] ?? 0);
  if ((settings as unknown as Record<string, unknown>)['ml_enabled'] && mlWeight > 0) {
    const { data: preds } = await supabaseAdmin
      .from("model_predictions")
      .select("as_of_date,ticker,rf_prediction")
      .in("as_of_date", outDates)
      .not("rf_prediction", "is", null);
    const predictions = new Map<string, number>();
    const coveredDates = new Set<string>();
    for (const row of preds ?? []) {
      predictions.set(`${row.as_of_date}|${row.ticker}`, Number(row.rf_prediction));
      coveredDates.add(row.as_of_date as string);
    }
    let conclusion: string;
    let delta = 0;
    let blendedAvg = 0;
    let accepted = false;
    if (coveredDates.size >= 5) {
      const blended = legFrom(
        masterPicks(rowsByDate, outDates, master, settings, share, {
          weight: Math.min(1, Math.max(0, mlWeight)),
          predictions,
        }),
      );
      blendedAvg = blended.avg_return_pct;
      delta = round(blended.avg_return_pct - leg.avg_return_pct, 3);
      accepted = delta > 0;
      conclusion = accepted
        ? `Accepted for now — blending the model's view added ${delta}% per trade on days it was never trained on. The Lead keeps testing it every cycle.`
        : `Rejected — blending the model's view cost ${Math.abs(delta)}% per trade on fresh days. The Master Formula stays pure; the Lead keeps re-testing as new predictions accumulate.`;
    } else {
      conclusion = `Not enough stored predictions yet (${coveredDates.size} session(s) covered, 5 needed). The model keeps scoring each cycle; the Lead will judge the blend once the record is long enough.`;
    }
    mlEvaluation = {
      weight: mlWeight,
      covered_dates: coveredDates.size,
      pure_avg_return_pct: leg.avg_return_pct,
      blended_avg_return_pct: blendedAvg,
      delta,
      accepted,
      conclusion,
    };
    // One notebook line per cycle, so the Lead's verdict history is visible.
    const { data: lastLeadEntry } = await supabaseAdmin
      .from("research_notebook")
      .select("experiment_no,generation")
      .eq("lane", "lead")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabaseAdmin.from("research_notebook").insert({
      lane: "lead",
      generation: (lastLeadEntry?.generation ?? 0) + 1,
      experiment_no: (lastLeadEntry?.experiment_no ?? 0) + 1,
      variable: "Predictive model blend",
      previous_value: "Pure Master Formula ranking",
      new_value: `Blended ranking — model share ${mlWeight}`,
      result:
        coveredDates.size >= 5
          ? delta > 0
            ? `Improved (+${delta}% per trade vs the pure formula)`
            : `Declined (${delta}% per trade vs the pure formula)`
          : `Inconclusive — ${coveredDates.size} of 5 needed sessions covered`,
      conclusion,
      accepted,
      edge: delta,
      horizons: {} as unknown as Json,
    });
  }

  const horizons: Record<string, number> = {};
  const sameDay = picks
    .map((p) => p.same_day)
    .filter((v): v is number => typeof v === "number");
  horizons['same_day'] = sameDay.length
    ? round(sameDay.reduce((a, b) => a + b, 0) / sameDay.length, 3)
    : 0;
  for (const h of HORIZONS) {
    const rets = picks.map((p) => p.forward[h]).filter((v): v is number => typeof v === "number");
    horizons[String(h)] = rets.length ? round(rets.reduce((a, b) => a + b, 0) / rets.length, 3) : 0;
  }

  // Which factors actually did the work, and the conditions behind wins/losses.
  const contributions: Record<string, number> = {};
  for (const key of Object.keys(master.weights) as FactorKey[]) {
    const w = master.weights[key] ?? 0;
    const avg = picks.length
      ? picks.reduce((a, p) => a + ((p.pct[key] ?? 0) / 100) * w, 0) / picks.length
      : 0;
    contributions[key] = round(avg, 2);
  }
  const conditionsFor = (list: PanelRow[]) => {
    if (!list.length) return [] as string[];
    const avg = (fn: (p: PanelRow) => number) => round(list.reduce((a, p) => a + fn(p), 0) / list.length, 1);
    return [
      `RSI averaged ${avg((p) => p.rsi14)}`,
      `daily range averaged ${avg((p) => p.atr_pct)}%`,
      `volume ran ${avg((p) => p.rel_volume)}x normal`,
    ];
  };
  const winners = picks.filter((p) => (p.forward_return ?? 0) > 0);
  const losers = picks.filter((p) => (p.forward_return ?? 0) <= 0);

  // Latest cached session, ranked under the Master Formula — the actual picks.
  const latestPicks = input.latestDate
    ? (rowsByDate.get(input.latestDate) ?? [])
        .filter((r) => passesFilters(r, master, settings, share))
        .map((r) => ({
          ticker: r.ticker,
          close: round(r.close, 2),
          score: round(scoreWith(r, master.weights) + bandBonus(r, master.bands), 1),
        }))
        .filter((r) => r.score >= master.min_score_to_trade)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, master.num_day_trades))
    : [];

  const gateBits: string[] = [`score at least ${master.min_score_to_trade}`];
  if (master.rsi_max !== null) gateBits.push(`RSI under ${master.rsi_max}`);
  if (master.rsi_min !== null) gateBits.push(`RSI over ${master.rsi_min}`);
  if (master.atr_pct_min !== null) gateBits.push(`daily range at least ${master.atr_pct_min}%`);
  if (master.atr_pct_max !== null) gateBits.push(`daily range under ${master.atr_pct_max}%`);
  if (master.rel_volume_min !== null)
    gateBits.push(`volume at least ${master.rel_volume_min}x average`);

  const recentFails = await supabaseAdmin
    .from("lead_tests")
    .select("edge")
    .order("test_date", { ascending: false })
    .limit(2);
  const priorNegative = ((recentFails.data ?? []) as { edge: number | null }[]).filter(
    (r) => Number(r.edge ?? 0) <= 0,
  ).length;
  const verdict =
    activeRules.length === 0
      ? "no validated rules yet"
      : edge > 0
        ? "still validating"
        : priorNegative >= 2
          ? "under review"
          : "weak day, no change";

  const note =
    activeRules.length === 0
      ? "The Master Formula has no validated rules yet, so today's test ran on the current live weights as a placeholder. Rules need three separate confirmations before they join."
      : edge > 0
        ? `The Master Formula still beats the current rule by ${edge}% per trade on days it was never tuned on.`
        : verdict === "under review"
          ? "Third weak test in a row — this version is under review. No rule was removed on the strength of one bad stretch."
          : "A weak test. Nothing was changed: the Master Formula only moves on sustained evidence.";

  await supabaseAdmin.from("lead_tests").upsert(
    {
      test_date: today,
      master_version: version,
      params: master as unknown as Json,
      picks: latestPicks as unknown as Json,
      factor_contributions: contributions as unknown as Json,
      entry_conditions: gateBits as unknown as Json,
      exit_conditions: [
        "sell the same session, before the close",
        "no overnight or weekend holding",
      ] as unknown as Json,
      horizons: horizons as unknown as Json,
      market_conditions: {
        up_market: upLeg,
        down_market: downLeg,
        sessions: input.sessions,
        tickers: input.tickers,
      } as unknown as Json,
      winning_conditions: conditionsFor(winners) as unknown as Json,
      losing_conditions: conditionsFor(losers) as unknown as Json,
      contributing_rules: activeRules.map((r) => r.label) as unknown as Json,
      evidence: {
        in_sample: inLeg,
        out_of_sample: leg,
        first_half: firstHalf,
        second_half: secondHalf,
        baseline_out: baselineOut,
        rule_tests: tests,
        ml_evaluation: mlEvaluation,
      } as unknown as Json,
      edge,
      verdict,
      note,
    },
    { onConflict: "test_date" },
  );

  const summary = `Master Formula v${version}: ${activeRules.length} validated rule(s) — ${gateBits.join("; ")}`;

  if (versionChanged) {
    await supabaseAdmin.from("master_formula_versions").insert({
      version,
      rules: activeRules.map((r) => ({
        signature: r.signature,
        label: r.label,
        kind: r.kind,
        discovered_by: r.discovered_by,
        confirmations: r.confirmations,
      })) as unknown as Json,
      params: master as unknown as Json,
      change_summary: !previous
        ? "First Master Formula version recorded."
        : [
            added.length ? `added ${added.length} rule(s): ${promoted.join("; ") || added.join(", ")}` : null,
            removed.length ? `retired ${removed.length} rule(s): ${retired.join("; ") || removed.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
      reason:
        "Each change followed three separate confirmations on days the finding was never tuned on, or four sustained failures.",
      discovered_by: activeRules.map((r) => r.discovered_by).join(", ") || null,
      evidence: { out_of_sample: leg, rule_tests: tests } as unknown as Json,
      skeptic_note: activeRules.find((r) => r.skeptic_note)?.skeptic_note ?? null,
      before_performance: (previous ? baselineOut : {}) as unknown as Json,
      after_performance: leg as unknown as Json,
      tests: tests.length,
    });
  }

  // The strategy you approve by hand is generated from the Master Formula.
  if (versionChanged && activeRules.length > 0 && edge > 0) {
    await supabaseAdmin.from("research_candidates").insert({
      name: `Master Formula v${version}`,
      base_version: "master",
      hypothesis: `The Lead Researcher's Master Formula, built from ${activeRules.length} independently validated finding(s).`,
      change_summary: summary,
      params: {
        weights: {
          trend: master.weights.trend ?? 0,
          momentum: master.weights.momentum ?? 0,
          volume: master.weights.volume ?? 0,
          relative_strength: master.weights.relative_strength ?? 0,
          volatility_quality: master.weights.volatility_quality ?? 0,
        },
        min_score_to_trade: master.min_score_to_trade,
        num_day_trades: master.num_day_trades,
        rsi_max: master.rsi_max,
        atr_pct_min: master.atr_pct_min,
        atr_pct_max: master.atr_pct_max,
        rel_volume_min: master.rel_volume_min,
      } as unknown as Json,
      evidence: {
        in_sample: inLeg,
        out_of_sample: leg,
        first_half: firstHalf,
        second_half: secondHalf,
        up_market: upLeg,
        down_market: downLeg,
        baseline_out: baselineOut,
        sessions: input.sessions,
        tickers: input.tickers,
        rules: activeRules.map((r) => r.label),
      } as unknown as Json,
      expected_improvement: edge,
      confidence: round(Math.max(0, Math.min(100, 45 + edge * 60)), 1),
      robustness: round(
        Math.max(
          0,
          Math.min(
            100,
            50 + (firstHalf.avg_return_pct > 0 ? 20 : -20) + (secondHalf.avg_return_pct > 0 ? 20 : -20),
          ),
        ),
        1,
      ),
      status: "proposed",
      warnings: (leg.picks < 20
        ? ["Thin confirmation evidence — fewer than 20 trades on fresh days."]
        : []) as unknown as Json,
    });
  }

  return {
    version,
    version_changed: versionChanged,
    change_summary: versionChanged ? summary : null,
    active_rules: activeRules.length,
    observation_rules: current.filter((r) => r.status === "observation").length,
    promoted,
    retired,
    parked,
    lead_test: {
      date: today,
      version,
      picks: latestPicks,
      horizons,
      edge,
      verdict,
      note,
      out_of_sample: leg,
      contributing_rules: activeRules.map((r) => r.label),
    },
    summary,
  };
}

// ------------------------------------------------------------------- readers

export async function masterFormulaOverview() {
  const [rulesRes, versionsRes, leadRes, backupRes] = await Promise.all([
    supabaseAdmin.from("master_rules").select("*").order("updated_at", { ascending: false }),
    supabaseAdmin
      .from("master_formula_versions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin.from("lead_tests").select("*").order("test_date", { ascending: false }).limit(14),
    supabaseAdmin
      .from("backup_tests")
      .select("*")
      .order("test_date", { ascending: false })
      .limit(30),
  ]);

  return {
    rules: (rulesRes.data ?? []) as unknown as MasterRule[],
    versions: (versionsRes.data ?? []) as unknown as {
      id: string;
      version: string;
      change_summary: string;
      reason: string;
      discovered_by: string | null;
      skeptic_note: string | null;
      rules: { label: string; discovered_by: string }[];
      tests: number;
      created_at: string;
    }[],
    lead_tests: (leadRes.data ?? []) as unknown as {
      id: string;
      test_date: string;
      master_version: string;
      picks: { ticker: string; score: number; close: number }[];
      factor_contributions: Record<string, number>;
      entry_conditions: string[];
      exit_conditions: string[];
      horizons: Record<string, number>;
      winning_conditions: string[];
      losing_conditions: string[];
      contributing_rules: string[];
      edge: number | null;
      verdict: string;
      note: string | null;
      evidence: {
        ml_evaluation?: {
          weight: number;
          covered_dates: number;
          pure_avg_return_pct: number;
          blended_avg_return_pct: number;
          delta: number;
          accepted: boolean;
          conclusion: string;
        } | null;
      } | null;
    }[],
    backup_tests: (backupRes.data ?? []) as unknown as {
      id: string;
      test_date: string;
      lane: string;
      researcher_name: string;
      formula_version: string;
      picks: { ticker: string; score: number; close: number }[];
      entry_conditions: string[];
      exit_conditions: string[];
      horizons: Record<string, number>;
      worked: string[];
      failed: string[];
      repeatable: boolean;
      discoveries: string[];
      problems: string[];
      escalate: boolean;
      edge: number | null;
      note: string | null;
    }[],
  };
}
