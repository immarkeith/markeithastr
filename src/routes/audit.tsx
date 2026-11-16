import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw, Wrench, Clock } from "lucide-react";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import {
  getLeadAudit,
  runLeadAuditNow,
  getRepairLogs,
  getIntegrityHistory,
} from "@/lib/audit.functions";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Lead Quantitative Audit Desk — ASTR" },
      {
        name: "description",
        content:
          "Independent quantitative audit engine verifying fills, scoreboard stats, closed-loop balances, and look-ahead bias.",
      },
      { property: "og:title", content: "Lead Quantitative Audit Desk — ASTR" },
      {
        property: "og:description",
        content:
          "Zero-leak balance reconciliation, authentic bar fill reconstruction, and lookahead bias verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditDeskPage,
});

const VERDICT_CONFIG = {
  PASS: {
    icon: ShieldCheck,
    color: "text-success",
    bg: "border-success/30 bg-success/10",
    label: "ALL PILLARS VERIFIED (PASS)",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-primary",
    bg: "border-primary/30 bg-primary/10",
    label: "ADVISORY WARNINGS DETECTED",
  },
  FAIL: {
    icon: XCircle,
    color: "text-destructive",
    bg: "border-destructive/30 bg-destructive/10",
    label: "MATHEMATICAL VIOLATIONS DETECTED (FAIL)",
  },
};

function AuditDeskPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const load = useServerFn(getLeadAudit);
  const runNow = useServerFn(runLeadAuditNow);

  const { data, isLoading, error } = useQuery({
    queryKey: ["lead-audit"],
    queryFn: () => load(),
  });

  const repairsLoad = useServerFn(getRepairLogs);
  const { data: repairLogs } = useQuery({
    queryKey: ["repair-logs"],
    queryFn: () => repairsLoad(),
  });

  const integrityLoad = useServerFn(getIntegrityHistory);
  const { data: integrityHistory } = useQuery({
    queryKey: ["integrity-history"],
    queryFn: () => integrityLoad(),
  });

  const auditMutation = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (res) => {
      qc.setQueryData(["lead-audit"], res.report);
      qc.invalidateQueries({ queryKey: ["integrity-history"] });
      if (!res.stored) toast.warning("Audit completed, but history could not be saved.");
      else toast.success(`Audit saved: ${res.verdict}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const report = data;
  const verdict = report?.overallVerdict ?? "WARNING";
  const cfg = VERDICT_CONFIG[verdict];
  const Icon = cfg.icon;
  const filtered = report?.discrepancies.filter(d => (category === "all" || d.category === category) && (severity === "all" || d.severity === severity)) ?? [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Quantitative Audit Desk</h1>
        </div>
        <Button
          onClick={() => auditMutation.mutate()}
          disabled={auditMutation.isPending || isLoading}
          className="shrink-0"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${auditMutation.isPending ? "animate-spin" : ""}`} />
          {auditMutation.isPending ? "Auditing…" : "Run Audit Now"}
        </Button>
      </header>

      {/* Main Verdict Card */}
      <div className={`flex items-center gap-4 border-y p-5 ${cfg.bg}`}>
        <Icon className={`h-10 w-10 shrink-0 ${cfg.color}`} />
        <div>
          <div className={`text-lg font-bold tracking-wide ${cfg.color}`}>{report ? cfg.label : error ? "AUDIT UNAVAILABLE" : "CHECKING AUDIT EVIDENCE…"}</div>
          <div className="text-xs text-muted-foreground">
            Last checked:{" "}
            {report?.timestamp ? new Date(report.timestamp).toLocaleString() : "Running check…"}
          </div>
        </div>
      </div>

      {/* 4 Pillar Stat Cards */}
      {report && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Raw-Bar Fills"
            value={report.pillars.reconstruction.verdict}
            hint={report.pillars.reconstruction.summary}
          />
          <StatTile
            label="Scoreboard Math"
            value={report.pillars.statsRecalculation.verdict}
            hint={report.pillars.statsRecalculation.summary}
          />
          <StatTile
            label="Balance Integrity"
            value={report.pillars.balanceReconciliation.verdict}
            hint={report.pillars.balanceReconciliation.summary}
          />
          <StatTile
            label="Look-Ahead Bias"
            value={report.pillars.lookaheadValidation.verdict}
            hint={report.pillars.lookaheadValidation.summary}
          />
        </div>
      )}

      {/* Discrepancy Ledger Table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Audit Discrepancy Ledger</h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Discrepancy category">
          {([["all", "All"], ["fill_reconstruction", "Fills"], ["scoreboard_drift", "Scoreboard"], ["balance_leak", "Balance"], ["lookahead_bias", "Lookahead"]] as const).map(([value, label]) => (
            <Button key={value} size="sm" variant={category === value ? "secondary" : "ghost"} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</Button>
          ))}
        </div>
        <div className="flex gap-1" role="group" aria-label="Discrepancy severity">
          {([["all", "All severities"], ["error", "FAIL"], ["warning", "WARNING"]] as const).map(([value, label]) => (
            <Button key={value} size="sm" variant={severity === value ? "secondary" : "ghost"} aria-pressed={severity === value} onClick={() => setSeverity(value)}>{label}</Button>
          ))}
        </div>
        {!report || filtered.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {!report ? (error ? "Audit could not be loaded. Try Run Audit Now." : "Checking evidence…") : report.discrepancies.length ? "No discrepancies match these filters." : "No discrepancies detected in the checked records."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Identifier</th>
                  <th className="p-3">Expected</th>
                  <th className="p-3">Actual</th>
                  <th className="p-3">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((d, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="p-3 font-medium uppercase text-muted-foreground">
                      {d.category.replace(/_/g, " ")}
                    </td>
                    <td className={`p-3 font-semibold ${d.severity === "error" ? "text-destructive" : "text-primary"}`}>{d.severity === "error" ? "FAIL" : "WARNING"}</td>
                    <td className="p-3 font-mono">{d.identifier}</td>
                    <td className="p-3 text-muted-foreground">{String(d.expected)}</td>
                    <td className={`p-3 font-mono ${d.severity === "error" ? "text-destructive" : "text-primary"}`}>{String(d.actual)}</td>
                    <td className="p-3 text-muted-foreground">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Autonomous Repair Log */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Autonomous Repair Log</h2>
        </div>
        {!repairLogs || repairLogs.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No autonomous repairs logged yet. The health loop logs each allowlisted repair here with
            post-repair verification.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Repair</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Verified</th>
                  <th className="p-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {repairLogs.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.checked_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">{r.repair_type.replace(/_/g, " ")}</td>
                    <td className="p-3 font-mono text-muted-foreground">{r.target ?? "—"}</td>
                    <td className="p-3">
                      {r.verified ? (
                        <span className="font-medium text-success">✓ verified</span>
                      ) : (
                        <span className="font-medium text-primary">unverified</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{r.verification_note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Integrity Audit History */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">Integrity Audit History</h2>
        </div>
        {!integrityHistory || integrityHistory.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No scheduled integrity audits yet. Daily and weekly audits appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Cadence</th>
                  <th className="p-3">Verdict</th>
                  <th className="p-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {integrityHistory.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {new Date(r.checked_at).toLocaleString()}
                    </td>
                    <td className="p-3 font-medium uppercase">{r.cadence}</td>
                    <td className="p-3">
                      <span
                        className={
                          r.overall_verdict === "PASS"
                            ? "font-medium text-success"
                            : r.overall_verdict === "WARNING"
                              ? "font-medium text-primary"
                              : "font-medium text-destructive"
                        }
                      >
                        {r.overall_verdict}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.summary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
