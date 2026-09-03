/**
 * The Research Department.
 *
 * Five specialists, each with its own research philosophy and its own set of
 * scoring variables, plus a Skeptic that attacks their conclusions and a Lead
 * Researcher that validates survivors and merges them into a single Balanced
 * Strategy proposal.
 *
 * Everything replays price history already cached in the database, so a pass
 * costs compute and nothing else. Nothing here can change the live strategy —
 * the Lead Researcher's output is filed as a candidate you approve by hand.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { HISTORY_DAYS, loadSettings, volumeShare, type Settings } from "./scan.server";
import { extraFactors, marketContext, FACTOR_KEYS, type FactorKey } from "./factors";
import { scoreSecurity, snapshot, type Bar, type Weights } from "./scoring";

type RawBars = [string, number, number, number, number, number][];

const CORE_KEYS: (keyof Weights)[] = [
  "trend",
  "momentum",
  "volume",
  "relative_strength",
  "volatility_quality",
];

const UNIT_WEIGHTS: Weights = {
  trend: 100,
  momentum: 100,
  volume: 100,
  relative_strength: 100,
  volatility_quality: 100,
};

export interface LaneParams {
  weights: Partial<Record<FactorKey, number>>;
  min_score_to_trade: number;
  num_day_trades: number;
  rsi_max: number | null;
  rsi_min: number | null;
  atr_pct_min: number | null;
  atr_pct_max: number | null;
  rel_volume_min: number | null;
  /**
   * How far this researcher currently moves a weight when it experiments.
   * It starts coarse and narrows every time the current setting survives a
   * generation, so the search closes in on the strongest region instead of
   * pushing a value ever higher.
   */
  step?: number;
}

/** Forward horizons the department measures each idea over. */
export const HORIZONS = [1, 3, 5, 10] as const;
export type Horizon = (typeof HORIZONS)[number];


export interface Leg {
  picks: number;
  win_rate: number;
  avg_return_pct: number;
  total_return_pct: number;
  avg_vs_benchmark_pct: number;
  /** How many picks had a benchmark bar to compare against. */
  benchmark_picks: number;
  /** Average return divided by its own volatility — the Risk lane's yardstick. */
  risk_adjusted: number;
}

interface PanelRow {
  ticker: string;
  date: string;
  pct: Record<FactorKey, number>;
  close: number;
  avg_dollar_volume: number;
  atr_pct: number;
  rsi14: number;
  rel_volume: number;
  forward_return: number | null;
  /** Forward return at each research horizon, keyed by trading days held. */
  forward: Partial<Record<Horizon, number>>;


  benchmark_return: number | null;
}

const round = (n: number, d = 3) => Number(n.toFixed(d));
const pctChange = (now: number, then: number) => (then ? ((now - then) / then) * 100 : 0);

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

// ---------------------------------------------------------------- the panel

async function buildPanel(universe: number, proxyTicker: string) {
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

  // The market proxy (SPY) may fall outside the sampled universe, in which
  // case fetch its bars directly so benchmark comparisons still work.
  let proxy = series.find((r) => r.ticker === proxyTicker.toUpperCase());
  if (!proxy) {
    const { data: proxyRows } = await supabaseAdmin
      .from("daily_bars")
      .select("bar_date, open, high, low, close, volume")
      .eq("ticker", proxyTicker.toUpperCase())
      .order("bar_date", { ascending: false })
      .limit(HISTORY_DAYS + 5);
    proxyRows?.reverse();
    if (proxyRows?.length) {
      proxy = {
        ticker: proxyTicker.toUpperCase(),
        bars: proxyRows.map((b) => ({
          date: b.bar_date,
          open: Number(b.open),
          high: Number(b.high),
          low: Number(b.low),
          close: Number(b.close),
          volume: Number(b.volume),
        })),
      };
    }
  }
  const proxyIndex = new Map<string, number>();
  proxy?.bars.forEach((b, i) => proxyIndex.set(b.date, i));

  const rows: PanelRow[] = [];
  const dates = new Set<string>();

  for (const item of series) {
    const bars = item.bars;
    if (bars.length < 62) continue;
    for (let i = 60; i < bars.length; i++) {
      const date = bars[i]!.date;
      const window = bars.slice(0, i + 1);
      const snap = snapshot(window);
      if (!snap) continue;

      let marketRoc5 = 0;
      let benchmark: number | null = null;
      let market = { roc20: 0, roc60: 0 };
      const pIdx = proxyIndex.get(date);
      if (proxy && pIdx !== undefined) {
        const now = proxy.bars[pIdx]!.close;
        const back = proxy.bars[pIdx - 5]?.close;
        if (back) marketRoc5 = pctChange(now, back);
        const exit = proxy.bars[pIdx + 1];
        if (exit) benchmark = pctChange(exit.close, now);
        market = marketContext(proxy.bars, pIdx);
      }

      const scored = scoreSecurity(window, marketRoc5, {
        weights: UNIT_WEIGHTS,
        minPrice: 0,
        minAvgDollarVolume: 0,
      });
      if (!scored) continue;

      const extras = extraFactors(window, market);
      const exitBar = bars[i + 1];
      const forward: Partial<Record<Horizon, number>> = {};
      for (const h of HORIZONS) {
        const later = bars[i + h];
        if (later) forward[h] = pctChange(later.close, snap.close);
      }
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
          ...extras,
        },
        close: snap.close,
        avg_dollar_volume: snap.avgDollarVolume20,
        atr_pct: (snap.atr14 / snap.close) * 100,
        rsi14: snap.rsi14,
        rel_volume: snap.relVolume,
        forward,
        forward_return: exitBar ? pctChange(exitBar.close, snap.close) : null,

        benchmark_return: benchmark,
      });
    }
  }

  return { rows, dates: [...dates].sort(), tickers: series.length };
}

