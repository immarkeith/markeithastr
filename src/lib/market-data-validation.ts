export interface DailyPriceBar {
  ticker: string;
  bar_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Reject incomplete/provider-error rows instead of inventing prices. */
export function validDailyBar(row: DailyPriceBar): boolean {
  return [row.open, row.high, row.low, row.close].every((n) => Number.isFinite(n) && n > 0)
    && Number.isFinite(row.volume) && row.volume >= 0
    && row.high >= Math.max(row.open, row.close, row.low)
    && row.low <= Math.min(row.open, row.close);
}

export function exactDailyPrice(rows: DailyPriceBar[], ticker: string, date: string): number | null {
  const row = rows.find((r) => r.ticker === ticker && r.bar_date === date && validDailyBar(r));
  return row?.close ?? null;
}

export async function retryCoverage<T>(read: () => Promise<T>, recovered?: () => void): Promise<T> {
  try { return await read(); } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/timeout|timed out|57014|temporar|connection|fetch failed/i.test(message)) throw error;
    const result = await read();
    recovered?.();
    return result;
  }
}