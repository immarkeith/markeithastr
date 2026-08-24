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
  /** Minutes after the 09:30 open before the authoritative rescore + buys. */
  preopen_recheck_minutes: number;
  /** Keep a still-top-ranked position overnight instead of sell-and-rebuy. */
  hold_qualifying_positions: boolean;
  notify_push: boolean;
  auto_run: boolean;
  strategy_enabled: boolean;
  paper_mode: boolean;
  ml_enabled: boolean;
  ml_target: string;
  ml_train_days: number;
  ml_test_days: number;
  ml_trees: number;
  ml_combine_weight: number;
  ml_holding_days: number;
  ml_min_return_pct: number;
  ml_retrain: string;
  research_auto: boolean;
  active_strategy_id: string | null;
  bt_fee_pct: number;
  bt_slippage_bps: number;
}

/**
 * Lookback window kept in the cache. Scoring alone needs 55 clean sessions, so
 * a 70-day window leaves almost nothing to research or train on — 160 days of
 * daily bars is still one ranged request per provider call.
 */
export const HISTORY_DAYS = 160;

export async function loadSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin.from("app_settings").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data as unknown as Settings;
}

/**
 * How much of real market volume the active data feed reports. The free Alpaca
 * (IEX) feed only prints a small slice of consolidated volume, so the dollar
 * volume gates have to be scaled to that slice or every name fails them.
 */
export async function volumeShare(s: Settings): Promise<number> {
  if (s.provider !== "alpaca") return 1;
  const { alpacaFeed, feedVolumeShare } = await import("./market-data.server");
  return feedVolumeShare(await alpacaFeed());
}

export function scoreConfig(s: Settings, share = 1): ScoreConfig {
  return {
    minPrice: Number(s.min_price),
    minAvgDollarVolume: Number(s.min_avg_dollar_volume) * share,
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
  const { isTradingDay } = await import("./market-calendar");
  // Market holidays have no bars to fetch, so they are not "missing".
  return recentWeekdays(days, end).filter((d) => !present.has(d) && isTradingDay(d));
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

function liquidityPrefilter(rows: BarRow[], s: Settings, share = 1): BarRow[] {
  const minPrice = Number(s.min_price);
  const minDollar = Number(s.min_avg_dollar_volume) * share;
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

/** Tickers already in the cache — keeps the stored universe stable day to day. */
export async function cachedTickers(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker")
    .order("ticker", { ascending: true })
    .limit(100000);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r) => r.ticker as string))];
}

/**
 * Cache bars for one trading day. On Polygon this is a single whole-market
 * request; on Alpaca it batches symbols. Once a universe exists in the cache we
 * keep topping up the SAME symbols, otherwise every day would store a
 * different shortlist and no ticker would ever build up enough history to
 * score.
 */
export async function cacheOneDay(date: string): Promise<{
  date: string;
  stored: number;
  trading_day: boolean;
}> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  let rows: BarRow[];
  let keepExisting = false;
  if (s.provider === "alpaca") {
    const existing = await cachedTickers();
    const universe =
      existing.length >= 100
        ? existing
        : await alpacaUniverse(Math.max(50, Number(s.max_universe)));
    keepExisting = existing.length >= 100;
    rows = (await alpacaBars(universe, date, date)).filter((r) => r.bar_date === date);
  } else {
    rows = await polygonGroupedDay(date);
  }
  if (rows.length === 0) return { date, stored: 0, trading_day: false };
  const kept = keepExisting ? rows : liquidityPrefilter(rows, s, share);
  const stored = await replaceDay(date, kept);
  return { date, stored, trading_day: true };
}

/**
 * Build the whole history window in as few data requests as possible: one
 * ranged request per symbol batch instead of one per batch per day. The stored
 * universe is chosen from the most recent session's liquidity and then kept for
 * every day in the window, so each ticker ends up with a continuous series the
 * scanner can actually score.
 */