// -------------------------------------------------------------- evaluation

function normalize(weights: Partial<Record<FactorKey, number>>): Partial<Record<FactorKey, number>> {
  const entries = Object.entries(weights).filter(([, v]) => (v ?? 0) > 0) as [FactorKey, number][];
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (!total) return { trend: 100 };
  const out: Partial<Record<FactorKey, number>> = {};
  for (const [k, v] of entries) out[k] = round((v / total) * 100, 1);
  return out;
}

function scoreWith(row: PanelRow, weights: Partial<Record<FactorKey, number>>): number {
  let total = 0;
  for (const key of Object.keys(weights) as FactorKey[]) {
    const w = weights[key] ?? 0;
    if (!w) continue;
    total += ((row.pct[key] ?? 0) / 100) * w;
  }
  return total;
}

function passesFilters(row: PanelRow, p: LaneParams, s: Settings, share: number): boolean {
  if (row.close < Number(s.min_price)) return false;
  if (row.avg_dollar_volume < Number(s.min_avg_dollar_volume) * share) return false;
  if (p.rsi_max !== null && row.rsi14 > p.rsi_max) return false;
  if (p.rsi_min !== null && row.rsi14 < p.rsi_min) return false;
  if (p.atr_pct_min !== null && row.atr_pct < p.atr_pct_min) return false;
  if (p.atr_pct_max !== null && row.atr_pct > p.atr_pct_max) return false;
  if (p.rel_volume_min !== null && row.rel_volume < p.rel_volume_min) return false;
  return true;
}

function pickRows(
  rowsByDate: Map<string, PanelRow[]>,
  dates: string[],
  p: LaneParams,
  s: Settings,
  share: number,
): PanelRow[] {
  const out: PanelRow[] = [];
  for (const date of dates) {
    const ranked = (rowsByDate.get(date) ?? [])
      .filter((r) => r.forward_return !== null && passesFilters(r, p, s, share))
      .map((r) => ({ row: r, score: scoreWith(r, p.weights) }))
      .filter((x) => x.score >= p.min_score_to_trade)
      .sort((a, b) => b.score - a.score);
    for (const item of ranked.slice(0, Math.max(1, p.num_day_trades))) out.push(item.row);
  }
  return out;
}

function emptyLeg(): Leg {
  return {
    picks: 0,
    win_rate: 0,
    avg_return_pct: 0,
    total_return_pct: 0,
    avg_vs_benchmark_pct: 0,
    benchmark_picks: 0,
    risk_adjusted: 0,
  };
}

/** Average forward return for a single horizon, over the picks that reached it. */
function avgHorizon(picks: PanelRow[], h: Horizon): number {
  const rets = picks.map((p) => p.forward[h]).filter((v): v is number => typeof v === "number");
  if (!rets.length) return 0;
  return round(rets.reduce((a, b) => a + b, 0) / rets.length, 3);
}

function legFrom(picks: PanelRow[]): Leg {
  if (picks.length === 0) return emptyLeg();
  const rets = picks.map((p) => p.forward_return!);
  const total = rets.reduce((a, b) => a + b, 0);
  const avg = total / rets.length;
  const sd =
    rets.length > 1
      ? Math.sqrt(rets.reduce((a, b) => a + (b - avg) ** 2, 0) / (rets.length - 1))
      : 0;
  const bench = picks.filter((p) => p.benchmark_return !== null);
  return {
    picks: picks.length,
    win_rate: round((rets.filter((r) => r > 0).length / rets.length) * 100, 1),
    avg_return_pct: round(avg, 3),
    total_return_pct: round(total, 2),
    avg_vs_benchmark_pct: bench.length
      ? round(
          bench.reduce((a, p) => a + (p.forward_return! - (p.benchmark_return ?? 0)), 0) /
            bench.length,
          3,
        )
      : 0,
    benchmark_picks: bench.length,
    risk_adjusted: sd > 0 ? round(avg / sd, 3) : 0,
  };
}

// ------------------------------------------------------------------- lanes

export interface Lane {
  lane: string;
  name: string;
  /** Only these scoring variables may be tuned by this researcher. */
  own: FactorKey[];
  seed: () => Partial<Record<FactorKey, number>>;
  /** Extra filter experiments this lane is allowed to try. */
  gates: { label: string; apply: (p: LaneParams) => LaneParams }[];
  /** The number this researcher is trying to maximise. */
  objective: (leg: Leg) => number;
}

