import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { HomeStockLookup } from "@/components/HomeStockLookup";
import { InfoDot } from "@/components/InfoDot";
import { LongTermReviewDialog } from "@/components/LongTermReviewDialog";
import { LongTermSellDialog } from "@/components/LongTermSellDialog";
import { MarketStatusBar } from "@/components/MarketStatusBar";
import { PnlChart } from "@/components/PnlChart";
import { horizonLabel } from "@/lib/horizons";
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

/** Days held, e.g. "17D"; same-day positions read "Today". */
function heldFor(entry: string) {
  const start = Date.parse(`${entry}T00:00:00Z`);
  if (Number.isNaN(start)) return "—";
  const days = Math.floor((Date.now() - start) / 86_400_000);
  return days <= 0 ? "Today" : `${days}D`;
}

/** Extracts the owning researcher (e.g. "Trend"), or falls back to "Rotation" / "Long-term". */
function owningResearcher(h: { who: string; note?: string | null }) {
  if (h.note) {
    const m = h.note.match(/Chosen researcher:\s*([A-Za-z]+)(?:\s+Researcher)?/i);
    if (m?.[1]) return m[1];
  }
  return h.who;
}

/** The owner's planned holding period, e.g. "17D target" or "3 Months". */
function holdTarget(h: {
  who: string;
  hold_days?: number | null;
  hold_horizon?: string | null;
}) {
  const days = Number(h.hold_days ?? 0);
  if (days > 0) return `${days}D target`;
  if (h.who === "Long-term" && h.hold_horizon) return horizonLabel(h.hold_horizon);
  return "Same day";
}


function HomePage() {
  const dash = useQuery(dashboardQuery);
  const d = dash.data;
  // Open-position profit right now, so the graph keeps moving before a sell.
  const openPl = (d?.same_day_holdings ?? []).reduce((sum, h) => sum + Number(h.pl ?? 0), 0);
  const heldDollars = [...(d?.same_day_holdings ?? []), ...(d?.long_term_holdings ?? [])].reduce(
    (sum, holding) => sum + Number(holding.dollars ?? 0),
    0,
  );
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
  const held = [
    ...(d?.same_day_holdings ?? []).map((h) => ({ ...h, who: "Rotation" })),
    ...(d?.long_term_holdings ?? []).map((h) => ({ ...h, who: "Long-term" })),
  ];

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

      {/* Stocks currently held — one compact list for every position. */}
      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
          Stocks currently held
        </h2>
        {held.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing held right now.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {held.map((h) => (
              <li
                key={`${h.who}-${h.ticker}-${h.entry_date}-${h.dollars}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 py-1.5 text-sm tabular-nums"
              >
                <span className="truncate">
                  <span className="font-bold">{h.ticker}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {h} · {holdTarget(h)}
                  </span>
                </span>
                <span>{money(h.market_value)}</span>
                <span className="text-muted-foreground">{heldFor(h.entry_date)}</span>
                <span className={h.pl >= 0 ? "text-success" : "text-destructive"}>
                  {h.pl_pct >= 0 ? "+" : ""}
                  {h.pl_pct.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <Figure
          label="Total assets"
          value={d?.account ? money(d.account.equity) : "—"}
          tone="text-primary"
          info="All cash in the account, including money still clearing, plus the current value of every stock held."
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

      {/* Live trading only — never paper results. Ranges are display-only. */}
      <PnlChart
        rows={[...(d?.closed ?? []), ...(d?.long_term_closed ?? [])]}
        unrealized={openPl + (d?.long_term_open_pl ?? 0)}
        unrealizedToday={openPl + (d?.long_term_open_pl ?? 0)}
        basis={heldDollars}
        title="Live profit / loss"
        compact
      />

      <HomeStockLookup />

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
