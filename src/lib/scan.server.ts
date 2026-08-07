/**
 * Server-only scan + bookkeeping logic. Never import from client code.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {
  alpacaBars,
  alpacaUniverse,
  polygonGroupedDay,
  recentWeekdays,
  type BarRow,
  type Provider,
} from "./market-data.server";
import { scoreSecurity, type Bar, type ScoreConfig } from "./scoring";

export interface Settings {
  provider: Provider;
  min_price: number;
  min_avg_dollar_volume: number;
  weight_trend: number;
  weight_momentum: number;
  weight_volume: number;
  weight_relative_strength: number;
  weight_volatility_quality: number;
  min_score_to_trade: number;
  num_day_trades: number;
  dollars_per_day_trade: number;
  profit_keep_pct: number;
  settlement_days: number;
  streak_suggest_days: number;
  swing_dollars: number;
  swing_max_hold_days: number;
  market_proxy: string;
  max_universe: number;
  exit_buffer_minutes: number;
  preopen_recheck_minutes: number;
  notify_push: boolean;
}

export const HISTORY_DAYS = 70;

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data as unknown as Settings;
}

function scoreConfig(s: Settings): ScoreConfig {
  return {
    minPrice: Number(s.min_price),
    minAvgDollarVolume: Number(s.min_avg_dollar_volume),
    weights: {
      trend: Number(s.weight_trend),
      momentum: Number(s.weight_momentum),
      volume: Number(s.weight_volume),
      relative_strength: Number(s.weight_relative_strength),
      volatility_quality: Number(s.weight_volatility_quality),
    },
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ------------------------------------------------------------- bar cache ----

export async function barCoverage(): Promise<{ bar_date: string; ticker_count: number }[]> {
  const { data, error } = await supabaseAdmin.rpc("bar_dates_present");
  if (error) throw new Error(error.message);
  return (data ?? []) as { bar_date: string; ticker_count: number }[];
}

/** Weekdays in the lookback window that we have no cached bars for, oldest first. */
export async function missingDates(days = HISTORY_DAYS): Promise<string[]> {
  const coverage = await barCoverage();
  const present = new Set(coverage.filter((c) => c.ticker_count > 0).map((c) => c.bar_date));
  // Yesterday is the newest reliably-settled daily bar.
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  return recentWeekdays(days, end).filter((d) => !present.has(d));
}

