/**
 * Read-only, advisory capital analysis built from completed paper research.
 * It never writes settings, trades, orders, position sizes, or research rows.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  CAPITAL_ANALYSIS_REQUIREMENTS,
  CAPITAL_ANALYSIS_TARGET_YEARLY,
  type CapitalAnalysisResult,
  type CapitalProgressItem,
  type CapitalStrategyEvidence,
} from "./capital-analysis";

type SameDayRow = {
  strategy_id: string;
  entry_date: string;
  same_day_pct: number;
};

type LongTermRow = {
  horizon: "1M" | "3M" | "9M";
  prediction_date: string;
  evaluated_at: string | null;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

async function allRows<T>(makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function strategyEvidence(input: {
  lane: string;
  strategyId: string;
  name: string;
  rows: SameDayRow[];
  researchDays: number;
}): CapitalStrategyEvidence {
  const ordered = [...input.rows].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const returns = ordered.map((row) => Number(row.same_day_pct));
  const winners = returns.filter((value) => value > 0);
  const losers = returns.filter((value) => value <= 0);

  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let losingStreak = 0;
  let longestLosingStreak = 0;
  for (const value of returns) {
    equity *= 1 + value / 100;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak > 0 ? ((peak - equity) / peak) * 100 : 0);
    if (value <= 0) {
      losingStreak += 1;
      longestLosingStreak = Math.max(longestLosingStreak, losingStreak);
    } else {
      losingStreak = 0;
    }
  }

  const average = mean(returns);
  const frequency = input.researchDays > 0 ? returns.length / input.researchDays : 0;
  return {
    lane: input.lane,
    strategy_id: input.strategyId,
    name: input.name,
    trades: returns.length,
    wins: winners.length,
    losses: losers.length,
    win_rate: returns.length ? round((winners.length / returns.length) * 100, 1) : null,
    average_return_pct: average === null ? null : round(average, 3),
    average_winner_pct: winners.length ? round(mean(winners) ?? 0, 3) : null,
    average_loser_pct: losers.length ? round(mean(losers) ?? 0, 3) : null,
    cumulative_return_pct: returns.length ? round((equity - 1) * 100, 2) : null,
    max_drawdown_pct: returns.length ? round(maxDrawdown, 2) : null,
    longest_losing_streak: longestLosingStreak,
    trades_per_research_day: round(frequency, 3),
    observed_annual_return_pct:
      average === null ? null : round(average * frequency * 252, 2),
    first_result: ordered[0]?.entry_date ?? null,
    last_result: ordered[ordered.length - 1]?.entry_date ?? null,
  };
}

export async function capitalAnalysis(): Promise<CapitalAnalysisResult> {
  const [{ data: slots, error: slotError }, { data: settings, error: settingsError }] =
    await Promise.all([
      supabaseAdmin
        .from("paper_slots")
        .select("lane, strategy_id")
        .not("lane", "is", null)
        .not("strategy_id", "is", null),
      supabaseAdmin.from("app_settings").select("market_proxy").eq("id", 1).maybeSingle(),
    ]);
  if (slotError) throw new Error(slotError.message);
  if (settingsError) throw new Error(settingsError.message);

  const activeSlots = (slots ?? [])
    .map((row) => ({ lane: String(row.lane), strategyId: String(row.strategy_id) }))
    .filter((row) => row.lane && row.strategyId);
  const strategyIds = [...new Set(activeSlots.map((row) => row.strategyId))];

  const [{ data: strategyRows, error: strategyError }, sameDayRows, longTermRows] =
    await Promise.all([
      strategyIds.length
        ? supabaseAdmin.from("strategies").select("id, name").in("id", strategyIds)
        : Promise.resolve({ data: [], error: null }),
      strategyIds.length
        ? allRows<SameDayRow>((from, to) =>
            supabaseAdmin
              .from("trades")
              .select("strategy_id, entry_date, same_day_pct")
              .eq("mode", "paper")
              .in("strategy_id", strategyIds)
              .not("same_day_pct", "is", null)
              .order("entry_date", { ascending: true })
              .range(from, to) as unknown as PromiseLike<{
                data: SameDayRow[] | null;
                error: { message: string } | null;
              }>,
          )
        : Promise.resolve([]),
      allRows<LongTermRow>((from, to) =>
        supabaseAdmin
          .from("research_horizon_predictions")
          .select("horizon, prediction_date, evaluated_at")
          .in("horizon", ["1M", "3M", "9M"])
          .not("successful", "is", null)
          .order("prediction_date", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{
            data: LongTermRow[] | null;
            error: { message: string } | null;
          }>,
      ).catch(() => [] as LongTermRow[]),
    ]);
  if (strategyError) throw new Error(strategyError.message);

  const names = new Map((strategyRows ?? []).map((row) => [String(row.id), String(row.name)]));
  const researchDates = [...new Set(sameDayRows.map((row) => row.entry_date))].sort();
  const researchDays = researchDates.length;
  const strategies = activeSlots.map((slot) =>
    strategyEvidence({
      lane: slot.lane,
      strategyId: slot.strategyId,
      name: names.get(slot.strategyId) ?? slot.lane,
      rows: sameDayRows.filter((row) => row.strategy_id === slot.strategyId),
      researchDays,
    }),
  );

  const completed = {
    same_day: sameDayRows.length,
    "1M": longTermRows.filter((row) => row.horizon === "1M").length,
    "3M": longTermRows.filter((row) => row.horizon === "3M").length,
    "9M": longTermRows.filter((row) => row.horizon === "9M").length,
  };
  const progress: CapitalProgressItem[] = [
    { key: "same_day", label: "Same-Day", completed: completed.same_day, required: CAPITAL_ANALYSIS_REQUIREMENTS.same_day, met: completed.same_day >= CAPITAL_ANALYSIS_REQUIREMENTS.same_day },
    { key: "1M", label: "1 Month", completed: completed["1M"], required: CAPITAL_ANALYSIS_REQUIREMENTS["1M"], met: completed["1M"] >= CAPITAL_ANALYSIS_REQUIREMENTS["1M"] },
    { key: "3M", label: "3 Months", completed: completed["3M"], required: CAPITAL_ANALYSIS_REQUIREMENTS["3M"], met: completed["3M"] >= CAPITAL_ANALYSIS_REQUIREMENTS["3M"] },
    { key: "9M", label: "9 Months", completed: completed["9M"], required: CAPITAL_ANALYSIS_REQUIREMENTS["9M"], met: completed["9M"] >= CAPITAL_ANALYSIS_REQUIREMENTS["9M"] },
  ];

  const allDates = [
    ...researchDates,
    ...longTermRows.map((row) => row.prediction_date),
    ...longTermRows.map((row) => row.evaluated_at?.slice(0, 10) ?? "").filter(Boolean),
  ].sort();
  const firstResult = allDates[0] ?? null;
  const lastResult = allDates[allDates.length - 1] ?? null;

  const proxy = String(settings?.market_proxy ?? "SPY").toUpperCase();
  const { data: proxyRows, error: proxyError } = firstResult && lastResult
    ? await supabaseAdmin
        .from("daily_bars")
        .select("bar_date, close")
        .eq("ticker", proxy)
        .gte("bar_date", firstResult)
        .lte("bar_date", lastResult)
        .order("bar_date", { ascending: true })
        .limit(5000)
    : { data: [], error: null };
  if (proxyError) throw new Error(proxyError.message);

  let upSessions = 0;
  let downSessions = 0;
  let volatileSessions = 0;
  const marketRows = proxyRows ?? [];
  for (let index = 1; index < marketRows.length; index += 1) {
    const prior = Number(marketRows[index - 1]?.close ?? 0);
    const current = Number(marketRows[index]?.close ?? 0);
    if (!prior || !current) continue;
    const move = ((current / prior) - 1) * 100;
    if (move > 0.5) upSessions += 1;
    if (move < -0.5) downSessions += 1;
    if (Math.abs(move) >= 1.5) volatileSessions += 1;
  }
  const varied = marketRows.length >= 40 && upSessions >= 5 && downSessions >= 5 && volatileSessions >= 1;

  const usableAnnualRates = strategies
    .map((strategy) => strategy.observed_annual_return_pct)
    .filter((value): value is number => value !== null);
  const annualRate = mean(usableAnnualRates);
  const status = progress.every((item) => item.met) ? "ready" : "collecting";

  return {
    status,
    target_yearly: CAPITAL_ANALYSIS_TARGET_YEARLY,
    target_monthly: round(CAPITAL_ANALYSIS_TARGET_YEARLY / 12),
    progress,
    completed,
    research_days: researchDays,
    first_result: firstResult,
    last_result: lastResult,
    market_coverage: {
      sessions: marketRows.length,
      up_sessions: upSessions,
      down_sessions: downSessions,
      volatile_sessions: volatileSessions,
      varied,
      note: varied
        ? `The completed research spans ${marketRows.length} ${proxy} sessions with both rising, falling, and volatile conditions represented.`
        : `The completed research currently covers ${marketRows.length} ${proxy} sessions. The market sample is still narrow, so any eventual estimate needs extra caution even after the minimum counts are met.`,
    },
    observed_annual_return_pct: annualRate === null ? null : round(annualRate, 2),
    observed_monthly_return_pct: annualRate === null ? null : round(annualRate / 12, 2),
    strategies,
    assumptions: [
      "The $52,000 target is modeled across all selected bots, not guaranteed for each bot.",
      "Each bot is modeled with an equal share of capital and the equal-weight average of the included researchers' observed same-day results.",
      "Observed trade frequency is annualized over 252 market sessions; fees, slippage, taxes, capacity limits, and future market changes can reduce results.",
      "Long-term outcomes establish evidence maturity only. Their returns are not added together or treated as deployable profit.",
      "Paper results are research evidence, not a promise of future live performance.",
    ],
  };
}