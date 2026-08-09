import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

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
  .middleware([requireGate])
  .inputValidator((input) => z.object({ date: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { cacheOneDay } = await import("./scan.server");
    return cacheOneDay(data.date);
  });

export const runScanNow = createServerFn({ method: "POST" })
  .middleware([requireGate]).handler(async () => {
  const { runScan } = await import("./scan.server");
  return runScan();
});

export const setWatchlist = createServerFn({ method: "POST" })
  .middleware([requireGate])
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
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ amount: z.number(), note: z.string().max(200).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { addFunds } = await import("./scan.server");
    return addFunds(data.amount, data.note);
  });

export const createTrade = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        ticker: z.string().min(1).max(10),
        kind: z.enum(["day", "swing"]),
        entry_price: z.number().positive(),
        dollars: z.number().positive(),
        mode: z.enum(["paper", "live"]).default("paper"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { openTrade } = await import("./scan.server");
    return openTrade(data);
  });

export const exitTrade = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), exit_price: z.number().positive() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { closeTrade } = await import("./scan.server");
    return closeTrade(data);
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireGate])
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
        paper_mode: z.boolean().optional(),
        auto_run: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./scan.server");
    return updateSettings(data);
  });

export const runCycleNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ force: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { runDailyCycle } = await import("./scan.server");
    return runDailyCycle({ force: data.force });
  });

export const simulateNow = createServerFn({ method: "POST" })
  .middleware([requireGate]).handler(async () => {
  const { managePaperTrades } = await import("./scan.server");
  return managePaperTrades();
});

export const runPreOpen = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ force: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { runPreOpenEntries } = await import("./scan.server");
    return runPreOpenEntries({ force: data.force });
  });

export const runPreClose = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ force: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { runPreCloseExits } = await import("./scan.server");
    return runPreCloseExits({ force: data.force });
  });

export const getPushKey = createServerFn({ method: "GET" }).handler(async () => {
  const { pushPublicKey } = await import("./notify.server");
  return { public_key: pushPublicKey() };
});

export const savePushDevice = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        endpoint: z.string().url().max(1000),
        p256dh: z.string().min(10).max(400),
        auth: z.string().min(4).max(200),
        label: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          label: data.label,
          failures: 0,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushDevice = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ endpoint: z.string().url().max(1000) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireGate]).handler(async () => {
  const { pushToDevices } = await import("./notify.server");
  return pushToDevices({
    title: "ASTR test alert",
    body: "Push notifications are working on this device.",
    url: "/notifications",
    tag: "test",
  });
});

export const markNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const { markAllRead } = await import("./notify.server");
  return markAllRead();
});

export const refreshInsights = createServerFn({ method: "POST" })
  .middleware([requireGate]).handler(async () => {
  const { generateInsights } = await import("./notify.server");
  const { marketStatus } = await import("./market-calendar");
  const created = await generateInsights(marketStatus().nyDate);
  return { created };
});

export const getThemeSignals = createServerFn({ method: "GET" }).handler(async () => {
  const { themeSignals } = await import("./notify.server");
  return themeSignals();
});

export const runStrategyLab = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        sessions: z.number().int().min(3).max(40).default(12),
        universe: z.number().int().min(50).max(1500).default(400),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { backtestStrategies } = await import("./strategy.server");
    return backtestStrategies(data.sessions, data.universe);
  });

// ------------------------------------------------- prices, trades, health ----

export const getLatestPrice = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ ticker: z.string().min(1).max(10) }).parse(input))
  .handler(async ({ data }) => {
    const { latestClose } = await import("./scan.server");
    return latestClose(data.ticker);
  });

export const cancelOpenTrade = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { cancelTrade } = await import("./scan.server");
    return cancelTrade(data);
  });

export const checkDataKey = createServerFn({ method: "GET" }).handler(async () => {
  const { verifyProviderKey } = await import("./market-data.server");
  const { loadSettings } = await import("./scan.server");
  const settings = await loadSettings();
  return verifyProviderKey(settings.provider as "polygon" | "alpaca");
});

export const runHealthNow = createServerFn({ method: "POST" })
  .middleware([requireGate]).handler(async () => {
  const { runHealthCheck } = await import("./health.server");
  return runHealthCheck();
});

// ------------------------------------------------------------- strategies ----

export const getStrategies = createServerFn({ method: "GET" }).handler(async () => {
  const { listStrategies } = await import("./strategies.server");
  return listStrategies();
});

export const useStrategy = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { activateStrategy } = await import("./strategies.server");
    return activateStrategy(data.id);
  });

export const toggleStrategy = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { setStrategyEnabled } = await import("./strategies.server");
    return setStrategyEnabled(data.enabled);
  });

export const saveStrategy = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({ name: z.string().min(2).max(60), description: z.string().max(500).default("") })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveCurrentStrategy } = await import("./strategies.server");
    return saveCurrentStrategy(data.name, data.description);
  });

export const removeStrategy = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { deleteStrategy } = await import("./strategies.server");
    return deleteStrategy(data.id);
  });

export const saveNotifyPrefs = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        notify_push: z.boolean().optional(),
        notify_day_pick: z.boolean().optional(),
        notify_swing: z.boolean().optional(),
        notify_theme: z.boolean().optional(),
        notify_trades: z.boolean().optional(),
        notify_health: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./scan.server");
    return updateSettings(data as Record<string, unknown>);
  });
