import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { getScoreboard } from "@/lib/scoreboard.functions";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Scoreboard — ASTR Research Rankings" },
      {
        name: "description",
        content: "Centralized live, paper, and researcher rankings with assistant evidence and Lead Researcher decisions.",
      },
      { property: "og:title", content: "Scoreboard — ASTR Research Rankings" },
      {
        property: "og:description",
        content: "Top-ranked stocks by ASTR formula, plus verification evidence and research decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScoreboardPage,
});

const CONCLUSION_TONE: Record<string, string> = {
  SUPPORTED: "text-success",
  "WEAKLY SUPPORTED": "text-warning",
  CONTRADICTED: "text-destructive",
};

function ScoreboardPage() {
  const board = useQuery({ queryKey: ["scoreboard"], queryFn: () => getScoreboard() });
  const sources = board.data?.sources ?? [];
  const [selectedId, setSelectedId] = useState("live");
  const selected = sources.find((source) => source.id === selectedId) ?? sources[0];
  const topThree = selected?.rows.slice(0, 3) ?? [];
  const watchByTicker = new Map(
    (board.data?.watchlist ?? []).map((row) => [String(row.ticker), row]),
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Scoreboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One place for every existing formula&apos;s rankings, explanation, verification, and Lead Researcher review.
        </p>
      </header>

      <label className="block max-w-md space-y-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Researcher or formula
        </span>
        <select
          value={selected?.id ?? ""}
          onChange={(event) => setSelectedId(event.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {sources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}{source.enabled === false ? " — inactive" : ""}
            </option>
          ))}
        </select>
      </label>

      {board.isLoading ? <p className="text-sm text-muted-foreground">Loading rankings…</p> : null}

      {selected ? (
        <>
          <section className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{selected.description}</p>
              </div>
              <span className="text-xs text-muted-foreground">as of {selected.as_of ?? "not ranked yet"}</span>
            </div>

            {topThree.length ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {topThree.map((row, index) => (
                  <div
                    key={row.ticker}
                    className={`rounded-md border p-3 ${index === 0 ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {index === 0 ? "Top ranked" : `Follow-up #${index + 1}`}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <span className="text-xl font-bold">{row.ticker}</span>
                      <span className="text-sm tabular-nums text-primary">{row.score.toFixed(1)} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                {selected.id === "research:skeptic"
                  ? "The Skeptic challenges other researchers and does not produce an independent Top 10. Its evidence appears below."
                  : "No saved ranking is available for this formula yet."}
              </p>
            )}
          </section>

          {selected.rows.length ? (
            <section className="space-y-2">
              <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Full Top 10</h2>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Rank</th>
                      <th className="p-3 text-left">Stock</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3 text-right">Close</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.slice(0, 10).map((row) => {
                      const watch = watchByTicker.get(row.ticker);
                      return (
                        <tr key={row.ticker} className="border-t border-border">
                          <td className="p-3 tabular-nums text-muted-foreground">#{row.rank}</td>
                          <td className="p-3 font-semibold">{row.ticker}</td>
                          <td className="p-3 text-right tabular-nums text-primary">{row.score.toFixed(1)}</td>
                          <td className="p-3 text-right tabular-nums">${row.close.toFixed(2)}</td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {watch ? `${watch.status} · ${watch.streak_days}d streak` : row.tradeable ? "qualified" : "ranked"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Research flow</h2>
          <p className="text-sm text-muted-foreground">
            Existing recommendations, assistant checks, and the Lead Researcher&apos;s recorded decision.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {(board.data?.assistants ?? []).map((report) => (
            <article key={report.id} className="space-y-2 rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{report.scientist_name}</h3>
                <span className={`text-xs font-semibold ${CONCLUSION_TONE[report.conclusion] ?? "text-muted-foreground"}`}>
                  {report.conclusion}
                </span>
              </div>
              <p className="text-sm">
                {report.direction} <strong>{report.ticker}</strong> · {report.signal_strength} pts
              </p>
              <p className="text-xs text-muted-foreground">{report.reason}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                Confidence {report.confidence} · {report.results.comparable_signals} historical signals · {report.results.win_rate}% win · {report.results.avg_return >= 0 ? "+" : ""}{report.results.avg_return}% average
              </p>
            </article>
          ))}
        </div>

        <article className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-4">
          <h3 className="font-semibold text-primary">Lead Researcher decision</h3>
          {board.data?.lead ? (
            <>
              <p className="text-sm">{board.data.lead.summary}</p>
              <p className="text-xs text-muted-foreground">{board.data.lead.note}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {board.data.lead.filed ? "Filed as a candidate" : "Not filed"} · edge {board.data.lead.edge >= 0 ? "+" : ""}{board.data.lead.edge}%
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Balanced Strategy decision has been recorded. The existing safeguard requires enough validated evidence first.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}