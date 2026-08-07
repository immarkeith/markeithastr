import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { runStrategyLab } from "@/lib/scan.functions";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Strategy lab — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Replay alternative factor-weight formulas over cached market history to see which scoring mix would have picked better.",
      },
      { property: "og:title", content: "Strategy lab — ASTR" },
      {
        property: "og:description",
        content: "Compare scoring formulas against recent sessions before you change the weights.",
      },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const run = useServerFn(runStrategyLab);
  const [sessions, setSessions] = useState("12");
  const [universe, setUniverse] = useState("400");

  const test = useMutation({
    mutationFn: () =>
      run({ data: { sessions: Number(sessions) || 12, universe: Number(universe) || 400 } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const result = test.data;
  const ranked = [...(result?.results ?? [])].sort(
    (a, b) => b.total_return_pct - a.total_return_pct,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Strategy lab</h1>
        <p className="text-sm text-muted-foreground">
          Between the daily buy and sell, this replays different scoring formulas over the price
          history already cached — no extra data calls, no real money. The winner tells you which
          weight mix to try in Settings.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="sessions">Sessions to replay</Label>
          <Input
            id="sessions"
            className="w-28"
            inputMode="numeric"
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="universe">Tickers per session</Label>
          <Input
            id="universe"
            className="w-28"
            inputMode="numeric"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
          />
        </div>
        <Button onClick={() => test.mutate()} disabled={test.isPending}>
          {test.isPending ? "Replaying…" : "Run comparison"}
        </Button>
      </div>

      {result && (
        <p className="text-sm text-muted-foreground">
          {result.sessions} sessions · {result.tickers} tickers · through {result.as_of ?? "—"} ·{" "}
          {result.picks_per_day} pick(s)/day at score ≥ {result.min_score}
        </p>
      )}

      {ranked.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Formula</th>
                <th className="p-2 text-right">Picks</th>
                <th className="p-2 text-right">Win rate</th>
                <th className="p-2 text-right">Avg / trade</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-left">Best</th>
                <th className="p-2 text-left">Worst</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.id} className={i === 0 ? "bg-success/5" : ""}>
                  <td className="p-2 font-semibold">
                    {r.label}
                    {i === 0 && <span className="ml-2 text-xs text-success">best</span>}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {r.weights.trend}/{r.weights.momentum}/{r.weights.volume}/
                      {r.weights.relative_strength}/{r.weights.volatility_quality}
                    </span>
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.picks}</td>
                  <td className="p-2 text-right tabular-nums">{r.win_rate}%</td>
                  <td
                    className={`p-2 text-right tabular-nums ${
                      r.avg_return_pct >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {r.avg_return_pct >= 0 ? "+" : ""}
                    {r.avg_return_pct}%
                  </td>
                  <td
                    className={`p-2 text-right tabular-nums ${
                      r.total_return_pct >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {r.total_return_pct >= 0 ? "+" : ""}
                    {r.total_return_pct}%
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {r.best ? `${r.best.ticker} ${r.best.ret > 0 ? "+" : ""}${r.best.ret}%` : "—"}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {r.worst ? `${r.worst.ticker} ${r.worst.ret}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!result && !test.isPending && (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Run a comparison to see how each formula would have done. Needs cached market data first.
        </p>
      )}
    </div>
  );
}
