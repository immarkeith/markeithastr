import { isTradingDay, nyParts, OPEN_MINUTES, sessionCloseMinutes } from './market-calendar';
export interface ExchangeSession { openMinutes: number; closeMinutes: number }

export type ScheduledPass = 'preopen' | 'preclose' | 'daily-cycle' | 'key-check' | 'lab-refresh';

/** UTC jobs may fire at both DST offsets; only the intended Eastern window runs. */
export function scheduledPassDue(pass: ScheduledPass, now = new Date(), exchange?: ExchangeSession | null): boolean {
  const { date, minutes, weekday } = nyParts(now);
  if (pass === 'key-check') return minutes >= 480 && minutes < 485;
  if (exchange === null || (exchange === undefined && !isTradingDay(date, weekday))) return false;
  const open = exchange?.openMinutes ?? OPEN_MINUTES;
  const close = exchange?.closeMinutes ?? sessionCloseMinutes(date);
  if (pass === 'lab-refresh') return minutes >= open && minutes < close;
  if (pass === 'preopen') return minutes >= open + 5 && minutes < open + 10;
  if (pass === 'preclose') {
    return (minutes >= close - 15 && minutes < close - 10) || (minutes >= close - 8 && minutes < close - 3);
  }
  return minutes >= 1050 && minutes < 1055;
}