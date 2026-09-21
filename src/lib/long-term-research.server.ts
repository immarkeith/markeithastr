/**
 * Long-horizon PAPER research.
 *
 * When a researcher picks a stock for its normal daily test, the same idea is
 * also written down as a 1-month, 3-month and 9-month prediction. Nothing is
 * bought: these rows are pure bookkeeping. Later, once each horizon's date
 * arrives, the actual outcome is APPENDED to the row — the original prediction
 * is never overwritten.
 *
 * This module never touches live money, live positions or live P/L.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  addCalendarMonths,
  checkpointDate,
  LONG_TERM_RESEARCH_HORIZONS,
  RESEARCH_HORIZONS,
  horizonLabel,
} from "./horizons";
import { nyParts } from "./market-calendar";

const today = () => nyParts().date;

export interface HorizonSlot {
  lane: string | null;
  name: string;
  strategy_id: string;
  params: Record<string, number>;
}

export interface HorizonPick {
  ticker: string;
  score: number;
  close: number;
  factors?: Record<string, unknown>;
}

/**
 * Records the same research idea at every long horizon. Safe to call twice: the
 * unique key (lane, ticker, prediction_date, horizon) means a repeat pass never
 * duplicates or rewrites a prediction.
 */
export async function recordHorizonPredictions(
  slot: HorizonSlot,
  pick: HorizonPick,
  price: number,
): Promise<number> {
  if (!slot.lane || !price) return 0;
  const day = today();
  const rows = RESEARCH_HORIZONS.map((horizon) => ({
    prediction_date: day,
    lane: slot.lane as string,
    researcher_name: slot.name,
    strategy_id: slot.strategy_id,
    // The formula that produced the candidate travels with it, so later results
    // can never be credited to a formula that was changed in the meantime.
    formula_version: `${slot.name} @ ${day}`,
    formula: (slot.params ?? {}) as never,
    ticker: pick.ticker.toUpperCase(),
    entry_price: price,
    score: Number.isFinite(pick.score) ? pick.score : null,
    factors: (pick.factors ?? {}) as never,
    horizon,
    evaluate_on: checkpointDate(horizon, day),
    outcome: "pending",
  }));

  const { error } = await supabaseAdmin
    .from("research_horizon_predictions")
    .upsert(rows, { onConflict: "lane,ticker,prediction_date,horizon", ignoreDuplicates: true });
  if (error) {
    console.error("horizon predictions not recorded:", error.message);
    return 0;
  }
  return rows.length;
}

async function latestCloses(tickers: string[]): Promise<Map<string, { date: string; close: number }>> {
  const out = new Map<string, { date: string; close: number }>();
  if (tickers.length === 0) return out;
  const { data } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker, bar_date, close")
    .in("ticker", tickers)
    .order("bar_date", { ascending: true });
  for (const row of data ?? []) {
    out.set(String(row.ticker), { date: String(row.bar_date), close: Number(row.close) });
  }
  return out;
}

/**
 * Fills in the real outcome for every prediction whose horizon date has passed.
 * Appends only — the prediction fields stay exactly as they were written.
 */
