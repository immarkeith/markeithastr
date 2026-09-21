/**
 * Researcher learning and progression.
 *
 * Every researcher keeps its own growing library of completed research examples
 * and its own learned beliefs about WHY those examples worked or failed. A
 * researcher no longer just records "up or down and move on": for each finished
 * example it keeps the starting characteristics (trend, momentum, volume,
 * volatility, pullback, stability, reward-per-risk and the rest), pairs them
 * with what actually happened, then tests each observation against the whole
 * accumulated sample instead of treating one example as proof.
 *
 * Learning rules honoured here:
 *  - a characteristic only becomes "supported" if it holds up in BOTH halves of
 *    the accumulated sample (discovery half and hold-out half), so appearing in
 *    winners is not enough on its own;
 *  - beliefs are tested every pass, and a belief that stops holding up LOSES
 *    confidence and is eventually dropped rather than staying on the list;
 *  - level tests ("helpful up to a point, harmful above it") and combination
 *    tests ("these two together beat either alone") are graded separately;
 *  - every belief is scored per research horizon, so "works same-day but not at
 *    three months" is visible instead of averaged away.
 *
 * Isolation rules:
 *  - each researcher (lane) learns from ITS OWN examples only; nothing written
 *    here for one lane is ever read or copied into another lane's beliefs;
 *  - this is research only. Nothing in this module writes settings, strategy
 *    parameters, Master Formula rules, the live Trend Score, live rankings,
 *    SAME_DAY positions or LONG_TERM positions. A change to live trading still
 *    needs the normal, separately approved strategy change.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { FACTOR_KEYS, FACTOR_LABELS_ALL, type FactorKey } from "./factors";
import { buildPanel, characteristicsFor, type PanelRow } from "./department.server";
import { loadSettings } from "./scan.server";

/** Research horizons a belief can be graded on. */
export const LEARNING_HORIZONS = ["same_day", "1M", "3M", "9M"] as const;
export type LearningHorizon = (typeof LEARNING_HORIZONS)[number];

/** Fewest completed examples before a horizon is worth mining at all. */
const MIN_EXAMPLES: Record<LearningHorizon, number> = {
  same_day: 25,
  "1M": 12,
  "3M": 10,
  "9M": 8,
};
/** Fewest examples inside a band before its result is allowed to mean anything. */
const MIN_BAND = 5;
/** How much the sample is allowed to grow the universe of ideas tested per pass. */
const MAX_BELIEFS_PER_HORIZON = 14;

const round = (n: number, d = 2) => Number(n.toFixed(d));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const winRate = (xs: number[]) =>
  xs.length ? round((xs.filter((x) => x > 0).length / xs.length) * 100, 1) : 0;

// ------------------------------------------------------------------- examples

export interface ExampleRow {
  lane: string;
  ticker: string;
  example_date: string;
  horizon: LearningHorizon;
  score: number | null;
  factors: Partial<Record<FactorKey, number>>;
  conditions: { rsi14?: number; atr_pct?: number; rel_volume?: number };
  regime: string | null;
  return_pct: number | null;
  benchmark_return_pct: number | null;
  successful: boolean | null;
}

type PanelIndex = Map<string, PanelRow>;

function panelKey(ticker: string, date: string) {
  return `${ticker}|${date}`;
}

/** Up or down market on the day the example started, from the cached proxy bars. */
async function regimeByDate(proxy: string): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, close")
    .eq("ticker", proxy.toUpperCase())
    .order("bar_date", { ascending: true });
  const bars = (data ?? []) as { bar_date: string; close: number }[];
  const out = new Map<string, string>();
  for (let i = 5; i < bars.length; i++) {
    const now = Number(bars[i]!.close);
    const back = Number(bars[i - 5]!.close);
    if (!back) continue;
    out.set(bars[i]!.bar_date, now >= back ? "up" : "down");
  }
  return out;
}

