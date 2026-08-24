import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { ScoreTable } from "@/components/ScoreTable";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { latestRunQuery, settingsQuery } from "@/lib/queries";
import { runScanNow } from "@/lib/scan.functions";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Today's ranked candidate list: factor-weighted rotation scores across the cached US stock universe.",
      },
      { property: "og:title", content: "Scan — ASTR Daily Rotation Desk" },
      {
        property: "og:description",
        content: "Factor-weighted daily rotation scores across the liquid US stock universe.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const qc = useQueryClient();
  const runScanFn = useServerFn(runScanNow);
  const settings = useQuery(settingsQuery);
  const latest = useQuery(latestRunQuery);

  // One button. It tops up any missing bars, rebuilds every indicator and
  // re-ranks the universe — the same work the scheduled passes do.
  const rescore = useMutation({
    mutationFn: () => runScanFn({}),
    onSuccess: async (res) => {
      toast.success(`Scored ${res.scored_count} of ${res.universe_size} names.`);
      await qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const s = settings.data;
  const scores = latest.data?.scores ?? [];
  const tradeable = scores.filter((r) => r.tradeable);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Candidate list</h1>
          <p className="text-sm text-muted-foreground">
            Every cached name scored on trend, momentum, volume, relative strength and volatility
            quality. The bot buys from the top of this list.
          </p>
        </div>
        <Button onClick={() => rescore.mutate()} disabled={rescore.isPending}>
          {rescore.isPending ? "Rescoring…" : "Rescore now"}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Last scored"
          value={latest.data?.run ? String(latest.data.run.run_date) : "—"}
          hint={
            latest.data?.run?.bars_as_of
              ? `data through ${String(latest.data.run.bars_as_of)}`
              : "not run yet"
          }
        />
        <StatTile
          label="Names scored"
          value={`${latest.data?.run?.scored_count ?? scores.length}`}
          hint="cached universe"
          tone="accent"
        />
        <StatTile
          label="Eligible to buy"
          value={`${tradeable.length}`}
          hint={`score ≥ ${s?.min_score_to_trade ?? 60}`}
          tone={tradeable.length > 0 ? "positive" : "default"}
        />
      </section>

      <ScoreTable rows={scores} />
    </div>
  );
}
