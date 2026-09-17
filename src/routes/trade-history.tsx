import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import type { TradeHistoryRow } from "@/lib/data.functions";
import { tradeHistoryQuery } from "@/lib/queries";

export const Route = createFileRoute("/trade-history")({
  head: () => ({
    meta: [
      { title: "Trade log — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Every ASTR buy and sell with prices, dates, times, profit and the scoring formulas behind each pick.",
      },
      { property: "og:title", content: "Trade log — ASTR Daily Rotation Desk" },
      {
        property: "og:description",
        content: "Full buy/sell history with per-formula score evidence for every trade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TradeHistoryPage,
});

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function stamp(iso: string | null, fallbackDate: string | null) {
  if (!iso) return fallbackDate ?? "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallbackDate ?? "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type ViewFilter = "today" | "72h" | "researcher";

type TradeEvent = {
  id: string;
  side: "BUY" | "SELL";
  ticker: string;
  amount: number;
  at: string;
  source: string;
  live: boolean;
  note: string | null;
};

function TradeHistoryPage() {
  const { data, isLoading } = useQuery(tradeHistoryQuery);
  const [view, setView] = useState<ViewFilter>("today");
  const [researcher, setResearcher] = useState("");

  const all = (data?.trades ?? []) as TradeHistoryRow[];
  const researchers = useMemo(() => Array.from(new Set(all.filter((row) => row.mode !== "live").map((row) => row.source_name))).sort(), [all]);
  const events = useMemo(() => {
    const now = Date.now();
    const today = new Date().toLocaleDateString();
    return all.flatMap<TradeEvent>((row) => {
      const items: TradeEvent[] = [{ id: `${row.id}-buy`, side: "BUY", ticker: row.ticker, amount: row.dollars, at: row.entry_at ?? `${row.entry_date}T12:00:00`, source: row.source_name, live: row.mode === "live", note: row.source_description }];
      if (row.exit_date && row.status === "closed") items.push({ id: `${row.id}-sell`, side: "SELL", ticker: row.ticker, amount: row.proceeds ?? row.dollars, at: row.exit_at ?? `${row.exit_date}T12:00:00`, source: row.source_name, live: row.mode === "live", note: row.status_note });
      return items;
    }).filter((event) => {
      const time = new Date(event.at).getTime();
      if (view === "today") return new Date(event.at).toLocaleDateString() === today;
      if (view === "72h") return Number.isFinite(time) && time >= now - 72 * 60 * 60 * 1000;
      return !event.live && event.source === researcher && Number.isFinite(time) && time >= now - 90 * 86400000;
    }).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [all, researcher, view]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Trade log</h1>
        <p className="text-sm text-muted-foreground">
          Recent live and research activity, with the actor and recorded score context for each trade.
          {data?.strategy_name ? ` Active strategy: ${data.strategy_name}.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={view} onChange={(event) => setView(event.target.value as ViewFilter)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
          <option value="today">Today</option>
          <option value="72h">72 Hours</option>
          <option value="researcher">Individual Researcher</option>
        </select>
        {view === "researcher" ? (
          <select value={researcher} onChange={(event) => setResearcher(event.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            <option value="">Choose researcher</option>
            {researchers.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading trade log…</p>
      ) : events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {view === "researcher" && !researcher ? "Choose a researcher to view three months of activity." : "No trades match this filter yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <article key={event.id} className={`grid gap-2 rounded-md border-l-4 bg-card p-4 sm:grid-cols-[1fr_auto] ${event.live ? "border-l-chart-1" : "border-l-success"}`}>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-lg font-bold">{event.ticker}</span>
                <span className={`text-xs font-semibold ${event.side === "BUY" ? "text-success" : "text-primary"}`}>{event.side}</span>
                <span className="font-semibold tabular-nums">{money(event.amount)}</span>
              </div>
              <div className="text-sm text-muted-foreground sm:text-right">
                {view !== "today" ? <p>{stamp(event.at, null)}</p> : null}
                {view !== "researcher" ? <p>{event.source}</p> : null}
              </div>
              {event.note ? <p className="text-xs text-muted-foreground sm:col-span-2">{event.note}</p> : null}
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Times before today are approximate — they use when the record was written. New trades record
        the exact buy and sell time.
      </p>
    </div>
  );
}
