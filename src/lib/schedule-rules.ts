import { isTradingDay, nyParts, sessionCloseMinutes } from './market-calendar';

export type ScheduledPass = 'preopen' | 'preclose' | 'daily-cycle' | 'key-check' | 'lab-refresh';

/** UTC jobs may fire at both DST offsets; only the intended Eastern window runs. */
export function scheduledPassDue(pass: ScheduledPass, now = new Date()): boolean {
  const { date, minutes, weekday } = nyParts(now);
  if (pass === 'key-check') return minutes >= 480 && minutes < 485;
  if (pass === 'lab-refresh') return weekday === 6 ? minutes >= 600 && minutes < 605 : weekday >= 1 && weekday <= 5 && minutes >= 1080 && minutes < 1085;
  if (!isTradingDay(date, weekday)) return false;
  if (pass === 'preopen') return minutes >= 575 && minutes < 580;
  if (pass === 'preclose') {
    const close = sessionCloseMinutes(date);
    return (minutes >= close - 15 && minutes < close - 10) || (minutes >= close - 8 && minutes < close - 3);
  }
  return minutes >= 1050 && minutes < 1055;
}