export const LANES: Lane[] = [
  {
    lane: "trend",
    name: "Trend Researcher",
    own: ["trend", "momentum", "relative_strength", "volume"],
    seed: () => ({ trend: 35, momentum: 30, relative_strength: 20, volume: 15 }),
    gates: [
      { label: "skip very overbought names (RSI over 80)", apply: (p) => ({ ...p, rsi_max: 80 }) },
      { label: "require volume confirmation (1.2x average)", apply: (p) => ({ ...p, rel_volume_min: 1.2 }) },
      { label: "require real daily range (ATR at least 1.5%)", apply: (p) => ({ ...p, atr_pct_min: 1.5 }) },
    ],
    objective: (l) => l.avg_return_pct,
  },
  {
    lane: "contrarian",
    name: "Contrarian Researcher",
    own: ["pullback", "oversold_reversal", "down_streak", "volume_dryup", "trend"],
    seed: () => ({ pullback: 30, oversold_reversal: 30, down_streak: 15, volume_dryup: 10, trend: 15 }),
    gates: [
      { label: "only names that are not overbought (RSI under 55)", apply: (p) => ({ ...p, rsi_max: 55 }) },
      { label: "only genuinely washed-out names (RSI under 40)", apply: (p) => ({ ...p, rsi_max: 40 }) },
      { label: "avoid falling knives (ATR under 6%)", apply: (p) => ({ ...p, atr_pct_max: 6 }) },
    ],
    objective: (l) => l.avg_return_pct,
  },
  {
    lane: "consistency",
    name: "Consistency Researcher",
    own: ["return_stability", "positive_days", "low_drawdown", "atr_stability", "trend"],
    seed: () => ({ return_stability: 30, positive_days: 25, low_drawdown: 20, atr_stability: 10, trend: 15 }),
    gates: [
      { label: "exclude erratic names (ATR under 4%)", apply: (p) => ({ ...p, atr_pct_max: 4 }) },
      { label: "exclude dead-quiet names (ATR at least 1%)", apply: (p) => ({ ...p, atr_pct_min: 1 }) },
      { label: "avoid overbought extremes (RSI under 72)", apply: (p) => ({ ...p, rsi_max: 72 }) },
    ],
    objective: (l) => l.risk_adjusted * 2 + l.avg_return_pct,
  },
  {
    lane: "growth",
    name: "Growth Researcher",
    own: ["growth_acceleration", "long_relative_strength", "sustained_advance", "momentum"],
    seed: () => ({ growth_acceleration: 30, long_relative_strength: 30, sustained_advance: 25, momentum: 15 }),
    gates: [
      { label: "require above-average participation (1.1x volume)", apply: (p) => ({ ...p, rel_volume_min: 1.1 }) },
      { label: "skip exhausted moves (RSI under 78)", apply: (p) => ({ ...p, rsi_max: 78 }) },
      { label: "ignore names still in a slump (RSI over 45)", apply: (p) => ({ ...p, rsi_min: 45 }) },
    ],
    objective: (l) => l.avg_return_pct,
  },
  {
    lane: "risk",
    name: "Risk Researcher",
    own: ["reward_per_risk", "downside_protection", "worst_day", "liquidity_depth", "volatility_quality"],
    seed: () => ({
      reward_per_risk: 30,
      downside_protection: 25,
      worst_day: 15,
      liquidity_depth: 15,
      volatility_quality: 15,
    }),
    gates: [
      { label: "cap volatility (ATR under 5%)", apply: (p) => ({ ...p, atr_pct_max: 5 }) },
      { label: "cap volatility hard (ATR under 3.5%)", apply: (p) => ({ ...p, atr_pct_max: 3.5 }) },
      { label: "avoid overbought risk (RSI under 75)", apply: (p) => ({ ...p, rsi_max: 75 }) },
    ],
    objective: (l) => l.risk_adjusted * 3 + l.avg_return_pct,
  },
];

function laneSeedParams(lane: Lane, s: Settings): LaneParams {
  return {
    weights: normalize(lane.seed()),
    min_score_to_trade: Number(s.min_score_to_trade),
    num_day_trades: Math.max(1, Number(s.num_day_trades)),
    rsi_max: null,
    rsi_min: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  };
}

function baselineParams(s: Settings): LaneParams {
  return {
    weights: {
      trend: Number(s.weight_trend),
      momentum: Number(s.weight_momentum),
      volume: Number(s.weight_volume),
      relative_strength: Number(s.weight_relative_strength),
      volatility_quality: Number(s.weight_volatility_quality),
    },
    min_score_to_trade: Number(s.min_score_to_trade),
    num_day_trades: Math.max(1, Number(s.num_day_trades)),
    rsi_max: null,
    rsi_min: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  };
}

interface Experiment {
  label: string;
  signature: string;
  params: LaneParams;
  /** What was changed, for the notebook. */
  variable: string;
  previous_value: string;
  new_value: string;
}

