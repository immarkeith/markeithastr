import { z } from 'zod';
import { nyParts } from './market-calendar';
import { scheduledPassDue, type ExchangeSession, type ScheduledPass } from './schedule-rules';

const rowSchema = z.object({ date: z.string(), open: z.string().regex(/^\d{2}:\d{2}$/), close: z.string().regex(/^\d{2}:\d{2}$/) });
const clockSchema = z.object({ is_open: z.boolean() });
let cache: { date: string; checkedAt: number; session: ExchangeSession | null; isOpen: boolean } | null = null;
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

/** Read-only exchange calendar and clock. No orders, account writes or inferred shutdown closures. */
export async function exchangeSessionNow(now = new Date()) {
  const date = nyParts(now).date;
  if (cache?.date === date && now.getTime() - cache.checkedAt >= 0 && now.getTime() - cache.checkedAt < 60_000) return cache;
  const id = process.env['ALPACA_LIVE_KEY_ID']?.trim();
  const secret = process.env['ALPACA_LIVE_SECRET_KEY']?.trim();
  if (!id || !secret) throw new Error('Exchange calendar access is not configured');
  const headers = { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': secret };
  const [calendarResponse, clockResponse] = await Promise.all([
    fetch(`https://api.alpaca.markets/v2/calendar?start=${date}&end=${date}`, { headers, signal: AbortSignal.timeout(5000) }),
    fetch('https://api.alpaca.markets/v2/clock', { headers, signal: AbortSignal.timeout(5000) }),
  ]);
  if (!calendarResponse.ok || !clockResponse.ok) throw new Error('Exchange calendar temporarily unavailable');
  const rows = z.array(rowSchema).parse(await calendarResponse.json());
  const clock = clockSchema.parse(await clockResponse.json());
  const row = rows.find(value => value.date === date);
  const session = row ? { openMinutes: minutes(row.open), closeMinutes: minutes(row.close) } : null;
  if (session && session.openMinutes >= session.closeMinutes) throw new Error('Exchange returned an invalid session');
  cache = { date, checkedAt: now.getTime(), session, isOpen: clock.is_open };
  return cache;
}

/** Fail closed when authoritative timing is unavailable; retain the existing hook credential contract. */
export async function scheduledPassStatus(pass: ScheduledPass, now = new Date()) {
  try {
    const exchange = await exchangeSessionNow(now);
    const due = scheduledPassDue(pass, now, exchange.session) && (pass !== 'lab-refresh' || exchange.isOpen);
    return { due, available: true, reason: due ? 'Exchange session permits this pass' : 'Outside the actual exchange window' };
  } catch {
    return { due: false, available: false, reason: 'Exchange calendar unavailable; scheduled work was not run' };
  }
}