/**
 * Harvest every completed research example that has not been filed yet.
 *
 * Short-horizon examples come from each researcher's own finished paper trades
 * (their recorded same-day result). Long-horizon examples come from that
 * researcher's own evaluated 1M/3M/9M predictions. The starting characteristics
 * are read back from the SHARED cached daily bars — the same history every other
 * part of the app uses — so no price data is duplicated and nothing is
 * backdated: an example is only ever dated on the day the researcher acted.
 */
async function harvestExamples(
  panel: PanelIndex,
  regime: Map<string, string>,
  proxyBars: { date: string; open: number; high: number; low: number; close: number; volume: number }[],
) {
  // Characteristics come from the panel when the stock is in the sampled
  // research universe, otherwise from the same shared cached bars. Memoised so
  // one pass never reads the same ticker/date twice.
  const cache = new Map<string, Awaited<ReturnType<typeof characteristicsFor>>>();
  const conditionsFor = async (ticker: string, date: string) => {
    const fromPanel = panel.get(panelKey(ticker, date));
    if (fromPanel) return fromPanel;
    const key = panelKey(ticker, date);
    if (!cache.has(key)) cache.set(key, await characteristicsFor(ticker, date, proxyBars));
    return cache.get(key) ?? null;
  };
  const rows: (ExampleRow & { source: string; source_id: string; resolved_on: string | null })[] =
    [];

  const { data: slotRows } = await supabaseAdmin
    .from("paper_slots")
    .select("lane, strategy_id");
  const laneOf = new Map<string, string>();
  for (const s of (slotRows ?? []) as { lane: string | null; strategy_id: string | null }[]) {
    if (s.lane && s.strategy_id) laneOf.set(s.strategy_id, s.lane);
  }

  // --- short horizon: the researcher's own closed paper trades
  const { data: tradeRows } = await supabaseAdmin
    .from("trades")
    .select("id, ticker, entry_date, strategy_id, same_day_pct, status")
    .eq("status", "closed")
    .not("strategy_id", "is", null)
    .order("entry_date", { ascending: false })
    .limit(2000);
  for (const t of (tradeRows ?? []) as {
    id: string;
    ticker: string;
    entry_date: string;
    strategy_id: string | null;
    same_day_pct: number | null;
  }[]) {
    const lane = t.strategy_id ? laneOf.get(t.strategy_id) : undefined;
    if (!lane || t.same_day_pct === null || t.same_day_pct === undefined) continue;
    const row = await conditionsFor(t.ticker, t.entry_date);
    if (!row) continue; // characteristics no longer in the cached window
    rows.push({
      lane,
      source: "paper_trade",
      source_id: t.id,
      ticker: t.ticker,
      example_date: t.entry_date,
      horizon: "same_day",
      score: null,
      factors: row.pct,
      conditions: { rsi14: round(row.rsi14, 1), atr_pct: round(row.atr_pct, 2), rel_volume: round(row.rel_volume, 2) },
      regime: regime.get(t.entry_date) ?? null,
      return_pct: Number(t.same_day_pct),
      benchmark_return_pct: row.benchmark_return ?? null,
      successful: Number(t.same_day_pct) > 0,
      resolved_on: t.entry_date,
    });
  }

  // --- long horizons: the researcher's own evaluated predictions
  const { data: horizonRows } = await supabaseAdmin
    .from("research_horizon_predictions")
    .select(
      "id, lane, ticker, prediction_date, horizon, score, factors, return_pct, benchmark_return_pct, successful, outcome, evaluated_at",
    )
    .not("return_pct", "is", null)
    .order("prediction_date", { ascending: false })
    .limit(4000);
  for (const p of (horizonRows ?? []) as {
    id: string;
    lane: string;
    ticker: string;
    prediction_date: string;
    horizon: string;
    score: number | null;
    factors: Record<string, number> | null;
    return_pct: number | null;
    benchmark_return_pct: number | null;
    successful: boolean | null;
    evaluated_at: string | null;
  }[]) {
    if (!LEARNING_HORIZONS.includes(p.horizon as LearningHorizon)) continue;
    const row = await conditionsFor(p.ticker, p.prediction_date);
    const factors = (row?.pct ?? (p.factors as Partial<Record<FactorKey, number>>) ?? {}) as Partial<
      Record<FactorKey, number>
    >;
    if (!Object.keys(factors).length) continue;
    rows.push({
      lane: p.lane,
      source: "horizon_prediction",
      source_id: p.id,
      ticker: p.ticker,
      example_date: p.prediction_date,
      horizon: p.horizon as LearningHorizon,
      score: p.score,
      factors,
      conditions: row
        ? { rsi14: round(row.rsi14, 1), atr_pct: round(row.atr_pct, 2), rel_volume: round(row.rel_volume, 2) }
        : {},
      regime: regime.get(p.prediction_date) ?? null,
      return_pct: p.return_pct,
      benchmark_return_pct: p.benchmark_return_pct,
      successful: p.successful ?? (Number(p.return_pct) > 0),
      resolved_on: p.evaluated_at ? p.evaluated_at.slice(0, 10) : null,
    });
  }

  if (rows.length) {
    // Append-only: an example that is already filed is never rewritten.
    for (let i = 0; i < rows.length; i += 200) {
      await supabaseAdmin
        .from("researcher_examples")
        .upsert(rows.slice(i, i + 200) as never, {
          onConflict: "lane,source,source_id,horizon",
          ignoreDuplicates: true,
        });
    }
  }
  return rows.length;
}

