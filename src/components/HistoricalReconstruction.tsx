import { useQuery } from "@tanstack/react-query";

import { LAB_RANGES, PnlChart } from "@/components/PnlChart";
import { money } from "@/lib/queries";
import { fetchLabHistory } from "@/lib/race.functions";

const NAMES: Record<string, string> = {
  lead: "Lead Researcher",
  trend: "Trend Researcher",
  contrarian: "Contrarian Researcher",
  consistency: "Consistency Researcher",
  growth: "Growth Researcher",
  risk: "Risk Researcher",
  skeptic: "Skeptic",
};

/** Historical replay of each researcher's formula on real past market data. */
export function HistoricalReconstruction() {
  const q = useQuery({ queryKey: ["lab-history"], queryFn: () => fetchLabHistory(), staleTime: 60 * 60_000 });
  const h = q.data;
  return (
    <div className="space-y-3">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Historical reconstruction</h2>
      {!h ? (
        <p className="text-sm text-muted-foreground">
          {q.isLoading ? "Loading…" : "The historical replay has not finished yet."}
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Replay of each researcher&apos;s formula from {h.from} to {h.to} across {h.universe.toLocaleString()} US
            stocks (including ones later delisted). Picks use only data known before each morning; $20 bought at the
            open and sold at the close. Simulated — kept separate from paper and live trades.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {h.curves.map((c) => {
              const last = c.points[c.points.length - 1];
              return (
                <section key={c.lane} className="space-y-2 rounded border border-border/70 p-3">
                  <h3 className="font-semibold">{NAMES[c.lane] ?? c.lane}</h3>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {c.trades} trades · {c.trades ? Math.round((c.wins / c.trades) * 100) : 0}% wins ·{" "}
                    {c.total_pnl >= 0 ? "+" : ""}
                    {money(c.total_pnl)}
                  </p>
                  <PnlChart
                    rows={[]}
                    ranges={LAB_RANGES.filter((r) => r.key !== "live")}
                    initialRange="all"
                    title="Replayed P/L"
                    compact
                    percent
                    basis={20}
                    equity={{
                      points: c.points,
                      coverage_from: c.points[0]?.date ?? null,
                      coverage_to: last?.date ?? null,
                      has_gaps: false,
                    }}
                  />
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
