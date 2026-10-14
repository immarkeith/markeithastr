import type { BarRow } from "./market-data.server";
/** Reject corrupt bars; never manufacture OHLC or pad missing sessions. */
export function reliableBar(bar: BarRow): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(bar.bar_date) &&
    [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite) &&
    Math.min(bar.open, bar.high, bar.low, bar.close) > 0 &&
    bar.volume >= 0 &&
    bar.low <= Math.min(bar.open, bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= bar.high
  );
}
/** IEX's reliable feed history starts in 2016. Provider entitlement may be shorter. */
export const RELIABLE_HISTORY_START = "2016-01-01";
export const RESEARCH_HISTORY_SESSIONS = 2520;