// ------------------------------------------------------------------- beliefs

export interface BeliefRow {
  id: string;
  lane: string;
  horizon: string;
  kind: string;
  characteristic: string;
  band: string;
  direction: string;
  hypothesis: string;
  sample_size: number;
  avg_return_in: number | null;
  avg_return_out: number | null;
  lift: number | null;
  win_rate_in: number | null;
  win_rate_out: number | null;
  first_half_lift: number | null;
  second_half_lift: number | null;
  up_market_lift: number | null;
  down_market_lift: number | null;
  confidence: number;
  confirmations: number;
  failures: number;
  status: string;
  note: string | null;
  last_tested_on: string | null;
  updated_at: string;
}

interface StoredExample {
  example_date: string;
  horizon: string;
  factors: Record<string, number>;
  regime: string | null;
  return_pct: number;
}

interface Test {
  kind: "level" | "ceiling" | "combination";
  characteristic: string;
  band: string;
  hypothesis: string;
  inside: StoredExample[];
  outside: StoredExample[];
}

/** Value at a percentile of a sorted-by-value characteristic. */
function cut(values: number[], q: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[idx]!;
}

/**
 * The question book. Each entry is one testable statement about a starting
 * characteristic, never a claim — the grading below decides whether it holds.
 */
function buildTests(examples: StoredExample[]): Test[] {
  const tests: Test[] = [];
  const label = (key: string) => FACTOR_LABELS_ALL[key as FactorKey] ?? key.replace(/_/g, " ");

  const usable = FACTOR_KEYS.filter(
    (key) => examples.filter((e) => typeof e.factors[key] === "number").length >= MIN_BAND * 3,
  );

  const ranked: { key: FactorKey; lift: number; high: number }[] = [];

  for (const key of usable) {
    const withValue = examples.filter((e) => typeof e.factors[key] === "number");
    const values = withValue.map((e) => e.factors[key]!);
    const hiCut = cut(values, 2 / 3);
    const midCut = cut(values, 1 / 3);
    const high = withValue.filter((e) => e.factors[key]! >= hiCut);
    const low = withValue.filter((e) => e.factors[key]! <= midCut);
    const mid = withValue.filter((e) => e.factors[key]! > midCut && e.factors[key]! < hiCut);

    if (high.length >= MIN_BAND && low.length + mid.length >= MIN_BAND) {
      tests.push({
        kind: "level",
        characteristic: key,
        band: "high",
        hypothesis: `Does a strong ${label(key).toLowerCase()} reading (${round(hiCut, 0)}+) consistently improve the outcome?`,
        inside: high,
        outside: [...mid, ...low],
      });
      ranked.push({
        key,
        lift: mean(high.map((e) => e.return_pct)) - mean([...mid, ...low].map((e) => e.return_pct)),
        high: hiCut,
      });
    }
    if (low.length >= MIN_BAND && high.length + mid.length >= MIN_BAND) {
      tests.push({
        kind: "level",
        characteristic: key,
        band: "low",
        hypothesis: `Does a weak ${label(key).toLowerCase()} reading (${round(midCut, 0)} or less) consistently improve the outcome?`,
        inside: low,
        outside: [...mid, ...high],
      });
    }
    // Helpful up to a point, harmful above it: top third measured against the
    // middle third only, so a genuinely excessive level shows up as negative.
    if (high.length >= MIN_BAND && mid.length >= MIN_BAND) {
      tests.push({
        kind: "ceiling",
        characteristic: key,
        band: `above ${round(hiCut, 0)}`,
        hypothesis: `Does ${label(key).toLowerCase()} become harmful once it climbs above ${round(hiCut, 0)}?`,
        inside: high,
        outside: mid,
      });
    }
  }

  // Combinations: only the two strongest single readings, tested to see whether
  // together they beat either one alone.
  ranked.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift));
  const a = ranked[0];
  const b = ranked[1];
  if (a && b) {
    const both = examples.filter(
      (e) => (e.factors[a.key] ?? -1) >= a.high && (e.factors[b.key] ?? -1) >= b.high,
    );
    const either = examples.filter(
      (e) =>
        ((e.factors[a.key] ?? -1) >= a.high) !== ((e.factors[b.key] ?? -1) >= b.high),
    );
    if (both.length >= MIN_BAND && either.length >= MIN_BAND) {
      tests.push({
        kind: "combination",
        characteristic: `${a.key}+${b.key}`,
        band: "both high",
        hypothesis: `Do strong ${label(a.key).toLowerCase()} and strong ${label(b.key).toLowerCase()} together beat either one on its own?`,
        inside: both,
        outside: either,
      });
    }
  }

  return tests;
}

