/**
 * Gate-protected reads. These tables hold the owner's trading data, so the
 * browser never queries them directly with the publishable key — every read
 * goes through these server functions behind the passcode gate.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const fetchSettings = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    return data;
  });

export const fetchLatestRun = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("scan_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const run = data?.[0] ?? null;
    const { data: scores, error: scoreErr } = await db
      .from("scan_scores")
      .select("*")
      .eq("run_id", run?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("rank", { ascending: true })
      .limit(50);
    if (scoreErr) throw new Error(scoreErr.message);
    return { run, scores: scores ?? [] };
  });

export const fetchRunHistory = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("scan_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const runs = data ?? [];
    const { data: scores, error: scoreErr } = await db
      .from("scan_scores")
      .select("*")
      .in(
        "run_id",
        runs.length > 0 ? runs.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"],
      )
      .lte("rank", 10)
      .order("rank", { ascending: true });
    if (scoreErr) throw new Error(scoreErr.message);
    return { runs, scores: scores ?? [] };
  });


export const fetchWatchlist = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("watchlist_candidates")
      .select("*")
      .order("streak_days", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fetchTrades = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("trades")
      .select("*")
      // Live book only; paper-race trades live in the Research Log.
      .is("strategy_id", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fetchLedger = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("ledger_entries")
      .select("*")
      .is("strategy_id", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fetchNotifications = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const fetchHealthChecks = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data, error } = await db
      .from("health_checks")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Capital ladder: the level the desk is trading at, how much cushion it has and
 * how close it is to the next scaling step.
 */
export const fetchCapitalLadder = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const [{ loadLadder, evaluateLadder, requiredCapital, describeStep, STABLE_DAYS_REQUIRED, CUSHION }, { scalingCapital }] =
      await Promise.all([import("./capital.server"), import("./scan.server")]);
    const db = await admin();
    const state = await loadLadder();
    const capital = await scalingCapital();
    const view = evaluateLadder({ ...state, hold_level: true }, capital);
    const { data: events } = await db
      .from("capital_ladder_events" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    return {
      level: describeStep(view.step),
      stocks_per_day: view.step.stocks,
      position_dollars: view.step.dollars,
      capital,
      required: view.required,
      cushion: Number((capital - view.step.stocks * view.step.dollars).toFixed(2)),
      cushion_target: CUSHION,
      next_level: view.next ? describeStep(view.next) : null,
      next_required: view.next_required,
      stable_days: state.stable_days,
      stable_days_required: STABLE_DAYS_REQUIRED,
      breach_days: state.breach_days,
      hold_level: state.hold_level,
      below_requirement: capital < requiredCapital(view.step),
      events: (events ?? []) as unknown as Array<{
        id: string;
        event_date: string;
        direction: string;
        to_stocks: number;
        to_dollars: number;
        note: string | null;
      }>,
    };
  });

/**
 * Everything the home dashboard shows in one call: the live account balance,
 * what is actually held right now (with any note about a failed sell), what is
 * queued to buy next, the best longer-term ideas and the closed-trade series
 * used for the profit/loss graph.
 */