export async function evaluateDueHorizons(): Promise<{ evaluated: number; waiting: number }> {
  const day = today();
  const { data: due } = await supabaseAdmin
    .from("research_horizon_predictions")
    .select("*")
    .eq("outcome", "pending")
    .lte("evaluate_on", day)
    .limit(500);
  const rows = due ?? [];
  if (rows.length === 0) return { evaluated: 0, waiting: 0 };

  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("market_proxy")
    .eq("id", 1)
    .maybeSingle();
  const proxy = String(settings?.market_proxy ?? "SPY").toUpperCase();

  const tickers = Array.from(new Set([...rows.map((r) => String(r.ticker)), proxy]));
  const marks = await latestCloses(tickers);

  let evaluated = 0;
  let waiting = 0;
  for (const row of rows) {
    const mark = marks.get(String(row.ticker));
    // No usable price: after a month of grace the prediction is closed out as
    // "insufficient data" rather than pretending to a result.
    if (!mark || mark.date < String(row.evaluate_on)) {
      const graceOver = addCalendarMonths(String(row.evaluate_on), 1) < day;
      if (!graceOver) {
        waiting += 1;
        continue;
      }
      await supabaseAdmin
        .from("research_horizon_predictions")
        .update({
          outcome: "insufficient_data",
          evaluated_at: new Date().toISOString(),
          note: "No price history was available for this horizon.",
        })
        .eq("id", row.id)
        .eq("outcome", "pending");
      evaluated += 1;
      continue;
    }

    const entry = Number(row.entry_price);
    const exit = mark.close;
    const returnPct = entry > 0 ? Number((((exit / entry) - 1) * 100).toFixed(4)) : 0;
    const { error } = await supabaseAdmin
      .from("research_horizon_predictions")
      .update({
        outcome: returnPct > 0 ? "win" : "loss",
        successful: returnPct > 0,
        exit_price: exit,
        return_pct: returnPct,
        evaluated_at: new Date().toISOString(),
        note: `Evaluated at the ${horizonLabel(String(row.horizon))} mark using the ${mark.date} close.`,
      })
      .eq("id", row.id)
      .eq("outcome", "pending");
    if (!error) evaluated += 1;
  }
  return { evaluated, waiting };
}

// ------------------------------------------------------- the Top 10 board ----

export interface LongTermCandidate {
  rank: number;
  ticker: string;
  horizon: string;
  horizon_label: string;
  researcher: string;
  lane: string;
  formula_version: string | null;
  predicted_on: string;
  entry_price: number;
  current_price: number | null;
  move_pct: number | null;
  quality: number;
  sample_size: number;
  win_rate: number | null;
  average_return: number | null;
  insufficient_data: boolean;
  evidence: string;
}

export interface LongTermBoard {
  as_of: string;
  candidates: LongTermCandidate[];
  /** Internal sanity check — never used to reshuffle the ranking. */
  concentration: {
    counts: Record<string, number>;
    dominant: string | null;
    concentrated: boolean;
    note: string | null;
  };
  total_predictions: number;
}

export interface ResearcherHorizonWinRate {
  horizon: "1M" | "3M" | "9M";
  wins: number;
  completed: number;
  win_rate: number | null;
}

/**
 * Completed long-term prediction accuracy for each researcher, kept separate
 * by horizon. These are research outcomes, never accumulated trading P/L.
 */
export async function researcherLongTermWinRates(): Promise<
  Record<string, ResearcherHorizonWinRate[]>
> {
  const { data, error } = await supabaseAdmin
    .from("research_horizon_predictions")
    .select("lane, horizon, successful")
    .in("horizon", [...LONG_TERM_RESEARCH_HORIZONS])
    .not("successful", "is", null)
    .limit(10000);
  if (error) throw new Error(error.message);

  const totals = new Map<string, { wins: number; completed: number }>();
  for (const row of data ?? []) {
    const key = `${String(row.lane)}|${String(row.horizon)}`;
    const current = totals.get(key) ?? { wins: 0, completed: 0 };
    current.completed += 1;
    if (row.successful === true) current.wins += 1;
    totals.set(key, current);
  }

  const lanes = Array.from(new Set((data ?? []).map((row) => String(row.lane))));
  return Object.fromEntries(
    lanes.map((lane) => [
      lane,
      LONG_TERM_RESEARCH_HORIZONS.map((horizon) => {
        const total = totals.get(`${lane}|${horizon}`) ?? { wins: 0, completed: 0 };
        return {
          horizon,
          wins: total.wins,
          completed: total.completed,
          win_rate:
            total.completed > 0
              ? Number(((total.wins / total.completed) * 100).toFixed(1))
              : null,
        };
      }),
    ]),
  );
}

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * The current long-term Top 10. 1-month, 3-month and 9-month candidates compete
 * in one list, ranked purely on how good their research evidence is.
 *
 * No horizon gets a bonus or a penalty: performance is compared only against
 * OTHER candidates at the same horizon (a z-score inside its own cohort), so a
 * horizon cannot win just because its results arrive sooner or more often.
 */
