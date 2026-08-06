/**
 * US equity market calendar (NYSE/Nasdaq regular session, America/New_York).
 * Client-safe: no server-only imports.
 */

/** Full-day closures, YYYY-MM-DD (New York local dates). */
export const MARKET_HOLIDAYS = new Set<string>([
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Washington's Birthday
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  // 2027
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26",
  "2027-05-31",
  "2027-06-18",
  "2027-07-05",
  "2027-09-06",
  "2027-11-25",
  "2027-12-24",
]);

/** Half days: regular session ends 13:00 ET. */
export const HALF_DAYS = new Set<string>([
  "2026-07-02",
  "2026-11-27",
  "2026-12-24",
  "2027-11-26",
]);

export interface NyParts {
  date: string; // YYYY-MM-DD in New York
  minutes: number; // minutes since New York midnight
  weekday: number; // 0 = Sunday
}

const NY = "America/New_York";

export function nyParts(now: Date = new Date()): NyParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: NY,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) map[p.type] = p.value;
  const hour = Number(map["hour"] === "24" ? "0" : map["hour"]);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    date: `${map["year"]}-${map["month"]}-${map["day"]}`,
    minutes: hour * 60 + Number(map["minute"]),
    weekday: Math.max(0, weekdays.indexOf(map["weekday"] ?? "Sun")),
  };
}

export const OPEN_MINUTES = 9 * 60 + 30; // 09:30 ET
export const CLOSE_MINUTES = 16 * 60; // 16:00 ET
export const EARLY_CLOSE_MINUTES = 13 * 60; // 13:00 ET

export function isTradingDay(date: string, weekday?: number): boolean {
  if (MARKET_HOLIDAYS.has(date)) return false;
  const dow = weekday ?? new Date(`${date}T12:00:00Z`).getUTCDay();
  return dow !== 0 && dow !== 6;
}

export function sessionCloseMinutes(date: string): number {
  return HALF_DAYS.has(date) ? EARLY_CLOSE_MINUTES : CLOSE_MINUTES;
}

export type MarketState = "pre-open" | "open" | "closing" | "after-hours" | "closed";

export interface MarketStatus {
  state: MarketState;
  label: string;
  detail: string;
  nyDate: string;
  nyTime: string;
  tradingDay: boolean;
  earlyClose: boolean;
  minutesToOpen: number | null;
  minutesToClose: number | null;
  nextTradingDay: string;
}

function fmtMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nextTradingDay(from: string): string {
  let cursor = addDays(from, 1);
  for (let i = 0; i < 10; i++) {
    if (isTradingDay(cursor)) return cursor;
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

export function marketStatus(now: Date = new Date()): MarketStatus {
  const { date, minutes, weekday } = nyParts(now);
  const tradingDay = isTradingDay(date, weekday);
  const close = sessionCloseMinutes(date);
  const earlyClose = HALF_DAYS.has(date);
  const nyTime = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")} ET`;
  const next = nextTradingDay(date);

  if (!tradingDay) {
    const reason = MARKET_HOLIDAYS.has(date) ? "Market holiday" : "Weekend";
    return {
      state: "closed",
      label: "Closed",
      detail: `${reason} — next session ${next}`,
      nyDate: date,
      nyTime,
      tradingDay: false,
      earlyClose: false,
      minutesToOpen: null,
      minutesToClose: null,
      nextTradingDay: next,
    };
  }

  if (minutes < OPEN_MINUTES) {
    return {
      state: "pre-open",
      label: "Pre-open",
      detail: `Opens in ${fmtMinutes(OPEN_MINUTES - minutes)} (09:30 ET)`,
      nyDate: date,
      nyTime,
      tradingDay: true,
      earlyClose,
      minutesToOpen: OPEN_MINUTES - minutes,
      minutesToClose: close - minutes,
      nextTradingDay: next,
    };
  }

  if (minutes < close) {
    const left = close - minutes;
    const closing = left <= 15;
    return {
      state: closing ? "closing" : "open",
      label: closing ? "Closing bell" : "Open",
      detail: `${fmtMinutes(left)} to the ${earlyClose ? "early " : ""}close${earlyClose ? " (13:00 ET)" : " (16:00 ET)"}`,
      nyDate: date,
      nyTime,
      tradingDay: true,
      earlyClose,
      minutesToOpen: 0,
      minutesToClose: left,
      nextTradingDay: next,
    };
  }

  return {
    state: "after-hours",
    label: "After hours",
    detail: `Session closed — next open ${next} 09:30 ET`,
    nyDate: date,
    nyTime,
    tradingDay: true,
    earlyClose,
    minutesToOpen: null,
    minutesToClose: 0,
    nextTradingDay: next,
  };
}
