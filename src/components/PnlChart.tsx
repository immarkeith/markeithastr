import { useMemo, useState } from "react";

import { money } from "@/lib/queries";

export interface PnlRange {
  key: string;
  label: string;
  /** Window length in days, counting back from today. */
  days: number;
  /** Today only, and always includes today's open-position move. */
  live?: boolean;
  /** Ends yesterday — a finished session, so open positions are excluded. */
  endYesterday?: boolean;
}

export const HOME_RANGES: PnlRange[] = [
  { key: "live", label: "LIVE", days: 1, live: true },
  { key: "1d", label: "1D", days: 1, endYesterday: true },
  { key: "1w", label: "1W", days: 7 },
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
];

/** The Research Lab compares strategies week by week over a one-month test. */
export const LAB_RANGES: PnlRange[] = [
  { key: "live", label: "LIVE", days: 1, live: true },
  { key: "1d", label: "1D", days: 1, endYesterday: true },
  { key: "1w", label: "1W", days: 7 },
  { key: "2w", label: "2W", days: 14 },
  { key: "3w", label: "3W", days: 21 },
  { key: "1m", label: "1M", days: 28 },
];

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Profit/loss over a chosen window: realised profit from closed trades, plus
 * the current open-position move so the line keeps updating before anything is
 * sold. Shared by the Home dashboard and every Research Lab slot so the two
 * always read the same way.
 */
export function PnlChart({
  rows,
  ranges = HOME_RANGES,
  initialRange,
  title = "Profit / loss",
  compact = false,
  unrealized = 0,
  unrealizedToday = 0,
  basis = 0,
}: {
  rows: { exit_date: string | null; profit: number }[];
  ranges?: PnlRange[];
  initialRange?: string;
  title?: string;
  compact?: boolean;
  /** Open-position profit right now, versus the entry prices. */
  unrealized?: number;
  /** How much of that open-position move happened today. */
  unrealizedToday?: number;
  /** Cash + money at work, used as the percent denominator. */
  basis?: number;
}) {
  const [range, setRange] = useState(initialRange ?? ranges[0]!.key);
  const active = ranges.find((r) => r.key === range) ?? ranges[0]!;

  const series = useMemo(() => {
    const today = isoDaysAgo(0);
    const from = active.endYesterday ? isoDaysAgo(active.days) : isoDaysAgo(active.days - 1);
    const until = active.endYesterday ? isoDaysAgo(1) : today;
    const byDay = new Map<string, number>();
    for (const row of rows) {
      if (!row.exit_date || row.exit_date < from || row.exit_date > until) continue;
      byDay.set(row.exit_date, (byDay.get(row.exit_date) ?? 0) + Number(row.profit ?? 0));
    }
    // Open positions still count: the whole move for LIVE (today only), the
    // full open profit for any window that runs up to right now.
    const open = active.endYesterday ? 0 : active.live ? unrealizedToday : unrealized;
    if (open !== 0) byDay.set(today, (byDay.get(today) ?? 0) + open);

    const days = [...byDay.keys()].sort();
    let running = 0;
    return days.map((day) => {
      running += byDay.get(day) ?? 0;
      return { day, daily: byDay.get(day) ?? 0, cumulative: Number(running.toFixed(2)) };
    });
  }, [rows, active, unrealized, unrealizedToday]);

  const total = series.length > 0 ? series[series.length - 1]!.cumulative : 0;
  const pct = basis > 0 ? (total / basis) * 100 : null;
  const up = total >= 0;
  const tone = up ? "text-success" : "text-destructive";
  const width = 100;
  const height = 40;
  const max = Math.max(0.01, ...series.map((p) => Math.abs(p.cumulative)));
  const points = series.length === 1 ? [...series, ...series] : series;
  const path = points
    .map((point, i) => {
      const x = (i / Math.max(1, points.length - 1)) * width;
      const y = height / 2 - (point.cumulative / max) * (height / 2 - 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <section
      className={
        compact ? "space-y-2" : "space-y-3 rounded-md border border-border bg-card p-4"
      }
    >
      <div className="space-y-0.5">
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
        <p className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"}`}>
          {up ? "+" : ""}
          {money(total)}
        </p>
        <p className={`text-xs font-medium tabular-nums ${tone}`}>
          {up ? "▲" : "▼"} {pct === null ? "" : `${Math.abs(pct).toFixed(2)}% · `}
          {active.label === "LIVE" ? "today, live" : active.label}
        </p>
      </div>

      {series.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Flat for this window — the line moves once a position is open or sold.
        </p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={compact ? "h-20 w-full" : "h-32 w-full"}
          preserveAspectRatio="none"
        >
          {/* Dotted break-even baseline, the way Robinhood draws it. */}
          <line
            x1="0"
            x2={width}
            y1={height / 2}
            y2={height / 2}
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray="1.5 1.5"
            className="text-muted-foreground/60"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={path}
            fill="none"
            strokeWidth="1.6"
            strokeLinecap="round"
            stroke="currentColor"
            className={tone}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <div className="flex flex-wrap gap-1">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
              r.key === range
                ? `bg-foreground/10 ${tone}`
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {compact || series.length === 0 ? null : (
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
      )}
    </section>
  );
}