export async function backfillHistory(days = HISTORY_DAYS): Promise<{
  days_stored: number;
  tickers: number;
  rows: number;
  feed: string;
  from: string | null;
  to: string | null;
}> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const window = recentWeekdays(days, end);
  const from = window[0] ?? null;
  const to = window[window.length - 1] ?? null;
  if (!from || !to) return { days_stored: 0, tickers: 0, rows: 0, feed: "n/a", from, to };

  let all: BarRow[] = [];
  let feed = s.provider;
  let existing: string[] = [];
  if (s.provider === "alpaca") {
    const { alpacaFeed } = await import("./market-data.server");
    feed = `alpaca:${await alpacaFeed()}` as Settings["provider"];
    existing = await cachedTickers();
    const universe =
      existing.length >= 100 ? existing : await alpacaUniverse(Math.max(50, Number(s.max_universe)));
    all = await alpacaBars(universe, from, to);
  } else {
    for (const date of window) all.push(...(await polygonGroupedDay(date)));
  }
  if (all.length === 0) return { days_stored: 0, tickers: 0, rows: 0, feed, from, to };

  // Pick the universe once, from the newest session we actually received.
  const byDate = new Map<string, BarRow[]>();
  for (const row of all) {
    const list = byDate.get(row.bar_date);
    if (list) list.push(row);
    else byDate.set(row.bar_date, [row]);
  }
  const dates = [...byDate.keys()].sort();
  const newest = dates[dates.length - 1]!;
  const chosen = new Set(liquidityPrefilter(byDate.get(newest)!, s, share).map((r) => r.ticker));
  // A quiet session must not shrink a universe we already track: names already
  // in the cache stay in, and the scan's own gates still decide what's scoreable.
  for (const ticker of existing) chosen.add(ticker);
  if (chosen.size === 0) return { days_stored: 0, tickers: 0, rows: 0, feed, from, to };


  let rowCount = 0;
  for (const date of dates) {
    const rows = byDate.get(date)!.filter((r) => chosen.has(r.ticker));
    if (rows.length === 0) continue;
    rowCount += await replaceDay(date, rows);
  }
  return {
    days_stored: dates.length,
    tickers: chosen.size,
    rows: rowCount,
    feed,
    from: dates[0] ?? from,
    to: newest,
  };
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
  const config = scoreConfig(s, await volumeShare(s));

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
  const ticker = input.ticker.toUpperCase();
  let entryPrice = input.entry_price;
  let orderNote = "";

  // Live mode sends a real market order to the broker and records the actual
  // fill, not the price we guessed from cached bars.
  if (mode === "live") {
    const { buyNotional, positionQty } = await import("./broker.server");
    // Broker truth guard: if the account already holds this name, no second
    // order is ever sent — this is what doubled a position before, when a
    // duplicate/retried request reached the buy path.
    const held = await positionQty("live", ticker);
    if (held > 0) {
      throw new Error(`${ticker} is already held at the broker (${held} sh) — no second buy placed.`);
    }
    const fill = await buyNotional("live", ticker, input.dollars);
    if (fill.status !== "filled" || !fill.filled_price) {
      throw new Error(
        `Broker did not fill ${ticker} (status ${fill.status}). Nothing was recorded.`,
      );
    }
    entryPrice = fill.filled_price;
    orderNote = ` order ${fill.order_id} (${fill.filled_qty} sh)`;
  }


  const { data, error } = await supabaseAdmin
    .from("trades")
    .insert({
      ticker,
      kind: input.kind,
      entry_date: today(),
      entry_at: new Date().toISOString(),
      entry_price: entryPrice,
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
      note: `Bought ${input.kind} ${ticker} @ ${entryPrice}${orderNote}`,
    });
    if (ledgerErr) throw new Error(ledgerErr.message);
  }
  return { id: data!.id as string, mode, entry_price: entryPrice };
}

