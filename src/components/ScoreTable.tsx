import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FACTOR_LABELS } from "@/lib/scoring";
import type { ScanScoreRow } from "@/lib/queries";
import { cn } from "@/lib/utils";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <div
        className={cn("h-full rounded-full", score >= 60 ? "bg-success" : "bg-primary")}
        style={{ width: `${Math.min(100, Math.max(2, score))}%` }}
      />
    </div>
  );
}

export function ScoreTable({ rows }: { rows: ScanScoreRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No scored names yet. Load market data, then run a scan.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Ticker</th>
            <th className="px-3 py-2 text-right">Score</th>
            <th className="hidden px-3 py-2 sm:table-cell">Strength</th>
            <th className="px-3 py-2 text-right">Close</th>
            <th className="hidden px-3 py-2 text-right md:table-cell">SMA20</th>
            <th className="px-3 py-2 text-right">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = open === row.id;
            return (
              <Fragment key={row.id}>
                <tr
                  onClick={() => setOpen(isOpen ? null : row.id)}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-accent/50"
                >
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.rank}</td>
                  <td className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      {isOpen ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      )}
                      {row.ticker}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary">
                    {Number(row.score).toFixed(1)}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    <ScoreBar score={Number(row.score)} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    ${Number(row.close).toFixed(2)}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums text-muted-foreground md:table-cell">
                    {row.sma20 === null ? "—" : `$${Number(row.sma20).toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.tradeable ? (
                      <Badge className="bg-success text-success-foreground hover:bg-success">
                        tradeable
                      </Badge>
                    ) : (
                      <Badge variant="secondary">watch</Badge>
                    )}
                  </td>
                </tr>
                {isOpen ? (
                  <tr className="border-t border-border bg-secondary/30">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(row.factors ?? {}).map(([name, factor]) => (
                          <div key={name} className="rounded border border-border bg-card p-3">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                                {FACTOR_LABELS[name] ?? name}
                              </span>
                              <span className="tabular-nums font-semibold text-primary">
                                +{Number(factor.weighted_points).toFixed(1)}
                              </span>
                            </div>
                            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                              {(factor.reasons ?? []).map((reason) => (
                                <li key={reason}>· {reason}</li>
                              ))}
                              {(factor.reasons ?? []).length === 0 ? <li>· no contribution</li> : null}
                            </ul>
                          </div>
                        ))}
                      </div>
                      {row.invalidation ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          <span className="text-destructive">Invalidation:</span> {row.invalidation}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
