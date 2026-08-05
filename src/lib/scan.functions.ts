import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getBarStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { barCoverage, missingDates } = await import("./scan.server");
  const coverage = await barCoverage();
  const missing = await missingDates();
  return {
    days_cached: coverage.length,
    newest: coverage[0]?.bar_date ?? null,
    oldest: coverage[coverage.length - 1]?.bar_date ?? null,
    tickers_latest: coverage[0]?.ticker_count ?? 0,
    missing,
  };
});

export const cacheDay = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ date: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { cacheOneDay } = await import("./scan.server");
    return cacheOneDay(data.date);
  });

export const runScanNow = createServerFn({ method: "POST" }).handler(async () => {
  const { runScan } = await import("./scan.server");
  return runScan();
});

export const setWatchlist = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        ticker: z.string().min(1),
        status: z.enum(["watching", "suggested", "approved", "rejected"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { setWatchlistStatus } = await import("./scan.server");
    return setWatchlistStatus(data.ticker, data.status);
  });

export const recordFunds = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ amount: z.number(), note: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { addFunds } = await import("./scan.server");
    return addFunds(data.amount, data.note);
  });

export const createTrade = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        ticker: z.string().min(1).max(10),
        kind: z.enum(["day", "swing"]),
        entry_price: z.number().positive(),
        dollars: z.number().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { openTrade } = await import("./scan.server");
    return openTrade(data);
  });

export const exitTrade = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), exit_price: z.number().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { closeTrade } = await import("./scan.server");
    return closeTrade(data);
  });

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        provider: z.enum(["polygon", "alpaca"]).optional(),
        min_price: z.number().min(0).optional(),
        min_avg_dollar_volume: z.number().min(0).optional(),
        weight_trend: z.number().min(0).max(100).optional(),
        weight_momentum: z.number().min(0).max(100).optional(),
        weight_volume: z.number().min(0).max(100).optional(),
        weight_relative_strength: z.number().min(0).max(100).optional(),
        weight_volatility_quality: z.number().min(0).max(100).optional(),
        min_score_to_trade: z.number().min(0).max(100).optional(),
        num_day_trades: z.number().int().min(0).max(10).optional(),
        dollars_per_day_trade: z.number().min(0).optional(),
        profit_keep_pct: z.number().min(0).max(1).optional(),
        settlement_days: z.number().int().min(0).max(5).optional(),
        streak_suggest_days: z.number().int().min(1).max(30).optional(),
        swing_dollars: z.number().min(0).optional(),
        swing_max_hold_days: z.number().int().min(1).max(60).optional(),
        market_proxy: z.string().min(1).max(10).optional(),
        max_universe: z.number().int().min(50).max(3000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./scan.server");
    return updateSettings(data);
  });
