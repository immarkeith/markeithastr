import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { ScoreTable } from "@/components/ScoreTable";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { latestRunQuery, settingsQuery } from "@/lib/queries";
import { cacheDay, getBarStatus, runScanNow } from "@/lib/scan.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Scan — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Run a wide-universe daily scan: factor-weighted scores, tradeable signals and today's rotation plan.",
      },
      { property: "og:title", content: "Scan — ASTR Daily Rotation Desk" },
      {
        property: "og:description",
        content: "Factor-weighted daily rotation scores across thousands of liquid US stocks.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const qc = useQueryClient();
  const barStatusFn = useServerFn(getBarStatus);
  const cacheDayFn = useServerFn(cacheDay);
  const runScanFn = useServerFn(runScanNow);

  const status = useQuery({ queryKey: ["bar-status"], queryFn: () => barStatusFn({}) });
  const settings = useQuery(settingsQuery);
  const latest = useQuery(latestRunQuery);

  const [loading, setLoading] = useState<{ done: number; total: number } | null>(null);

  async function loadMarketData() {
    const missing = status.data?.missing ?? [];
    if (missing.length === 0) {
      toast.info("Price history is already up to date.");
      return;
    }
    setLoading({ done: 0, total: missing.length });
    try {
      for (let i = 0; i < missing.length; i++) {
        const date = missing[i]!;
        const res = await cacheDayFn({ data: { date } });
        setLoading({ done: i + 1, total: missing.length });
        if (!res.trading_day) continue;
      }
      toast.success("Price history cached.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load market data.");
    } finally {
      setLoading(null);
      await qc.invalidateQueries({ queryKey: ["bar-status"] });
    }
  }

  const scan = useMutation({
    mutationFn: () => runScanFn({}),
    onSuccess: async (res) => {
      toast.success(`Scored ${res.scored_count} of ${res.universe_size} tickers.`);
      await qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const s = settings.data;
  const scores = latest.data?.scores ?? [];
  const tradeable = scores.filter((r) => r.tradeable);
  const plan = tradeable.slice(0, Number(s?.num_day_trades ?? 2));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Daily rotation scan</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Whole-market daily bars are cached once per trading day, so scans and history cost no
          extra data requests. Scores blend trend, momentum, volume, relative strength and
          volatility quality.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Bars cached"
          value={`${status.data?.days_cached ?? 0} days`}
          hint={status.data?.newest ? `newest ${status.data.newest}` : "no data yet"}
        />
        <StatTile
          label="Universe (latest day)"
          value={`${status.data?.tickers_latest ?? 0}`}
          hint={`cap ${s?.max_universe ?? "—"} tickers`}
          tone="accent"
        />
        <StatTile
          label="Last scan"
          value={latest.data?.run ? String(latest.data.run.run_date) : "—"}
          hint={latest.data?.run?.note ?? "not run yet"}
        />
        <StatTile
          label="Tradeable names"
          value={`${tradeable.length}`}
          hint={`score ≥ ${s?.min_score_to_trade ?? 60}`}
          tone={tradeable.length > 0 ? "positive" : "default"}
        />
      </section>

      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={loadMarketData} disabled={loading !== null}>
            {loading
              ? `Loading ${loading.done}/${loading.total}…`
              : `Load market data${(status.data?.missing.length ?? 0) > 0 ? ` (${status.data?.missing.length} days)` : ""}`}
          </Button>
          <Button
            variant="secondary"
            onClick={() => scan.mutate()}
            disabled={scan.isPending || loading !== null}
          >
            {scan.isPending ? "Scanning…" : "Run scan"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Data loads one trading day per request to stay inside API limits.
          </span>
        </div>
        {loading ? (
          <Progress value={(loading.done / Math.max(1, loading.total)) * 100} className="h-1.5" />
        ) : null}
      </section>

      {plan.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Today's plan
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {plan.map((row) => (
              <div key={row.id} className="rounded-md border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold">{row.ticker}</span>
                  <span className="tabular-nums text-primary">
                    {Number(row.score).toFixed(1)} pts
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deploy ${Number(s?.dollars_per_day_trade ?? 25).toFixed(0)} at ~$
                  {Number(row.close).toFixed(2)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{row.invalidation}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Ranked candidates
        </h2>
        <ScoreTable rows={scores} />
      </section>
    </div>
  );
}
