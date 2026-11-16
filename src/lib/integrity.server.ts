/**
 * Autonomous integrity audit — runs the Lead Self-Audit engine on a daily and
 * weekly cadence, stores results in audit_integrity_results, and alerts only
 * on FAIL verdicts. Warnings are logged but never pushed as alerts.
 *
 * Phase 1 of the ASTR autonomous monitoring system.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runLeadSelfAudit, type LeadAuditReport } from "./audit.server";

export type IntegrityCadence = "daily" | "weekly" | "manual";

export interface IntegrityResult {
  cadence: IntegrityCadence;
  verdict: string;
  summary: string;
  report: LeadAuditReport;
  stored: boolean;
}

/**
 * Run a scheduled integrity audit. Stores the full report in
 * audit_integrity_results and alerts only when the overall verdict is FAIL.
 */
export async function runIntegrityCheck(
  cadence: IntegrityCadence = "daily",
): Promise<IntegrityResult> {
  const report = await runLeadSelfAudit({
    lookbackDays: cadence === "weekly" ? 180 : 60,
    sampleCount: cadence === "weekly" ? 60 : 15,
  });

  const pillarSummary = Object.values(report.pillars)
    .map((p) => `${p.name}: ${p.verdict}`)
    .join(", ");
  const summary = `[${cadence.toUpperCase()}] ${report.overallVerdict} — ${pillarSummary}`;

  // Store the result (graceful: table may not exist yet)
  let stored = false;
  try {
    const { error } = await untypedDb().from("audit_integrity_results").insert({
      cadence,
      overall_verdict: report.overallVerdict,
      pillars: report.pillars as never,
      discrepancies: report.discrepancies as never,
      summary,
    });
    stored = !error;
    if (error) console.error("Integrity result could not be stored:", error.message);
  } catch (error) {
    console.error("Integrity result could not be stored:", error instanceof Error ? error.message : "write failed");
  }

  // Alert only on FAIL — warnings are logged but not pushed.
  if (report.overallVerdict === "FAIL" && cadence !== "manual") {
    try {
    const { notify } = await import("./notify.server");
    const failCount = report.discrepancies.filter((d) => d.severity === "error").length;
    const detail = report.discrepancies
      .filter((d) => d.severity === "error")
      .slice(0, 3)
      .map((d) => d.reason)
      .join(" ");
    await notify({
      kind: "health",
      title: `ASTR ${cadence} integrity audit FAILED`,
      body: `${failCount} mathematical violation(s) detected. ${detail}`,
      severity: "bad",
      action: "Open the Audit Desk to review",
      dedupe_key: `integrity-${cadence}:${new Date().toISOString().slice(0, 10)}`,
    });
    } catch (error) {
      console.error("Integrity notification failed:", error instanceof Error ? error.message : "notification failed");
    }
  }

  return { cadence, verdict: report.overallVerdict, summary, report, stored };
}

export interface IntegrityHistoryRow {
  id: string;
  checked_at: string;
  cadence: string;
  overall_verdict: string;
  summary: string | null;
}

/** Fetch recent integrity results for the Audit Desk. */
export async function recentIntegrityResults(limit = 10): Promise<IntegrityHistoryRow[]> {
  try {
    const { data, error } = await untypedDb()
      .from("audit_integrity_results")
      .select("id, checked_at, cadence, overall_verdict, summary")
      .order("checked_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as unknown as IntegrityHistoryRow[];
  } catch {
    return [];
  }
}

// Phase K / audit tables are not in the generated types until their migrations run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untypedDb(): any {
  return supabaseAdmin;
}
