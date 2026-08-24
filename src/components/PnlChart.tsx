import { useMemo, useState } from "react";

import { money } from "@/lib/queries";

export interface PnlRange {
  key: string;
  label: string;
  days: number;
}

export const HOME_RANGES: PnlRange[] = [
  { key: "1d", label: "Today", days: 1 },
  { key: "1w", label: "Week", days: 7 },
  { key: "1m", label: "Month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
];

/** The Research Lab compares strategies week by week over a one-month test. */
export const LAB_RANGES: PnlRange[] = [
  { key: "1d", label: "Today", days: 1 },
  { key: "1w", label: "1 wk", days: 7 },
  { key: "2w", label: "2 wk", days: 14 },
  { key: "3w", label: "3 wk", days: 21 },
  { key: "4w", label: "4 wk", days: 28 },
];

/**
 * Cumulative realised profit/loss over a chosen window, drawn from closed
 * trades. Shared by the Home dashboard and every Research Lab slot so the two
 * always read the same way.
 */
export function PnlChart({
  rows,
  ranges = HOME_RANGES,
  initialRange,
  title = "Profit / loss",
  compact = false,
}: {
  rows: { exit_date: string | null; profit: number }[];
  ranges?: PnlRange[];
  initialRange?: string;
  title?: string;
  compact?: boolean;
}) {
  const [range, setRange] = useState(initialRange ?? ranges[1]?.key ?? ranges[0]!.key);
  const active = ranges.find((r) => r.key === range) ?? ranges[0]!;

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
  const width = 100;
  const height = 40;
  const max = Math.max(0.01, ...series.map((p) => Math.abs(p.cumulative)));
  const path = series
    .map((point, i) => {
      const x = series.length === 1 ? width : (i / (series.length - 1)) * width;
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
        <div className="flex flex-wrap gap-1">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
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
        className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${
          total >= 0 ? "text-success" : "text-destructive"
        }`}
      >
        {total >= 0 ? "+" : ""}
        {money(total)}
      </p>

      {series.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No closed trades in this window yet — the line starts once a position is sold.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={compact ? "h-16 w-full" : "h-28 w-full"}
            preserveAspectRatio="none"
          >
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
          {compact ? null : (
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
        </>
      )}
    </section>
  );
}