function signature(lane: string, p: LaneParams): string {
  const w = Object.entries(normalize(p.weights))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${Math.round(v as number)}`)
    .join(",");
  return `${lane}|${w}|s${Math.round(p.min_score_to_trade)}|n${p.num_day_trades}|rsi${p.rsi_max ?? "-"}/${p.rsi_min ?? "-"}|atr${p.atr_pct_min ?? "-"}/${p.atr_pct_max ?? "-"}|rv${p.rel_volume_min ?? "-"}`;
}

/**
 * One generation of experiments for a lane, seeded from its current params.
 *
 * The weight search is a genuine hill-climb: it probes the current step size in
 * both directions plus a half step, so a value can move up, move down, shrink
 * towards zero or be dropped entirely. The step itself narrows over generations
 * (see `nextStep`), which is what turns 25 → 30 → 35 into 28 → 30 → 32 once the
 * strong region has been located.
 */
function experiments(lane: Lane, current: LaneParams): Experiment[] {
  const list: Experiment[] = [];
  const step = Math.max(2, Math.round(current.step ?? 12));
  const push = (
    label: string,
    params: LaneParams,
    variable: string,
    previous_value: string,
    new_value: string,
  ) =>
    list.push({
      label,
      signature: signature(lane.lane, params),
      params,
      variable,
      previous_value,
      new_value,
    });

  push("keep the current settings", current, "nothing", "current", "current");

  const halfStep = Math.max(1, Math.round(step / 2));
  for (const key of lane.own) {
    const base = current.weights[key] ?? 0;
    const moves = new Set([step, -step, halfStep, -halfStep]);
    // A factor can also be removed outright — less of a factor is a real
    // discovery, not just a smaller number.
    if (base > 0) moves.add(-base);
    for (const amount of moves) {
      if (amount === 0 || base + amount < 0) continue;
      const weights = { ...current.weights };
      weights[key] = base + amount;
      const pretty = key.replace(/_/g, " ");
      const label =
        base + amount === 0
          ? `drop ${pretty} from the formula`
          : `${pretty} weight ${amount > 0 ? "up" : "down"} ${Math.abs(amount)}`;
      push(label, { ...current, weights: normalize(weights) }, `${pretty} weight`, String(round(base, 1)), String(round(base + amount, 1)));
    }
  }

  for (const delta of [-step, -halfStep, halfStep, step]) {
    const gate = current.min_score_to_trade + delta;
    if (gate < 25 || gate > 92) continue;
    push(`score gate ${gate}`, { ...current, min_score_to_trade: gate }, "score gate", String(current.min_score_to_trade), String(gate));
  }

  for (const gate of lane.gates) {
    push(gate.label, gate.apply(current), "entry filter", "none", gate.label);
  }

  for (const picks of [Math.max(1, current.num_day_trades - 1), current.num_day_trades + 1]) {
    if (picks === current.num_day_trades) continue;
    push(`${picks} pick(s) a day`, { ...current, num_day_trades: picks }, "picks per day", String(current.num_day_trades), String(picks));
  }

  return list;
}

/**
 * Narrow the search when the current setting survives, widen it a little when
 * the researcher is still finding better ground.
 */
function nextStep(current: LaneParams, movedOn: boolean): number {
  const step = Math.max(2, Math.round(current.step ?? 12));
  return movedOn ? Math.min(14, step) : Math.max(2, Math.round(step / 2));
}


// ------------------------------------------------------------ persisted state

interface ResearcherRow {
  id: string;
  lane: string;
  name: string;
  focus: string;
  mission: string;
  params: LaneParams | Record<string, never>;
  best_params: LaneParams | null;
  best_evidence: { label?: string; out_of_sample?: Leg };
  best_edge: number | null;
  generation: number;
  experiments_run: number;
  enabled: boolean;
  last_run_at: string | null;
}

export async function listResearchers(): Promise<ResearcherRow[]> {
  const { data, error } = await supabaseAdmin.from("researchers").select("*").order("lane");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ResearcherRow[];
}

async function loadDeadEnds(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from("research_dead_ends").select("lane, signature");
  const set = new Set<string>();
  for (const row of (data ?? []) as { lane: string; signature: string }[]) {
    set.add(row.signature);
  }
  return set;
}

async function recordDeadEnd(lane: string, sig: string, label: string, reason: string, edge: number) {
  const { data } = await supabaseAdmin
    .from("research_dead_ends")
    .select("id, hits")
    .eq("lane", lane)
    .eq("signature", sig)
    .maybeSingle();
  if (data) {
    await supabaseAdmin
      .from("research_dead_ends")
      .update({ hits: ((data as { hits: number }).hits ?? 1) + 1, reason, edge })
      .eq("id", (data as { id: string }).id);
    return;
  }
  await supabaseAdmin
    .from("research_dead_ends")
    .insert({ lane, signature: sig, label, reason, edge });
}

// ------------------------------------------------------------------- skeptic

interface Trial {
  lane: Lane;
  label: string;
  signature: string;
  params: LaneParams;
  in_sample: Leg;
  out_of_sample: Leg;
  first_half: Leg;
  second_half: Leg;
  up_market: Leg;
  down_market: Leg;
  trimmed: Leg;
  edge: number;
  objective: number;
}

interface SkepticVerdict {
  objections: string[];
  vetoed: boolean;
}

/**
 * The Skeptic never picks stocks. It only looks for reasons an attractive
 * finding should not be trusted, and can veto it outright.
 */
function skepticReview(trial: Trial, baselineOut: Leg, baselineTrimmed: Leg): SkepticVerdict {
  const objections: string[] = [];
  let vetoed = false;

  if (trial.out_of_sample.picks < 15) {
    objections.push(
      `Only ${trial.out_of_sample.picks} confirmation trades — too thin to believe on its own.`,
    );
    if (trial.out_of_sample.picks < 8) vetoed = true;
  }
  if (trial.trimmed.avg_return_pct <= baselineTrimmed.avg_return_pct) {
    objections.push(
      "Drop its three luckiest trades and the edge disappears — this looks like a handful of outliers, not a rule.",
    );
    // With a thin confirmation set, dropping any 3 trades kills almost any
    // edge — so this only becomes a veto once there is enough evidence for
    // the trim to be meaningful.
    if (trial.out_of_sample.picks >= 15) vetoed = true;
  }
  if (!(trial.first_half.avg_return_pct > 0 && trial.second_half.avg_return_pct > 0)) {
    objections.push("It is not positive in both halves of the confirmation window.");
  }
  if (trial.in_sample.avg_return_pct > trial.out_of_sample.avg_return_pct * 2 + 0.2) {
    objections.push(
      "Much stronger on the days it was tuned on than on fresh days — classic curve-fitting signature.",
    );
    // Likewise, the tuning-vs-fresh gap is only decisive with enough fresh
    // trades to trust the comparison.
    if (trial.out_of_sample.picks >= 15) vetoed = true;
  }
  if (trial.down_market.picks >= 5 && trial.down_market.avg_return_pct < 0) {
    objections.push("It loses money on days the market falls, so it is riding the market, not beating it.");
  }
  // Only lean on the benchmark when the market proxy actually has bars for
  // most of the picks — otherwise the comparison is measuring missing data.
  if (
    trial.out_of_sample.benchmark_picks >= Math.ceil(trial.out_of_sample.picks * 0.5) &&
    trial.out_of_sample.avg_vs_benchmark_pct <= 0
  ) {
    objections.push("It does not beat simply holding the market proxy over the same days.");
  }
  return { objections, vetoed };
}

// ----------------------------------------------------------------- the pass

export interface LaneReport {
  lane: string;
  name: string;
  best_label: string;
  hypothesis: string;
  edge: number;
  objections: string[];
  verdict: "validated" | "vetoed" | "rejected";
  out_of_sample: Leg;
  tested: number;
  generation: number;
}

export interface DepartmentResult {
  as_of: string | null;
  sessions: number;
  tickers: number;
  baseline: Leg;
  lanes: LaneReport[];
  balanced: {
    filed: boolean;
    edge: number;
    summary: string;
    note: string;
    out_of_sample: Leg;
  } | null;
  dead_ends_added: number;
  warnings: string[];
}

export async function runDepartment(
  options: { universe?: number } = {},
): Promise<DepartmentResult> {
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
      `Only ${usable.length} completed sessions cached — the department needs 20+ before its findings mean anything.`,
    );
  }

  const splitAt = Math.floor(usable.length * 0.6);
  const inDates = usable.slice(0, splitAt);
  const outDates = usable.slice(splitAt);
  const half = Math.floor(outDates.length / 2);

  const base = baselineParams(s);
  const baselinePicks = pickRows(rowsByDate, outDates, base, s, share);
  const baselineOut = legFrom(baselinePicks);
  const baselineSorted = [...baselinePicks].sort(
    (a, b) => b.forward_return! - a.forward_return!,
  );
  const baselineTrimmed = legFrom(
    baselineSorted.slice(3, Math.max(3, baselineSorted.length - 3)),
  );

  const researchers = await listResearchers();
  const deadEnds = await loadDeadEnds();
  let deadAdded = 0;

  const evaluate = (lane: Lane, label: string, sig: string, params: LaneParams): Trial => {
    const inPicks = pickRows(rowsByDate, inDates, params, s, share);
    const outPicks = pickRows(rowsByDate, outDates, params, s, share);
    const outLeg = legFrom(outPicks);
    // Symmetric trim: drop the 3 best AND the 3 worst trades. Dropping only
    // the winners would kill every winner-take-most strategy by construction.
    const sortedOut = [...outPicks].sort((a, b) => b.forward_return! - a.forward_return!);
    return {
      lane,
      label,
      signature: sig,
      params,
      in_sample: legFrom(inPicks),
      out_of_sample: outLeg,
      first_half: legFrom(pickRows(rowsByDate, outDates.slice(0, half), params, s, share)),
      second_half: legFrom(pickRows(rowsByDate, outDates.slice(half), params, s, share)),
      up_market: legFrom(outPicks.filter((p) => (p.benchmark_return ?? 0) >= 0)),
      down_market: legFrom(outPicks.filter((p) => (p.benchmark_return ?? 0) < 0)),
      trimmed: legFrom(sortedOut.slice(3, Math.max(3, sortedOut.length - 3))),
      edge: round(outLeg.avg_return_pct - baselineOut.avg_return_pct, 3),
      objective: lane.objective(outLeg),
    };
  };

  const reports: LaneReport[] = [];
  const validated: Trial[] = [];
  /** Each lane's post-evolution parameters — the researcher's current mind. */
  const laneFinal: Map<string, LaneParams> = new Map();


  for (const lane of LANES) {
    const row = researchers.find((r) => r.lane === lane.lane);
    if (row && row.enabled === false) continue;
    const current =
      row && row.params && (row.params as LaneParams).weights
        ? (row.params as LaneParams)
        : laneSeedParams(lane, s);
    const currentSignature = signature(lane.lane, current);


    const book = experiments(lane, current).filter(
      (e) => !deadEnds.has(e.signature) || e.params === current,
    );

    // Discovery block first, so only the strongest few pay for a full workup.
    const shortlist = book
      .map((e) => ({
        e,
        leg: legFrom(pickRows(rowsByDate, inDates, e.params, s, share)),
      }))
      .sort((a, b) => lane.objective(b.leg) - lane.objective(a.leg))
      .slice(0, 4);

    const trials = shortlist.map(({ e }) => evaluate(lane, e.label, e.signature, e.params));
    trials.sort((a, b) => b.objective - a.objective);
    const best = trials[0];

    // The notebook: every shortlisted experiment is written down, variable
    // changed, old value, new value, result and conclusion — across all four
    // forward horizons, so a "weak tomorrow, strong in a week" pattern is
    // visible instead of being thrown away.
    const shortlistBySig = new Map(shortlist.map(({ e }) => [e.signature, e]));
    const horizonProfile = (params: LaneParams) => {
      const profile: Record<string, number> = {};
      for (const h of HORIZONS) {
        profile[String(h)] = avgHorizon(pickRows(rowsByDate, outDates, params, s, share), h);
      }
      return profile;
    };


    if (!best) continue;

    const review = skepticReview(best, baselineOut, baselineTrimmed);
    const verdict: LaneReport["verdict"] = review.vetoed
      ? "vetoed"
      : best.edge > 0
        ? "validated"
        : "rejected";

    // Write every shortlisted trial into the researcher's permanent notebook.
    const generation = (row?.generation ?? 0) + 1;
    const experimentNo = row?.experiments_run ?? 0;
    const notebookRows = trials.map((t, idx) => {
      const e = shortlistBySig.get(t.signature);
      const isBest = t === best;
      const accepted = isBest && verdict === "validated";
      const horizons = horizonProfile(t.params);
      const weak1d = horizons["1"] !== undefined && horizons["1"] <= 0;
      const longerStrong = (horizons["5"] ?? 0) > 0.4 || (horizons["10"] ?? 0) > 0.8;
      const result =
        t.edge > 0
          ? `Improved (+${t.edge}% per trade vs the current rule)`
          : `Declined (${t.edge > 0 ? "+" : ""}${t.edge}% per trade vs the current rule)`;
      const conclusion = accepted
        ? "Accepted as the current hypothesis."
        : isBest && verdict === "vetoed"
          ? `Rejected — the Skeptic vetoed it: ${review.objections[0] ?? "see objections"}`
          : weak1d && longerStrong
            ? "Rejected for same-day trading — but this looks like a longer-horizon characteristic. Flagged to the Lead Researcher."
            : "Rejected — no edge over the current rule on fresh days.";
      return {
        lane: lane.lane,
        generation,
        experiment_no: experimentNo + idx + 1,
        variable: e?.variable ?? "unknown",
        previous_value: e?.previous_value ?? "",
        new_value: e?.new_value ?? "",
        result,
        conclusion,
        accepted,
        edge: t.edge,
        horizons: horizons as unknown as Json,
      };
    });
    await supabaseAdmin.from("research_notebook").insert(notebookRows);


    // Everything that clearly failed goes into the permanent dead-end ledger so
    // the same experiment is never spent again.
    for (const t of trials) {
      const failed = t.edge <= 0 || (t === best && review.vetoed);
      if (!failed || deadEnds.has(t.signature)) continue;
      await recordDeadEnd(
        lane.lane,
        t.signature,
        `${lane.name}: ${t.label}`,
        review.vetoed && t === best
          ? review.objections[0] || "Vetoed by the Skeptic."
          : `No edge on fresh days (${t.edge > 0 ? "+" : ""}${t.edge}% per trade vs the current rule).`,
        t.edge,
      );
      deadEnds.add(t.signature);
      deadAdded++;
    }

    const hypothesis = `${lane.name}: does ${best.label} produce better ${
      lane.lane === "risk" || lane.lane === "consistency" ? "risk-adjusted results" : "short-term results"
    }?`;

    await supabaseAdmin.from("research_findings").insert({
      lane: lane.lane,
      generation,
      name: `${lane.name} — ${best.label}`,
      hypothesis,
      change_summary: best.label,
      params: best.params as unknown as Json,
      evidence: {
        in_sample: best.in_sample,
        out_of_sample: best.out_of_sample,
        first_half: best.first_half,
        second_half: best.second_half,
        up_market: best.up_market,
        down_market: best.down_market,
        trimmed: best.trimmed,
        baseline_out: baselineOut,
        sessions: usable.length,
        tickers: panel.tickers,
      } as unknown as Json,
      edge: best.edge,
      robustness: round(
        Math.max(
          0,
          Math.min(
            100,
            50 +
              (best.first_half.avg_return_pct > 0 ? 15 : -15) +
              (best.second_half.avg_return_pct > 0 ? 15 : -15) +
              (best.down_market.avg_return_pct > 0 ? 10 : -10) +
              Math.min(10, best.out_of_sample.picks / 4),
          ),
        ),
        1,
      ),
      confidence: round(Math.max(0, Math.min(100, 40 + best.edge * 60 - review.objections.length * 8)), 1),
      verdict,
      objections: review.objections as unknown as Json,
    });

    // The researcher evolves: a validated finding becomes its new starting
    // point next generation. A vetoed or flat one leaves it where it was —
    // and narrows the search step, closing in on the region it already knows
    // is strong instead of wandering.
    const keeps = verdict === "validated";
    // Progress re-opens the search; standing still closes in on the region.
    const step = keeps ? 12 : nextStep(current, best.signature !== currentSignature);
    const nextParams = { ...(keeps ? best.params : current), step };
    if (row) {
      await supabaseAdmin
        .from("researchers")
        .update({
          params: nextParams as unknown as Json,
          best_params: (keeps ? best.params : (row.best_params ?? current)) as unknown as Json,
          best_evidence: (keeps
            ? { out_of_sample: best.out_of_sample, label: best.label }
            : row.best_evidence) as unknown as Json,
          best_edge: keeps ? best.edge : row.best_edge,
          generation,
          experiments_run: (row.experiments_run ?? 0) + book.length,
          last_run_at: new Date().toISOString(),
        })
        .eq("lane", lane.lane);
    }
    laneFinal.set(lane.lane, nextParams);

    if (verdict === "validated") validated.push(best);

    reports.push({
      lane: lane.lane,
      name: lane.name,
      best_label: best.label,
      hypothesis,
      edge: best.edge,
      objections: review.objections,
      verdict,
      out_of_sample: best.out_of_sample,
      tested: book.length,
      generation: (row?.generation ?? 0) + 1,
    });
  }

  const balanced = await leadResearcher({
    validated,
    base,
    baselineOut,
    rowsByDate,
    inDates,
    outDates,
    settings: s,
    share,
    sessions: usable.length,
    tickers: panel.tickers,
  });

  await supabaseAdmin.from("research_runs").insert({
    kind: "department",
    config: { universe, sessions: usable.length, tickers: panel.tickers } as unknown as Json,
    summary: {
      baseline_out: baselineOut,
      lanes: reports,
      balanced,
      dead_ends_added: deadAdded,
    } as unknown as Json,
    warnings: warnings as unknown as Json,
  });

  return {
    as_of: usable[usable.length - 1] ?? null,
    sessions: usable.length,
    tickers: panel.tickers,
    baseline: baselineOut,
    lanes: reports,
    balanced,
    dead_ends_added: deadAdded,
    warnings,
  };
}

// ------------------------------------------------------------ lead researcher

/**
 * The Lead Researcher takes the surviving findings, converts each one into the
 * language the live strategy actually speaks (the five core weights plus entry
 * filters), re-tests the merged result, and only files it when the merge itself
 * beats the current rule on days nothing was tuned on.
 */
async function leadResearcher(input: {
  validated: Trial[];
  base: LaneParams;
  baselineOut: Leg;
  rowsByDate: Map<string, PanelRow[]>;
  inDates: string[];
  outDates: string[];
  settings: Settings;
  share: number;
  sessions: number;
  tickers: number;
}): Promise<DepartmentResult["balanced"]> {
  const { validated, base, baselineOut, rowsByDate, outDates, settings, share } = input;
  if (validated.length === 0) return null;

  // Each validated finding votes with its core-factor mix, weighted by its edge.
  const totals: Record<string, number> = {};
  let voteWeight = 0;
  for (const t of validated) {
    const coreOnly: Partial<Record<FactorKey, number>> = {};
    for (const k of CORE_KEYS) coreOnly[k] = t.params.weights[k] ?? 0;
    const anyCore = Object.values(coreOnly).reduce((a, b) => a + (b ?? 0), 0);
    const mix = anyCore > 0 ? normalize(coreOnly) : normalize(base.weights);
    const w = Math.max(0.2, t.edge);
    voteWeight += w;
    for (const k of CORE_KEYS) totals[k] = (totals[k] ?? 0) + (mix[k] ?? 0) * w;
  }
  const merged: Partial<Record<FactorKey, number>> = {};
  for (const k of CORE_KEYS) {
    // Half the current rule, half the department's consensus: the Balanced
    // Strategy evolves, it never lurches.
    merged[k] = ((base.weights[k] ?? 0) + (totals[k] ?? 0) / (voteWeight || 1)) / 2;
  }

  // A filter is only adopted when at least two independent lanes found it.
  const median = (list: number[]) =>
    list.length ? [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)]! : null;
  const adopt = (key: "rsi_max" | "rsi_min" | "atr_pct_min" | "atr_pct_max" | "rel_volume_min") => {
    const votes = validated
      .map((t) => t.params[key])
      .filter((v): v is number => typeof v === "number");
    return votes.length >= 2 ? median(votes) : null;
  };

  const candidateParams: LaneParams = {
    weights: normalize(merged),
    min_score_to_trade: Math.round(
      validated.reduce((a, t) => a + t.params.min_score_to_trade, base.min_score_to_trade) /
        (validated.length + 1),
    ),
    num_day_trades: base.num_day_trades,
    rsi_max: adopt("rsi_max"),
    rsi_min: adopt("rsi_min"),
    atr_pct_min: adopt("atr_pct_min"),
    atr_pct_max: adopt("atr_pct_max"),
    rel_volume_min: adopt("rel_volume_min"),
  };

  const outPicks = pickRows(rowsByDate, outDates, candidateParams, settings, share);
  const outLeg = legFrom(outPicks);
  const inLeg = legFrom(pickRows(rowsByDate, input.inDates, candidateParams, settings, share));
  const halfN = Math.floor(outDates.length / 2);
  const firstHalf = legFrom(pickRows(rowsByDate, outDates.slice(0, halfN), candidateParams, settings, share));
  const secondHalf = legFrom(pickRows(rowsByDate, outDates.slice(halfN), candidateParams, settings, share));
  const edge = round(outLeg.avg_return_pct - baselineOut.avg_return_pct, 3);

  const gateBits: string[] = [];
  if (candidateParams.rsi_max !== null) gateBits.push(`RSI ceiling ${candidateParams.rsi_max}`);
  if (candidateParams.rsi_min !== null) gateBits.push(`RSI floor ${candidateParams.rsi_min}`);
  if (candidateParams.atr_pct_min !== null) gateBits.push(`ATR at least ${candidateParams.atr_pct_min}%`);
  if (candidateParams.atr_pct_max !== null) gateBits.push(`ATR under ${candidateParams.atr_pct_max}%`);
  if (candidateParams.rel_volume_min !== null)
    gateBits.push(`volume at least ${candidateParams.rel_volume_min}x average`);

  const summary = `Weights ${CORE_KEYS.map((k) => `${k.replace(/_/g, " ")} ${Math.round(candidateParams.weights[k] ?? 0)}`).join(", ")}; score gate ${candidateParams.min_score_to_trade}${gateBits.length ? `; ${gateBits.join("; ")}` : ""}`;

  if (edge <= 0) {
    return {
      filed: false,
      edge,
      summary,
      note: `Merging this generation's ${validated.length} validated finding(s) did not beat the current rule on fresh days, so nothing was filed. The findings stay with their researchers for the next generation.`,
      out_of_sample: outLeg,
    };
  }

  await supabaseAdmin.from("research_candidates").insert({
    name: `Balanced Strategy (generation ${new Date().toISOString().slice(0, 10)})`,
    base_version: "department",
    hypothesis: `The Lead Researcher merged ${validated.length} validated finding(s) from ${validated
      .map((t) => t.lane.name)
      .join(", ")} into one balanced rule.`,
    change_summary: summary,
    params: {
      weights: {
        trend: candidateParams.weights.trend ?? 0,
        momentum: candidateParams.weights.momentum ?? 0,
        volume: candidateParams.weights.volume ?? 0,
        relative_strength: candidateParams.weights.relative_strength ?? 0,
        volatility_quality: candidateParams.weights.volatility_quality ?? 0,
      },
      min_score_to_trade: candidateParams.min_score_to_trade,
      num_day_trades: candidateParams.num_day_trades,
      rsi_max: candidateParams.rsi_max,
      atr_pct_min: candidateParams.atr_pct_min,
      atr_pct_max: candidateParams.atr_pct_max,
      rel_volume_min: candidateParams.rel_volume_min,
    } as unknown as Json,
    evidence: {
      in_sample: inLeg,
      out_of_sample: outLeg,
      first_half: firstHalf,
      second_half: secondHalf,
      up_market: legFrom(outPicks.filter((p) => (p.benchmark_return ?? 0) >= 0)),
      down_market: legFrom(outPicks.filter((p) => (p.benchmark_return ?? 0) < 0)),
      baseline_in: legFrom(pickRows(rowsByDate, input.inDates, base, settings, share)),
      baseline_out: baselineOut,
      sessions: input.sessions,
      tickers: input.tickers,
    } as unknown as Json,
    expected_improvement: edge,
    confidence: round(Math.max(0, Math.min(100, 45 + edge * 60)), 1),
    robustness: round(
      Math.max(0, Math.min(100, 50 + (firstHalf.avg_return_pct > 0 ? 20 : -20) + (secondHalf.avg_return_pct > 0 ? 20 : -20))),
      1,
    ),
    status: "proposed",
    warnings: (outLeg.picks < 20
      ? ["Thin confirmation evidence — fewer than 20 trades in the fresh block."]
      : []) as unknown as Json,
  });

  await supabaseAdmin
    .from("research_findings")
    .update({ adopted: true, lead_note: "Merged into the Balanced Strategy proposal." })
    .in(
      "lane",
      validated.map((t) => t.lane.lane),
    )
    .eq("verdict", "validated")
    .is("adopted", false);

  return {
    filed: true,
    edge,
    summary,
    note: `Filed as a Balanced Strategy candidate on the strength of ${validated.length} validated finding(s). Nothing changed live — approve it yourself if you want it trading.`,
    out_of_sample: outLeg,
  };
}

// ------------------------------------------------------------------ readers

export async function departmentOverview() {
  const [researchers, findingsRes, deadRes, runsRes] = await Promise.all([
    listResearchers(),
    supabaseAdmin
      .from("research_findings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
    supabaseAdmin
      .from("research_dead_ends")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from("research_runs")
      .select("*")
      .eq("kind", "department")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return {
    researchers,
    findings: (findingsRes.data ?? []) as unknown as {
      id: string;
      lane: string;
      generation: number;
      name: string;
      hypothesis: string;
      change_summary: string;
      edge: number | null;
      robustness: number | null;
      confidence: number | null;
      verdict: string;
      objections: string[];
      adopted: boolean;
      created_at: string;
      evidence: { out_of_sample?: Leg };
    }[],
    dead_ends: (deadRes.data ?? []) as unknown as {
      id: string;
      lane: string;
      label: string;
      reason: string;
      edge: number | null;
      hits: number;
      updated_at: string;
    }[],
    last_run: (runsRes.data ?? [])[0] as
      | {
          created_at: string;
          summary: {
            baseline_out?: Leg;
            lanes?: LaneReport[];
            balanced?: DepartmentResult["balanced"];
            dead_ends_added?: number;
          };
        }
      | undefined,
  };
}
