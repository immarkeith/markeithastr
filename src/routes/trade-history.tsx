import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import type { ScoreSnapshot, TradeHistoryRow } from "@/lib/data.functions";
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

const FACTOR_LABELS: Record<string, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volume: "Volume",
  relative_strength: "Relative strength",
  volatility_quality: "Volatility quality",
};

function label(key: string) {
  return (
    FACTOR_LABELS[key] ??
    key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

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

function ScoreDetail({ snap, title }: { snap: ScoreSnapshot | null; title: string }) {
  if (!snap) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        No scan score was recorded for {title.toLowerCase()}.
      </div>
    );
  }
  const factors = Object.entries(snap.factors ?? {}).sort(
    (a, b) => Number(b[1]?.weighted_points ?? 0) - Number(a[1]?.weighted_points ?? 0),
  );
  return (
    <div className="space-y-3 rounded-md border border-border bg-background/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <span className="text-xs tabular-nums">
          rank #{snap.rank} · <span className="text-primary">{snap.score.toFixed(1)} pts</span> ·
          close ${snap.close.toFixed(2)} · {snap.tradeable ? "qualified" : "below trade cutoff"}
        </span>
      </div>

      {factors.length === 0 ? (
        <p className="text-xs text-muted-foreground">No formula breakdown stored.</p>
      ) : (
        <ul className="space-y-2">
          {factors.map(([key, value]) => (
            <li key={key} className="rounded border border-border/70 p-2">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{label(key)}</span>
                <span className="tabular-nums text-primary">
                  {Number(value?.weighted_points ?? 0).toFixed(1)} pts
                </span>
              </div>
              {(value?.reasons ?? []).length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {(value?.reasons ?? []).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {snap.ml && (
        <div className="rounded border border-border/70 p-2 text-xs">
          <div className="font-medium">Machine-learning read</div>
          <div className="mt-1 space-y-0.5 text-muted-foreground tabular-nums">
            {snap.ml.predicted_return !== null && (
              <div>Predicted next-day move: {snap.ml.predicted_return.toFixed(2)}%</div>
            )}
            {snap.ml.prob_positive !== null && (
              <div>Chance of a positive day: {(snap.ml.prob_positive * 100).toFixed(0)}%</div>
            )}
            {snap.ml.prob_target !== null && (
              <div>Chance of hitting the target move: {(snap.ml.prob_target * 100).toFixed(0)}%</div>
            )}
            {snap.ml.combined_score !== null && (
              <div>Combined ASTR + ML score: {snap.ml.combined_score.toFixed(1)}</div>
            )}
          </div>
        </div>
      )}

      {snap.invalidation && (
        <p className="text-xs text-muted-foreground">
          Exit rule that day: <span className="text-foreground">{snap.invalidation}</span>
        </p>
      )}
    </div>
  );
}

function TradeCard({ row }: { row: TradeHistoryRow }) {
  const [open, setOpen] = useState(false);
  const closed = row.status !== "open";
  const pl = row.profit ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight">{row.ticker}</span>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            {row.kind}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${
              row.mode === "live"
                ? "bg-primary/15 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {row.mode === "live" ? "live" : "simulated"}
          </span>
        </div>
        {closed ? (
          <span
            className={`text-sm font-semibold tabular-nums ${pl >= 0 ? "text-primary" : "text-destructive"}`}
          >
            {money(pl)} {row.pct !== null && <span className="text-xs">({row.pct.toFixed(2)}%)</span>}
          </span>
        ) : (
          <span className="text-xs uppercase tracking-widest text-muted-foreground">open</span>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border/70 p-2 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Bought</div>
          <div className="mt-1 tabular-nums">{stamp(row.entry_at, row.entry_date)}</div>
          <div className="mt-1 tabular-nums text-muted-foreground">
            ${row.entry_price.toFixed(2)} / share · {money(row.dollars)} invested ·{" "}
            {row.shares.toFixed(4)} sh
          </div>
        </div>
        <div className="rounded-md border border-border/70 p-2 text-xs">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {row.status === "cancelled" ? "Cancelled" : "Sold"}
          </div>
          {closed ? (
            <>
              <div className="mt-1 tabular-nums">{stamp(row.exit_at, row.exit_date)}</div>
              <div className="mt-1 tabular-nums text-muted-foreground">
                {row.exit_price === null
                  ? "no fill recorded"
                  : `$${row.exit_price.toFixed(2)} / share · ${money(row.proceeds)} back`}
                {row.kept && row.kept > 0 ? ` · ${money(row.kept)} saved profit` : ""}
              </div>
            </>
          ) : (
            <div className="mt-1 text-muted-foreground">
              {row.status_note ?? "Still held — sells at the pre-close pass."}
            </div>
          )}
        </div>
      </div>

      {row.status_note && closed && (
        <p className="mt-2 text-xs text-destructive">{row.status_note}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Hide scoring detail" : "Why it scored high"}
      </Button>

      {open && (
        <div className="mt-3 space-y-3">
          <ScoreDetail snap={row.entry_score} title={`Score on buy day (${row.entry_date})`} />
          {closed && row.exit_date && (
            <ScoreDetail snap={row.exit_score} title={`Score on sell day (${row.exit_date})`} />
          )}
        </div>
      )}
    </div>
  );
}

type ModeFilter = "all" | "live" | "paper";
type StateFilter = "all" | "open" | "closed";

function TradeHistoryPage() {
  const { data, isLoading } = useQuery(tradeHistoryQuery);
  const [mode, setMode] = useState<ModeFilter>("all");
  const [state, setState] = useState<StateFilter>("all");

  const all = (data?.trades ?? []) as TradeHistoryRow[];
  const rows = useMemo(
    () =>
      all.filter((t) => {
        if (mode !== "all" && t.mode !== mode) return false;
        if (state === "open" && t.status !== "open") return false;
        if (state === "closed" && t.status === "open") return false;
        return true;
      }),
    [all, mode, state],
  );

  const totals = useMemo(() => {
    const done = rows.filter((t) => t.status === "closed");
    const pl = done.reduce((sum, t) => sum + Number(t.profit ?? 0), 0);
    const saved = done.reduce((sum, t) => sum + Math.max(Number(t.kept ?? 0), 0), 0);
    const wins = done.filter((t) => Number(t.profit ?? 0) > 0).length;
    return {
      count: rows.length,
      closed: done.length,
      pl,
      saved,
      winRate: done.length ? (wins / done.length) * 100 : null,
    };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Trade log</h1>
        <p className="text-sm text-muted-foreground">
          Every buy and sell, with the formulas that made each name score high.
          {data?.strategy_name ? ` Active strategy: ${data.strategy_name}.` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Trades", value: String(totals.count) },
          { label: "Closed", value: String(totals.closed) },
          {
            label: "Total P&L",
            value: money(totals.pl),
            tone: totals.pl >= 0 ? "text-primary" : "text-destructive",
          },
          {
            label: "Win rate",
            value: totals.winRate === null ? "—" : `${totals.winRate.toFixed(0)}%`,
          },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {tile.label}
            </div>
            <div className={`mt-1 text-lg font-semibold tabular-nums ${tile.tone ?? ""}`}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "live", "paper"] as ModeFilter[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {m === "all" ? "All modes" : m === "live" ? "Live" : "Simulated"}
          </button>
        ))}
        <span className="mx-1 w-px bg-border" />
        {(["all", "open", "closed"] as StateFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              state === s
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All trades" : s === "open" ? "Open" : "Closed"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading trade log…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No trades match this filter yet.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <TradeCard key={row.id} row={row} />
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