export async function longTermTopTen(): Promise<LongTermBoard> {
  const { data } = await supabaseAdmin
    .from("research_horizon_predictions")
    .select("*")
    .order("prediction_date", { ascending: false })
    .limit(4000);
  const rows = data ?? [];
  const day = today();

  // Evidence is grouped by the researcher + horizon that produced it.
  type Cohort = {
    returns: number[];
    wins: number;
    evaluated: number;
    total: number;
  };
  const cohorts = new Map<string, Cohort>();
  const cohortKey = (lane: string, horizon: string) => `${lane}|${horizon}`;
  for (const row of rows) {
    const key = cohortKey(String(row.lane), String(row.horizon));
    const cohort = cohorts.get(key) ?? { returns: [], wins: 0, evaluated: 0, total: 0 };
    cohort.total += 1;
    if (row.return_pct !== null && row.return_pct !== undefined) {
      cohort.returns.push(Number(row.return_pct));
      cohort.evaluated += 1;
      if (row.successful) cohort.wins += 1;
    }
    cohorts.set(key, cohort);
  }

  const mean = (list: number[]) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  const stdev = (list: number[]) => {
    if (list.length < 2) return 0;
    const m = mean(list);
    return Math.sqrt(mean(list.map((v) => (v - m) ** 2)));
  };

  // Per-horizon reference points, so each horizon is judged against its peers.
  const perHorizon = new Map<string, { mu: number; sd: number }>();
  for (const horizon of LONG_TERM_RESEARCH_HORIZONS) {
    const means: number[] = [];
    for (const [key, cohort] of cohorts) {
      if (!key.endsWith(`|${horizon}`) || cohort.evaluated === 0) continue;
      means.push(mean(cohort.returns));
    }
    perHorizon.set(horizon, { mu: mean(means), sd: stdev(means) || 1 });
  }

  // One candidate per ticker + horizon: the most recent live prediction.
  const latest = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (String(row.outcome) === "insufficient_data") continue;
    // A candidate needs at least a one-month horizon to qualify here.
    if (!LONG_TERM_RESEARCH_HORIZONS.includes(String(row.horizon) as never)) continue;
    const key = `${String(row.ticker)}|${String(row.horizon)}`;
    const held = latest.get(key);
    if (!held || String(row.prediction_date) > String(held['prediction_date'])) {
      latest.set(key, row as unknown as Record<string, unknown>);
    }
  }

  const marks = await latestCloses(
    Array.from(new Set([...latest.values()].map((r) => String(r['ticker'])))),
  );

  const scored = [...latest.values()].map((row) => {
    const lane = String(row['lane']);
    const horizon = String(row['horizon']);
    const cohort = cohorts.get(cohortKey(lane, horizon)) ?? {
      returns: [],
      wins: 0,
      evaluated: 0,
      total: 0,
    };
    const ref = perHorizon.get(horizon) ?? { mu: 0, sd: 1 };
    const avg = cohort.evaluated ? mean(cohort.returns) : null;
    const winRate = cohort.evaluated ? cohort.wins / cohort.evaluated : null;

    const entry = Number(row['entry_price']);
    const mark = marks.get(String(row['ticker']))?.close ?? null;
    const movePct = mark && entry > 0 ? Number((((mark / entry) - 1) * 100).toFixed(2)) : null;

    // Quality of the evidence, not the speed of the horizon.
    const performance = logistic((avg === null ? 0 : (avg - ref.mu) / ref.sd));
    const consistency = winRate ?? 0.5;
    const sample = cohort.evaluated / (cohort.evaluated + 3);
    const maturity = cohort.total > 0 ? cohort.evaluated / cohort.total : 0;
    const risk = 1 / (1 + stdev(cohort.returns) / 5);
    const continued = logistic((movePct ?? 0) / 8);
    const quality =
      100 *
      (0.28 * performance +
        0.2 * consistency +
        0.16 * sample +
        0.1 * maturity +
        0.14 * risk +
        0.12 * continued);

    const insufficient = cohort.evaluated < 3;
    return {
      ticker: String(row['ticker']),
      horizon,
      horizon_label: horizonLabel(horizon),
      researcher: String(row['researcher_name']),
      lane,
      formula_version: (row['formula_version'] as string | null) ?? null,
      predicted_on: String(row['prediction_date']),
      entry_price: entry,
      current_price: mark,
      move_pct: movePct,
      quality: Number(quality.toFixed(1)),
      sample_size: cohort.evaluated,
      win_rate: winRate === null ? null : Number((winRate * 100).toFixed(1)),
      average_return: avg === null ? null : Number(avg.toFixed(2)),
      insufficient_data: insufficient,
      evidence: insufficient
        ? `Only ${cohort.evaluated} finished ${horizonLabel(horizon)} test(s) so far — not enough evidence yet.`
        : `${cohort.evaluated} finished ${horizonLabel(horizon)} test(s), ${Math.round((winRate ?? 0) * 100)}% positive, ${avg! >= 0 ? "+" : ""}${avg!.toFixed(2)}% average.`,
    };
  });

  scored.sort((a, b) => b.quality - a.quality || a.ticker.localeCompare(b.ticker));
  const candidates: LongTermCandidate[] = scored
    .slice(0, 10)
    .map((row, index) => ({ rank: index + 1, ...row }));

  const counts: Record<string, number> = { "1M": 0, "3M": 0, "9M": 0 };
  for (const row of candidates) counts[row.horizon] = (counts[row.horizon] ?? 0) + 1;
  const dominantEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? null;
  const dominant = dominantEntry && dominantEntry[1] > 0 ? dominantEntry[0] : null;
  const concentrated = candidates.length >= 5 && !!dominantEntry && dominantEntry[1] / candidates.length >= 0.8;

  return {
    as_of: day,
    candidates,
    concentration: {
      counts,
      dominant,
      concentrated,
      note: concentrated
        ? `These rankings are currently concentrated in ${horizonLabel(dominant!)} candidates (${dominantEntry![1]} of ${candidates.length}). The list has not been adjusted for that.`
        : null,
    },
    total_predictions: rows.length,
  };
}

