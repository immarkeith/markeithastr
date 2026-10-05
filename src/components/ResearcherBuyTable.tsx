import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { researcherBuy } from "@/lib/assign.functions";
import type { AnalyzeResult } from "@/lib/analyze-types";

function fmtHold(d: number) {
  if (d >= 252) return "1Y";
  if (d >= 21 && d % 21 === 0) return `${d / 21}M`;
  return `${d}D`;
}

/** Phase A: every researcher's score + hold for this ticker, with a paper BUY per row. */
export function ResearcherBuyTable({ result }: { result: AnalyzeResult }) {
  const qc = useQueryClient();
  const buyFn = useServerFn(researcherBuy);
  const buy = useMutation({
    mutationFn: (researcher: string) =>
      buyFn({ data: { ticker: result.ticker, researcher: researcher as never } }),
    onSuccess: async (r) => {
      toast.success(`${r.researcher} paper-bought ${r.ticker} at $${r.price.toFixed(2)}, holding ${fmtHold(r.hold_days)}.`);
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = result.researchers ?? [];
  if (!rows.length) return null;
  const best = rows.reduce<string | null>((b, r) => {
    const top = rows.find((x) => x.researcher === b);
    return r.score !== null && (top?.score ?? -Infinity) < r.score ? r.researcher : b;
  }, null);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <p className="bg-secondary/60 px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        Researchers — paper only, no real money
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => {
            const top = r.researcher === best;
            return (
              <tr key={r.researcher} className={`border-t border-border ${top ? "bg-primary/10" : ""}`}>
                <td className="px-3 py-2 font-medium">
                  {r.researcher.replace(" Researcher", "")}
                  {top ? <span className="ml-2 text-xs text-primary">Top fit</span> : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className={r.score !== null && r.score >= r.min_score ? "text-success" : "text-muted-foreground"}>
                    {r.score === null ? "—" : r.score.toFixed(1)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtHold(r.hold_days)}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant={top ? "default" : "outline"} disabled={buy.isPending || result.close === null}
                    onClick={() => buy.mutate(r.researcher)}>
                    BUY
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