export const fetchDashboard = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data: settings, error: settingsError } = await db
      .from("app_settings")
      .select("*")
      .eq("id", 1)
      .single();
    // Never guess the account: if the saved settings cannot be read we must say
    // so rather than quietly showing the simulated account's money.
    if (settingsError || !settings) {
      throw new Error(
        `Could not read the saved settings, so the real account was not shown: ${
          settingsError?.message ?? "no settings row found"
        }`,
      );
    }
    // Phase D: the broker is the live account only; paper research is internal.
    const mode = "live" as const;


    // Live broker snapshot. A broker outage must not blank the page.
    let account: {
      equity: number;
      cash: number;
      buying_power: number;
      status: string;
    } | null = null;
    let positions: Array<{
      ticker: string;
      qty: number;
      current_price: number;
      market_value: number;
      unrealized_pl: number;
      unrealized_plpc: number;
    }> = [];
    let broker_error: string | null = null;
    try {
      const { brokerAccount, listPositions } = await import("./broker.server");
      const acct = await brokerAccount(mode);
      account = {
        equity: acct.equity,
        cash: acct.cash,
        buying_power: acct.buying_power,
        status: acct.status,
      };
      positions = await listPositions(mode);
    } catch (error) {
      broker_error = error instanceof Error ? error.message : "Broker unavailable";
    }

    // Every query here is scoped to strategy_id IS NULL: that is the real book.
    // Paper-race rows carry a strategy_id and never reach this dashboard.
    const { data: openTrades } = await db
      .from("trades")
      .select("*")
      .eq("status", "open")
      .is("strategy_id", null)
      .eq("mode", mode);
    const { data: closedTrades } = await db
      .from("trades")
      .select("exit_date, profit, kept, ticker, mode")
      .eq("status", "closed")
      .is("strategy_id", null)
      .eq("mode", mode)
      .eq("position_type", "SAME_DAY")
      .order("exit_date", { ascending: true })
      .limit(400);
    // Long-term sales are kept on their own, so the same-day line never changes.
    const { data: closedLongTerm } = await db
      .from("trades")
      .select("exit_date, profit, kept, ticker, mode")
      .eq("status", "closed")
      .is("strategy_id", null)
      .eq("mode", mode)
      .eq("position_type", "LONG_TERM")
      .order("exit_date", { ascending: true })
      .limit(400);
    const { data: ledger } = await db
      .from("ledger_entries")
      .select("amount, available_on, kind")
      .is("strategy_id", null);

    const day = new Date().toISOString().slice(0, 10);
    let available = 0;
    let pending = 0;
    let saved = 0;
    for (const row of ledger ?? []) {
      const amount = Number(row.amount);
      if (String(row.kind) === "reserve") {
        saved += amount;
        continue;
      }
      if (String(row.available_on) <= day) available += amount;
      else pending += amount;
    }

    // Latest scores drive both the holding rank and the "up next" queue.
    const { data: runRow } = await db
      .from("scan_runs")
      .select("id, run_date, bars_as_of, scored_count")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: scores } = runRow
      ? await db
          .from("scan_scores")
          .select("ticker, rank, score, close, tradeable, invalidation")
          .eq("run_id", runRow.id as string)
          .order("rank", { ascending: true })
          .limit(25)
      : { data: [] as any[] };
    const byTicker = new Map((scores ?? []).map((r) => [String(r.ticker), r]));

    const { loadLadder } = await import("./capital.server");
    const ladder = await loadLadder();

    const heldTickers = new Set<string>();
    const holdings = (openTrades ?? []).map((t) => {
      const ticker = String(t.ticker);
      heldTickers.add(ticker);
      const pos = positions.find((p) => p.ticker === ticker.toUpperCase());
      const score = byTicker.get(ticker);
      const price = Number(pos?.current_price ?? score?.close ?? t.entry_price);
      const dollars = Number(t.dollars);
      const qty = Number(t.filled_qty ?? dollars / Number(t.entry_price));
      const marketValue = qty * price;
      const pl = marketValue - dollars;
      return {
        trade_id: String(t.id),
        ticker,
        kind: String(t.kind),
        position_type: String(t.position_type),
        entry_date: String(t.entry_date),
        entry_price: Number(t.entry_price),
        dollars,
        qty,
        price,
        market_value: Number(marketValue.toFixed(2)),
        pl: Number(pl.toFixed(2)),
        pl_pct: Number((((price / Number(t.entry_price)) - 1) * 100).toFixed(2)),
        rank: score ? Number(score.rank) : null,
        score: score ? Number(score.score) : null,
        still_qualifies: Boolean(score?.tradeable),
        note: (t as { status_note?: string | null }).status_note ?? null,
        // The owner's intended holding period, and when they will be asked.
        hold_horizon: (t as { hold_horizon?: string | null }).hold_horizon ?? null,
        review_date: (t as { review_date?: string | null }).review_date ?? null,
        hold_days: Number((t as { hold_days?: number | null }).hold_days ?? 0),
        hold_target_date: (t as { hold_target_date?: string | null }).hold_target_date ?? null,
      };
    });

    // Broker holdings with no matching open trade row are worth surfacing too.
    for (const pos of positions) {
      if (heldTickers.has(pos.ticker)) continue;
      holdings.push({
        trade_id: "",
        ticker: pos.ticker,
        kind: "untracked",
        position_type: "LONG_TERM",
        entry_date: "—",
        entry_price: pos.current_price,
        dollars: pos.market_value,
        qty: pos.qty,
        price: pos.current_price,
        market_value: pos.market_value,
        pl: pos.unrealized_pl,
        pl_pct: pos.unrealized_plpc,
        rank: null,
        score: null,
        still_qualifies: false,
        note: "Held at the broker without a matching ASTR trade record.",
        hold_horizon: null,
        review_date: null,
        hold_days: 0,
        hold_target_date: null,
      });
    }

    const sameDayHoldings = holdings.filter((h) => h.position_type === "SAME_DAY");
    const longTermHoldings = holdings.filter((h) => h.position_type === "LONG_TERM");
    const slots = Math.max(0, Number(ladder.stocks_per_day) - sameDayHoldings.length);
    const upNext = (scores ?? [])
      .filter((r) => r.tradeable && !heldTickers.has(String(r.ticker)))
      .slice(0, Math.max(1, slots || 1))
      .map((r) => ({
        ticker: String(r.ticker),
        score: Number(r.score),
        close: Number(r.close),
        invalidation: (r.invalidation as string | null) ?? null,
        stake: Number(ladder.position_dollars),
      }));

    const { data: watch } = await db
      .from("watchlist_candidates")
      .select("ticker, streak_days, status, best_pick_ever")
      .in("status", ["suggested", "requested", "approved"])
      .order("streak_days", { ascending: false })
      .limit(5);

    return {
      mode,
      bot_running: settings?.auto_run !== false && settings?.strategy_enabled !== false,
      account,
      broker_error,
      cash: {
        available: Number(available.toFixed(2)),
        pending: Number(pending.toFixed(2)),
        saved: Number(saved.toFixed(2)),
      },
      holdings,
      same_day_holdings: sameDayHoldings,
      long_term_holdings: longTermHoldings,
      up_next: upNext,
      slots,
      stake: Number(ladder.position_dollars),
      stocks_per_day: Number(ladder.stocks_per_day),
      suggestions: (watch ?? []).map((w) => ({
        ticker: String(w.ticker),
        streak_days: Number(w.streak_days),
        status: String(w.status),
        permanent: Number(w.streak_days) >= 10,
      })),
      scan: runRow
        ? {
            run_date: String(runRow.run_date),
            scored_count: Number(runRow.scored_count),
            bars_as_of: (runRow.bars_as_of as string | null) ?? null,
          }
        : null,
      closed: (closedTrades ?? []).map((t) => ({
        exit_date: String(t.exit_date),
        ticker: String(t.ticker),
        profit: Number(t.profit ?? 0),
      })),
      // Long-term sales and the open long-term move, kept apart from same-day.
      long_term_closed: (closedLongTerm ?? []).map((t) => ({
        exit_date: String(t.exit_date),
        ticker: String(t.ticker),
        profit: Number(t.profit ?? 0),
      })),
      long_term_open_pl: Number(
        longTermHoldings.reduce((sum, hold) => sum + Number(hold.pl ?? 0), 0).toFixed(2),
      ),
      total_profit: Number(
        (closedTrades ?? []).reduce((sum, trade) => sum + Number(trade.profit ?? 0), 0).toFixed(2),
      ),
    };
  });