/**
 * What the accumulated research says about holding a ticker longer, used by the
 * review notifications. Returns null when there simply is not enough evidence.
 */
export async function horizonRecommendation(ticker: string): Promise<{
  best_horizon: string | null;
  best_label: string | null;
  sample_size: number;
  win_rate: number | null;
  average_return: number | null;
  supported: boolean;
  summary: string;
}> {
  const { data } = await supabaseAdmin
    .from("research_horizon_predictions")
    .select("horizon, return_pct, successful")
    .eq("ticker", ticker.toUpperCase())
    .not("return_pct", "is", null)
    .limit(400);
  const rows = data ?? [];
  if (rows.length < 3) {
    return {
      best_horizon: null,
      best_label: null,
      sample_size: rows.length,
      win_rate: null,
      average_return: null,
      supported: false,
      summary: `There is not enough long-term research data on ${ticker.toUpperCase()} yet to make a recommendation.`,
    };
  }
  let best: { horizon: string; avg: number; wins: number; n: number } | null = null;
  for (const horizon of LONG_TERM_RESEARCH_HORIZONS) {
    const subset = rows.filter((r) => String(r.horizon) === horizon);
    if (subset.length === 0) continue;
    const avg = subset.reduce((a, r) => a + Number(r.return_pct), 0) / subset.length;
    const wins = subset.filter((r) => r.successful).length;
    if (!best || avg > best.avg) best = { horizon, avg, wins, n: subset.length };
  }
  if (!best) {
    return {
      best_horizon: null,
      best_label: null,
      sample_size: rows.length,
      win_rate: null,
      average_return: null,
      supported: false,
      summary: `There is not enough long-term research data on ${ticker.toUpperCase()} yet to make a recommendation.`,
    };
  }
  const winRate = Number(((best.wins / best.n) * 100).toFixed(1));
  const supported = best.avg > 0 && best.n >= 3;
  return {
    best_horizon: best.horizon,
    best_label: horizonLabel(best.horizon),
    sample_size: best.n,
    win_rate: winRate,
    average_return: Number(best.avg.toFixed(2)),
    supported,
    summary: supported
      ? `Research so far has been strongest for ${ticker.toUpperCase()} over ${horizonLabel(best.horizon)} (${best.n} finished tests, ${winRate}% positive, ${best.avg >= 0 ? "+" : ""}${best.avg.toFixed(2)}% average).`
      : `Current research no longer supports the original long-term case for ${ticker.toUpperCase()} (${best.n} finished tests, ${winRate}% positive).`,
  };
}
