import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { HomeStockLookup } from "@/components/HomeStockLookup";
import { InfoDot } from "@/components/InfoDot";
import { LongTermSellDialog } from "@/components/LongTermSellDialog";
import { MarketStatusBar } from "@/components/MarketStatusBar";
import { PnlChart } from "@/components/PnlChart";
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
          "Live account balance, current holdings, protected long-term holds and a daily, weekly and monthly profit/loss graph.",
      },
      { property: "og:title", content: "Dashboard — ASTR Rotation Desk" },
      {
        property: "og:description",
        content: "Live balance, open positions, long-term holds and profit/loss over time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

/** One compact figure inside the account block — no boxes, no subtitles. */
function Figure({
  label,
  value,
  tone = "",
  info,
}: {
  label: string;
  value: string;
  tone?: string;
  info?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
        {info ? <InfoDot title={label}>{info}</InfoDot> : null}
      </p>
      <p className={`truncate text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

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
    <div className="space-y-6">
      {/* Live trading on/off — compact, no explanatory text. */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              running ? "bg-success" : "bg-destructive"
            }`}
          />
          {running ? "Running" : "Stopped"}
        </span>
        <Button
          size="sm"
          variant={running ? "outline" : "default"}
          disabled={busy}
          onClick={() => toggleBot(!running)}
        >
          {busy ? "Working…" : running ? "Stop" : "Start"}
        </Button>
      </div>

      <MarketStatusBar paperMode={d?.mode !== "live"} />

      {d?.broker_error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the broker: {d.broker_error}
        </p>
      ) : null}

      {/* Six figures, no boxes: left column then right column, graph below. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Figure
          label="Current stock"
          value={(d?.same_day_holdings ?? [])[0]?.ticker ?? "None"}
          tone="text-primary"
        />
        <Figure
          label="Total assets"
          value={d?.account ? money(d.account.equity) : "—"}
          tone="text-primary"
          info="All cash in the account, including money still clearing, plus the current value of every stock held."
        />
        <Figure
          label="Live profit / loss"
          value={d ? money(openPl) : "—"}
          tone={openPl >= 0 ? "text-success" : "text-destructive"}
        />
        <Figure
          label="Total profit"
          value={d ? money(d.total_profit) : "—"}
          tone={(d?.total_profit ?? 0) >= 0 ? "text-success" : "text-destructive"}
        />
        <Figure
          label="Available balance"
          value={d?.account ? money(d.account.buying_power) : "—"}
          info="Only the cash ASTR can actually spend right now."
        />
        <Figure
          label="Current balance"
          value={d?.account ? money(d.account.cash) : "—"}
          info="All cash in the account, including cash that has not finished clearing yet."
        />
      </div>

      {/* The only box on the page. Live trading only — never paper results. */}
      <section className="rounded-md border border-border bg-card p-4">
        <PnlChart
          rows={d?.closed ?? []}
          unrealized={openPl}
          unrealizedToday={openPl}
          basis={heldDollars}
          title="Live profit / loss"
          compact
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Long-term holds
        </h2>
        {(d?.long_term_holdings.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No long-term holdings.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {d?.long_term_holdings.map((h) => (
              <div key={`${h.ticker}-${h.entry_date}-${h.dollars}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <Link to="/analyze" className="text-lg font-bold hover:text-primary">
                    {h.ticker}
                  </Link>
                  <span
                    className={`font-semibold tabular-nums ${
                      h.pl >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {h.pl >= 0 ? "+" : ""}
                    {money(h.pl)} ({h.pl_pct.toFixed(2)}%)
                  </span>
                </div>
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {h.qty.toFixed(4)} sh · {money(h.dollars)} in · {money(h.market_value)} now
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {h.trade_id ? (
                    <LongTermSellDialog
                      tradeId={h.trade_id}
                      ticker={h.ticker}
                      marketValue={h.market_value}
                      shares={h.qty}
                      price={h.price}
                    />
                  ) : null}
                </div>
                {h.note ? <p className="mt-2 text-xs text-muted-foreground">{h.note}</p> : null}
              </div>
            ))}
          </div>
        )}

        {/* Ideas only — separate from what is actually held above. */}
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            5 long-term hold suggestions
          </summary>
          {(d?.suggestions.length ?? 0) === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No hold suggestions yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d?.suggestions.slice(0, 5).map((s) => (
                <li key={s.ticker} className="flex items-center justify-between gap-3">
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

      <HomeStockLookup />

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
              <div
                key={`${h.ticker}-${h.entry_date}`}
                className="rounded-md border border-border bg-card p-4"
              >
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

      {dash.isLoading ? <p className="text-sm text-muted-foreground">Loading the desk…</p> : null}

      {/* Explanations last. */}
      <footer className="space-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <p>
          {d?.mode === "live"
            ? "Live account — real orders. Start and Stop control live trading only; the Research Lab keeps paper testing either way."
            : "Simulation mode — nothing is sent to the broker."}
          {d?.scan ? ` Last score ${d.scan.run_date} (${d.scan.scored_count} names).` : ""}
        </p>
        <p>
          Long-term holds are protected: the daily rotation can only sell its own same-day shares.
        </p>
      </footer>
    </div>
  );
}
