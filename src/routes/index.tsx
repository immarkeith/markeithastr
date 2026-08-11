import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { MarketStatusBar } from "@/components/MarketStatusBar";
import { ScoreTable } from "@/components/ScoreTable";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { latestRunQuery, settingsQuery } from "@/lib/queries";
import { marketStatus } from "@/lib/market-calendar";
import { getBarStatus, loadHistory, runCycleNow, runScanNow } from "@/lib/scan.functions";

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
  const loadHistoryFn = useServerFn(loadHistory);
  const runScanFn = useServerFn(runScanNow);
  const runCycleFn = useServerFn(runCycleNow);

  const status = useQuery({ queryKey: ["bar-status"], queryFn: () => barStatusFn({}) });
  const settings = useQuery(settingsQuery);
  const latest = useQuery(latestRunQuery);

  const [busy, setBusy] = useState(false);

  async function loadMarketData() {
    setBusy(true);
    try {
      const res = await loadHistoryFn({ data: { days: 70 } });
      if (res.days_stored === 0) {
        toast.error("No bars came back from the data feed — check the key in Settings.");
      } else {
        toast.success(
          `Cached ${res.days_stored} sessions for ${res.tickers} tickers (${res.feed} feed).`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load market data.");
    } finally {
      setBusy(false);
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

  const cycle = useMutation({
    mutationFn: () => runCycleFn({ data: { force: true } }),
    onSuccess: async (res) => {
      if (!res.ran) toast.info(res.reason);
      else
        toast.success(
          `Cycle done — ${res.scan?.scored_count ?? 0} scored, ${res.paper_opened.length} simulated entries, ${res.paper_closed.length} exits.`,
        );
      await qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const market = marketStatus();
  const s = settings.data;
  const scores = latest.data?.scores ?? [];
  const tradeable = scores.filter((r) => r.tradeable);
  const plan = tradeable.slice(0, Number(s?.num_day_trades ?? 2));

  return (
    <div className="space-y-8">
      <MarketStatusBar paperMode={(s as { paper_mode?: boolean } | undefined)?.paper_mode !== false} />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Daily rotation scan</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Whole-market daily bars are cached once per trading day, so scans and history cost no
          extra data requests. Scores blend trend, momentum, volume, relative strength and
          volatility quality. Simulation mode keeps scoring, entries and exits running on paper —
          no broker orders are placed until you switch it off in Settings.
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
          <Button onClick={loadMarketData} disabled={busy}>
            {busy
              ? "Loading history…"
              : `Load market data${(status.data?.missing.length ?? 0) > 0 ? ` (${status.data?.missing.length} days)` : ""}`}
          </Button>
          <Button
            variant="secondary"
            onClick={() => scan.mutate()}
            disabled={scan.isPending || busy}
          >
            {scan.isPending ? "Scanning…" : "Run scan"}
          </Button>
          <Button variant="outline" onClick={() => cycle.mutate()} disabled={cycle.isPending || busy}>
            {cycle.isPending ? "Running cycle…" : "Run today's cycle"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Cycle = top up bars, re-score, then apply the simulated entry/exit rules.
            {market.tradingDay
              ? ` Session ${market.label.toLowerCase()}.`
              : " Market is closed today, so the cycle only re-scores."}
          </span>
        </div>
        {busy ? <Progress value={undefined} className="h-1.5" /> : null}
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
