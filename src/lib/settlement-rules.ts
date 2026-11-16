/** Paper-only cash rules. Never import these into brokerage execution. */
export type Tranche = "A" | "B";
export interface PaperCashRow {
  amount: number;
  available_on: string;
  kind: string;
  note?: string | null;
}
const cents = (n: number) => Math.round(n * 100) / 100;
const dateOf = (d: Date) => d.toISOString().slice(0, 10);
function shift(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(d.getTime())) throw new Error("Invalid paper session date");
  d.setUTCDate(d.getUTCDate() + days);
  return dateOf(d);
}
function nth(year: number, month: number, weekday: number, occurrence: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1, 12));
  d.setUTCDate(1 + (weekday - d.getUTCDay() + 7) % 7 + (occurrence - 1) * 7);
  return dateOf(d);
}
function observed(date: string): string {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
  return dow === 6 ? shift(date, -1) : dow === 0 ? shift(date, 1) : date;
}
function goodFriday(year: number): string {
  // Gregorian Easter (Meeus), minus two days.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = (h + l - 7 * m + 114) % 31 + 1;
  return shift(dateOf(new Date(Date.UTC(year, month - 1, day, 12))), -2);
}
export function isPaperSession(date: string): boolean {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid paper session date");
  const dow = parsed.getUTCDay(), y = parsed.getUTCFullYear();
  if (dow === 0 || dow === 6) return false;
  const memorial = new Date(Date.UTC(y, 4, 31, 12));
  memorial.setUTCDate(31 - (memorial.getUTCDay() + 6) % 7);
  const holidays = new Set([
    // NYSE does not observe a Saturday New Year on the preceding Friday.
    dow === 1 ? observed(`${y}-01-01`) : `${y}-01-01`,
    nth(y, 1, 1, 3), nth(y, 2, 1, 3), goodFriday(y), dateOf(memorial),
    observed(`${y}-07-04`), nth(y, 9, 1, 1), nth(y, 11, 4, 4), observed(`${y}-12-25`),
    ...(y >= 2022 ? [observed(`${y}-06-19`)] : []),
    "2025-01-09", // National day of mourning, NYSE closure.
  ]);
  return !holidays.has(date);
}
export function paperSettlementDate(saleDate: string): string {
  let cursor = shift(saleDate, 1);
  while (!isPaperSession(cursor)) cursor = shift(cursor, 1);
  return cursor;
}
export function paperCash(rows: PaperCashRow[], asOf: string) {
  let settled = 0, inFlight = 0, reserved = 0;
  let nextClearing: string | null = null;
  for (const row of rows) {
    if (row.kind === "reserve") reserved += row.amount;
    else if (row.available_on <= asOf) settled += row.amount;
    else inFlight += row.amount;
    if (row.amount > 0 && row.available_on > asOf && (!nextClearing || row.available_on < nextClearing)) {
      nextClearing = row.available_on;
    }
  }
  return { settled: cents(settled), inFlight: cents(inFlight), reserved: cents(reserved), nextClearing };
}
export function nextTranche(last: Tranche | null): Tranche { return last === "A" ? "B" : "A"; }
export function trancheOf(note?: string | null): Tranche | null {
  return note?.includes("[Tranche A]") ? "A" : note?.includes("[Tranche B]") ? "B" : null;
}
export function paperBuyCapacity(rows: PaperCashRow[], asOf: string, rapid: boolean) {
  const cash = paperCash(rows, asOf);
  if (!rapid) return { available: Math.max(0, cash.settled), tranche: null, cash };
  let last: Tranche | null = null;
  const balances = { A: 0, B: 0 };
  for (const row of rows) {
    const pool = trancheOf(row.note);
    if (row.kind === "deploy" && pool) last = pool;
    if (row.kind === "reserve" || row.available_on > asOf) continue;
    if (pool) balances[pool] += row.amount;
    else { balances.A += row.amount / 2; balances.B += row.amount / 2; }
  }
  const tranche = nextTranche(last);
  return { available: Math.max(0, Math.min(cents(balances[tranche]), cash.settled)), tranche, cash };
}
export function requirePaperCash(available: number, dollars: number): void {
  if (!Number.isFinite(dollars) || dollars <= 0) throw new Error("Paper stake must be positive");
  if (Math.round(available * 100) < Math.round(dollars * 100)) throw new Error("Insufficient settled paper cash");
}
/** Elapsed open sessions between entry and exit (same-day = 0), plus one settlement session. */
export function capitalEfficiency(returnPct: number, holdTradingDays: number): number {
  if (!Number.isFinite(returnPct) || !Number.isInteger(holdTradingDays) || holdTradingDays < 0) {
    throw new Error("Invalid capital efficiency inputs");
  }
  return returnPct / (holdTradingDays + 1);
}