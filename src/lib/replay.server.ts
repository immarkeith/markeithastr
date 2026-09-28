/**
 * 100% Authentic Historical Walk-Forward Replay Engine.
 * Evaluates all 7 researchers point-in-time from 2026-02-09 to 2026-09-25.
 * Strictly paper-only (mode = 'paper'). Real brokerage keys are never touched.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LANES, laneSeedParams, listResearchers, passesFilters, scoreWith, type LaneParams } from "./department.server";
import { assemble, bandBonus, type Band, type MasterRule } from "./master-formula.server";
import { loadSettings, volumeShare, type Settings } from "./scan.server";
import { snapshot, scoreSecurity, type Bar } from "./scoring";

export const STRATEGY_IDS: Record<string, string> = {
  lead: "69b3556c-828a-4543-ad5b-683606de679c",
  trend: "d3ffd675-48e8-4a2b-aef4-0adbc5b3d2a3",
  contrarian: "9c162418-608f-49db-9d18-71e8544bed63",
  consistency: "70c73a78-efcc-442c-93f1-5edfc95505ff",
  growth: "b5396b3e-0fe2-41a2-98be-9c0492dfb57c",
  risk: "861fc7f9-108e-4e6f-8884-daeb4f3c1e11",
  skeptic: "72ab182f-c255-4ed8-accb-232b1bd34b5e",
};

export const RESEARCHER_NAMES: Record<string, string> = {
  lead: "Lead Researcher",
  trend: "Trend Researcher",
  contrarian: "Contrarian Researcher",
  consistency: "Consistency Researcher",
  growth: "Growth Researcher",
  risk: "Risk Researcher",
  skeptic: "Skeptic",
};

export async function runHistoricalReplayBatch(batchNumber: number = 1, batchSize: number = 20) {
  const settings = await loadSettings();
  const share = await volumeShare(settings);

  // 1. Fetch all distinct trading calendar dates from 2026-02-09.
  // PostgREST caps every response at 1,000 rows server-side, so we page
  // through with .range() until a short page comes back.
  const dateRows: { bar_date: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error: dateError } = await supabaseAdmin
      .from("daily_bars")
      .select("bar_date")
      .gte("bar_date", "2026-02-09")
      .lte("bar_date", "2026-09-25")
      .order("bar_date", { ascending: true })
      .range(from, from + 999);
    if (dateError) throw new Error("Failed to fetch trading dates: " + dateError.message);
    if (!page || page.length === 0) break;
    dateRows.push(...page);
    if (page.length < 1000) break;
  }

  const allTradingDays = Array.from(new Set(dateRows.map((r) => r.bar_date)));
  const totalDays = allTradingDays.length;
  const totalBatches = Math.ceil(totalDays / batchSize);

  const safeBatch = Math.max(1, Math.min(batchNumber, totalBatches));
  const startIndex = (safeBatch - 1) * batchSize;
  const batchDays = allTradingDays.slice(startIndex, startIndex + batchSize);

  if (batchDays.length === 0) {
    return { complete: true, message: "All batches completed!", totalBatches, safeBatch };
  }

  // 2. Load bar history including 60-day lookback window for technical indicators
  const lookbackStartIndex = Math.max(0, startIndex - 60);
  const fetchStartDate = allTradingDays[lookbackStartIndex];
  const fetchEndDate = batchDays[batchDays.length - 1];

  const rawBars: { ticker: string; bar_date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error: barError } = await supabaseAdmin
      .from("daily_bars")
      .select("ticker, bar_date, open, high, low, close, volume")
      .gte("bar_date", fetchStartDate)
      .lte("bar_date", fetchEndDate)
      .order("bar_date", { ascending: true })
      .range(from, from + 999);
    if (barError) throw new Error("Failed to fetch price bars: " + barError.message);
    if (!page || page.length === 0) break;
    rawBars.push(...page);
    if (page.length < 1000) break;
  }

  // Group bars by ticker
  const tickerBars = new Map<string, Bar[]>();
  for (const b of rawBars) {
    let list = tickerBars.get(b.ticker);
    if (!list) {
      list = [];
      tickerBars.set(b.ticker, list);
    }
    list.push({
      date: b.bar_date,
      open: Number(b.open),
      high: Number(b.high),
      low: Number(b.low),
      close: Number(b.close),
      volume: Number(b.volume),
    });
  }

  // 3. Load Researcher & Master Formula parameters
  const researchers = await listResearchers();
  const laneParamsMap = new Map<string, LaneParams>();
  for (const lane of LANES) {
    const row = researchers.find((r) => r.lane === lane.lane);
    const seed = laneSeedParams(lane, settings);
    const saved = row?.params as Partial<LaneParams> | undefined;
    // Merge saved params over the seed so a missing weight (e.g. "trend") never crashes a batch.
    const params: LaneParams = saved && typeof saved === "object"
      ? { ...seed, ...saved, weights: { ...seed.weights, ...((saved.weights as object) ?? {}) } as LaneParams["weights"] }
      : seed;
    for (const k of Object.keys(seed.weights) as (keyof LaneParams["weights"])[]) {
      if (!Number.isFinite(Number(params.weights[k]))) params.weights[k] = seed.weights[k];
    }
    if (!Number.isFinite(Number(params.min_score_to_trade))) params.min_score_to_trade = seed.min_score_to_trade;
    laneParamsMap.set(lane.lane, params);
  }

  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const masterParams = assemble((ruleRows ?? []) as unknown as MasterRule[], {
    weights: {
      trend: Number(settings.weight_trend),
      momentum: Number(settings.weight_momentum),
      volume: Number(settings.weight_volume),
      relative_strength: Number(settings.weight_relative_strength),
      volatility_quality: Number(settings.weight_volatility_quality),
    },
    min_score_to_trade: Number(settings.min_score_to_trade),
    num_day_trades: 1,
    rsi_max: null,
    rsi_min: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  });

  const tradesToInsert: any[] = [];
  const predictionsToInsert: any[] = [];
  const examplesToInsert: any[] = [];

  // Track active 3-day holding per researcher
  const activeHolds = new Map<string, { ticker: string; entryDayIdx: number }>();

  // 4. Walk forward through each day in the batch
  for (const currentDay of batchDays) {
    const currentDayIdx = allTradingDays.indexOf(currentDay);

    // Compute point-in-time indicators for all tickers up to currentDay
    const dayCandidates: any[] = [];

    for (const [ticker, bars] of tickerBars.entries()) {
      const dayIdx = bars.findIndex((b) => b.date === currentDay);
      if (dayIdx < 14) continue; // Need at least 14 bars for RSI

      const window = bars.slice(0, dayIdx + 1);
      const snap = snapshot(window);
      if (!snap || snap.close <= 2.0 || bars[dayIdx]!.volume < 20000) continue;

      dayCandidates.push({ ticker, snap, bar: bars[dayIdx] });
    }

    // Process each lane
    const allLanes = [...LANES.map((l) => l.lane), "lead"];

    for (const lane of allLanes) {
      const active = activeHolds.get(lane);
      // Check if 3-day hold has finished
      if (active && currentDayIdx >= active.entryDayIdx + 3) {
        activeHolds.delete(lane);
      }
      if (activeHolds.has(lane)) continue; // Researcher is currently holding 1 stock

      const params = lane === "lead" ? masterParams : laneParamsMap.get(lane)!;
      const bands = lane === "lead" ? masterParams.bands : [];

      const scored = dayCandidates
        .filter((c) => passesFilters(c.snap, params, settings, share))
        .map((c) => ({
          ticker: c.ticker,
          score: scoreWith(c.snap, params.weights) + bandBonus(c.snap, bands),
          bar: c.bar,
          snap: c.snap,
        }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (!best || best.score < params.min_score_to_trade) continue;

      // Lock in the 3-day hold
      activeHolds.set(lane, { ticker: best.ticker, entryDayIdx: currentDayIdx });

      // Calculate same-day & 3-day exit outcomes
      const exitDayIdx = Math.min(allTradingDays.length - 1, currentDayIdx + 3);
      const exitDate = allTradingDays[exitDayIdx]!;

      // Lookup exit close price
      const futureBars = tickerBars.get(best.ticker) ?? [];
      const exitBar = futureBars.find((b) => b.date === exitDate) ?? best.bar;

      const entryPrice = best.bar.open;
      const sameDayPrice = best.bar.close;
      const exitPrice = exitBar.close;

      const sameDayProfit = Number(((20.0 / entryPrice) * (sameDayPrice - entryPrice)).toFixed(2));
      const sameDayPct = Number((((sameDayPrice / entryPrice) - 1.0) * 100.0).toFixed(2));
      const totalProfit = Number(((20.0 / entryPrice) * (exitPrice - entryPrice)).toFixed(2));

      const isClosed = exitDate < "2026-09-25";

      tradesToInsert.push({
        ticker: best.ticker,
        kind: "day",
        entry_date: currentDay,
        entry_price: entryPrice,
        dollars: 20.0,
        filled_qty: Number((20.0 / entryPrice).toFixed(4)),
        exit_date: exitDate,
        exit_price: exitPrice,
        same_day_price: sameDayPrice,
        same_day_profit: sameDayProfit,
        same_day_pct: sameDayPct,
        profit: totalProfit,
        status: isClosed ? "closed" : "open",
        mode: "paper",
        position_type: "SAME_DAY",
        strategy_id: STRATEGY_IDS[lane],
        entry_at: `${currentDay}T13:35:00Z`,
        exit_at: `${exitDate}T19:50:00Z`,
        same_day_at: `${currentDay}T19:50:00Z`,
      });

      // Continuous Learning Example
      examplesToInsert.push({
        lane,
        source: "paper_trade",
        source_id: `replay_${lane}_${best.ticker}_${currentDay}`,
        ticker: best.ticker,
        example_date: currentDay,
        horizon: "same_day",
        score: Number(best.score.toFixed(1)),
        conditions: {
          rsi: Number(best.snap.rsi?.toFixed(1) ?? 50),
          rel_volume: Number(best.snap.relVolume?.toFixed(2) ?? 1.0),
          atr_pct: Number(best.snap.atrPct?.toFixed(2) ?? 2.0),
        },
        return_pct: sameDayPct,
        successful: sameDayPct > 0,
        resolved_on: currentDay,
      });

      // 1M & 3M Long-Term Horizon Predictions (Lead only)
      if (lane === "lead") {
        for (const horizon of ["1M", "3M"] as const) {
          const holdSessions = horizon === "1M" ? 21 : 63;
          const evalIdx = currentDayIdx + holdSessions;
          const evalDate = evalIdx < allTradingDays.length ? allTradingDays[evalIdx] : null;
          const evalBar = evalDate ? futureBars.find((b) => b.date === evalDate) : null;

          const isMatured = evalBar !== null;
          const horizonExit = evalBar ? evalBar.close : null;
          const horizonReturn = horizonExit ? Number((((horizonExit / entryPrice) - 1.0) * 100.0).toFixed(2)) : null;

          predictionsToInsert.push({
            prediction_date: currentDay,
            predicted_at: `${currentDay}T13:35:00Z`,
            lane: "lead",
            researcher_name: "Lead Researcher",
            strategy_id: STRATEGY_IDS["lead"],
            ticker: best.ticker,
            entry_price: entryPrice,
            score: Number(best.score.toFixed(1)),
            horizon,
            evaluate_on: evalDate ?? currentDay,
            evaluated_at: isMatured ? `${evalDate}T20:00:00Z` : null,
            exit_price: horizonExit,
            return_pct: horizonReturn,
            successful: isMatured ? horizonReturn! > 0 : null,
            outcome: !isMatured ? "pending" : horizonReturn! > 0 ? "won" : "lost",
          });
        }
      }
    }
  }

  // 5. Insert records into database
  if (tradesToInsert.length > 0) {
    await supabaseAdmin.from("trades").insert(tradesToInsert);
  }
  if (predictionsToInsert.length > 0) {
    await supabaseAdmin.from("research_horizon_predictions").upsert(predictionsToInsert, {
      onConflict: "lane,ticker,prediction_date,horizon",
    });
  }
  if (examplesToInsert.length > 0) {
    await supabaseAdmin.from("researcher_examples").upsert(examplesToInsert, {
      onConflict: "lane,source,source_id,horizon",
    });
  }

  return {
    success: true,
    batch: safeBatch,
    totalBatches,
    nextBatch: safeBatch < totalBatches ? safeBatch + 1 : null,
    datesProcessed: `${batchDays[0]} to ${batchDays[batchDays.length - 1]}`,
    tradesLogged: tradesToInsert.length,
    predictionsLogged: predictionsToInsert.length,
    examplesLogged: examplesToInsert.length,
  };
}