interface Graded {
  test: Test;
  lift: number;
  avgIn: number;
  avgOut: number;
  winIn: number;
  winOut: number;
  firstLift: number;
  secondLift: number;
  upLift: number;
  downLift: number;
  holdsUp: boolean;
  evidence: number;
  note: string;
}

/**
 * Grade one statement against the whole accumulated sample, then again on each
 * half separately. Appearing in winners is not evidence; the reading has to
 * keep its direction on the half it was not discovered on.
 */
function grade(test: Test): Graded {
  const all = [...test.inside, ...test.outside].sort((a, b) =>
    a.example_date.localeCompare(b.example_date),
  );
  const mid = Math.floor(all.length / 2);
  const firstHalf = new Set(all.slice(0, mid).map((e) => `${e.example_date}|${e.return_pct}`));
  const key = (e: StoredExample) => `${e.example_date}|${e.return_pct}`;

  const liftOf = (inside: StoredExample[], outside: StoredExample[]) =>
    inside.length && outside.length
      ? mean(inside.map((e) => e.return_pct)) - mean(outside.map((e) => e.return_pct))
      : 0;

  const lift = liftOf(test.inside, test.outside);
  const firstLift = liftOf(
    test.inside.filter((e) => firstHalf.has(key(e))),
    test.outside.filter((e) => firstHalf.has(key(e))),
  );
  const secondLift = liftOf(
    test.inside.filter((e) => !firstHalf.has(key(e))),
    test.outside.filter((e) => !firstHalf.has(key(e))),
  );
  const upLift = liftOf(
    test.inside.filter((e) => e.regime === "up"),
    test.outside.filter((e) => e.regime === "up"),
  );
  const downLift = liftOf(
    test.inside.filter((e) => e.regime === "down"),
    test.outside.filter((e) => e.regime === "down"),
  );

  const direction = Math.sign(lift);
  const holdsUp =
    direction !== 0 &&
    Math.sign(firstLift) === direction &&
    Math.sign(secondLift) === direction &&
    Math.abs(lift) >= 0.05;

  const sampleWeight = Math.min(1, test.inside.length / 20);
  const evidence = round(
    Math.max(
      0,
      Math.min(
        95,
        (holdsUp ? 45 : 12) +
          Math.min(25, Math.abs(lift) * 12) +
          sampleWeight * 20 +
          (Math.sign(upLift) === direction && Math.sign(downLift) === direction ? 10 : 0),
      ),
    ),
    1,
  );

  const notes: string[] = [];
  if (!holdsUp) notes.push("does not keep its direction on the half it was not found on");
  if (Math.sign(upLift) !== Math.sign(downLift))
    notes.push(
      `behaves differently by market: ${round(upLift)}% in up markets vs ${round(downLift)}% in down markets`,
    );
  if (test.inside.length < 10) notes.push(`thin sample (${test.inside.length} examples)`);

  return {
    test,
    lift: round(lift, 3),
    avgIn: round(mean(test.inside.map((e) => e.return_pct)), 3),
    avgOut: round(mean(test.outside.map((e) => e.return_pct)), 3),
    winIn: winRate(test.inside.map((e) => e.return_pct)),
    winOut: winRate(test.outside.map((e) => e.return_pct)),
    firstLift: round(firstLift, 3),
    secondLift: round(secondLift, 3),
    upLift: round(upLift, 3),
    downLift: round(downLift, 3),
    holdsUp,
    evidence,
    note: notes.join("; "),
  };
}

