import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { MarketStatusBar } from "@/components/MarketStatusBar";
import { PnlChart } from "@/components/PnlChart";
import { ScoreTable } from "@/components/ScoreTable";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { dashboardQuery, latestRunQuery, money, settingsQuery } from "@/lib/queries";
import { runScanNow, setBotRunning } from "@/lib/scan.functions";

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
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const dash = useQuery(dashboardQuery);
  const d = dash.data;
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const runScanFn = useServerFn(runScanNow);
  const settings = useQuery(settingsQuery);
  const latest = useQuery(latestRunQuery);
  const scores = latest.data?.scores ?? [];
  const tradeable = scores.filter((r) => r.tradeable);

  // Tops up any missing bars, rebuilds indicators and re-ranks — no trading.
  const rescore = useMutation({
    mutationFn: () => runScanFn({}),
    onSuccess: async (res) => {
      toast.success(`Scored ${res.scored_count} of ${res.universe_size} names.`);
      await qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function toggleBot(running: boolean) {
    setBusy(true);
    try {
      await setBotRunning({ data: { running } });
      await dash.refetch();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
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

      {d && !d.bot_running ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/10 p-4">
          <div>
            <p className="font-semibold text-primary">Bot stopped</p>
            <p className="text-sm text-muted-foreground">
              No scheduled scoring, buying or selling will happen until you start it again.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => toggleBot(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start bot"}
          </button>
        </section>
      ) : null}
      {d?.bot_running ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => toggleBot(false)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {busy ? "Stopping…" : "Stop bot"}
          </button>
        </div>
      ) : null}

      {dash.isLoading ? <p className="text-sm text-muted-foreground">Loading the desk…</p> : null}
      {d?.broker_error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the broker: {d.broker_error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Account value"
          value={d?.account ? money(d.account.equity) : "—"}
          hint={d?.account ? `status ${d.account.status}` : "broker balance"}
          tone="accent"
        />
        <StatTile
          label="Cash at broker"
          value={d?.account ? money(d.account.cash) : "—"}
          hint="includes money still clearing"
        />
        <StatTile
          label="Ready to invest"
          value={d ? money(d.cash.available) : "—"}
          hint={d ? `${money(d.cash.pending)} clears next session` : "settled cash"}
          tone={(d?.cash.available ?? 0) >= (d?.stake ?? 0) ? "positive" : "default"}
        />
        <StatTile
          label="Saved profit"
          value={d ? money(d.cash.saved) : "—"}
          hint="set aside, never reinvested"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Currently owned
        </h2>
        {(d?.holdings.length ?? 0) === 0 ? (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
            Nothing is held right now.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d?.holdings.map((h) => (
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

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Up next</h2>
          <p className="text-xs text-muted-foreground">
            Bought only if it still passes the next scheduled score check.
          </p>
          {(d?.up_next.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing is queued right now.</p>
          ) : (
            <ul className="space-y-2">
              {d?.up_next.map((row) => (
                <li key={row.ticker} className="rounded border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold">{row.ticker}</span>
                    <span className="tabular-nums text-primary">{row.score.toFixed(1)} pts</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Plan {money(row.stake)} at ~${row.close.toFixed(2)}
                    {d?.cash && d.cash.available < row.stake
                      ? " — waiting on cash to clear"
                      : ""}
                  </p>
                  {row.invalidation ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.invalidation}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Longer-term ideas
          </h2>
          {(d?.suggestions.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No hold suggestions yet.</p>
          ) : (
            <ul className="space-y-2">
              {d?.suggestions.map((s) => (
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
                  <Link to="/watchlist" className="text-xs text-primary hover:underline">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <PnlChart rows={d?.closed ?? []} />
    </div>
  );
}
