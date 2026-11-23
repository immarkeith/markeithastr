import { useQuery } from "@tanstack/react-query";

import { LAB_RANGES, PnlChart } from "@/components/PnlChart";
import { money } from "@/lib/queries";
import { fetchLabHistory } from "@/lib/race.functions";
import { parseLabHistory } from "@/lib/lab-history";
import { Button } from "@/components/ui/button";

const NAMES: Record<string, string> = {
  lead: "Lead Researcher",
  trend: "Trend Researcher",
  contrarian: "Contrarian Researcher",
  consistency: "Consistency Researcher",
  growth: "Growth Researcher",
  risk: "Risk Researcher",
  skeptic: "Skeptic",
};

/** Stored daily selection outcomes, independent of strategy holding books. */
export function HistoricalReconstruction() {
  const q = useQuery({ queryKey: ["lab-history"], queryFn: () => fetchLabHistory(), staleTime: 0, refetchOnMount: "always", refetchInterval: 5 * 60_000 });
  const h = parseLabHistory(q.data);
  return (
    <div className="min-w-0 space-y-3" aria-label="Historical selection replay">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Historical selection replay (same-day)</h2>
      {!h ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {q.isLoading ? "Loading…" : q.isError || q.data ? "Historical selection results are temporarily unavailable." : "No saved selection results yet."}
          </p>
          {!q.isLoading && (q.isError || q.data) ? <Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => void q.refetch()}>{q.isFetching ? "Checking…" : "Try again"}</Button> : null}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {h.from} to {h.to} · {h.selection_sessions.toLocaleString()} selection sessions · {h.universe.toLocaleString()}-stock comparable cached cohort.
            Selection at the prior session&apos;s close; $20 at the next session&apos;s open, exit at that session&apos;s close.
            Simulated gross P/L, before costs — separate from strategy books and live trading.
            Historical listing and delisting membership remains unverified.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {h.curves.map((c) => {
              const last = c.points[c.points.length - 1];
              return (
                <section key={c.lane} className="min-w-0 space-y-2 rounded border border-border/70 p-3">
                  <h3 className="break-words font-semibold">{NAMES[c.lane] ?? c.lane}</h3>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {c.trades} trades · {c.trades ? Math.round((c.wins / c.trades) * 100) : 0}% wins ·{" "}
                    {c.total_pnl >= 0 ? "+" : ""}
                    {money(c.total_pnl)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.pending > 0 && `${c.pending} pending · `}
                    {c.no_pick} no-pick sessions
                    {c.excluded + c.missing_evaluations > 0 && ` · ${c.excluded + c.missing_evaluations} excluded / missing outcomes`}
                  </p>
                  <PnlChart
                    rows={[]}
                    ranges={LAB_RANGES.filter((r) => r.key !== "live")}
                    initialRange="all"
                    title="Replayed P/L"
                    compact
                    ledgerOnly
                    equity={{
                      points: c.points,
                      coverage_from: c.points[0]?.date ?? null,
                      coverage_to: last?.date ?? null,
                      has_gaps: c.has_gaps,
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
