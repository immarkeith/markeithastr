import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { MarketStatusBar } from "@/components/MarketStatusBar";
import { PnlChart } from "@/components/PnlChart";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { dashboardQuery, money } from "@/lib/queries";
import { setBotRunning } from "@/lib/scan.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ASTR Rotation Desk" },
      {
        name: "description",
        content:
          "Live account balance, current holdings, the next planned buy and a daily, weekly and monthly profit/loss graph.",
      },
      { property: "og:title", content: "Dashboard — ASTR Rotation Desk" },
      {
        property: "og:description",
        content: "Live balance, open positions, queued buys and profit/loss over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const dash = useQuery(dashboardQuery);
  const d = dash.data;
  // Open-position profit right now, so the graph keeps moving before a sell.
  const openPl = (d?.same_day_holdings ?? []).reduce((sum, h) => sum + Number(h.pl ?? 0), 0);
  const heldDollars = (d?.same_day_holdings ?? []).reduce((sum, h) => sum + Number(h.dollars ?? 0), 0);
  const [busy, setBusy] = useState(false);

  async function toggleBot(running: boolean) {
    setBusy(true);
    try {
      await setBotRunning({ data: { running } });
      await dash.refetch();
    } finally {
      setBusy(false);
    }
  }

  const running = Boolean(d?.bot_running);

  return (
    <div className="space-y-8">
      {/* Main on/off control for the automated live trading, right at the top. */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              running ? "bg-success" : "bg-destructive"
            }`}
          />
          <div>
            <p className="text-sm font-semibold">
              ASTR is {running ? "running" : "stopped"}
            </p>
            <p className="text-xs text-muted-foreground">
              {running
                ? "Automated live trading is on."
                : "No real-money buys or sells until you start it. Research keeps testing separately."}
            </p>
          </div>
        </div>
        <Button
          variant={running ? "outline" : "default"}
          disabled={busy}
          onClick={() => toggleBot(!running)}
        >
          {busy ? "Working…" : running ? "Stop" : "Start"}
        </Button>
      </section>

      <MarketStatusBar paperMode={d?.mode !== "live"} />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Desk overview</h1>
        <p className="text-sm text-muted-foreground">
          {d?.mode === "live"
            ? "Live account — real orders."
            : "Simulation mode — nothing is sent to the broker."}
          {d?.scan ? ` Last score ${d.scan.run_date} (${d.scan.scored_count} names).` : ""}
        </p>
      </header>

      {dash.isLoading ? <p className="text-sm text-muted-foreground">Loading the desk…</p> : null}
      {d?.broker_error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the broker: {d.broker_error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Total assets"
          value={d?.account ? money(d.account.equity) : "—"}
          hint="all cash plus stocks held"
          tone="accent"
        />
        <StatTile
          label="Current balance"
          value={d?.account ? money(d.account.cash) : "—"}
          hint="all cash, including money still clearing"
        />
        <StatTile
          label="Available balance"
          value={d?.account ? money(d.account.buying_power) : "—"}
          hint={d ? `${money(d.cash.pending)} still clearing` : "spendable cash right now"}
          tone={(d?.account?.buying_power ?? 0) >= (d?.stake ?? 0) ? "positive" : "default"}
        />
        <StatTile
          label="Total profit"
          value={d ? money(d.total_profit) : "—"}
          hint={d ? `${money(d.cash.saved)} set aside` : "cumulative profit"}
          tone={(d?.total_profit ?? 0) >= 0 ? "positive" : "default"}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
           Same-day positions
        </h2>
        {(d?.same_day_holdings.length ?? 0) === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            No same-day position is open.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d?.same_day_holdings.map((h) => (
              <div key={`${h.ticker}-${h.entry_date}`} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-baseline justify-between">
                  <Link to="/analyze" className="text-lg font-bold hover:text-primary">
                    {h.ticker}
                  </Link>
                  <span
                    className={`tabular-nums font-semibold ${
                      h.pl >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {h.pl >= 0 ? "+" : ""}
                    {money(h.pl)} ({h.pl_pct.toFixed(2)}%)
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                  {money(h.market_value)} at ${h.price.toFixed(2)} · entry ${h.entry_price.toFixed(2)}
                  {h.qty !== null ? ` · ${h.qty} sh` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {h.kind === "untracked" ? "Untracked position" : `${h.kind} trade since ${h.entry_date}`}
                  {h.rank !== null
                    ? ` · ranked #${h.rank} (${(h.score ?? 0).toFixed(1)} pts)${h.still_qualifies ? " — still qualifies" : " — no longer qualifies"}`
                    : ""}
                </p>
                {h.note ? (
                  <p className="mt-2 rounded border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {h.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Live trading only — research paper results never appear here. */}
      <PnlChart
        rows={d?.closed ?? []}
        unrealized={openPl}
        unrealizedToday={openPl}
        basis={heldDollars}
        title="Live profit / loss"
      />

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Long-Term Holds</h2>
        {(d?.long_term_holdings.length ?? 0) === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            No protected long-term holdings yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d?.long_term_holdings.map((h) => (
              <div key={`${h.ticker}-${h.entry_date}-${h.dollars}`} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <Link to="/analyze" className="text-lg font-bold hover:text-primary">{h.ticker}</Link>
                  <span className={`font-semibold tabular-nums ${h.pl >= 0 ? "text-success" : "text-destructive"}`}>
                    {h.pl >= 0 ? "+" : ""}{money(h.pl)} ({h.pl_pct.toFixed(2)}%)
                  </span>
                </div>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {money(h.market_value)} · {h.qty.toFixed(4)} shares · cost {money(h.dollars)} at $
                  {h.entry_price.toFixed(2)}
                </p>
                <p className="mt-2 text-xs text-primary">Protected from same-day sales</p>
                {h.note ? <p className="mt-2 text-xs text-muted-foreground">{h.note}</p> : null}
              </div>
            ))}
          </div>
        )}

        {/* Ideas only — separate from what is actually held above. */}
        <details className="rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            5 long-term hold suggestions
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            Noticed during ASTR&apos;s normal scans. These are not owned and are never bought
            automatically.
          </p>
          {(d?.suggestions.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hold suggestions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d?.suggestions.slice(0, 5).map((s) => (
                <li
                  key={s.ticker}
                  className="flex items-center justify-between rounded border border-border p-3"
                >
                  <div>
                    <span className="font-bold">{s.ticker}</span>
                    <p className="text-xs text-muted-foreground">
                      Top-ranked {s.streak_days} session(s) in a row
                      {s.permanent ? " — permanent hold candidate" : ""}
                    </p>
                  </div>
                  <Link to="/scoreboard" className="text-xs text-primary hover:underline">
                    Scoreboard
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

    </div>
  );
}
