import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { MarketStatusBar } from "@/components/MarketStatusBar";
import { StatTile } from "@/components/StatTile";
import { dashboardQuery, money } from "@/lib/queries";

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

const RANGES = [
  { key: "1d", label: "Today", days: 1 },
  { key: "1w", label: "Week", days: 7 },
  { key: "1m", label: "Month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
] as const;

function PnlChart({ rows }: { rows: { exit_date: string; profit: number }[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1w");
  const active = RANGES.find((r) => r.key === range) ?? RANGES[1];

  const series = useMemo(() => {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - (active.days - 1));
    const from = cutoff.toISOString().slice(0, 10);
    const byDay = new Map<string, number>();
    for (const row of rows) {
      if (!row.exit_date || row.exit_date < from) continue;
      byDay.set(row.exit_date, (byDay.get(row.exit_date) ?? 0) + row.profit);
    }
    const days = [...byDay.keys()].sort();
    let running = 0;
    return days.map((day) => {
      running += byDay.get(day) ?? 0;
      return { day, daily: byDay.get(day) ?? 0, cumulative: Number(running.toFixed(2)) };
    });
  }, [rows, active.days]);

  const total = series.length > 0 ? series[series.length - 1]!.cumulative : 0;
  const values = series.map((p) => p.cumulative);
  const max = Math.max(0.01, ...values.map(Math.abs));
  const width = 100;
  const height = 40;
  const path = series
    .map((point, i) => {
      const x = series.length === 1 ? width : (i / (series.length - 1)) * width;
      const y = height / 2 - (point.cumulative / max) * (height / 2 - 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Profit / loss</h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                r.key === range
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p
        className={`text-2xl font-bold tabular-nums ${
          total >= 0 ? "text-success" : "text-destructive"
        }`}
      >
        {total >= 0 ? "+" : ""}
        {money(total)}
      </p>

      {series.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No closed trades in this window yet — the line starts once a position is sold.
        </p>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full" preserveAspectRatio="none">
            <line
              x1="0"
              x2={width}
              y1={height / 2}
              y2={height / 2}
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-border"
            />
            <path
              d={path}
              fill="none"
              strokeWidth="1.2"
              stroke="currentColor"
              className={total >= 0 ? "text-success" : "text-destructive"}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {series
              .slice(-6)
              .reverse()
              .map((point) => (
                <li key={point.day} className="flex justify-between tabular-nums">
                  <span>{point.day}</span>
                  <span className={point.daily >= 0 ? "text-success" : "text-destructive"}>
                    {point.daily >= 0 ? "+" : ""}
                    {money(point.daily)}
                  </span>
                </li>
              ))}
          </ul>
        </>
      )}
    </section>
  );
}

function HomePage() {
  const dash = useQuery(dashboardQuery);
  const d = dash.data;

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
                  <Link
                    to="/analyze"
                    search={{ ticker: h.ticker }}
                    className="text-lg font-bold hover:text-primary"
                  >
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
                  <p className="mt-2 rounded border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
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