export interface ScoreSnapshot {
  run_date: string;
  rank: number;
  score: number;
  close: number;
  tradeable: boolean;
  invalidation: string | null;
  factors: Record<string, { weighted_points: number; reasons: string[] }>;
  ml: {
    predicted_return: number | null;
    prob_positive: number | null;
    prob_target: number | null;
    combined_score: number | null;
    astr_score: number | null;
  } | null;
}

export interface TradeHistoryRow {
  id: string;
  ticker: string;
  kind: string;
  mode: string;
  status: string;
  dollars: number;
  entry_date: string;
  entry_at: string | null;
  entry_price: number;
  exit_date: string | null;
  exit_at: string | null;
  exit_price: number | null;
  profit: number | null;
  kept: number | null;
  status_note: string | null;
  shares: number;
  proceeds: number | null;
  pct: number | null;
  entry_score: ScoreSnapshot | null;
  exit_score: ScoreSnapshot | null;
  source_name: string;
  source_description: string | null;
}

/**
 * Every recorded buy/sell with the score evidence from the day it was bought
 * (and the day it was sold), so each row can explain itself.
 */
export const fetchTradeHistory = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const db = await admin();
    const { data: trades, error } = await db
      .from("trades")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = trades ?? [];

    const strategyIds = Array.from(
      new Set(rows.map((t) => t.strategy_id as string | null).filter((id): id is string => !!id)),
    );
    const { data: strategies } = strategyIds.length
      ? await db.from("strategies").select("id, name, description").in("id", strategyIds)
      : { data: [] as Array<{ id: string; name: string; description: string | null }> };
    const strategyById = new Map((strategies ?? []).map((s) => [String(s.id), s]));

    const tickers = Array.from(new Set(rows.map((t) => String(t.ticker).toUpperCase())));
    const dates = Array.from(
      new Set(
        rows.flatMap((t) =>
          [t.entry_date as string | null, t.exit_date as string | null].filter(
            (d): d is string => !!d,
          ),
        ),
      ),
    );

    // Scores are stored per scan run; map run ids back to their run_date.
    const { data: runs } = dates.length
      ? await db.from("scan_runs").select("id, run_date").in("run_date", dates)
      : { data: [] as Array<{ id: string; run_date: string }> };
    const runDate = new Map<string, string>();
    for (const r of runs ?? []) runDate.set(String(r.id), String(r.run_date));

    const { data: scores } = runs && runs.length && tickers.length
      ? await db
          .from("scan_scores")
          .select("run_id, ticker, rank, score, close, tradeable, invalidation, factors")
          .in(
            "run_id",
            (runs ?? []).map((r) => String(r.id)),
          )
          .in("ticker", tickers)
      : { data: [] as never[] };

    const { data: preds } = dates.length && tickers.length
      ? await db
          .from("model_predictions")
          .select(
            "ticker, as_of_date, predicted_return, prob_positive, prob_target, combined_score, astr_score",
          )
          .in("as_of_date", dates)
          .in("ticker", tickers)
      : { data: [] as never[] };

    const predKey = new Map<string, ScoreSnapshot["ml"]>();
    for (const p of preds ?? []) {
      predKey.set(`${String(p.ticker).toUpperCase()}|${String(p.as_of_date)}`, {
        predicted_return: p.predicted_return === null ? null : Number(p.predicted_return),
        prob_positive: p.prob_positive === null ? null : Number(p.prob_positive),
        prob_target: p.prob_target === null ? null : Number(p.prob_target),
        combined_score: p.combined_score === null ? null : Number(p.combined_score),
        astr_score: p.astr_score === null ? null : Number(p.astr_score),
      });
    }

    const snapKey = new Map<string, ScoreSnapshot>();
    for (const s of scores ?? []) {
      const date = runDate.get(String(s.run_id));
      if (!date) continue;
      const ticker = String(s.ticker).toUpperCase();
      snapKey.set(`${ticker}|${date}`, {
        run_date: date,
        rank: Number(s.rank),
        score: Number(s.score),
        close: Number(s.close),
        tradeable: Boolean(s.tradeable),
        invalidation: (s.invalidation as string | null) ?? null,
        factors: (s.factors ?? {}) as ScoreSnapshot["factors"],
        ml: predKey.get(`${ticker}|${date}`) ?? null,
      });
    }

    // The strategy that is currently driving the scoring weights.
    const { data: settings } = await db
      .from("app_settings")
      .select("active_strategy_id, strategy_enabled, ml_enabled")
      .eq("id", 1)
      .maybeSingle();
    let strategy_name: string | null = null;
    if (settings?.active_strategy_id) {
      const { data: strat } = await db
        .from("strategies")
        .select("name")
        .eq("id", settings.active_strategy_id as string)
        .maybeSingle();
      strategy_name = (strat?.name as string | null) ?? null;
    }

    const history: TradeHistoryRow[] = rows.map((t) => {
      const ticker = String(t.ticker).toUpperCase();
      const dollars = Number(t.dollars);
      const entryPrice = Number(t.entry_price);
      const exitPrice = t.exit_price === null ? null : Number(t.exit_price);
      const shares = Number(t.filled_qty ?? (entryPrice > 0 ? dollars / entryPrice : 0));
      return {
        id: String(t.id),
        ticker,
        kind: String(t.kind),
        mode: String(t.mode),
        status: String(t.status),
        dollars,
        entry_date: String(t.entry_date),
        entry_at: (t.entry_at as string | null) ?? (t.created_at as string | null) ?? null,
        entry_price: entryPrice,
        exit_date: (t.exit_date as string | null) ?? null,
        exit_at: (t.exit_at as string | null) ?? null,
        exit_price: exitPrice,
        profit: t.profit === null ? null : Number(t.profit),
        kept: t.kept === null ? null : Number(t.kept),
        status_note: (t.status_note as string | null) ?? null,
        shares: Number(shares.toFixed(6)),
        proceeds: exitPrice === null ? null : Number((shares * exitPrice).toFixed(2)),
        pct:
          exitPrice === null || entryPrice <= 0
            ? null
            : Number(((exitPrice / entryPrice - 1) * 100).toFixed(2)),
        entry_score: snapKey.get(`${ticker}|${String(t.entry_date)}`) ?? null,
        exit_score: t.exit_date ? (snapKey.get(`${ticker}|${String(t.exit_date)}`) ?? null) : null,
        source_name: t.strategy_id
          ? String(strategyById.get(String(t.strategy_id))?.name ?? "Research formula")
          : "Live Trading Bot",
        source_description: t.strategy_id
          ? ((strategyById.get(String(t.strategy_id))?.description as string | null | undefined) ?? null)
          : strategy_name,
      };
    });

    return {
      trades: history,
      strategy_name,
      strategy_enabled: Boolean(settings?.strategy_enabled ?? true),
      ml_enabled: Boolean(settings?.ml_enabled ?? false),
    };
  });