async function replaceDay(date: string, rows: BarRow[]): Promise<number> {
  await supabaseAdmin.from("daily_bars").delete().eq("bar_date", date);
  const chunk = 2000;
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await supabaseAdmin.from("daily_bars").insert(rows.slice(i, i + chunk));
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

function liquidityPrefilter(rows: BarRow[], s: Settings): BarRow[] {
  const minPrice = Number(s.min_price);
  const minDollar = Number(s.min_avg_dollar_volume);
  const proxy = s.market_proxy.toUpperCase();
  const kept = rows.filter(
    (r) => r.ticker === proxy || (r.close >= minPrice && r.close * r.volume >= minDollar * 0.6),
  );
  kept.sort((a, b) => b.close * b.volume - a.close * a.volume);
  const cap = Math.max(50, Number(s.max_universe));
  const top = kept.slice(0, cap);
  if (!top.some((r) => r.ticker === proxy)) {
    const proxyRow = rows.find((r) => r.ticker === proxy);
    if (proxyRow) top.push(proxyRow);
  }
  return top;
}

/**
 * Cache bars for one trading day. On Polygon this is a single whole-market
 * request; on Alpaca it batches the active-equity shortlist.
 */
export async function cacheOneDay(date: string): Promise<{
  date: string;
  stored: number;
  trading_day: boolean;
}> {
  const s = await loadSettings();
  let rows: BarRow[];
  if (s.provider === "alpaca") {
    const universe = await alpacaUniverse(Math.max(50, Number(s.max_universe)));
    rows = (await alpacaBars(universe, date, date)).filter((r) => r.bar_date === date);
  } else {
    rows = await polygonGroupedDay(date);
  }
  if (rows.length === 0) return { date, stored: 0, trading_day: false };
  const kept = liquidityPrefilter(rows, s);
  const stored = await replaceDay(date, kept);
  return { date, stored, trading_day: true };
}

// ------------------------------------------------------------------ scan ----

type RawBars = [string, number, number, number, number, number][];

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

async function fetchScanPage(limit: number, offset: number) {
  const { data, error } = await supabaseAdmin.rpc("scan_input", {
    p_days: HISTORY_DAYS,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as { ticker: string; bars: RawBars }[];
}

function roc5(bars: Bar[]): number {
  const closes = bars.map((b) => b.close);
  const last = closes[closes.length - 1];
  const prior = closes[closes.length - 6];
  if (last === undefined || !prior) return 0;
  return ((last - prior) / prior) * 100;
}

export interface ScanRowOut {
  ticker: string;
  rank: number;
  score: number;
  close: number;
  sma20: number | null;
  tradeable: boolean;
  factors: Record<string, unknown>;
  invalidation: string;
}

export async function runScan(): Promise<{
  run_id: string;
  universe_size: number;
  scored_count: number;
  bars_as_of: string | null;
  market_roc5: number;
}> {
  const s = await loadSettings();
  const config = scoreConfig(s);
  const coverage = await barCoverage();
  const barsAsOf = coverage[0]?.bar_date ?? null;
  if (!barsAsOf) throw new Error("No cached price history yet — load market data first.");

  // Market proxy 5-day rate of change.
  const { data: proxyRows, error: proxyErr } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, open, high, low, close, volume")
    .eq("ticker", s.market_proxy.toUpperCase())
    .order("bar_date", { ascending: false })
    .limit(10);
  if (proxyErr) throw new Error(proxyErr.message);
  const proxyBars = (proxyRows ?? [])
    .map((r) => ({
      date: r.bar_date as string,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume),
    }))
    .reverse();
  const marketRoc5 = roc5(proxyBars);

  const scored: { ticker: string; result: ReturnType<typeof scoreSecurity> }[] = [];
  let universe = 0;
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchScanPage(pageSize, offset);
    if (page.length === 0) break;
    universe += page.length;
    for (const row of page) {
      const result = scoreSecurity(toBars(row.bars), marketRoc5, config);
      if (result) scored.push({ ticker: row.ticker, result });
    }
    if (page.length < pageSize) break;
  }

  scored.sort((a, b) => b.result!.score - a.result!.score);

  const { data: run, error: runErr } = await supabaseAdmin
    .from("scan_runs")
    .insert({
      run_date: today(),
      status: "complete",
      universe_size: universe,
      scored_count: scored.length,
      bars_as_of: barsAsOf,
      note: `market proxy ${s.market_proxy} 5d ${marketRoc5.toFixed(2)}%`,
    })
    .select("id")
    .single();
  if (runErr) throw new Error(runErr.message);
  const runId = run!.id as string;

  const minScore = Number(s.min_score_to_trade);
  const rows = scored.slice(0, 300).map((entry, i) => ({
    run_id: runId,
    ticker: entry.ticker,
    rank: i + 1,
    score: entry.result!.score,
    close: entry.result!.close,
    sma20: entry.result!.sma20,
    tradeable: entry.result!.score >= minScore,
    factors: entry.result!.factors as unknown as Json,
    invalidation: entry.result!.invalidation,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabaseAdmin.from("scan_scores").insert(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }

  await updateWatchlist(
    rows.slice(0, 10).map((r) => r.ticker),
    s,
  );

  return {
    run_id: runId,
    universe_size: universe,
    scored_count: scored.length,
    bars_as_of: barsAsOf,
    market_roc5: Number(marketRoc5.toFixed(2)),
  };
}

// ------------------------------------------------------------- watchlist ----

async function updateWatchlist(topTickers: string[], s: Settings) {
  const day = today();
  const { data: existing, error } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("*");
  if (error) throw new Error(error.message);
  const byTicker = new Map((existing ?? []).map((r) => [r.ticker as string, r]));

  for (const ticker of topTickers) {
    const prev = byTicker.get(ticker);
    const streak = prev && prev.last_seen_date !== day ? Number(prev.streak_days) + 1 : Number(prev?.streak_days ?? 1);
    const status =
      prev?.status === "approved" || prev?.status === "rejected"
        ? prev.status
        : streak >= Number(s.streak_suggest_days)
          ? "suggested"
          : "watching";
    const payload = {
      ticker,
      streak_days: prev ? streak : 1,
      best_pick_ever: Boolean(prev?.best_pick_ever) || topTickers[0] === ticker,
      last_seen_date: day,
      status,
      updated_at: new Date().toISOString(),
    };
    if (prev) {
      await supabaseAdmin.from("watchlist_candidates").update(payload).eq("ticker", ticker);
    } else {
      await supabaseAdmin.from("watchlist_candidates").insert(payload);
    }
  }

  // Reset streaks for names that dropped out of today's top 10.
  for (const row of existing ?? []) {
    const ticker = row.ticker as string;
    if (topTickers.includes(ticker)) continue;
    if (row.last_seen_date === day) continue;
    if (Number(row.streak_days) === 0) continue;
    await supabaseAdmin
      .from("watchlist_candidates")
      .update({ streak_days: 0, updated_at: new Date().toISOString() })
      .eq("ticker", ticker);
  }
}

export async function setWatchlistStatus(ticker: string, status: string) {
  const s = await loadSettings();
  const holdUntil = new Date();
  holdUntil.setUTCDate(holdUntil.getUTCDate() + Number(s.swing_max_hold_days));
  const { error } = await supabaseAdmin
    .from("watchlist_candidates")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      hold_until: status === "approved" ? holdUntil.toISOString().slice(0, 10) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("ticker", ticker.toUpperCase());
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ------------------------------------------------- trades + cash ledger ----

export async function addFunds(amount: number, note: string) {
  const { error } = await supabaseAdmin.from("ledger_entries").insert({
    kind: amount >= 0 ? "deposit" : "withdrawal",
    amount,
    note,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function openTrade(input: {
  ticker: string;
  kind: string;
  entry_price: number;
  dollars: number;
  mode?: string;
}) {
  const mode = input.mode === "live" ? "live" : "paper";

  const { data, error } = await supabaseAdmin
    .from("trades")
    .insert({
      ticker: input.ticker.toUpperCase(),
      kind: input.kind,
      entry_date: today(),
      entry_price: input.entry_price,
      dollars: input.dollars,
      status: "open",
      mode,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Simulated trades never touch the real cash ledger.
  if (mode === "live") {
    const { error: ledgerErr } = await supabaseAdmin.from("ledger_entries").insert({
      kind: "deploy",
      amount: -Math.abs(input.dollars),
      trade_id: data!.id,
      note: `Opened ${input.kind} ${input.ticker.toUpperCase()} @ ${input.entry_price}`,
    });
    if (ledgerErr) throw new Error(ledgerErr.message);
  }
  return { id: data!.id as string, mode };
}


export async function closeTrade(input: { id: string; exit_price: number }) {
  const s = await loadSettings();
  const { data: trade, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("id", input.id)
    .single();
  if (error) throw new Error(error.message);
  if (trade!.status !== "open") throw new Error("Trade is already closed.");

  const dollars = Number(trade!.dollars);
  const entry = Number(trade!.entry_price);
  const profit = dollars * (input.exit_price / entry - 1);
  const kept = profit > 0 ? profit * Number(s.profit_keep_pct) : profit;

  const { error: upErr } = await supabaseAdmin
    .from("trades")
    .update({
      exit_date: today(),
      exit_price: input.exit_price,
      profit: Number(profit.toFixed(2)),
      kept: Number(kept.toFixed(2)),
      status: "closed",
    })
    .eq("id", input.id);
  if (upErr) throw new Error(upErr.message);

  if (trade!.mode !== "paper") {
    const available = new Date();
    available.setUTCDate(available.getUTCDate() + Number(s.settlement_days));
    const { error: ledgerErr } = await supabaseAdmin.from("ledger_entries").insert({
      kind: "settle",
      amount: Number((dollars + kept).toFixed(2)),
      available_on: available.toISOString().slice(0, 10),
      trade_id: input.id,
      note: `Closed ${trade!.ticker} @ ${input.exit_price} (P&L ${profit.toFixed(2)}, kept ${kept.toFixed(2)})`,
    });
    if (ledgerErr) throw new Error(ledgerErr.message);
  }
  return { profit: Number(profit.toFixed(2)), kept: Number(kept.toFixed(2)) };
}

// ---------------------------------------------- paper (simulated) cycle ----

interface CycleResult {
  ran: boolean;
  reason: string;
  market: string;
  days_cached: number;
  scan: { scored_count: number; universe_size: number; bars_as_of: string | null } | null;
  paper_opened: { ticker: string; kind: string; price: number }[];
  paper_closed: { ticker: string; exit: number; profit: number; why: string }[];
}

async function latestBarByTicker(tickers: string[]) {
  if (tickers.length === 0) return new Map<string, { bar_date: string; close: number }>();
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker, bar_date, close")
    .in("ticker", tickers)
    .order("bar_date", { ascending: true });
  if (error) throw new Error(error.message);
  const map = new Map<string, { bar_date: string; close: number }>();
  for (const row of data ?? []) {
    map.set(row.ticker as string, { bar_date: row.bar_date as string, close: Number(row.close) });
  }
  return map;
}

/**
 * Simulate the trading rules against cached bars: day trades exit on the next
 * session (the "sell before 4pm" rule), swings exit when they lose the 20-day
 * average or run past the max hold.
 */
export async function managePaperTrades(
  options: { phase?: "both" | "exit" | "entry" } = {},
): Promise<{
  opened: CycleResult["paper_opened"];
  closed: CycleResult["paper_closed"];
}> {
  const phase = options.phase ?? "both";
  const s = await loadSettings();
  const opened: CycleResult["paper_opened"] = [];
  const closed: CycleResult["paper_closed"] = [];

  const { data: openRows, error: openErr } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("status", "open")
    .eq("mode", "paper");
  if (openErr) throw new Error(openErr.message);
  const openTrades = openRows ?? [];

  // Latest scan scores give us the SMA20 exit reference.
  const { data: runRow } = await supabaseAdmin
    .from("scan_runs")
    .select("id, bars_as_of")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: scoreRows } = runRow
    ? await supabaseAdmin
        .from("scan_scores")
        .select("ticker, rank, score, close, sma20, tradeable, invalidation")
        .eq("run_id", runRow.id as string)
        .order("rank", { ascending: true })
        .limit(50)
    : { data: [] as any[] };
  const scores = scoreRows ?? [];
  const byTicker = new Map(scores.map((r) => [r.ticker as string, r]));

  const bars = await latestBarByTicker(openTrades.map((t) => t.ticker as string));

  for (const trade of phase === "entry" ? [] : openTrades) {
    const ticker = trade.ticker as string;
    const bar = bars.get(ticker);
    const score = byTicker.get(ticker);
    const price = Number(bar?.close ?? score?.close ?? 0);
    if (!price) continue;
    const barDate = bar?.bar_date ?? runRow?.bars_as_of ?? today();
    const heldDays = Math.max(
      0,
      Math.round(
        (Date.parse(`${barDate}T00:00:00Z`) - Date.parse(`${trade.entry_date}T00:00:00Z`)) / 86400000,
      ),
    );

    let why = "";
    if (trade.kind === "day") {
      if (heldDays >= 1) why = "day-trade exit before the close";
    } else {
      const sma = score?.sma20 === null || score?.sma20 === undefined ? null : Number(score.sma20);
      if (sma !== null && price < sma) why = "lost the 20-day average";
      else if (heldDays >= Number(s.swing_max_hold_days)) why = "max hold reached";
    }
    if (!why) continue;

    const res = await closeTrade({ id: trade.id as string, exit_price: price });
    closed.push({ ticker, exit: price, profit: res.profit, why });
  }

  if (phase === "exit") return { opened, closed };

  // Open today's simulated plan.
  const stillOpen = new Set(
    openTrades.filter((t) => !closed.some((c) => c.ticker === t.ticker)).map((t) => t.ticker as string),
  );
  const plan = scores
    .filter((r) => r.tradeable)
    .filter((r) => !stillOpen.has(r.ticker as string))
    .slice(0, Number(s.num_day_trades));
  for (const row of plan) {
    const ticker = row.ticker as string;
    const price = Number(bars.get(ticker)?.close ?? row.close);
    if (!price) continue;
    await openTrade({
      ticker,
      kind: "day",
      entry_price: price,
      dollars: Number(s.dollars_per_day_trade),
      mode: "paper",
    });
    opened.push({ ticker, kind: "day", price });
  }

  // Approved swing candidates get a simulated position too.
  const { data: approved } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("ticker")
    .eq("status", "approved");
  for (const row of approved ?? []) {
    const ticker = row.ticker as string;
    if (stillOpen.has(ticker) || opened.some((o) => o.ticker === ticker)) continue;
    const score = byTicker.get(ticker);
    const price = Number(bars.get(ticker)?.close ?? score?.close ?? 0);
    if (!price) continue;
    await openTrade({
      ticker,
      kind: "swing",
      entry_price: price,
      dollars: Number(s.swing_dollars),
      mode: "paper",
    });
    opened.push({ ticker, kind: "swing", price });
  }

  return { opened, closed };
}

/**
 * One full end-of-day cycle: respect the market calendar, top up cached bars,
 * re-score the universe, then run the simulation. Safe to call repeatedly.
 */
export async function runDailyCycle(options: { force?: boolean } = {}): Promise<CycleResult> {
  const { marketStatus } = await import("./market-calendar");
  const status = marketStatus();
  const base: CycleResult = {
    ran: false,
    reason: "",
    market: `${status.label} — ${status.detail}`,
    days_cached: 0,
    scan: null,
    paper_opened: [],
    paper_closed: [],
  };

  if (!options.force && !status.tradingDay) {
    return { ...base, reason: `Market closed (${status.detail}). Nothing to do.` };
  }

  const missing = await missingDates();
  let cached = 0;
  for (const date of missing.slice(-6)) {
    const res = await cacheOneDay(date);
    if (res.trading_day) cached += 1;
  }

  const scan = await runScan();
  const sim = await managePaperTrades();
  return {
    ...base,
    ran: true,
    reason: "Cycle complete.",
    days_cached: cached,
    scan: {
      scored_count: scan.scored_count,
      universe_size: scan.universe_size,
      bars_as_of: scan.bars_as_of,
    },
    paper_opened: sim.opened,
    paper_closed: sim.closed,
  };
}


export async function updateSettings(patch: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return { ok: true };
}
