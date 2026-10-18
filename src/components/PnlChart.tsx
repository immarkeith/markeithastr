import { useEffect, useMemo, useState } from "react";

import { money } from "@/lib/queries";
import { marketStatus } from "@/lib/market-calendar";

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
  calendar?: "week" | "month" | "months3" | "ytd";
  /** Display resolution only — never limits research or holding periods. */
  weekly?: boolean;
}

/**
 * Short labels only — LIVE, 1W, 1M, 3M. The windows themselves are still real
 * calendar periods: this week, this month, this month plus the two before it.
 */
export const HOME_RANGES: PnlRange[] = [
  { key: "live", label: "Today", days: 1, live: true },
  { key: "week", label: "1W", days: 7 },
  { key: "month", label: "1M", days: 31 },
  { key: "months3", label: "3M", days: 92 },
  { key: "ytd", label: "YTD", days: 366, calendar: "ytd" },
  { key: "year", label: "1Y", days: 365 },
  { key: "years5", label: "5Y", days: 1826, weekly: true },
  { key: "all", label: "All", days: 36500, weekly: true },
];

/** The Research Lab reads the same calendar periods as the live graph. */
export const LAB_RANGES: PnlRange[] = HOME_RANGES;

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/** First day of a calendar period, as an ISO date. */
function calendarStart(kind: "week" | "month" | "months3" | "ytd"): string {
  const today = isoDaysAgo(0);
  if (kind === "ytd") return `${today.slice(0, 4)}-01-01`;
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
 * An optional comparison series can draw a second independent line.
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
  percent = false,
  compareRows,
  primaryLabel,
  compareLabel,
  secondaryRows,
  secondaryOpen = 0,
  secondaryLabel,
  liveTicker,
  activeTicker,
  equity,
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
  /**
   * Draw the line in pure percentage terms instead of dollars, so researcher
   * curves are never distorted by stake size or cash balance.
   */
  percent?: boolean;
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
  /** Current real same-day holding, shown only while the LIVE range and market are active. */
  liveTicker?: string | null;
  /**
   * This slot's currently held ticker. When provided, the headline shows the
   * ticker (or "—" when nothing is held) instead of the duplicated dollar P/L.
   */
  activeTicker?: string | null;
  /**
   * Server-built mark-to-market equity for this book (FEATURES.md §8.1):
   * realized P/L through each date plus every open position marked to that
   * session's real cached close. When present, it REPLACES the realized-only
   * construction entirely — the chart draws these points directly, re-based
   * to the selected window so the line starts at zero.
   */
  equity?: {
    points: { date: string; equity: number }[];
    coverage_from: string | null;
    coverage_to: string | null;
    has_gaps: boolean;
  } | null;
}) {
  const [range, setRange] = useState(initialRange ?? ranges[0]!.key);
  const [marketOpen, setMarketOpen] = useState(() => {
    const state = marketStatus().state;
    return state === "open" || state === "closing";
  });
  useEffect(() => {
    const update = () => {
      const state = marketStatus().state;
      setMarketOpen(state === "open" || state === "closing");
    };
    update();
    const id = globalThis.setInterval(update, 10_000);
    globalThis.addEventListener?.("focus", update);
    globalThis.addEventListener?.("visibilitychange", update);
    return () => {
      globalThis.clearInterval(id);
      globalThis.removeEventListener?.("focus", update);
      globalThis.removeEventListener?.("visibilitychange", update);
    };
  }, []);
  const active = ranges.find((r) => r.key === range) ?? ranges[0]!;
  const activeLiveTicker = active.live && marketOpen && liveTicker ? liveTicker : null;
  const showsLiveHolding = liveTicker !== undefined;
  const todayActiveTicker = marketOpen && liveTicker ? liveTicker.toUpperCase() : "—";
  // Same-day only: never show a held ticker outside the regular session.
  const shownActiveTicker = marketOpen ? (activeTicker ?? null) : null;

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
    // Long ranges group by week so the line stays readable on a phone.
    const bucket = (day: string) => {
      if (!active.weekly) return day;
      const d = new Date(`${day}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - d.getUTCDay());
      return d.toISOString().slice(0, 10);
    };
        const build = (
      source: { exit_date: string | null; entry_date?: string | null; profit: number }[],
      open: number,
    ): Map<string, number> => {
      const byDay = new Map<string, number>();
      for (const row of source) {
        if (!row.exit_date || row.exit_date < window.from || row.exit_date > window.until) continue;
        const key = bucket(row.exit_date);
        const value =
          percent && basis > 0 ? (Number(row.profit ?? 0) / basis) * 100 : Number(row.profit ?? 0);
        byDay.set(key, (byDay.get(key) ?? 0) + value);
      }
      if (open !== 0) {
        const key = bucket(window.today);
        const openValue = percent && basis > 0 ? (open / basis) * 100 : open;
        byDay.set(key, (byDay.get(key) ?? 0) + openValue);
      }
      return byDay;
    };

    // With a mark-to-market equity curve present, the open position is already
    // carried bar-by-bar — adding the live unrealized again would double-count.
    const hasOpenSeries = equity !== null && equity !== undefined && equity.points.length > 0;
    const open = active.endYesterday || hasOpenSeries ? 0 : active.live ? unrealizedToday : unrealized;
    return {
      primary: build(rows, open),
      compare: compareRows ? build(compareRows, 0) : null,
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
    percent,
    basis,
    equity,
  ]);

  // Generate a continuous date timeline so windows with few closed trades
  // still render a continuous mark-to-market curve instead of a flat 1-point collapse.
  const days = useMemo(() => {
    const list: string[] = [];
    const cur = new Date(`${window.from}T00:00:00Z`);
    const end = new Date(`${window.until}T00:00:00Z`);
    const stepDays = active.weekly ? 7 : active.days > 90 ? 2 : 1;

    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      list.push(iso);
      cur.setUTCDate(cur.getUTCDate() + stepDays);
    }
    if (list[list.length - 1] !== window.until) {
      list.push(window.until);
    }

    // Merge any trade exit dates outside or within the stepped grid
    const all = new Set<string>([
      ...list,
      ...daily.primary.keys(),
      ...(daily.compare?.keys() ?? []),
      ...(daily.secondary?.keys() ?? []),
    ]);
    return [...all].sort();
  }, [window, active, daily]);

  const cumulate = (byDay: Map<string, number> | null) => {
    if (!byDay) return null;
    let running = 0;
    return days.map((day) => {
      // Realized profit lands on exit dates; the live mark (when no equity
      // curve exists) lands on today's point only.
      const realized = byDay.get(day) ?? 0;
      running += realized;
      return { day, daily: realized, cumulative: Number(running.toFixed(2)) };
    });
  };

  /**
   * The server-built mark-to-market curve, sliced to the selected window and
   * re-based so it starts at zero. Used INSTEAD of the realized-only builder.
   */
  const equitySeries = useMemo(() => {
    if (!equity || equity.points.length === 0) return null;
    const inWindow = equity.points.filter(
      (p) => p.date >= window.from && p.date <= window.until,
    );
    // No cached bar inside this window (e.g. Today before the session's bar
    // exists): fall back to the realized builder instead of collapsing flat.
    if (inWindow.length === 0) return null;
    const scale = percent && basis > 0 ? 100 / basis : 1;
    // Long ranges roll daily marks up to one point per week so the line stays
    // readable instead of drawing every session bunched together.
    const rolled = (() => {
      if (!active.weekly) return inWindow;
      const byWeek = new Map<string, number>();
      for (const p of inWindow) {
        const d = new Date(`${p.date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - d.getUTCDay());
        byWeek.set(d.toISOString().slice(0, 10), p.equity);
      }
      return [...byWeek.entries()]
        .map(([date, eq]) => ({ date, equity: eq }))
        .sort((a, b) => a.date.localeCompare(b.date));
    })();
    const base = rolled[0]!.equity;
    let prev = base;
    return rolled.map((p) => {
      const cumulative = Number(((p.equity - base) * scale).toFixed(2));
      // daily is the day-over-day change, not a repeat of the running total.
      const daily = Number(((p.equity - prev) * scale).toFixed(2));
      prev = p.equity;
      return { day: p.date, daily, cumulative };
    });
  }, [equity, window, percent, basis, active.weekly]);

  const series = equitySeries ?? cumulate(daily.primary) ?? [];
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
  /** Percent mode: totals are already percentages, so format them directly. */
  const fmtTotal = (n: number) =>
    percent ? `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` : `${n >= 0 ? "+" : ""}${money(n)}`;
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

  /** X positions follow each point's actual date, not even steps, so every
   *  line — primary, compare, secondary — shares one date-true axis. */
  const xOf = (day: string) => {
    const t = Date.parse(`${day}T00:00:00Z`);
    const from = Date.parse(`${window.from}T00:00:00Z`);
    const to = Date.parse(`${window.until}T00:00:00Z`);
    return ((t - from) / Math.max(1, to - from)) * width;
  };
  const pathOf = (points: { day: string; cumulative: number }[]) => {
    const list = points.length === 1 ? [...points, ...points] : points;
    return list
      .map((point, i) => {
        const x = xOf(point.day);
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
        {showsLiveHolding && secondaryRows !== undefined ? (
          <div className="grid grid-cols-3 divide-x divide-border/60 pt-1">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                {primaryLabel ?? "Same-Day P/L"}
              </p>
              <p className={`truncate text-lg font-bold tabular-nums ${toneOf(total)}`}>
                {total >= 0 ? "+" : ""}
                {money(total)}
              </p>
            </div>
            <div className="min-w-0 px-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                {secondaryLabel ?? "Long-Term P/L"}
              </p>
              <p className={`truncate text-lg font-bold tabular-nums ${toneOf(secondaryTotal)}`}>
                {secondaryTotal === null
                  ? "—"
                  : `${secondaryTotal >= 0 ? "+" : ""}${money(secondaryTotal)}`}
              </p>
            </div>
            <div className="min-w-0 pl-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Today’s Active
              </p>
              <p className={`truncate text-lg font-bold ${todayActiveTicker === "—" ? "text-muted-foreground" : "text-primary"}`}>
                {todayActiveTicker}
              </p>
            </div>
          </div>
        ) : twoLine ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
            <p className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${toneOf(total)}`}>
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {primaryLabel ?? "Primary"}
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
        ) : activeTicker !== undefined ? (
          <p
            className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"} ${
              shownActiveTicker ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {shownActiveTicker ? shownActiveTicker.toUpperCase() : "—"}
          </p>
        ) : (
          <p className={`font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"}`}>
            {fmtTotal(total)}
          </p>
        )}
        <p className={`text-xs font-medium tabular-nums ${twoLine ? "text-muted-foreground" : toneOf(total)}`}>
          {twoLine || total === 0 ? "" : up ? "▲ " : "▼ "}
          {pct === null || percent ? "" : `${Math.abs(pct).toFixed(2)}% · `}
          {active.label === "LIVE" ? "today, live" : active.label}
        </p>
      </div>

      {/* The graph is always drawn, even with no activity: a flat baseline. */}
      <div className="relative flex items-stretch gap-2">
        {activeLiveTicker ? (
          <span className="absolute right-1 top-0 z-10 text-[10px] font-semibold uppercase text-primary">
            LIVE — {activeLiveTicker}
          </span>
        ) : null}
        <span className="flex w-6 shrink-0 items-center justify-center text-[9px] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          {percent ? "P/L (%)" : "P/L ($)"}
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
            solid — {primaryLabel ?? "Primary"}
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

      {equity && equity.points.length > 0 && equity.coverage_from ? (
        <p className="text-[10px] text-muted-foreground">
          Marked to real daily closes {equity.coverage_from} → {equity.coverage_to ?? "now"}
          {equity.coverage_to && equity.coverage_to < isoDaysAgo(0)
            ? " — no newer bars cache yet, later dates show no movement"
            : ""}
          {equity.has_gaps ? " — some sessions lack cached bars and show no movement there" : ""}
        </p>
      ) : null}

      {compact || series.length === 0 ? null : (
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {series
            .slice(-6)
            .reverse()
            .map((point) => (
              <li key={point.day} className="flex justify-between tabular-nums">
                <span>{point.day}</span>
                <span className={point.daily >= 0 ? "text-success" : "text-destructive"}>
                  {percent
                    ? `${point.daily >= 0 ? "+" : ""}${point.daily.toFixed(2)}%`
                    : `${point.daily >= 0 ? "+" : ""}${money(point.daily)}`}
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
