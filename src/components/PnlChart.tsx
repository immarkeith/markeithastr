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
  /**
   * A real calendar period instead of a rolling day count:
   *   week    — the current week, from its first day through today
   *   month   — the 1st of this month through today
   *   months3 — this month plus the two whole months before it
   */
  calendar?: "week" | "month" | "months3";
}

/**
 * Short labels only — LIVE, 1W, 1M, 3M. The windows themselves are still real
 * calendar periods: this week, this month, this month plus the two before it.
 */
export const HOME_RANGES: PnlRange[] = [
  { key: "live", label: "LIVE", days: 1, live: true },
  { key: "week", label: "1W", days: 7, calendar: "week" },
  { key: "month", label: "1M", days: 31, calendar: "month" },
  { key: "months3", label: "3M", days: 92, calendar: "months3" },
];

/** The Research Lab reads the same calendar periods as the live graph. */
export const LAB_RANGES: PnlRange[] = HOME_RANGES;

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/** First day of a calendar period, as an ISO date. */
function calendarStart(kind: "week" | "month" | "months3"): string {
  const today = isoDaysAgo(0);
  if (kind === "week") {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.toISOString().slice(0, 10);
  }
  if (kind === "month") return `${today.slice(0, 7)}-01`;
  // This month plus the two immediately preceding whole months.
  const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 2);
  return d.toISOString().slice(0, 10);
}