export interface LearningResult {
  examples_filed: number;
  lanes: {
    lane: string;
    horizons: { horizon: LearningHorizon; examples: number; tested: number; ready: boolean }[];
    supported: number;
    dropped: number;
  }[];
}

/**
 * One learning pass. Runs after the daily research pass, per researcher, and
 * updates only that researcher's own beliefs.
 */
export async function runLearningPass(): Promise<LearningResult> {
  const s = await loadSettings();
  const panel = await buildPanel(Math.min(400, Number(s.max_universe) || 300), String(s.market_proxy));
  const index: PanelIndex = new Map();
  for (const row of panel.rows) index.set(panelKey(row.ticker, row.date), row);
  const regime = await regimeByDate(String(s.market_proxy));

  const filed = await harvestExamples(index, regime, proxyBars);

  const { data: stored } = await supabaseAdmin
    .from("researcher_examples")
    .select("lane, horizon, example_date, factors, regime, return_pct")
    .not("return_pct", "is", null)
    .order("example_date", { ascending: true })
    .limit(20000);

  const byLane = new Map<string, Map<string, StoredExample[]>>();
  for (const raw of (stored ?? []) as {
    lane: string;
    horizon: string;
    example_date: string;
    factors: Record<string, number> | null;
    regime: string | null;
    return_pct: number | null;
  }[]) {
    if (raw.return_pct === null) continue;
    const lanes = byLane.get(raw.lane) ?? new Map<string, StoredExample[]>();
    const list = lanes.get(raw.horizon) ?? [];
    list.push({
      example_date: raw.example_date,
      horizon: raw.horizon,
      factors: (raw.factors ?? {}) as Record<string, number>,
      regime: raw.regime,
      return_pct: Number(raw.return_pct),
    });
    lanes.set(raw.horizon, list);
    byLane.set(raw.lane, lanes);
  }

  const today = new Date().toISOString().slice(0, 10);
  const result: LearningResult = { examples_filed: filed, lanes: [] };

  for (const [lane, horizons] of byLane) {
    // Only this lane's beliefs are ever read or written in this block.
    const { data: existingRows } = await supabaseAdmin
      .from("researcher_beliefs")
      .select("*")
      .eq("lane", lane);
    const existing = new Map<string, BeliefRow>();
    for (const b of (existingRows ?? []) as unknown as BeliefRow[]) {
      existing.set(`${b.horizon}|${b.kind}|${b.characteristic}|${b.band}`, b);
    }

    const laneReport: LearningResult["lanes"][number] = {
      lane,
      horizons: [],
      supported: 0,
      dropped: 0,
    };

    for (const horizon of LEARNING_HORIZONS) {
      const examples = horizons.get(horizon) ?? [];
      const ready = examples.length >= MIN_EXAMPLES[horizon];
      const graded = ready
        ? buildTests(examples)
            .map(grade)
            .sort((a, b) => b.evidence - a.evidence)
            .slice(0, MAX_BELIEFS_PER_HORIZON)
        : [];
      laneReport.horizons.push({
        horizon,
        examples: examples.length,
        tested: graded.length,
        ready,
      });

      for (const g of graded) {
        const key = `${horizon}|${g.test.kind}|${g.test.characteristic}|${g.test.band}`;
        const prior = existing.get(key);
        const direction = g.lift >= 0 ? "helps" : "hurts";
        const confirmed = g.holdsUp && (!prior || prior.direction === direction);

        // Confidence rises only on a confirmation and FALLS on a failure, so a
        // reading that stops working stops being treated as a finding.
        const previous = prior ? Number(prior.confidence) : 30;
        const confidence = confirmed
          ? round(Math.min(95, previous * 0.6 + g.evidence * 0.4 + 6), 1)
          : round(Math.max(5, previous * 0.65), 1);
        const confirmations = (prior?.confirmations ?? 0) + (confirmed ? 1 : 0);
        const failures = confirmed
          ? Math.max(0, (prior?.failures ?? 0) - 1)
          : (prior?.failures ?? 0) + 1;

        const status =
          failures >= 3 && confidence < 25
            ? "dropped"
            : confirmed && confidence >= 55 && confirmations >= 2
              ? "supported"
              : failures > confirmations
                ? "weakening"
                : "forming";
        if (status === "supported") laneReport.supported += 1;
        if (status === "dropped") laneReport.dropped += 1;

        await supabaseAdmin.from("researcher_beliefs").upsert(
          {
            lane,
            horizon,
            kind: g.test.kind,
            characteristic: g.test.characteristic,
            band: g.test.band,
            direction,
            hypothesis: g.test.hypothesis,
            sample_size: g.test.inside.length,
            avg_return_in: g.avgIn,
            avg_return_out: g.avgOut,
            lift: g.lift,
            win_rate_in: g.winIn,
            win_rate_out: g.winOut,
            first_half_lift: g.firstLift,
            second_half_lift: g.secondLift,
            up_market_lift: g.upLift,
            down_market_lift: g.downLift,
            confidence,
            confirmations,
            failures,
            status,
            note: g.note || null,
            last_tested_on: today,
          } as never,
          { onConflict: "lane,horizon,kind,characteristic,band" },
        );
      }
    }

    result.lanes.push(laneReport);
  }

  await supabaseAdmin.from("research_runs").insert({
    kind: "learning",
    config: { horizons: LEARNING_HORIZONS, min_examples: MIN_EXAMPLES } as never,
    summary: result as never,
    warnings: [] as never,
  } as never);

  return result;
}

/**
 * Read-only view of what one researcher has learned so far, newest evidence
 * first. Used by the Research Lab; never by the live path.
 */
export async function learnedProfiles() {
  const [beliefsRes, countsRes] = await Promise.all([
    supabaseAdmin
      .from("researcher_beliefs")
      .select("*")
      .order("confidence", { ascending: false })
      .limit(600),
    supabaseAdmin
      .from("researcher_examples")
      .select("lane, horizon")
      .not("return_pct", "is", null)
      .limit(20000),
  ]);

  const counts: Record<string, Record<string, number>> = {};
  for (const row of (countsRes.data ?? []) as { lane: string; horizon: string }[]) {
    counts[row.lane] = counts[row.lane] ?? {};
    counts[row.lane]![row.horizon] = (counts[row.lane]![row.horizon] ?? 0) + 1;
  }

  return {
    beliefs: (beliefsRes.data ?? []) as unknown as BeliefRow[],
    example_counts: counts,
    minimums: MIN_EXAMPLES,
  };
}
