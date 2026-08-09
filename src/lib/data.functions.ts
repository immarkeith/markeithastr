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
