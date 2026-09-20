import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { LongTermBuyDialog } from "@/components/LongTermBuyDialog";
import { getLongTermBoard } from "@/lib/long-term-research.functions";
import { getScoreboard } from "@/lib/scoreboard.functions";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "Scoreboard — ASTR Research Rankings" },
      {
        name: "description",
        content: "Top 10 stock rankings for each ASTR live, paper, and researcher formula.",
      },
      { property: "og:title", content: "Scoreboard — ASTR Research Rankings" },
      {
        property: "og:description",
        content: "Top-ranked stocks by ASTR formula with protected long-term buy actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScoreboardPage,
});

function ScoreboardPage() {
  const board = useQuery({ queryKey: ["scoreboard"], queryFn: () => getScoreboard() });
  const longTerm = useQuery({
    queryKey: ["long-term-board"],
    queryFn: () => getLongTermBoard(),
  });
  const sources = board.data?.sources ?? [];
  const [selectedId, setSelectedId] = useState("live");
  const selected = sources.find((source) => source.id === selectedId) ?? sources[0];
  const watchByTicker = new Map(
    (board.data?.watchlist ?? []).map((row) => [String(row.ticker), row]),
  );
  const lt = longTerm.data;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Scoreboard</h1>
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Short-Term</h2>


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
          {selected.rows.length ? (
            <section className="space-y-2">
              <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
                Ranked stocks
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="p-3 text-left">Rank</th>
                      <th className="p-3 text-left">Stock</th>
                      <th className="p-3 text-right">Score</th>
                      <th className="p-3 text-right">Close</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((row) => {
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
                          <td className="p-3 text-right">
                            <LongTermBuyDialog ticker={row.ticker} price={row.close} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
              {selected.id === "research:skeptic"
                ? "The Skeptic reviews evidence and does not publish an independent Top 10."
                : "No saved ranking is available for this scoreboard yet."}
            </p>
          )}
        </>
      ) : null}

      {/* A separate, additional board. The short-term board above is untouched. */}
      <section className="space-y-2 border-t border-border/60 pt-5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Long-Term</h2>
        <p className="text-xs text-muted-foreground">
          The top 10 long-term research candidates. 1-month, 3-month and 9-month candidates compete
          in one list, ranked on the strength of their research evidence.
        </p>
        {longTerm.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading long-term candidates…</p>
        ) : null}
        {lt?.concentration.note ? (
          <p className="rounded-md border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            {lt.concentration.note}
          </p>
        ) : null}
        {lt && lt.candidates.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Rank</th>
                  <th className="p-3 text-left">Stock</th>
                  <th className="p-3 text-left">Horizon</th>
                  <th className="p-3 text-right">Quality</th>
                  <th className="p-3 text-left">Evidence</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lt.candidates.map((row) => (
                  <tr key={`${row.ticker}-${row.horizon}`} className="border-t border-border">
                    <td className="p-3 tabular-nums text-muted-foreground">#{row.rank}</td>
                    <td className="p-3 font-semibold">
                      {row.ticker}
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        {row.researcher}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{row.horizon_label}</td>
                    <td className="p-3 text-right tabular-nums text-primary">
                      {row.quality.toFixed(1)}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{row.evidence}</td>
                    <td className="p-3 text-right">
                      {row.current_price && row.current_price > 0 ? (
                        <LongTermBuyDialog ticker={row.ticker} price={row.current_price} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !longTerm.isLoading ? (
          <p className="rounded-md border border-dashed border-border p-5 text-sm text-muted-foreground">
            No long-term candidates yet. These build up as the researchers record and then check
            their 1-month, 3-month and 9-month calls.
          </p>
        ) : null}
      </section>

      <footer className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
        Each formula ranks the market on its own. Buy Long Term places a real live purchase that the
        daily rotation can never sell.
      </footer>
    </div>
  );
}