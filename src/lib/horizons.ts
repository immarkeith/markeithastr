/**
 * Holding horizons for LIVE long-term positions and for the paper research
 * that evaluates the same idea over longer periods. Client-safe.
 *
 * A horizon is an INTENTION, never permission for ASTR to sell. The review date
 * only decides when the owner gets asked what to do next.
 */
export type HoldHorizon = "1M" | "3M" | "9M" | "INDEFINITE";

export const HOLD_HORIZONS: ReadonlyArray<{
  value: HoldHorizon;
  label: string;
  /** Calendar months until the review date; null means no scheduled review. */
  months: number | null;
}> = [
  { value: "1M", label: "1 Month", months: 1 },
  { value: "3M", label: "3 Months", months: 3 },
  { value: "9M", label: "9 Months", months: 9 },
  { value: "INDEFINITE", label: "Indefinite", months: null },
];

/**
 * Checkpoints the Research Lab evaluates on paper. The one-week checkpoint is
 * research only: it is an early read on a long-term idea, and it never appears
 * on the Long-Term scoreboard, which needs at least a one-month horizon.
 */
export const RESEARCH_HORIZONS = ["1W", "1M", "3M", "9M"] as const;
export type ResearchHorizon = (typeof RESEARCH_HORIZONS)[number];

/** Horizons that qualify for the Long-Term board (minimum one month). */
export const LONG_TERM_RESEARCH_HORIZONS = ["1M", "3M", "9M"] as const;

export function horizonLabel(value: string | null | undefined): string {
  if (!value) return "Indefinite";
  if (value === "1W") return "1 Week";
  return HOLD_HORIZONS.find((h) => h.value === value)?.label ?? String(value);
}

export function horizonMonths(value: string | null | undefined): number | null {
  return HOLD_HORIZONS.find((h) => h.value === value)?.months ?? null;
}

/** The evaluation date for a research checkpoint, including the week one. */
export function checkpointDate(horizon: string, fromIso: string): string {
  if (horizon === "1W") {
    const d = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  const months = horizon === "1M" ? 1 : horizon === "3M" ? 3 : 9;
  return addCalendarMonths(fromIso, months);
}

/**
 * Adds calendar months, not a fixed number of days: buying on 31 January with a
 * 1-month horizon reviews on 28/29 February, not on 2 or 3 March.
 */
export function addCalendarMonths(fromIso: string, months: number): string {
  const [y, m, d] = fromIso.slice(0, 10).split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** The scheduled review date for a horizon, or null when it is indefinite. */
export function reviewDateFor(horizon: string | null | undefined, fromIso: string): string | null {
  const months = horizonMonths(horizon);
  if (months === null) return null;
  return addCalendarMonths(fromIso, months);
}