/** Most recent cached close for a ticker — used to prefill the entry price. */
export async function latestClose(
  ticker: string,
): Promise<{ ticker: string; close: number | null; bar_date: string | null }> {
  const symbol = ticker.trim().toUpperCase();
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, close")
    .eq("ticker", symbol)
    .order("bar_date", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return {
    ticker: symbol,
    close: row ? Number(row.close) : null,
    bar_date: row ? (row.bar_date as string) : null,
  };
}

/**
 * Cancel a trade that was opened by mistake. Any still-open broker order for
 * that symbol is pulled first; the record is marked cancelled and cash set
 * aside for it is returned.
 */
export async function cancelTrade(input: { id: string }) {
  const { data: trade, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("id", input.id)
    .single();
  if (error) throw new Error(error.message);
  if (trade!.status !== "open") throw new Error("Only an open trade can be cancelled.");

  if (trade!.mode === "live") {
    const { cancelOpenOrders } = await import("./broker.server");
    try {
      await cancelOpenOrders("live", trade!.ticker as string);
    } catch (err) {
      console.error("cancel order failed:", err instanceof Error ? err.message : err);
    }
  }

  const { error: upErr } = await supabaseAdmin
    .from("trades")
    .update({
      status: "cancelled",
      exit_date: today(),
      exit_at: new Date().toISOString(),
      profit: 0,
      kept: 0,
    })
    .eq("id", input.id);
  if (upErr) throw new Error(upErr.message);

  if (trade!.mode !== "paper") {
    const { error: ledgerErr } = await supabaseAdmin.from("ledger_entries").insert({
      kind: "cancel",
      amount: Math.abs(Number(trade!.dollars)),
      trade_id: input.id,
      note: `Cancelled ${trade!.ticker} — cash returned, nothing was traded`,
    });
    if (ledgerErr) throw new Error(ledgerErr.message);
  }
  return { ok: true, ticker: trade!.ticker as string };
}


export interface CloseResult {
  closed: boolean;
  profit: number;
  kept: number;
  note: string;
}

/**
 * Close a position. In live mode the sell is only believed once the broker
 * confirms the position is actually gone: one retry, then the trade is left
 * open with a note explaining why (shown on the dashboard, never pushed).
 */
export async function closeTrade(input: { id: string; exit_price: number }): Promise<CloseResult> {
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
  const ticker = trade!.ticker as string;
  let exitPrice = input.exit_price;
  let orderNote = "";

  // Live mode actually sells the position and records the real fill.
  if (trade!.mode === "live") {
    const { sellPosition, positionQty } = await import("./broker.server");
    const EPS = 0.000001;
    let fill = await sellPosition("live", ticker);
    let remaining = await positionQty("live", ticker);
    if (remaining > EPS) {
      // One retry — a rejected or partially filled market order is common
      // right at the bell.
      try {
        fill = (await sellPosition("live", ticker)) ?? fill;
      } catch (err) {
        console.error("sell retry failed:", err instanceof Error ? err.message : err);
      }
      remaining = await positionQty("live", ticker);
    }
    if (remaining > EPS) {
      const note = `Sell did not go through — ${remaining.toFixed(4)} share(s) of ${ticker} are still held${
        fill ? ` (broker status ${fill.status})` : ""
      }. ASTR will try again on the next pass.`;
      await supabaseAdmin.from("trades").update({ status_note: note }).eq("id", input.id);
      return { closed: false, profit: 0, kept: 0, note };
    }
    if (fill?.filled_price) {
      exitPrice = fill.filled_price;
      orderNote = ` order ${fill.order_id}`;
    }
  }

  const profit = dollars * (exitPrice / entry - 1);
  const kept = profit > 0 ? profit * Number(s.profit_keep_pct) : profit;

  const { error: upErr } = await supabaseAdmin
    .from("trades")
    .update({
      exit_date: today(),
      exit_at: new Date().toISOString(),
      exit_price: exitPrice,
      profit: Number(profit.toFixed(2)),
      kept: Number(kept.toFixed(2)),
      status: "closed",
      status_note: null,
    })
    .eq("id", input.id);
  if (upErr) throw new Error(upErr.message);

  if (trade!.mode !== "paper") {
    const available = new Date();
    available.setUTCDate(available.getUTCDate() + Number(s.settlement_days));
    const availableOn = available.toISOString().slice(0, 10);
    // The stake comes back to the tradeable pool once it settles. Any profit is
    // banked separately as "saved profit" so the desk keeps risking the same
    // fixed stake instead of compounding.
    const rows: Array<{ kind: string; amount: number; available_on: string; trade_id: string; note: string }> = [
      {
        kind: "settle",
        amount: Number((dollars + Math.min(profit, 0)).toFixed(2)),
        available_on: availableOn,
        trade_id: input.id,
        note: `Sold ${trade!.ticker} @ ${exitPrice}${orderNote} (P&L ${profit.toFixed(2)})`,
      },
    ];
    if (kept > 0) {
      rows.push({
        kind: "reserve",
        amount: Number(kept.toFixed(2)),
        available_on: availableOn,
        trade_id: input.id,
        note: `Saved profit from ${trade!.ticker} (not reinvested)`,
      });
    }
    const { error: ledgerErr } = await supabaseAdmin.from("ledger_entries").insert(rows);
    if (ledgerErr) throw new Error(ledgerErr.message);
  }
  return {
    closed: true,
    profit: Number(profit.toFixed(2)),
    kept: Number(kept.toFixed(2)),
    note: "",
  };
}


/**
 * Broker truth wins. Before the pre-close pass this:
 *  1. trims any live position that is bigger than the stake it is supposed to
 *     be (what caused the doubled-up holding), using the live quantity and
 *     price at that moment;
 *  2. re-points the cash ledger at the broker's real cash balance so a sell
 *     that silently failed can never leave phantom money behind.
 * Proceeds from a trim settle under the normal T+1 rule, so they become
 * spendable the day after — never the next morning.
 */
export async function adoptUntrackedPositions(): Promise<string[]> {
  const adopted: string[] = [];
  const s = await loadSettings();
  if (s.paper_mode !== false) return adopted;

  const { listPositions, listOrdersSince } = await import("./broker.server");
  let positions: Awaited<ReturnType<typeof listPositions>> = [];
  try {
    positions = await listPositions("live");
  } catch (error) {
    console.error(
      "could not read broker positions:",
      error instanceof Error ? error.message : error,
    );
    return adopted;
  }
  if (positions.length === 0) return adopted;

  const { data: openRows } = await supabaseAdmin
    .from("trades")
    .select("id, ticker")
    .eq("status", "open")
    .is("strategy_id", null)
    .eq("mode", "live");
  const known = new Set((openRows ?? []).map((t) => String(t.ticker).toUpperCase()));
  const unknown = positions.filter((p) => !known.has(p.ticker) && p.qty > 0);
  if (unknown.length === 0) return adopted;

  // Fill time and order id, when the broker still lists the buy, so the
  // reconstructed row carries the real timestamps rather than "now".
  let orders: Awaited<ReturnType<typeof listOrdersSince>> = [];
  try {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    orders = await listOrdersSince("live", since);
  } catch {
    /* timestamps fall back to now */
  }

  for (const pos of unknown) {
    const buy = orders.find(
      (o) => o.ticker === pos.ticker && o.side === "buy" && o.status === "filled",
    );
    const entryAt = buy?.filled_at ?? buy?.submitted_at ?? new Date().toISOString();
    const dollars = Number((pos.qty * pos.avg_entry_price).toFixed(2));
    const note = `Reconstructed from the broker on ${today()} — this position was held at the broker with no matching record in the app${buy ? ` (order ${buy.order_id})` : ""}.`;
    const { data: inserted, error } = await supabaseAdmin
      .from("trades")
      .insert({
        ticker: pos.ticker,
        kind: "day",
        mode: "live",
        status: "open",
        entry_date: entryAt.slice(0, 10),
        entry_at: entryAt,
        entry_price: pos.avg_entry_price,
        dollars,
        status_note: note,
      })
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("could not adopt broker position:", error.message);
      continue;
    }
    await supabaseAdmin.from("ledger_entries").insert({
      kind: "deploy",
      amount: -dollars,
      entry_date: entryAt.slice(0, 10),
      available_on: entryAt.slice(0, 10),
      note: `Adopted untracked ${pos.ticker} position @ ${pos.avg_entry_price} (${pos.qty} sh)${buy ? ` order ${buy.order_id}` : ""}`,
      trade_id: (inserted?.id as string | undefined) ?? null,
    });
    adopted.push(
      `${pos.ticker}: ${pos.qty} share(s) @ $${pos.avg_entry_price.toFixed(2)} ($${dollars.toFixed(2)}) adopted from the broker.`,
    );
  }
  return adopted;
}

export async function reconcileBroker(): Promise<{
  trimmed: string[];
  adopted: string[];
  cash_adjusted: number;
}> {
  const trimmed: string[] = [];
  let cashAdjusted = 0;
  const s = await loadSettings();
  if (s.paper_mode !== false) return { trimmed, adopted: [], cash_adjusted: 0 };

  const { listPositions, sellQty, getPosition } = await import("./broker.server");

  // Broker truth first: anything held with no trade row is written into the book
  // before any trim or exit decision, so a position can never be ignored just
  // because the app never recorded the buy.
  const adopted = await adoptUntrackedPositions();

  const { data: openRows } = await supabaseAdmin
    .from("trades")
    .select("id, ticker, dollars, entry_price, status_note")
    .eq("status", "open")
    .is("strategy_id", null)
    .eq("mode", "live");
  const open = openRows ?? [];

  let positions: Awaited<ReturnType<typeof listPositions>> = [];
  try {
    positions = await listPositions("live");
  } catch (error) {
    console.error("could not read broker positions:", error instanceof Error ? error.message : error);
    return { trimmed, adopted, cash_adjusted: 0 };
  }

  // 1. Trim oversized positions back to the recorded stake.
  for (const pos of positions) {
    const mine = open.filter((t) => String(t.ticker).toUpperCase() === pos.ticker);
    if (mine.length === 0) continue;
    const target = mine.reduce((sum, t) => sum + Number(t.dollars), 0);
    const excess = pos.market_value - target;
    if (excess <= 1 || !pos.current_price) continue;
    try {
      const qty = Math.min(pos.qty, excess / pos.current_price);
      const fill = await sellQty("live", pos.ticker, qty);
      const after = await getPosition("live", pos.ticker);
      const soldQty = Number(fill?.filled_qty ?? 0);
      const price = Number(fill?.filled_price ?? pos.current_price);
      const proceeds = Number((soldQty * price).toFixed(2));
      if (proceeds > 0) {
        const available = new Date();
        available.setUTCDate(available.getUTCDate() + Number(s.settlement_days));
        await supabaseAdmin.from("ledger_entries").insert({
          kind: "settle",
          amount: proceeds,
          available_on: available.toISOString().slice(0, 10),
          note: `Trimmed extra ${pos.ticker} shares back to the ${target.toFixed(2)} stake (sold ${soldQty} @ ${price})`,
        });
        trimmed.push(
          `${pos.ticker}: sold ${soldQty} extra share(s) @ $${price.toFixed(2)} — $${proceeds.toFixed(2)} clears next session. Left ${(after?.market_value ?? 0).toFixed(2)} invested.`,
        );
        for (const t of mine) {
          await supabaseAdmin
            .from("trades")
            .update({
              status_note: `Extra shares sold back to the $${target.toFixed(2)} stake on ${today()}.`,
            })
            .eq("id", t.id as string);
        }
      }
    } catch (error) {
      console.error("trim failed:", error instanceof Error ? error.message : error);
    }
  }

  // 2. Align the ledger with real broker cash (settled + pending), excluding
  // banked profit which is tracked separately.
  try {
    const { brokerAccount } = await import("./broker.server");
    const account = await brokerAccount("live");
    // Live cash only: paper-race rows carry a strategy_id and are never counted.
    const { data: rows } = await supabaseAdmin
      .from("ledger_entries")
      .select("amount, kind")
      .is("strategy_id", null);
    let ledgerCash = 0;
    for (const row of rows ?? []) {
      if (String(row.kind) === "reserve") continue;
      ledgerCash += Number(row.amount);
    }
    const diff = Number((account.cash - ledgerCash).toFixed(2));
    if (Math.abs(diff) >= 0.25) {
      await supabaseAdmin.from("ledger_entries").insert({
        kind: "adjust",
        amount: diff,
        available_on: today(),
        note: `Matched the cash ledger to the live account balance (${account.cash.toFixed(2)})`,
      });
      cashAdjusted = diff;
    }
  } catch (error) {
    console.error("cash reconcile failed:", error instanceof Error ? error.message : error);
  }

  return { trimmed, adopted, cash_adjusted: cashAdjusted };
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
 * Settled cash currently available for real orders. Banked profit ("reserve"
 * rows) is deliberately excluded so the stake never compounds.
 */
async function availableCash(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("ledger_entries")
    .select("amount, available_on, kind")
    .is("strategy_id", null);
  if (error) throw new Error(error.message);
  const day = today();
  let sum = 0;
  for (const row of data ?? []) {
    if (String(row.kind) === "reserve") continue;
    if (String(row.available_on) <= day) sum += Number(row.amount);
  }
  return Number(sum.toFixed(2));
}

/**
 * Capital used for scaling decisions: what the account is genuinely worth, not
 * just the idle slice. Settled cash, cash still settling under T+1, banked
 * profit, and the market value of anything currently held all count. Sizing the
 * desk off settled cash alone made a normal day (stake invested, proceeds
 * unsettled) look like a shortfall and shrank the stake for no real reason.
 */
export async function scalingCapital(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("ledger_entries")
    .select("amount, available_on, kind")
    .is("strategy_id", null);
  if (error) throw new Error(error.message);
  let sum = 0;
  for (const row of data ?? []) sum += Number(row.amount);

  // Money sitting inside an open position is still capital.
  try {
    const s = await loadSettings();
    if (s.paper_mode === false) {
      const { listPositions } = await import("./broker.server");
      const positions = await listPositions("live");
      for (const pos of positions) sum += Number(pos.market_value ?? 0);
    } else {
      const { data: openRows } = await supabaseAdmin
        .from("trades")
        .select("dollars")
        .eq("status", "open")
        .is("strategy_id", null)
        .eq("mode", "paper");
      for (const row of openRows ?? []) sum += Number(row.dollars);
    }
  } catch (error) {
    console.error("scalingCapital positions:", error instanceof Error ? error.message : error);
  }

  return Number(sum.toFixed(2));
}


/**
 * Run the trading rules: day trades exit on the next session (the "sell before
 * 4pm" rule), swings exit when they lose the 20-day average or run past the max
 * hold. Operates on the paper book while simulation mode is on, and on the real
 * broker account once it is switched off.
 */
export async function managePaperTrades(
  options: {
    phase?: "both" | "exit" | "entry";
    keepQualifying?: boolean;
    mode?: "paper" | "live";
    /** Tickers trimmed back to their stake this pass: keep the remainder. */
    carryOver?: string[];
  } = {},
): Promise<{
  opened: CycleResult["paper_opened"];
  closed: CycleResult["paper_closed"];
  held: { ticker: string; rank: number; score: number }[];
}> {
  const phase = options.phase ?? "both";
  const s = await loadSettings();
  const activeMode = options.mode ?? (s.paper_mode === false ? "live" : "paper");
  const opened: CycleResult["paper_opened"] = [];
  const closed: CycleResult["paper_closed"] = [];
  const held: { ticker: string; rank: number; score: number }[] = [];

  // Before deciding exits in the live book, make sure the book actually matches
  // the broker: a position held with no trade row would otherwise never be
  // considered for sale at all.
  if (phase !== "entry" && activeMode === "live") {
    try {
      const adopted = await adoptUntrackedPositions();
      if (adopted.length > 0) console.log("adopted untracked broker positions:", adopted.join(" "));
    } catch (error) {
      console.error("adoption failed:", error instanceof Error ? error.message : error);
    }
  }

  const { data: openRows, error: openErr } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("status", "open")
    // Live book only — paper-race rows are handled by race.server.ts.
    .is("strategy_id", null)
    .eq("mode", activeMode);
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

  // Names the desk may carry overnight: still flagged tradeable AND still inside
  // the slots it would buy today. Selling one of these before the close only to
  // rebuy it in the morning pays the spread twice for no change in exposure.
  const holdSet = new Set<string>();
  if (options.keepQualifying && s.hold_qualifying_positions !== false) {
    const { loadLadder: loadLadderForHold } = await import("./capital.server");
    const holdSlots = Math.max(1, Number((await loadLadderForHold()).stocks_per_day));
    for (const row of scores.filter((r) => r.tradeable).slice(0, holdSlots)) {
      holdSet.add(row.ticker as string);
    }
  }

  for (const trade of phase === "entry" ? [] : openTrades) {
    const ticker = trade.ticker as string;
    const bar = bars.get(ticker);
    const score = byTicker.get(ticker);
    // Last resort is the entry price itself: a day trade must never stay open
    // just because that symbol dropped out of the cached universe.
    const price = Number(bar?.close ?? score?.close ?? trade.entry_price ?? 0);
    if (!price) continue;
    const barDate = bar?.bar_date ?? runRow?.bars_as_of ?? today();

    const heldDays = Math.max(
      0,
      Math.round(
        (Date.parse(`${barDate}T00:00:00Z`) - Date.parse(`${trade.entry_date}T00:00:00Z`)) / 86400000,
      ),
    );
    // A day trade is measured against the calendar, not against how fresh the
    // cached bar happens to be.
    const calendarDays = Math.max(
      0,
      Math.round(
        (Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${trade.entry_date}T00:00:00Z`)) / 86400000,
      ),
    );

    let why = "";
    if (trade.kind === "day") {
      if (Math.max(heldDays, calendarDays) >= 1) why = "day-trade exit before the close";

    } else {
      const sma = score?.sma20 === null || score?.sma20 === undefined ? null : Number(score.sma20);
      if (sma !== null && price < sma) why = "lost the 20-day average";
      else if (heldDays >= Number(s.swing_max_hold_days)) why = "max hold reached";
    }
    if (!why) continue;

    // Trimmed today: the extra shares were already sold, and the remaining
    // single stake rolls into the next session instead of being liquidated.
    if ((options.carryOver ?? []).includes(ticker)) {
      held.push({
        ticker,
        rank: Number(score?.rank ?? 0),
        score: Number(score?.score ?? 0),
      });
      continue;
    }

    // Still the best available name: carry it instead of churning it.
    if (trade.kind === "day" && holdSet.has(ticker)) {
      held.push({
        ticker,
        rank: Number(score?.rank ?? 0),
        score: Number(score?.score ?? 0),
      });
      continue;
    }


    const res = await closeTrade({ id: trade.id as string, exit_price: price });
    // An unconfirmed sell keeps the position open with a note on the dashboard;
    // it is never reported as a completed exit.
    if (!res.closed) continue;
    closed.push({ ticker, exit: price, profit: res.profit, why });
  }


  // Re-size the desk once per trading day, AFTER the day's exits have settled
  // into the ledger, so today's result is part of the stability decision.
  if (phase !== "entry") {
    try {
      const { applyLadder } = await import("./capital.server");
      await applyLadder(await scalingCapital(), today());
    } catch (error) {
      console.error("capital ladder failed:", error instanceof Error ? error.message : error);
    }
  }

  if (phase === "exit") return { opened, closed, held };


  // Strategy switched off on the Strategy page: keep scoring and managing
  // exits, but take no new entries.
  if ((s as unknown as { strategy_enabled?: boolean }).strategy_enabled === false) {
    return { opened, closed, held };
  }

  // Open today's plan. In live mode every entry is limited by the settled cash
  // actually sitting in the account, so it can never overspend.
  let cashLeft = activeMode === "live" ? await availableCash() : Number.POSITIVE_INFINITY;

  const stillOpen = new Set(
    openTrades.filter((t) => !closed.some((c) => c.ticker === t.ticker)).map((t) => t.ticker as string),
  );

  async function tryOpen(ticker: string, kind: "day" | "swing", price: number, want: number) {
    if (!price) return;
    const dollars = want;
    // Never stack a second stake on a name the account already holds — that is
    // exactly how the doubled-up position happened.
    if (activeMode === "live") {
      try {
        const { positionQty } = await import("./broker.server");
        if ((await positionQty("live", ticker)) > 0) return;
      } catch (error) {
        console.error("position check failed:", error instanceof Error ? error.message : error);
      }
    }
    if (activeMode === "live" && cashLeft < want) {
      // Full stake or nothing: if yesterday's sale has not settled yet, sit out
      // today rather than buying a smaller partial position.
      const { notify } = await import("./notify.server");
      await notify({
        kind: "trade",
        title: `Sat out — waiting on settled cash`,
        body: `${ticker} was today's pick, but only ${cashLeft.toFixed(2)} of the ${want.toFixed(2)} stake has cleared. It will buy once the money settles.`,
        ticker,
        severity: "info",
        action: "No trade",
        dedupe_key: `cash-wait-${today()}`,
      });
      return;
    }
    const res = await openTrade({
      ticker,
      kind,
      entry_price: price,
      dollars: Number(dollars.toFixed(2)),
      mode: activeMode,
    });
    if (activeMode === "live") cashLeft = Number((cashLeft - dollars).toFixed(2));
    opened.push({ ticker, kind, price: res.entry_price ?? price });
  }

  // Position count and stake come from the capital ladder, which scales with the
  // account instead of using the fixed settings values.
  const { loadLadder } = await import("./capital.server");
  const ladder = await loadLadder();
  const perTrade = Number(ladder.position_dollars);
  // Anything carried over from yesterday still occupies a slot and its capital,
  // so today only fills what is genuinely free.
  const carried = openTrades.filter(
    (t) => t.kind === "day" && stillOpen.has(t.ticker as string),
  ).length;
  const slots = Math.max(0, Number(ladder.stocks_per_day) - carried);


  const plan = scores
    .filter((r) => r.tradeable)
    .filter((r) => !stillOpen.has(r.ticker as string))
    .slice(0, Math.max(0, slots));
  for (const row of plan) {
    const ticker = row.ticker as string;
    const price = Number(bars.get(ticker)?.close ?? row.close);
    await tryOpen(ticker, "day", price, perTrade);
  }


  // Approved swing candidates get a position too.
  const { data: approved } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("ticker")
    .eq("status", "approved");
  for (const row of approved ?? []) {
    const ticker = row.ticker as string;
    if (stillOpen.has(ticker) || opened.some((o) => o.ticker === ticker)) continue;
    const score = byTicker.get(ticker);
    const price = Number(bars.get(ticker)?.close ?? score?.close ?? 0);
    await tryOpen(ticker, "swing", price, Number(s.swing_dollars));
  }

  return { opened, closed, held };
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

  // Thin or fragmented history can never produce a score (each indicator needs
  // 55 clean sessions), so rebuild the whole window in one ranged pass first.
  const coverage = await barCoverage();
  let cached = 0;
  if (coverage.length < 55 || Number(coverage[0]?.ticker_count ?? 0) < 100) {
    const back = await backfillHistory();
    cached = back.days_stored;
  } else {
    const missing = await missingDates();
    for (const date of missing.slice(-6)) {
      const res = await cacheOneDay(date);
      if (res.trading_day) cached += 1;
    }
  }


  const scan = await runScan();
  const sim = await managePaperTrades();
  const { generateInsights } = await import("./notify.server");
  await generateInsights(status.nyDate);

  // Between the buy and the sell there is idle time — spend it on research and
  // model work. Both are advisory only: neither can change the live strategy.
  const settings = await loadSettings();
  if (settings.ml_enabled) {
    try {
      const { gradePredictions, predictLatest } = await import("./ml.server");
      await gradePredictions();
      await predictLatest({ universe: 300 });
    } catch (error) {
      console.error("ml pass failed:", error instanceof Error ? error.message : error);
    }
  }
  if (settings.research_auto) {
    try {
      const { runResearch } = await import("./research.server");
      await runResearch({ universe: 300 });
    } catch (error) {
      console.error("research pass failed:", error instanceof Error ? error.message : error);
    }
  }

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

// ------------------------------------------------- intraday timed passes ----

export interface TimedPassResult {
  ran: boolean;
  reason: string;
  market: string;
  ny_time: string;
  opened: CycleResult["paper_opened"];
  closed: CycleResult["paper_closed"];
  held: { ticker: string; rank: number; score: number }[];
  scan: { scored_count: number; bars_as_of: string | null } | null;
  insights: number;
}

/** Most recent completed regular session strictly before `date`. */
async function previousTradingDay(date: string): Promise<string> {
  const { isTradingDay } = await import("./market-calendar");
  let cursor = date;
  for (let i = 0; i < 12; i++) {
    const d = new Date(`${cursor}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
    if (isTradingDay(cursor)) return cursor;
  }
  return cursor;
}

/**
 * Pre-close pass: re-scores the universe, then sells the day positions a few
 * minutes before the bell so the cash clears under T+1 — except a name that is
 * still the top-ranked eligible pick, which is carried overnight instead of
 * being sold and rebought in the morning.
 */
export async function runPreCloseExits(options: { force?: boolean } = {}): Promise<TimedPassResult> {
  const { marketStatus } = await import("./market-calendar");
  const { notify } = await import("./notify.server");
  const s = await loadSettings();
  const status = marketStatus();
  const buffer = Math.max(1, Number(s.exit_buffer_minutes ?? 8));
  const base: TimedPassResult = {
    ran: false,
    reason: "",
    market: `${status.label} — ${status.detail}`,
    ny_time: status.nyTime,
    opened: [],
    closed: [],
    held: [],
    scan: null,
    insights: 0,
  };

  if (!options.force) {
    if (!status.tradingDay) return { ...base, reason: `Market closed (${status.detail}).` };
    const left = status.minutesToClose ?? 0;
    // The scheduler fires a few minutes before the buffer so a failed sell can
    // be retried before the bell. Treat that lead time as inside the window —
    // otherwise the scheduled pass bails as "too early" and nothing sells.
    const window = buffer + 6;
    if (left > window) {
      return { ...base, reason: `Too early — exits run inside the last ${window} minutes.` };
    }
    if (left < 0) return { ...base, reason: "Session already closed." };
  }


  // Fresh pre-close score decides whether each holding still qualifies.
  let scan: { scored_count: number; bars_as_of: string | null } | null = null;
  try {
    const missing = await missingDates();
    for (const date of missing.slice(-3)) await cacheOneDay(date);
    const res = await runScan();
    scan = { scored_count: res.scored_count, bars_as_of: res.bars_as_of };
  } catch (error) {
    // A failed pre-close score must never trap a position: fall through to the
    // exits using the last good ranking.
    console.error("pre-close rescore failed:", error instanceof Error ? error.message : error);
  }

  // Broker truth first: trim anything bigger than its stake and re-align cash,
  // using the live quantity and price at this moment.
  let carryOver: string[] = [];
  let adopted: string[] = [];
  try {
    const fix = await reconcileBroker();
    // A trimmed name keeps its single stake overnight; the trim proceeds settle
    // under T+1, so the desk sits out the next morning by design.
    carryOver = fix.trimmed.map((line) => line.split(":")[0]!.trim());
    adopted = fix.adopted;
  } catch (error) {
    console.error("reconcile failed:", error instanceof Error ? error.message : error);
  }
  for (const line of adopted) {
    const ticker = line.split(":")[0]!.trim();
    await notify({
      kind: "health",
      title: `Found an unrecorded ${ticker} position at the broker`,
      body: `${line} It has been written into the book, so this pre-close pass decides whether to sell or hold it like any other position.`,
      ticker,
      severity: "bad",
      action: "Review the trade log",
      dedupe_key: `adopt:${ticker}:${status.nyDate}`,
    });
  }

  const sim = await managePaperTrades({ phase: "exit", keepQualifying: true, carryOver });
  for (const exit of sim.closed) {
    await notify({
      kind: "exit",
      title: `Sold ${exit.ticker} @ $${exit.exit.toFixed(2)} (${exit.profit >= 0 ? "+" : ""}$${exit.profit.toFixed(2)})`,
      body: `Closed ${buffer} minutes before the bell — ${exit.why}. Cash clears under the T+1 rule.`,
      ticker: exit.ticker,
      severity: exit.profit >= 0 ? "good" : "bad",
      action: s.paper_mode === false ? "Live exit" : "Simulated exit",
      dedupe_key: `exit:${exit.ticker}:${status.nyDate}`,
    });
  }
  for (const hold of sim.held) {
    await notify({
      kind: "trade",
      title: `Holding ${hold.ticker} overnight — still ranked #${hold.rank}`,
      body: `The pre-close score still puts ${hold.ticker} at the top of the eligible list (${hold.score.toFixed(1)} pts), so it was not sold just to be bought back tomorrow.`,
      ticker: hold.ticker,
      severity: "info",
      action: s.paper_mode === false ? "Live hold" : "Simulated hold",
      dedupe_key: `hold:${hold.ticker}:${status.nyDate}`,
    });
  }
  // The paper strategy race runs its own exits on the same cached bars. It is
  // fully isolated (every row carries a strategy_id) and can never block or
  // change the live book, so a failure here is logged and ignored.
  try {
    const { runRacePass, maybeSuggestSwitch } = await import("./race.server");
    await runRacePass({ phase: "exit" });
    await maybeSuggestSwitch();
  } catch (error) {
    console.error("paper race (exit) failed:", error instanceof Error ? error.message : error);
  }

  const parts: string[] = [];
  if (sim.closed.length) parts.push(`closed ${sim.closed.length}`);
  if (sim.held.length) parts.push(`held ${sim.held.length}`);
  return {
    ...base,
    ran: true,
    reason: parts.length ? `Pre-close pass — ${parts.join(", ")} position(s).` : "Nothing open to sell.",
    closed: sim.closed,
    held: sim.held,
    scan,
  };
}

/**
 * Post-open pass (default 09:32 ET): refresh the data, rebuild every score and
 * re-rank, then buy the day's allocation from that fresh ranking. This score —
 * not yesterday's — is the authority for new purchases.
 */
export async function runPreOpenEntries(options: { force?: boolean } = {}): Promise<TimedPassResult> {
  const { marketStatus, nyParts, OPEN_MINUTES } = await import("./market-calendar");
  const { notify, generateInsights } = await import("./notify.server");
  const s = await loadSettings();
  const status = marketStatus();
  const wait = Math.max(0, Number(s.preopen_recheck_minutes ?? 2));
  const base: TimedPassResult = {
    ran: false,
    reason: "",
    market: `${status.label} — ${status.detail}`,
    ny_time: status.nyTime,
    opened: [],
    closed: [],
    held: [],
    scan: null,
    insights: 0,
  };

  if (!options.force) {
    if (!status.tradingDay) return { ...base, reason: `Market closed (${status.detail}).` };
    const sinceOpen = nyParts().minutes - OPEN_MINUTES;
    if (sinceOpen < wait) {
      return {
        ...base,
        reason:
          sinceOpen < 0
            ? "Waiting for the opening bell."
            : `Score runs ${wait} minute(s) after the open.`,
      };
    }
    if ((status.minutesToClose ?? 0) <= Math.max(1, Number(s.exit_buffer_minutes ?? 8))) {
      return { ...base, reason: "Too late in the session for a new entry." };
    }
  }

  // 1. Download the latest bars we're missing.
  const missing = await missingDates();
  for (const date of missing.slice(-3)) await cacheOneDay(date);

  // 2. Rebuild every indicator and re-rank the whole universe.
  const scan = await runScan();
  const scanInfo = { scored_count: scan.scored_count, bars_as_of: scan.bars_as_of };

  // 3. Stale or empty data is never treated as a valid new score.
  const required = await previousTradingDay(status.nyDate);
  const stale =
    scan.scored_count === 0 || !scan.bars_as_of || String(scan.bars_as_of) < required;
  if (stale) {
    const detail =
      scan.scored_count === 0
        ? "the feed returned nothing scoreable"
        : `newest data is ${scan.bars_as_of ?? "missing"}, expected ${required} or later`;
    await notify({
      kind: "health",
      title: "No purchase — market data is stale",
      body: `The ${wait}-minute post-open score could not be trusted (${detail}), so no buy was placed. It will retry on the next pass.`,
      severity: "bad",
      action: "No trade",
      dedupe_key: `stale-open:${status.nyDate}`,
    });
    return {
      ...base,
      ran: true,
      reason: `Stale data — no purchase (${detail}).`,
      scan: scanInfo,
    };
  }

  // 4. Broker truth first: trim anything larger than its stake and re-align the
  // cash ledger, so a doubled-up holding is corrected at the open too.
  try {
    await reconcileBroker();
  } catch (error) {
    console.error("reconcile failed:", error instanceof Error ? error.message : error);
  }

  // 5. Buy the day's allocation from the fresh ranking.
  const sim = await managePaperTrades({ phase: "entry" });

  for (const entry of sim.opened) {
    await notify({
      kind: "entry",
      title: `Bought ${entry.ticker} @ $${entry.price.toFixed(2)} (${entry.kind})`,
      body: `Scored ${wait} minute(s) after the open against ${scan.scored_count} names — highest-ranked eligible stock on today's fresh data.`,
      ticker: entry.ticker,
      severity: "good",
      action: s.paper_mode === false ? "Live entry" : "Simulated entry",
      dedupe_key: `entry:${entry.ticker}:${status.nyDate}`,
    });
  }
  // Paper strategy race: simulated buys on the same fresh ranking, isolated by
  // strategy_id and never sent to any broker.
  try {
    const { runRacePass } = await import("./race.server");
    await runRacePass({ phase: "entry" });
  } catch (error) {
    console.error("paper race (entry) failed:", error instanceof Error ? error.message : error);
  }

  const insights = await generateInsights(status.nyDate);

  return {
    ...base,
    ran: true,
    reason: sim.opened.length
      ? `Opened ${sim.opened.length} position(s) on the post-open score.`
      : "Post-open score done — nothing met the requirements, so nothing was bought.",
    opened: sim.opened,
    held: sim.held,
    scan: scanInfo,
    insights,
  };
}
