import { useEffect, useMemo, useState } from "react";

import { money } from "@/lib/queries";
import { marketStatus } from "@/lib/market-calendar";

import { HOME_RANGES, pnlSeries, tradingDate, type PnlRange } from "@/lib/pnl";
export { HOME_RANGES, LAB_RANGES } from "@/lib/pnl";
export type { PnlRange } from "@/lib/pnl";

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
}) {
  const [today, setToday] = useState(() => tradingDate());
  const [range, setRange] = useState(initialRange ?? ranges[0]!.key);
  const [marketOpen, setMarketOpen] = useState(() => {
    const state = marketStatus().state;
    return state === "open" || state === "closing";
  });
  useEffect(() => {
    const update = () => {
      setToday(tradingDate());
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

  const series = useMemo(
    () =>
      pnlSeries(rows, active, today, active.live ? unrealizedToday : unrealized, basis, percent),
    [rows, active, today, unrealized, unrealizedToday, basis, percent],
  );
  const compareSeries = useMemo(
    () => (compareRows ? pnlSeries(compareRows, active, today, 0, basis, percent) : null),
    [compareRows, active, today, basis, percent],
  );
  const secondarySeries = useMemo(
    () =>
      secondaryRows ? pnlSeries(secondaryRows, active, today, secondaryOpen, basis, percent) : null,
    [secondaryRows, active, today, secondaryOpen, basis, percent],
  );

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
    value === null || value === 0 ? "text-live" : value > 0 ? "text-success" : "text-destructive";
  const fillOf = (value: number | null) =>
    value === null || value === 0 ? "bg-live" : value > 0 ? "bg-success" : "bg-destructive";
  const primaryStroke = toneOf(total);
  const compareStroke = toneOf(compareTotal);

  return (
    <section
      className={compact ? "space-y-2" : "space-y-3 rounded-md border border-border bg-card p-4"}
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
                {fmtTotal(total).replace(/^\+/, "")}
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
              <p
                className={`truncate text-lg font-bold ${todayActiveTicker === "—" ? "text-muted-foreground" : "text-primary"}`}
              >
                {todayActiveTicker}
              </p>
            </div>
          </div>
        ) : twoLine ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5">
            <p
              className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${toneOf(total)}`}
            >
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {primaryLabel ?? "Primary"}
              </span>
              {total >= 0 ? "+" : ""}
              {fmtTotal(total).replace(/^\+/, "")}
            </p>
            <p
              className={`font-bold tabular-nums ${compact ? "text-lg" : "text-2xl"} ${toneOf(compareTotal)}`}
            >
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {compareLabel ?? "Same-Day"}
              </span>
              {(compareTotal ?? 0) >= 0 ? "+" : ""}
              {fmtTotal(compareTotal ?? 0).replace(/^\+/, "")}
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
        <p
          className={`text-xs font-medium tabular-nums ${twoLine ? "text-muted-foreground" : toneOf(total)}`}
        >
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
            role="img"
            aria-label={`${title}: ${active.label}, ${fmtTotal(total)}`}
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
            {secondaryTotal === null
              ? "—"
              : `${secondaryTotal >= 0 ? "+" : ""}${money(secondaryTotal)}`}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={r.key === range}
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

      <p className="text-[10px] text-muted-foreground">
        Realized results by exit date + current open-position P/L. Today uses only today’s
        open-position move.
      </p>

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
