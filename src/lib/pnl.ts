/** Pure graph calculation shared by the dashboards and regression tests. */
export interface PnlRange {
  key: string;
  label: string;
  days: number;
  live?: boolean;
  endYesterday?: boolean;
  calendar?: "week" | "month" | "months3" | "ytd";
  weekly?: boolean;
}
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
export const LAB_RANGES = HOME_RANGES;
export function tradingDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDay(day: string, count: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function pnlWindow(range: PnlRange, today: string) {
  let from = shiftDay(today, -(range.endYesterday ? range.days : range.days - 1));
  if (range.calendar === "ytd") from = `${today.slice(0, 4)}-01-01`;
  if (range.calendar === "month") from = `${today.slice(0, 7)}-01`;
  if (range.calendar === "week")
    from = shiftDay(today, -new Date(`${today}T12:00:00Z`).getUTCDay());
  if (range.calendar === "months3") {
    const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - 2);
    from = d.toISOString().slice(0, 10);
  }
  return { today, from, until: range.endYesterday ? shiftDay(today, -1) : today };
}
export interface PnlRow {
  exit_date: string | null;
  profit: number;
}
export interface PnlPoint {
  day: string;
  daily: number;
  cumulative: number;
}
/** Current incomplete weeks are included immediately, not only at week end. */
export function pnlSeries(
  rows: PnlRow[],
  range: PnlRange,
  today: string,
  open = 0,
  basis = 0,
  percent = false,
): PnlPoint[] {
  const window = pnlWindow(range, today);
  const bucket = (day: string) => {
    if (!range.weekly) return day;
    const start = shiftDay(day, -new Date(`${day}T12:00:00Z`).getUTCDay());
    // Labels stay INSIDE the selected window, including the incomplete week.
    return [shiftDay(start, 6), window.until].sort()[0]!;
  };
  const values = new Map<string, number>();
  const add = (day: string, value: number) => {
    const key = bucket(day);
    if (!Number.isFinite(value)) throw new Error("Invalid P&L value");
    values.set(key, (values.get(key) ?? 0) + value);
  };
  for (const row of rows) {
    if (row.exit_date && row.exit_date >= window.from && row.exit_date <= window.until)
      add(row.exit_date, Number(row.profit));
  }
  if (!range.endYesterday) add(today, open);
  // Avoid a century of empty ticks in All; still preserve the selected filter.
  let start = range.key === "all" ? ([...values.keys()].sort()[0] ?? today) : window.from;
  const days = new Set<string>(values.keys());
  for (; start <= window.until; start = shiftDay(start, range.weekly ? 7 : range.days > 90 ? 2 : 1))
    days.add(bucket(start));
  days.add(window.until);
  let running = 0;
  return [...days].sort().map((day) => {
    const dollars = values.get(day) ?? 0;
    const daily = percent ? (basis > 0 ? (dollars / basis) * 100 : 0) : dollars;
    running += daily;
    return { day, daily, cumulative: Number(running.toFixed(2)) };
  });
}
/** Overnight move uses actual shares, not a new notional at yesterday's price. */
export function positionDayPnl(qty: number, current: number, prior: number) {
  return Number((qty * (current - prior)).toFixed(2));
}
