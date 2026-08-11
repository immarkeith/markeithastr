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
