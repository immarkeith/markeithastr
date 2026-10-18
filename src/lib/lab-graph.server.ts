/**
 * Persistent snapshots for the Research Lab graphs.
 *
 * The Lab's charts used to be recalculated from scratch every time the page
 * opened: full universe re-scoring, Alpaca marks, and a complete historical
 * mark-to-market equity rebuild for all seven paper books. That made the page
 * slow and made every visit pay for work that had not changed.
 *
 * Design (FEATURES.md §8):
 * - FULL REBUILD: `rebuildLabGraph()` computes the whole payload (standings,
 *   equity curves, long-term win rates, capital analysis) and stores it as one
 *   `research_runs` row with kind "lab_graph", together with the metadata
 *   needed to validate it later: a fingerprint of every input that would
 *   change the result (formulas, slots, settings) and per-book trade-count
 *   watermarks.
 * - SERVE: `readLabGraph()` returns the latest valid saved payload. The page
 *   reads this instead of recomputing; it is a single database read.
 * - INCREMENTAL REFRESH: `refreshLabGraphIntraday()` appends only the newest
 *   session points to the stored curves (realized P/L lands on exit dates and
 *   daily marks priced from authentic cached closes — identical math to the
 *   full rebuild, applied only to new data) and re-marks open positions with
 *   live quotes while the market is open. Anything unexplained by the
 *   watermarks (backfilled history, formula change) falls back to a full
 *   rebuild, so incremental is only used when it is mathematically equivalent.
 *
 * Correctness rules: never invent a data point, never carry a value forward to
 * imply movement, never interpolate a gap. Sessions without a cached bar stay
 * absent and keep the curve's has_gaps flag set. Stored curves keep their
 * maximum history; rolling windows are applied at render time.
 *
 * Server-only. Research only — nothing here touches live trading.
 */
import { createHash } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

import type { CapitalAnalysisResult } from "./capital-analysis";
import type { EquityPoint, RaceEntrant, ResearcherEquityCurve } from "./race.server";

/** research_runs.kind value for Research Lab graph snapshots. */
export const LAB_GRAPH_KIND = "lab_graph";

export interface CurveGuard {
  strategy_id: string;
  /** Number of closed trades when the snapshot was written. */
  closed_count: number;
  /** Number of recorded hypothetical same-day results when it was written. */
  sameday_count: number;
  /** Last date a real point backs in the stored curve. */
  coverage_to: string | null;
  /** The open paper positions at snapshot time (the incremental-append set). */
  held: { ticker: string; entry_date: string; entry_price: number; dollars: number }[];
}

export interface LabGraphGuards {
  fingerprint: string;
  curve_guards: CurveGuard[];
  generated_at: string;
}

export interface LabGraphPayload {
  entrants: RaceEntrant[];
  days_running: number;
  min_days: number;
  suggestion: { name: string; strategy_id: string; edge: number } | null;
  equity_curves: ResearcherEquityCurve[];
  strategies: { id: string; name: string; description: string }[];
  long_term_win_rates: Record<
    string,
    { horizon: "1M" | "3M" | "9M"; wins: number; completed: number; win_rate: number | null }[]
  >;
  capital_analysis: CapitalAnalysisResult;
}

export interface LabGraphSnapshot {
  rowId: string;
  payload: LabGraphPayload;
  guards: LabGraphGuards;
}

// -------------------------------------------------------------- guards -------

/**
 * Fingerprint of every input that changes the graph result. A mismatch means
 * the saved snapshot is stale in a way incremental math cannot patch, and the
 * next refresh rebuilds fully.
 */
async function computeFingerprint(): Promise<string> {
  const { loadSlots } = await import("./race.server");
  const { loadSettings } = await import("./scan.server");
  const [slots, settings] = await Promise.all([loadSlots(), loadSettings()]);
  const { data: strategies, error } = await supabaseAdmin
    .from("strategies")
    .select("id, name, params");
  if (error) throw new Error(error.message);
  return createHash("sha256")
    .update(
      JSON.stringify({
        slots: slots.map((s) => [s.id, s.strategy_id, s.enabled, s.position_dollars, s.started_on]),
        strategies: strategies ?? [],
        active: settings.active_strategy_id ?? null,
        settlement: Number(settings.settlement_days),
        keep: Number(settings.profit_keep_pct),
      }),
    )
    .digest("hex");
}

