/** Deterministic audit math. Never mutates research or trading state. */
export const FILL_TOLERANCE = 0.005;
export const cents = (value: number) => Math.round(value * 100);

export function validateBarFill(price: number | null, bar?: { low: number; high: number }) {
  if (!bar || !Number.isFinite(bar.low) || !Number.isFinite(bar.high) || bar.low <= 0 || bar.high < bar.low) return "missing";
  if (price === null || !Number.isFinite(price) || price <= 0) return "invalid";
  const epsilon = Number.EPSILON * Math.max(price, bar.high) * 4;
  return price + epsilon >= bar.low * (1 - FILL_TOLERANCE) && price - epsilon <= bar.high * (1 + FILL_TOLERANCE) ? "valid" : "invalid";
}

export function validateSameDayHold(entry: string, exit: string | null, target: string | null, holdDays: number, positionType: string) {
  // Historical swings inherited the SAME_DAY database default. Require positive intent.
  const intraday = positionType === "SAME_DAY" && holdDays === 0 && target === entry;
  return !intraday || !exit || exit === entry;
}

export function recalculateMetrics(profits: number[]) {
  const wins = profits.filter(p => p > 0);
  const losses = profits.filter(p => p < 0);
  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = -losses.reduce((a, b) => a + b, 0);
  return { total_trades: profits.length, wins: wins.length, losses: losses.length,
    win_rate: profits.length ? wins.length / profits.length * 100 : 0,
    total_profit: cents(profits.reduce((a, b) => a + b, 0)) / 100,
    profit_factor: grossLosses ? grossWins / grossLosses : null };
}

export function reconcileBalance(capital: number, realized: number, settled: number, unsettled: number, openCost: number) {
  const expected = cents(capital) + cents(realized);
  const actual = cents(settled) + cents(unsettled) + cents(openCost);
  return { expected: expected / 100, actual: actual / 100, difference: (actual - expected) / 100, valid: expected === actual };
}

export function validateTemporalBoundary(signal: unknown, historyEnd: unknown) {
  if (typeof signal !== "string" || typeof historyEnd !== "string") return "missing";
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && Number.isFinite(Date.parse(v));
  if (!validDate(signal) || !validDate(historyEnd)) return "missing";
  return Date.parse(historyEnd) <= Date.parse(signal) ? "valid" : "invalid";
}

export function verdictFor(discrepancies: { severity: string }[], count: number) {
  return discrepancies.some(d => d.severity === "error") ? "FAIL" : !count || discrepancies.length ? "WARNING" : "PASS";
}