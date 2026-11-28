/** Explicit Eastern fallback until device-local formatting is available after hydration. */
export function formatDisplayTime(iso: string, deviceZone?: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return 'Unavailable';
  const format = (zone: string, fallback: boolean) => {
    const value = new Intl.DateTimeFormat(undefined, {
      timeZone: zone, year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', ...(fallback ? {} : { timeZoneName: 'short' as const }),
    }).format(date);
    return fallback ? `${value} Eastern` : value;
  };
  try { return format(deviceZone ?? 'America/New_York', !deviceZone); }
  catch { return format('America/New_York', true); }
}