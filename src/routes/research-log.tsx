import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { StatTile } from "@/components/StatTile";
import { fetchRaceLog } from "@/lib/race.functions";
import { money } from "@/lib/queries";

export const Route = createFileRoute("/research-log")({
  head: () => ({
    meta: [
      { title: "Research Log — ASTR Paper Trade History" },
      {
        name: "description",
        content:
          "Every simulated buy and sell made by the strategies under test, grouped by formula, with entry, exit and realised profit.",
      },
      { property: "og:title", content: "Research Log — ASTR Paper Trade History" },
      {
        property: "og:description",
        content: "Full paper trade history for each strategy being tested against the live one.",
      },
    ],
  }),
  component: ResearchLogPage,
});

function ResearchLogPage() {
  const log = useQuery({ queryKey: ["race-log"], queryFn: () => fetchRaceLog() });
  const [active, setActive] = useState<string | null>(null);
  const groups = log.data?.groups ?? [];
  const shown = active ? groups.filter((g) => g.strategy_id === active) : groups;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Research Log</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Paper trades only — the practice book from the{" "}
          <Link to="/lab" className="text-primary hover:underline">
            Research Lab
          </Link>
          . Real money trades live in the{" "}
          <Link to="/trade-history" className="text-primary hover:underline">
            Trade Log
          </Link>
          .
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Live strategy so far"
          value={
            log.data?.live
              ? `${log.data.live.total_pnl >= 0 ? "+" : ""}${money(log.data.live.total_pnl)}`
              : "—"
          }
          hint={log.data?.live ? `${log.data.live.trades} closed trade(s)` : "the benchmark"}
          tone="accent"
        />
        <StatTile
          label="Paper trades recorded"
          value={`${groups.reduce((n, g) => n + g.rows.length, 0)}`}
          hint={`${groups.length} formula(s) under test`}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            active === null
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          All formulas
        </button>
        {groups.map((g) => (
          <button
            key={g.strategy_id}
            onClick={() => setActive(g.strategy_id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              active === g.strategy_id
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {log.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the paper history…</p>
      ) : null}

      {shown.map((g) => (
        <section key={g.strategy_id} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">
              #{g.rank} {g.name}
              {g.enabled ? "" : " (paused)"}
            </h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className={g.total_pnl >= 0 ? "text-success" : "text-destructive"}>
                {g.total_pnl >= 0 ? "+" : ""}
                {money(g.total_pnl)}
              </span>{" "}
              · {g.trades} closed · win rate {g.win_rate === null ? "—" : `${g.win_rate}%`} ·{" "}
              {money(g.stake)} stake
            </p>
          </div>

          {g.rows.length === 0 ? (
            <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              No simulated trades yet for this formula.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2">Bought</th>
                    <th className="px-3 py-2">Entry</th>
                    <th className="px-3 py-2">Sold</th>
                    <th className="px-3 py-2">Exit</th>
                    <th className="px-3 py-2 text-right">Stake</th>
                    <th className="px-3 py-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{t.ticker}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.entry_date}</td>
                      <td className="px-3 py-2 tabular-nums">${Number(t.entry_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {t.exit_date ?? (t.status === "open" ? "still held" : "—")}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {t.exit_price === null ? "—" : `$${Number(t.exit_price).toFixed(2)}`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {money(Number(t.dollars))}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-semibold ${
                          Number(t.profit ?? 0) >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        {t.profit === null
                          ? "—"
                          : `${Number(t.profit) >= 0 ? "+" : ""}${money(Number(t.profit))}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      <p className="text-xs text-muted-foreground">
        Looking for the rule-testing engine and its candidate ideas? That lives on the{" "}
        <Link to="/research" className="text-primary hover:underline">
          research engine page
        </Link>
        .
      </p>
    </div>
  );
}
