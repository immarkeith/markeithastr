/**
 * Phase C — 9-cell Market Regime matrix for the Research Lab.
 *
 * Shows how each specialist's formula performed in every combination of
 * market direction (Bull / Bear / Sideways) and volatility (Low / Normal /
 * High), evaluated out-of-sample with point-in-time classification and an
 * explicit cost assumption. Cells are only called Favorable or Vulnerable
 * when the evidence tier is Moderate+ AND significant after the
 * Benjamini-Hochberg correction — small samples are labeled honestly.
 */
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getRegime } from "@/lib/regime.functions";
import type { CellVerdict, RegimeReport } from "@/lib/regime.server";

const DIRECTIONS = ["bull", "bear", "sideways"] as const;
const VOLS = ["low", "normal", "high"] as const;

const VERDICT_STYLE: Record<CellVerdict, string> = {
  favorable: "border-success/60 bg-success/10 text-success",
  vulnerable: "border-destructive/60 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted/40 text-muted-foreground",
  insufficient_data: "border-border/50 bg-transparent text-muted-foreground/70",
};

const VERDICT_LABEL: Record<CellVerdict, string> = {
  favorable: "Favorable",
  vulnerable: "Vulnerable",
  neutral: "Neutral",
  insufficient_data: "Low data",
};

function Cell({ cell }: { cell: RegimeReport["lanes"][number]["cells"][number] }) {
  return (
    <div
      className={`rounded border p-2 text-center ${VERDICT_STYLE[cell.verdict]}`}
      title={`${cell.setups} setups across ${cell.sessions} sessions · evidence: ${cell.evidence}${
        cell.t_stat !== null ? ` · t=${cell.t_stat}` : ""
      }${cell.max_drawdown_pct !== null ? ` · max DD ${cell.max_drawdown_pct}%` : ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide">
        {VERDICT_LABEL[cell.verdict]}
      </p>
      <p className="mt-0.5 text-xs tabular-nums">
        {cell.avg_return_pct === null
          ? "—"
          : `${cell.avg_return_pct >= 0 ? "+" : ""}${cell.avg_return_pct}%`}
      </p>
      <p className="text-[9px] tabular-nums opacity-80">
        n={cell.setups}
        {cell.win_rate !== null ? ` · ${cell.win_rate}% win` : ""}
      </p>
    </div>
  );
}

export function RegimeMatrix() {
  const regime = useQuery({ queryKey: ["regime"], queryFn: () => getRegime() });
  const lanes = regime.data?.lanes ?? [];
  const [laneKey, setLaneKey] = useState<string | null>(null);
  const active = lanes.find((l) => l.lane === laneKey) ?? lanes[0];

  if (regime.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading regime analysis…</p>;
  }
  if (!regime.data) {
    return (
      <p className="text-sm text-muted-foreground">
        No regime analysis yet — run one to see how each formula behaves across market
        conditions.
      </p>
    );
  }
  const report: RegimeReport = regime.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          As of {report.as_of ?? "—"} · {report.spy_sessions} benchmark sessions · cost
          assumption {report.cost_assumption_pct}% round-trip
        </span>
      </div>

      {report.warnings.length > 0 ? (
        <div className="space-y-1 rounded border border-warning/60 bg-warning/10 p-3 text-xs">
          {report.warnings.map((w) => (
            <p key={w} className="text-warning">
              {w}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1" role="group" aria-label="Researcher">
        {lanes.map((l) => (
          <button
            key={l.lane}
            type="button"
            onClick={() => setLaneKey(l.lane)}
            className={`rounded border px-2.5 py-1 text-xs font-semibold ${
              active?.lane === l.lane
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <span />
            {VOLS.map((v) => (
              <span key={v} className="text-center">
                {v} vol
              </span>
            ))}
          </div>
          {DIRECTIONS.map((direction) => (
            <div key={direction} className="grid grid-cols-4 items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {direction}
              </span>
              {VOLS.map((vol) => {
                const cell = active.cells.find(
                  (c) => c.direction === direction && c.volatility === vol,
                );
                return cell ? (
                  <Cell key={vol} cell={cell} />
                ) : (
                  <div key={vol} className="rounded border border-border/50 p-2 text-center text-xs text-muted-foreground/70">
                    —
                  </div>
                );
              })}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">
            Provisional max-drawdown limit for {active.name}: {active.provisional_max_drawdown_pct}%
            (starting research setting — only changes after a historically tested proposal).
            Verdicts require Moderate+ evidence and survive multiple-testing correction; small
            samples are never called a proven edge.
          </p>
        </div>
      ) : null}
    </div>
  );
}
