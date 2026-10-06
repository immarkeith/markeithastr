import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { researcherLiveBuy } from "@/lib/assign.functions";
import type { AnalyzeResult } from "@/lib/analyze-types";

function fmtHold(d: number) {
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
  const rows = [...(result.researchers ?? [])].sort(
    (a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity),
  );
  if (!rows.length) return null;
  const amt = Number(dollars);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 bg-secondary/60 px-3 py-2">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Best fit first · real money</p>
        <div className="flex items-center gap-1 text-sm">
          $<Input className="h-8 w-20" inputMode="decimal" value={dollars} onChange={(e) => setDollars(e.target.value)} />
        </div>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.researcher} className={`border-t border-border ${i === 0 ? "bg-primary/10" : ""}`}>
              <td className="px-3 py-2 font-medium">
                {r.researcher.replace(" Researcher", "")} ({fmtHold(r.hold_days)})
                {i === 0 ? <span className="ml-2 text-xs text-primary">Best fit</span> : null}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                <span className={r.score !== null && r.score >= r.min_score ? "text-success" : "text-muted-foreground"}>
                  {r.score === null ? "—" : r.score.toFixed(1)}
                </span>
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
