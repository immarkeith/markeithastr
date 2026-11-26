import { isTradingDay, nyParts, sessionCloseMinutes } from './market-calendar';

/** Exchange-local close plus five minutes, with the date's real UTC offset. */
export function selectionTimestamp(date: string): string {
  if (!isTradingDay(date)) throw new Error('Cannot select on a closed market day');
  const noon = new Date(`${date}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'longOffset' }).formatToParts(noon);
  const zone = parts.find(part => part.type === 'timeZoneName')?.value;
  const match = zone?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  if (!match) throw new Error('Exchange timezone offset unavailable');
  const offset = (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '-' ? -1 : 1);
  const utcMinutes = sessionCloseMinutes(date) + 5 - offset;
  return new Date(Date.parse(`${date}T00:00:00Z`) + utcMinutes * 60_000).toISOString();
}

export function completedResearchSession(date: string, now = new Date()): boolean {
  const local = nyParts(now);
  return isTradingDay(date) && (date < local.date || (date === local.date && local.minutes >= sessionCloseMinutes(date) + 5));
}