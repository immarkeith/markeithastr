import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { researcherLiveBuy } from "@/lib/assign.functions";
import type { AnalyzeResult } from "@/lib/analyze-types";

function fmtHold(d: number) {
  if (d === 0) return "same day";
  if (d >= 252) return "1 year";
  if (d >= 21 && d % 21 === 0) return `${d / 21} month${d === 21 ? "" : "s"}`;
  return `${d} day${d === 1 ? "" : "s"}`;
}

/**
 * Phase A: researchers ranked by best fit for THIS stock. A recommendation,
 * never an auto-assignment — the owner picks a row and BUY places a REAL live
 * order that records that researcher and its recommended hold.
 */
export function ResearcherBuyTable({ result }: { result: AnalyzeResult }) {
  const qc = useQueryClient();
  const [dollars, setDollars] = useState("50");
  const buyFn = useServerFn(researcherLiveBuy);
  const buy = useMutation({
    mutationFn: (r: { researcher: string; hold_days: number }) =>
      buyFn({
        data: {
          ticker: result.ticker,
          researcher: r.researcher as never,
          hold_days: r.hold_days,
          dollars: Number(dollars),
          estimated_price: result.close ?? 0,
        },
      }),
    onSuccess: async (r) => {
      toast.success(`Bought ${r.ticker} live at $${r.entry_price.toFixed(2)} — ${r.researcher.replace(" Researcher", "")} (${fmtHold(r.hold_days)}).`);
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = [...(result.researchers ?? [])].sort((a, b) => (b.fit ?? -Infinity) - (a.fit ?? -Infinity));
  if (!rows.length) return null;
  const amt = Number(dollars);
  // If even the best-fit specialist fails its own bar, the honest signal is to
  // consider passing — the table never cascades to #2 on its own.
  const topFails = rows[0]!.qualified === false;

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 bg-secondary/60 px-3 py-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Specialists · best fit first · real money</p>
        <div className="flex items-center gap-1 text-sm">
          $<Input className="h-8 w-20" inputMode="decimal" value={dollars} onChange={(e) => setDollars(e.target.value)} />
        </div>
      </div>
      <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
        Lead Researcher is the overall synthesis (the main score above), not ranked here. Each hold below was found by testing that specialist's formula on {result.ticker}'s own history.
      </p>
      {topFails ? (
        <p className="border-t border-warning/40 bg-warning/10 px-3 py-1.5 text-[11px] font-medium text-warning">
          Top specialist does not qualify against its own bar — consider passing on {result.ticker}.
        </p>
      ) : null}
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.researcher} className={`border-t border-border ${i === 0 ? "bg-primary/10" : ""}`}>
              <td className="px-3 py-2 font-medium">
                {r.researcher.replace(" Researcher", "")} ({fmtHold(r.hold_days)})
                {i === 0 ? <span className="ml-2 text-xs text-primary">Best fit</span> : null}
                {r.qualified === true ? (
                  <span className="ml-2 text-xs font-semibold text-success">Qualified</span>
                ) : null}
                <div className="text-[11px] font-normal text-muted-foreground">
                  {r.samples} past signals · avg {r.avg_return_pct}% · {r.win_rate}% up
                </div>
                {r.qualified === false && r.qualify_reason ? (
                  <div className="text-[11px] font-normal text-warning">{r.qualify_reason}</div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                <span className={r.score !== null && r.score >= r.min_score ? "text-success" : "text-muted-foreground"}>
                  {r.fit === undefined ? "—" : r.fit.toFixed(0)}
                </span>
                <div className="text-[10px] text-muted-foreground">fit</div>
              </td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant={i === 0 ? "default" : "outline"}
                  disabled={buy.isPending || result.close === null || !(amt >= 1)}
                  onClick={() => {
                    if (window.confirm(`Place a REAL $${amt} buy of ${result.ticker} for ${r.researcher.replace(" Researcher", "")} (${fmtHold(r.hold_days)})?`)) {
                      buy.mutate({ researcher: r.researcher, hold_days: r.hold_days });
                    }
                  }}>
                  BUY
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
