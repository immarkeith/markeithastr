/**
 * Repair log — records each allowlisted repair the autonomous health loop
 * performs, with before/after state and post-repair verification. Degrades
 * gracefully: if the audit_repair_log table does not exist yet (migration not
 * run), logging is skipped silently so the health loop is never blocked.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RepairType =
  | "backfill_history"
  | "cache_missing_days"
  | "rerun_scan"
  | "rescore_empty_scan"
  | "settle_stale_paper";

export interface RepairEntry {
  repair_type: RepairType;
  target?: string | null;
  before_status?: Record<string, unknown>;
  after_status?: Record<string, unknown>;
  verified: boolean;
  verification_note?: string | null;
  source?: string;
}

/** Log a repair to audit_repair_log. Never throws — table may not exist yet. */
export async function logRepair(entry: RepairEntry): Promise<void> {
  try {
    await supabaseAdmin.from("audit_repair_log").insert({
      repair_type: entry.repair_type,
      target: entry.target ?? null,
      before_status: (entry.before_status ?? {}) as never,
      after_status: (entry.after_status ?? {}) as never,
      verified: entry.verified,
      verification_note: entry.verification_note ?? null,
      source: entry.source ?? "health_loop",
    });
  } catch {
    // Table may not exist yet — never block the health loop.
  }
}

export interface RepairLogRow {
  id: string;
  checked_at: string;
  repair_type: string;
  target: string | null;
  verified: boolean;
  verification_note: string | null;
  source: string;
}

/** Fetch recent repair log entries for the Audit Desk. */
export async function recentRepairs(limit = 20): Promise<RepairLogRow[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("audit_repair_log")
      .select("id, checked_at, repair_type, target, verified, verification_note, source")
      .order("checked_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as unknown as RepairLogRow[];
  } catch {
    return [];
  }
}