async function closedTradeCount(strategyId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("strategy_id", strategyId)
    .eq("status", "closed");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function samedayCount(strategyId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq("strategy_id", strategyId)
    .not("same_day_profit", "is", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function heldOf(rows: Record<string, unknown>[] | null): CurveGuard["held"] {
  return (rows ?? []).map((r) => ({
    ticker: String(r["ticker"]),
    entry_date: String(r["entry_date"] ?? ""),
    entry_price: Number(r["entry_price"] ?? 0),
    dollars: Number(r["dollars"] ?? 0),
  }));
}

async function buildCurveGuards(
  equityCurves: ResearcherEquityCurve[],
): Promise<CurveGuard[]> {
  const { loadSlots } = await import("./race.server");
  const slots = await loadSlots();
  const out: CurveGuard[] = [];
  for (const slot of slots) {
    const curve = equityCurves.find((c) => c.strategy_id === slot.strategy_id);
    const [openRows, closed, sameday] = await Promise.all([
      supabaseAdmin
        .from("trades")
        .select("ticker, entry_date, entry_price, dollars")
        .eq("strategy_id", slot.strategy_id)
        .eq("status", "open"),
      closedTradeCount(slot.strategy_id),
      samedayCount(slot.strategy_id),
    ]);
    out.push({
      strategy_id: slot.strategy_id,
      closed_count: closed,
      sameday_count: sameday,
      coverage_to: curve?.coverage_to ?? null,
      held: heldOf(openRows?.data as unknown as Record<string, unknown>[] | null),
    });
  }
  return out;
}

// ------------------------------------------------------------ full rebuild ----

/**
 * Recompute everything the Lab renders and save it. This is the only place
 * that runs the full historical rebuild; the scheduled hooks call it at end of
 * day, and the page calls it only when no valid snapshot exists.
 */
export async function rebuildLabGraph(): Promise<{
  payload: LabGraphPayload;
  guards: LabGraphGuards;
}> {
  const { raceStandings } = await import("./race.server");
  const { researcherLongTermWinRates } = await import("./long-term-research.server");
  const { capitalAnalysis } = await import("./capital-analysis.server");
  const [standings, winRates, capital] = await Promise.all([
    raceStandings(),
    researcherLongTermWinRates(),
    capitalAnalysis(),
  ]);
  const { data: strategies, error } = await supabaseAdmin
    .from("strategies")
    .select("id, name, description")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const payload: LabGraphPayload = {
    entrants: standings.entrants,
    days_running: standings.days_running,
    min_days: standings.min_days,
    suggestion: standings.suggestion,
    equity_curves: standings.equity_curves,
    strategies: strategies ?? [],
    long_term_win_rates: winRates,
    capital_analysis: capital,
  };
  const guards: LabGraphGuards = {
    fingerprint: await computeFingerprint(),
    curve_guards: await buildCurveGuards(payload.equity_curves),
    generated_at: new Date().toISOString(),
  };
  const { error: insertError } = await supabaseAdmin.from("research_runs").insert({
    kind: LAB_GRAPH_KIND,
    config: { generated_at: guards.generated_at } as unknown as Json,
    summary: { payload, guards } as unknown as Json,
  });
  if (insertError) throw new Error(insertError.message);
  return { payload, guards };
}

// ------------------------------------------------------------------ serve ----

/** Latest saved Lab graph snapshot, or null before the first rebuild. */
export async function readLabGraph(): Promise<LabGraphSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("research_runs")
    .select("id, summary, created_at")
    .eq("kind", LAB_GRAPH_KIND)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const parsed = data.summary as unknown as {
    payload?: LabGraphPayload;
    guards?: LabGraphGuards;
  } | null;
  if (!parsed?.payload?.entrants || !parsed.guards?.generated_at) return null;
  return { rowId: String(data.id), payload: parsed.payload, guards: parsed.guards };
}

// ------------------------------------------------------------ incremental ----

interface PricedPosition {
  ticker: string;
  entry_date: string;
  entry_price: number;
  dollars: number;
  exit_date: string | null;
}

/**
 * Append only the new sessions to each stored curve. Returns null whenever the
 * stored watermarks cannot fully explain the new data (so a full rebuild is
 * the honest path instead of a possibly-wrong incremental patch).
 */
async function appendCurves(
  existing: LabGraphSnapshot,
): Promise<{ payload: LabGraphPayload; guards: LabGraphGuards } | null> {
  const { nyParts, isTradingDay } = await import("./market-calendar");
  const day = nyParts().date;
  const curves = existing.payload.equity_curves.map((c) => ({ ...c, points: [...c.points] }));
  const curvesById = new Map(curves.map((c) => [c.strategy_id, c]));
  const nextGuards: CurveGuard[] = [];

  for (const guard of existing.guards.curve_guards) {
    const curve = curvesById.get(guard.strategy_id);
    if (!curve) return null;

    const [closed, sameday] = await Promise.all([
      closedTradeCount(guard.strategy_id),
      samedayCount(guard.strategy_id),
    ]);

    // A book with nothing on record has nothing to append — keep it current.
    if (curve.points.length === 0 && guard.held.length === 0) {
      nextGuards.push({ ...guard, closed_count: closed, sameday_count: sameday });
      continue;
    }
    // An open position with no curve history yet cannot be priced incrementally.
    if (guard.coverage_to === null) return null;

    const exitsCount = await supabaseAdmin
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("strategy_id", guard.strategy_id)
      .eq("status", "closed")
      .gt("exit_date", guard.coverage_to);
    if (exitsCount.error) throw new Error(exitsCount.error.message);
    const samedayCountSince = await supabaseAdmin
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("strategy_id", guard.strategy_id)
      .not("same_day_profit", "is", null)
      .gt("entry_date", guard.coverage_to);
    if (samedayCountSince.error) throw new Error(samedayCountSince.error.message);
    const exitsSince = exitsCount.count ?? 0;
    const samedaySince = samedayCountSince.count ?? 0;
    // New rows the watermarks do not explain (e.g. replay backfilled older
    // history) invalidate the incremental path.
    if (closed - guard.closed_count !== exitsSince) return null;
    if (sameday - guard.sameday_count !== samedaySince) return null;

    const [exitedDetails, openRows] = await Promise.all([
      supabaseAdmin
        .from("trades")
        .select("ticker, entry_date, entry_price, dollars, exit_date, profit")
        .eq("strategy_id", guard.strategy_id)
        .eq("status", "closed")
        .gt("exit_date", guard.coverage_to)
        .order("exit_date", { ascending: true }),
      supabaseAdmin
        .from("trades")
        .select("ticker, entry_date, entry_price, dollars")
        .eq("strategy_id", guard.strategy_id)
        .eq("status", "open"),
    ]);
    if (exitedDetails.error) throw new Error(exitedDetails.error.message);
    if (openRows.error) throw new Error(openRows.error.message);

    const positions: PricedPosition[] = [
      ...((exitedDetails.data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        ticker: String(r["ticker"]),
        entry_date: String(r["entry_date"] ?? ""),
        entry_price: Number(r["entry_price"] ?? 0),
        dollars: Number(r["dollars"] ?? 0),
        exit_date: r["exit_date"] ? String(r["exit_date"]) : null,
      })),
      ...heldOf(openRows.data as unknown as Record<string, unknown>[] | null).map((h) => ({
        ...h,
        exit_date: null,
      })),
    ];

    const tickers = [...new Set(positions.map((p) => p.ticker))];
    const realizedByDate = new Map<string, number>();
    for (const r of (exitedDetails.data ?? []) as unknown as Record<string, unknown>[]) {
      const date = r["exit_date"] ? String(r["exit_date"]) : "";
      if (!date) continue;
      realizedByDate.set(date, (realizedByDate.get(date) ?? 0) + Number(r["profit"] ?? 0));
    }

    if (tickers.length === 0) {
      nextGuards.push({
        strategy_id: guard.strategy_id,
        closed_count: closed,
        sameday_count: sameday,
        coverage_to: curve.coverage_to,
        held: [],
      });
      continue;
    }

    const { data: barRows, error: barError } = await supabaseAdmin
      .from("daily_bars")
      .select("ticker, bar_date, close")
      .in("ticker", tickers)
      .gt("bar_date", guard.coverage_to)
      .lte("bar_date", day)
      .order("bar_date", { ascending: true });
    if (barError) throw new Error(barError.message);

    const closeAt = new Map<string, number>();
    for (const r of barRows ?? []) {
      closeAt.set(`${String(r.ticker)}|${String(r.bar_date)}`, Number(r.close));
    }
    const dateSet = new Set<string>();
    for (const r of barRows ?? []) dateSet.add(String(r.bar_date));
    for (const date of realizedByDate.keys()) if (date <= day) dateSet.add(date);
    const dates = [...dateSet].sort();

    const lastPoint = curve.points[curve.points.length - 1];
    let running = lastPoint ? lastPoint.equity : 0;
    const appended: EquityPoint[] = [];
    let gaps = curve.has_gaps;

    for (const date of dates) {
      let delta = 0;
      let touched = false;
      for (const p of positions) {
        if (!p.entry_date || p.entry_date > date) continue;
        if (p.exit_date !== null && p.exit_date < date) continue;
        const close = closeAt.get(`${p.ticker}|${date}`);
        if (close === undefined) continue;
        delta += p.dollars * (close / p.entry_price - 1);
        touched = true;
      }
      const realized = realizedByDate.get(date);
      if (realized !== undefined) {
        delta += realized;
        touched = true;
      }
      if (!touched) continue;
      running += delta;
      appended.push({ date, equity: Number(running.toFixed(2)) });
    }

    // Interior-gap detection over only the new span (FEATURES §8.2): a session
    // a held position should cover but has no bar for is a gap, never movement.
    const sessionsBetween = (from: string, to: string): string[] => {
      const out: string[] = [];
      const cur = new Date(`${from}T00:00:00Z`);
      const end = new Date(`${to}T00:00:00Z`);
      while (cur <= end && out.length < 400) {
        const iso = cur.toISOString().slice(0, 10);
        if (isTradingDay(iso)) out.push(iso);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return out;
    };
    for (const p of positions) {
      const heldDates = [...closeAt.keys()]
        .filter((k) => k.startsWith(`${p.ticker}|`))
        .map((k) => k.split("|")[1]!);
      const lastHeld = heldDates[heldDates.length - 1];
      const target = p.exit_date ?? lastHeld;
      if (!target) {
        gaps = true;
        continue;
      }
      const start = p.entry_date > guard.coverage_to ? p.entry_date : guard.coverage_to;
      if (start > target) continue;
      for (const session of sessionsBetween(start, target)) {
        if (!closeAt.has(`${p.ticker}|${session}`)) {
          gaps = true;
          break;
        }
      }
    }

    curve.points = [...curve.points, ...appended];
    curve.has_gaps = gaps;
    const newLast = appended[appended.length - 1];
    curve.coverage_to = newLast ? newLast.date : curve.coverage_to;
    nextGuards.push({
      strategy_id: guard.strategy_id,
      closed_count: closed,
      sameday_count: sameday,
      coverage_to: curve.coverage_to,
      held: heldOf(openRows.data as unknown as Record<string, unknown>[] | null),
    });
  }

  return {
    payload: { ...existing.payload, equity_curves: curves },
    guards: {
      fingerprint: existing.guards.fingerprint,
      curve_guards: nextGuards,
      generated_at: new Date().toISOString(),
    },
  };
}

/** True while the New York session is open (or about to close). */
function marketIsOpen(state: string): boolean {
  return state === "open" || state === "closing";
}

/**
 * Re-mark every open position in the payload with live quotes, in place.
 * Returns false when the market is closed or the quote request failed — the
 * caller then keeps the previous marks rather than implying fresh movement.
 */
async function markQuotes(payload: LabGraphPayload): Promise<boolean> {
  const { marketStatus, nyParts } = await import("./market-calendar");
  if (!marketIsOpen(marketStatus().state)) return false;
  const tickers = [
    ...new Set(payload.entrants.flatMap((e) => e.holdings.map((h) => h.ticker))),
  ];
  if (tickers.length === 0) return true;
  try {
    const { alpacaLatestPrices } = await import("./market-data.server");
    const live = await alpacaLatestPrices(tickers);
    const day = nyParts().date;
    for (const entrant of payload.entrants) {
      let unrealized = 0;
      let todays = 0;
      let atWork = 0;
      for (const h of entrant.holdings) {
        const price = Number(live.get(h.ticker) ?? h.prev_close);
        h.price = Number(price.toFixed(4));
        h.pl = Number((h.dollars * (price / h.entry_price - 1)).toFixed(2));
        h.pl_pct = Number(((price / h.entry_price - 1) * 100).toFixed(2));
        const from = h.entry_date === day ? h.entry_price : h.prev_close;
        h.today_pl = Number((h.dollars * (price / from - 1)).toFixed(2));
        unrealized += h.pl;
        todays += h.today_pl;
        atWork += h.dollars;
      }
      entrant.unrealized = Number(unrealized.toFixed(2));
      entrant.unrealized_today = Number(todays.toFixed(2));
      entrant.basis = Number(Math.max(1, entrant.cash.capital + atWork).toFixed(2));
    }
    return true;
  } catch (error) {
    console.error(
      "intraday quote refresh failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Background refresh, safe to fire every five minutes. Appends new session
 * points to the stored curves and re-marks open positions; falls back to a
 * full rebuild whenever the saved snapshot cannot be validated. Always writes
 * back to the same row, so no unbounded history accumulates intraday.
 */
export async function refreshLabGraphIntraday(): Promise<{
  payload: LabGraphPayload;
  guards: LabGraphGuards;
  mode: "appended" | "rebuilt";
}> {
  const existing = await readLabGraph();
  if (!existing) {
    const built = await rebuildLabGraph();
    return { ...built, mode: "rebuilt" };
  }
  const fingerprint = await computeFingerprint();
  if (fingerprint !== existing.guards.fingerprint) {
    const built = await rebuildLabGraph();
    return { ...built, mode: "rebuilt" };
  }
  const appended = await appendCurves(existing);
  if (!appended) {
    const built = await rebuildLabGraph();
    return { ...built, mode: "rebuilt" };
  }
  await markQuotes(appended.payload);
  appended.guards.generated_at = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("research_runs")
    .update({
      summary: { payload: appended.payload, guards: appended.guards } as unknown as Json,
      config: { generated_at: appended.guards.generated_at } as unknown as Json,
    })
    .eq("id", existing.rowId);
  if (error) throw new Error(error.message);
  return { ...appended, mode: "appended" };
}