/**
 * Profit/loss over a chosen window: realised profit from closed trades, plus
 * the current open-position move so the line keeps updating before anything is
 * sold. Shared by the Home dashboard and every Research Lab slot so the two
 * always read the same way.
 *
 * A second series can be supplied (`compareRows`) to draw both research time
 * horizons — Same-Day and 3-Day — as two lines on one graph with a legend.
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
  compareRows,
  primaryLabel,
  compareLabel,
  secondaryRows,
  secondaryOpen = 0,
  secondaryLabel,
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
  /** Optional second line, e.g. the hypothetical same-day results. */
  compareRows?: { exit_date: string | null; profit: number }[];
  primaryLabel?: string;
  compareLabel?: string;
  /**
   * An extra, independent line on the same axes and the same range controls —
   * used for the combined live LONG_TERM profit/loss. It never changes how the
   * main line is drawn or measured.
   */
  secondaryRows?: { exit_date: string | null; profit: number }[];
  /** Open profit of those long-term positions right now. */
  secondaryOpen?: number;
  secondaryLabel?: string;
}) {
  const [range, setRange] = useState(initialRange ?? ranges[0]!.key);
  const active = ranges.find((r) => r.key === range) ?? ranges[0]!;

  const window = useMemo(() => {
    const today = isoDaysAgo(0);
    if (active.calendar) {
      return { today, from: calendarStart(active.calendar), until: today };
    }
    const from = active.endYesterday ? isoDaysAgo(active.days) : isoDaysAgo(active.days - 1);
    const until = active.endYesterday ? isoDaysAgo(1) : today;
    return { today, from, until };
  }, [active]);

  const daily = useMemo(() => {
    const build = (
      source: { exit_date: string | null; profit: number }[],
      open: number,
    ): Map<string, number> => {
      const byDay = new Map<string, number>();
      for (const row of source) {
        if (!row.exit_date || row.exit_date < window.from || row.exit_date > window.until) continue;
        byDay.set(row.exit_date, (byDay.get(row.exit_date) ?? 0) + Number(row.profit ?? 0));
      }
      if (open !== 0) byDay.set(window.today, (byDay.get(window.today) ?? 0) + open);
      return byDay;
    };
    // Open positions still count: the whole move for LIVE (today only), the
    // full open profit for any window that runs up to right now.
    const open = active.endYesterday ? 0 : active.live ? unrealizedToday : unrealized;
    return {
      primary: build(rows, open),
      // The same-day line is fully hypothetical and already booked per day, so
      // it never adds an open-position move.
      compare: compareRows ? build(compareRows, 0) : null,
      // Long-term holds: realised sales plus their current open move.
      secondary: secondaryRows
        ? build(secondaryRows, active.endYesterday ? 0 : secondaryOpen)
        : null,
    };
  }, [
    rows,
    compareRows,
    secondaryRows,
    secondaryOpen,
    window,
    active,
    unrealized,
    unrealizedToday,
  ]);

  const days = useMemo(() => {
    const all = new Set<string>([
      ...daily.primary.keys(),
      ...(daily.compare?.keys() ?? []),
      ...(daily.secondary?.keys() ?? []),
    ]);
    return [...all].sort();
  }, [daily]);

  const cumulate = (byDay: Map<string, number> | null) => {
    if (!byDay) return null;
    let running = 0;
    return days.map((day) => {
      running += byDay.get(day) ?? 0;
      return { day, daily: byDay.get(day) ?? 0, cumulative: Number(running.toFixed(2)) };
    });
  };

  const series = cumulate(daily.primary) ?? [];
  const compareSeries = cumulate(daily.compare);
  const secondarySeries = cumulate(daily.secondary);

  const total = series.length > 0 ? series[series.length - 1]!.cumulative : 0;
  const compareTotal =
    compareSeries && compareSeries.length > 0
      ? compareSeries[compareSeries.length - 1]!.cumulative
      : null;
  const secondaryTotal =
    secondarySeries && secondarySeries.length > 0
      ? secondarySeries[secondarySeries.length - 1]!.cumulative
      : null;
  const pct = basis > 0 ? (total / basis) * 100 : null;
  const up = total >= 0;
  const tone = up ? "text-success" : "text-destructive";
  const width = 100;
  const height = 40;
  const max = Math.max(
    0.01,
    ...series.map((p) => Math.abs(p.cumulative)),
    ...(compareSeries ?? []).map((p) => Math.abs(p.cumulative)),
    ...(secondarySeries ?? []).map((p) => Math.abs(p.cumulative)),
  );

  const pathOf = (points: { cumulative: number }[]) => {
    const list = points.length === 1 ? [...points, ...points] : points;
    return list
      .map((point, i) => {
        const x = (i / Math.max(1, list.length - 1)) * width;
        const y = height / 2 - (point.cumulative / max) * (height / 2 - 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  };

  const twoLine = compareSeries !== null;
  // EVERY line reads the same way: profit is green, loss is red, flat or no
  // activity is blue. It follows the overall result for the selected range, not
  // the last day's wiggle. Solid versus dotted still tells the lines apart.
  const toneOf = (value: number | null) =>
    value === null || value === 0
      ? "text-live"
      : value > 0
        ? "text-success"
        : "text-destructive";
  const fillOf = (value: number | null) =>
    value === null || value === 0 ? "bg-live" : value > 0 ? "bg-success" : "bg-destructive";
  const primaryStroke = toneOf(total);
  const compareStroke = toneOf(compareTotal);

  return (
    <section
      className={
        compact ? "space-y-2" : "space-y-3 rounded-md border border-border bg-card p-4"
      }
    >
      <div className="space-y-0.5">
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{title}</h2>
        {twoLine ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
            <p className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${toneOf(total)}`}>
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {primaryLabel ?? "3-Day"}
              </span>
              {total >= 0 ? "+" : ""}
              {money(total)}
            </p>
            <p className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${toneOf(compareTotal)}`}>
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {compareLabel ?? "Same-Day"}
              </span>
              {(compareTotal ?? 0) >= 0 ? "+" : ""}
              {money(compareTotal ?? 0)}
            </p>
          </div>
        ) : (
          <p className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"}`}>
            {up ? "+" : ""}
            {money(total)}
          </p>
        )}
        <p className={`text-xs font-medium tabular-nums ${twoLine ? "text-muted-foreground" : toneOf(total)}`}>
          {twoLine || total === 0 ? "" : up ? "▲ " : "▼ "}
          {pct === null ? "" : `${Math.abs(pct).toFixed(2)}% · `}
          {active.label === "LIVE" ? "today, live" : active.label}
        </p>
      </div>

      {/* The graph is always drawn, even with no activity: a flat baseline. */}
      <div className="flex items-stretch gap-2">
        <span className="flex w-6 shrink-0 items-center justify-center text-[9px] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          P/L ($)
        </span>
        <div className="flex-1 space-y-1">
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
            {compareSeries && compareSeries.length > 0 ? (
              <path
                d={pathOf(compareSeries)}
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="2 2"
                stroke="currentColor"
                className={compareStroke}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {/* Combined live long-term profit/loss — its own line, same axes. */}
            {secondarySeries && secondarySeries.length > 0 ? (
              <path
                d={pathOf(secondarySeries)}
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="3 2"
                stroke="currentColor"
                className={toneOf(secondaryTotal)}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {series.length > 0 ? (
              <path
                d={pathOf(series)}
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                stroke="currentColor"
                className={primaryStroke}
                vectorEffect="non-scaling-stroke"
              />
            ) : series.length === 0 && (compareSeries?.length ?? 0) === 0 ? (
              <path
                d={`M0,${height / 2} L${width},${height / 2}`}
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
                stroke="currentColor"
                className="text-live"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          <p className="text-center text-[9px] uppercase tracking-wider text-muted-foreground">
            Date / time
          </p>
        </div>
      </div>
      {series.length === 0 && (compareSeries?.length ?? 0) === 0 ? (
        <p className="text-xs text-muted-foreground">
          Flat for this window — the line moves once a position is open or sold.
        </p>
      ) : null}

      {twoLine ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={`inline-block h-0.5 w-5 rounded ${fillOf(total)}`} />
            solid — {primaryLabel ?? "3-Day"}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`inline-block h-0 w-5 border-t-2 border-dotted border-current ${toneOf(compareTotal)}`}
            />
            dotted — {compareLabel ?? "Same-Day"}
          </span>
        </div>
      ) : null}

      {/* Two clearly named lines whenever long-term holds are included. */}
      {secondarySeries ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className={`inline-block h-0.5 w-5 rounded ${fillOf(total)}`} />
            {primaryLabel ?? "Same-Day P/L"} {total >= 0 ? "+" : ""}
            {money(total)}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`inline-block h-0 w-5 border-t-2 border-dashed border-current ${toneOf(secondaryTotal)}`}
            />
            {secondaryLabel ?? "Long-Term P/L"}{" "}
            {secondaryTotal === null ? "—" : `${secondaryTotal >= 0 ? "+" : ""}${money(secondaryTotal)}`}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
              r.key === range
                ? `bg-foreground/10 ${twoLine ? "text-foreground" : tone}`
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

