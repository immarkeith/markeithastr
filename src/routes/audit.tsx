import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { getLeadAudit, runLeadAuditNow } from "@/lib/audit.functions";

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
    color: "text-emerald-500",
    bg: "border-emerald-500/30 bg-emerald-500/10",
    label: "ALL PILLARS VERIFIED (PASS)",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "border-amber-500/30 bg-amber-500/10",
    label: "ADVISORY WARNINGS DETECTED",
  },
  FAIL: {
    icon: XCircle,
    color: "text-rose-500",
    bg: "border-rose-500/30 bg-rose-500/10",
    label: "MATHEMATICAL VIOLATIONS DETECTED (FAIL)",
  },
};

function AuditDeskPage() {
  const qc = useQueryClient();
  const load = useServerFn(getLeadAudit);
  const runNow = useServerFn(runLeadAuditNow);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lead-audit"],
    queryFn: () => load(),
  });

  const auditMutation = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (res) => {
      const message = `Audit completed with verdict: ${res.overallVerdict}`;
      if (res.overallVerdict === "PASS") toast.success(message);
      else toast.error(message);
      qc.invalidateQueries({ queryKey: ["lead-audit"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const report = data;
  const verdict = report?.overallVerdict ?? "WARNING";
  const cfg = VERDICT_CONFIG[verdict];
  const evidenceUnavailable = Boolean(report && Object.values(report.pillars).some((pillar) => pillar.summary === "Audit could not read its evidence."));
  const Icon = cfg.icon;

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Quantitative Audit Desk</h1>
          <p className="text-sm text-muted-foreground">
            Daily raw-bar trade reconstruction, immutable scoreboard recalculation, closed-loop balance reconciliation, and look-ahead bias validation.
          </p>
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
      <div className={`flex items-center gap-4 rounded-xl border p-5 ${cfg.bg}`}>
        <Icon className={`h-10 w-10 shrink-0 ${cfg.color}`} />
        <div>
          <div className={`text-lg font-bold tracking-wide ${cfg.color}`}>{evidenceUnavailable ? "AUDIT BLOCKED — EVIDENCE UNAVAILABLE" : report ? cfg.label : isError ? "AUDIT EVIDENCE UNAVAILABLE" : "AUDIT NOT YET VERIFIED"}</div>
          <div className="text-xs text-muted-foreground">
            Last verified: {report?.timestamp ? new Date(report.timestamp).toLocaleString() : "Running check…"}
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
        {!report || report.discrepancies.length === 0 ? (
          <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {report ? "Zero discrepancies detected in the evidence audited above." : "No verified report available yet."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">Identifier</th>
                  <th className="p-3">Expected</th>
                  <th className="p-3">Actual</th>
                  <th className="p-3">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.discrepancies.map((d, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="p-3 font-medium uppercase text-muted-foreground">{d.category.replace("_", " ")}</td>
                    <td className="p-3 font-mono">{d.identifier}</td>
                    <td className="p-3 text-muted-foreground">{String(d.expected)}</td>
                    <td className="p-3 text-destructive font-mono">{String(d.actual)}</td>
                    <td className="p-3 text-muted-foreground">{d.reason}</td>
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
