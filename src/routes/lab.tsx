import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FEATURE_LABELS, type FeatureName } from "@/lib/features";
import {
  getModelHistory,
  runPredictLatest,
  runWalkForwardNow,
} from "@/lib/research.functions";
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
  const walkForward = useServerFn(runWalkForwardNow);
  const predict = useServerFn(runPredictLatest);
  const history = useServerFn(getModelHistory);
  const [sessions, setSessions] = useState("12");
  const [universe, setUniverse] = useState("400");
  const [mlUniverse, setMlUniverse] = useState("300");

  const test = useMutation({
    mutationFn: () =>
      run({ data: { sessions: Number(sessions) || 12, universe: Number(universe) || 400 } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const models = useQuery({ queryKey: ["model-history"], queryFn: () => history() });

  const wf = useMutation({
    mutationFn: () => walkForward({ data: { universe: Number(mlUniverse) || 300, folds: 4 } }),
    onSuccess: async (res) => {
      const best = [...res.systems].sort((a, b) => b.avg_return_pct - a.avg_return_pct)[0];
      toast.success(
        best
          ? `${res.folds} fold(s) tested — best out-of-sample: ${best.label}.`
          : "Not enough history to complete a fold.",
      );
      await models.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const live = useMutation({
    mutationFn: () => predict({ data: { universe: Number(mlUniverse) || 300 } }),
    onSuccess: (res) =>
      res.rows.length === 0
        ? toast.info("Not enough completed history to train on yet — load more market data.")
        : toast.success(`Predicted ${res.rows.length} names for ${res.as_of}.`),
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

      <hr className="border-border/60" />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Predictive model (walk-forward)</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A pattern-learning model (random forest) trains on past sessions and is graded only on
            the sessions that came after — never on days it learned from. The table compares three
            systems on exactly the same out-of-sample days: your ASTR score alone, the model alone,
            and the blend set in Settings. Nothing here changes your live picks.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
          <div className="space-y-1">
            <Label htmlFor="mlUniverse">Tickers per session</Label>
            <Input
              id="mlUniverse"
              className="w-28"
              inputMode="numeric"
              value={mlUniverse}
              onChange={(e) => setMlUniverse(e.target.value)}
            />
          </div>
          <Button onClick={() => wf.mutate()} disabled={wf.isPending}>
            {wf.isPending ? "Training folds…" : "Run walk-forward test"}
          </Button>
          <Button variant="secondary" onClick={() => live.mutate()} disabled={live.isPending}>
            {live.isPending ? "Predicting…" : "Predict today's names"}
          </Button>
        </div>

        {models.data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Graded predictions"
              value={`${models.data.accuracy.graded}`}
              hint="past predictions with a known outcome"
            />
            <StatTile
              label="Direction called right"
              value={
                models.data.accuracy.directional_accuracy === null
                  ? "—"
                  : `${models.data.accuracy.directional_accuracy}%`
              }
              tone={(models.data.accuracy.directional_accuracy ?? 0) > 50 ? "positive" : "default"}
            />
            <StatTile
              label="Top 10% actual return"
              value={
                models.data.accuracy.top_decile_avg === null
                  ? "—"
                  : `${models.data.accuracy.top_decile_avg}%`
              }
              hint="highest-ranked names, realised"
            />
            <StatTile
              label="Models trained"
              value={`${models.data.models.length}`}
              hint={models.data.models[0]?.trained_at?.slice(0, 10) ?? "none yet"}
            />
          </div>
        )}

        {wf.data && (
          <>
            <p className="text-sm text-muted-foreground">
              {wf.data.folds} fold(s) · train {wf.data.train_days} / test {wf.data.test_days}{" "}
              sessions · {wf.data.tickers} tickers · holding {wf.data.holding_days} day(s) · through{" "}
              {wf.data.as_of ?? "—"} · target {wf.data.target}
            </p>

            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">System</th>
                    <th className="p-2 text-right">Trades</th>
                    <th className="p-2 text-right">Win rate</th>
                    <th className="p-2 text-right">Avg</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">vs SPY</th>
                    <th className="p-2 text-right">Worst drawdown</th>
                    <th className="p-2 text-right">Profit factor</th>
                    <th className="p-2 text-right">Sharpe</th>
                    <th className="p-2 text-right">Rank corr.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...wf.data.systems]
                    .sort((a, b) => b.avg_return_pct - a.avg_return_pct)
                    .map((sys, i) => (
                      <tr key={sys.id} className={i === 0 ? "bg-success/5" : ""}>
                        <td className="p-2 font-semibold">
                          {sys.label}
                          {i === 0 && <span className="ml-2 text-xs text-success">best</span>}
                        </td>
                        <td className="p-2 text-right tabular-nums">{sys.picks}</td>
                        <td className="p-2 text-right tabular-nums">{sys.win_rate}%</td>
                        <td
                          className={`p-2 text-right tabular-nums ${
                            sys.avg_return_pct >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {sys.avg_return_pct >= 0 ? "+" : ""}
                          {sys.avg_return_pct}%
                        </td>
                        <td className="p-2 text-right tabular-nums">{sys.total_return_pct}%</td>
                        <td className="p-2 text-right tabular-nums">
                          {sys.avg_vs_benchmark_pct >= 0 ? "+" : ""}
                          {sys.avg_vs_benchmark_pct}%
                        </td>
                        <td className="p-2 text-right tabular-nums">{sys.max_drawdown_pct}%</td>
                        <td className="p-2 text-right tabular-nums">{sys.profit_factor}</td>
                        <td className="p-2 text-right tabular-nums">{sys.sharpe}</td>
                        <td className="p-2 text-right tabular-nums">{sys.rank_ic ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {wf.data.warnings.length > 0 && (
              <ul className="list-disc space-y-1 rounded-md border border-warning/40 bg-warning/5 p-3 pl-6 text-xs text-muted-foreground">
                {wf.data.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-md border border-border p-3">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
                  Does a higher model rank actually pay?
                </h3>
                {wf.data.buckets.map((b) => (
                  <div key={b.bucket} className="flex justify-between text-xs tabular-nums">
                    <span>{b.bucket}</span>
                    <span
                      className={b.avg_return_pct >= 0 ? "text-success" : "text-destructive"}
                    >
                      {b.avg_return_pct >= 0 ? "+" : ""}
                      {b.avg_return_pct}% · {b.win_rate}% win · {b.rows} rows
                    </span>
                  </div>
                ))}
                <h3 className="pt-2 text-xs uppercase tracking-widest text-muted-foreground">
                  By market regime
                </h3>
                {wf.data.regimes.map((r) => (
                  <div key={r.regime} className="flex justify-between text-xs tabular-nums">
                    <span>{r.regime}</span>
                    <span className={r.avg_return_pct >= 0 ? "text-success" : "text-destructive"}>
                      {r.avg_return_pct >= 0 ? "+" : ""}
                      {r.avg_return_pct}% · {r.win_rate}% win
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
                  What the model leans on most
                </h3>
                {wf.data.importance.map((f) => (
                  <div key={f.feature} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{FEATURE_LABELS[f.feature as FeatureName] ?? f.feature}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(f.weight * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, f.weight * 300)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {live.data && live.data.rows.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-widest text-muted-foreground">
              Model view of {live.data.as_of} (top 15)
            </h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">Ticker</th>
                    <th className="p-2 text-right">ASTR score</th>
                    <th className="p-2 text-right">Expected move</th>
                    <th className="p-2 text-right">Chance up</th>
                    <th className="p-2 text-right">Chance hits target</th>
                    <th className="p-2 text-right">Blended rank</th>
                  </tr>
                </thead>
                <tbody>
                  {live.data.rows.slice(0, 15).map((row) => (
                    <tr key={row.ticker} className="border-t border-border/60">
                      <td className="p-2 font-semibold">{row.ticker}</td>
                      <td className="p-2 text-right tabular-nums">
                        {row.astr_score === null ? "—" : row.astr_score.toFixed(1)}
                      </td>
                      <td
                        className={`p-2 text-right tabular-nums ${
                          row.predicted_return >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {row.predicted_return >= 0 ? "+" : ""}
                        {row.predicted_return}%
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {Math.round(row.prob_positive * 100)}%
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {Math.round(row.prob_target * 100)}%
                      </td>
                      <td className="p-2 text-right tabular-nums">{row.combined_score ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>

  );
}
