import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { runHistoryQuery } from "@/lib/queries";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Scan history — ASTR Daily Rotation Desk" },
      { name: "description", content: "Every past scan run with its top ten ranked picks." },
      { property: "og:title", content: "Scan history — ASTR Daily Rotation Desk" },
      { property: "og:description", content: "Past rotation scans and their top ten picks." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useQuery(runHistoryQuery);
  const runs = data?.runs ?? [];
  const scores = data?.scores ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Scan history</h1>
      {runs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No scans recorded yet.
        </p>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{run.run_date}</span>
                <span className="text-xs text-muted-foreground">
                  {run.scored_count} scored / {run.universe_size} scanned · bars as of{" "}
                  {run.bars_as_of ?? "—"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {scores
                  .filter((s) => s.run_id === run.id)
                  .map((s) => (
                    <span
                      key={s.id}
                      className="rounded border border-border px-2 py-1 text-xs tabular-nums"
                    >
                      <span className="text-muted-foreground">{s.rank}.</span> {s.ticker}{" "}
                      <span className="text-primary">{Number(s.score).toFixed(1)}</span>
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
