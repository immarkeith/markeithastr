/** No claim that hosted invocations are free: activation requires an existing free budget. */
export const MAINTENANCE_INTERVAL_MS = 5 * 60_000;
export const INTEGRITY_INTERVAL_MS = 60 * 60_000;
export function maintenanceDue(last: number | null, now: number, interval = MAINTENANCE_INTERVAL_MS): boolean {
  return last === null || now - last >= interval;
}
/** Compare actual payloads, not generation receipts, before rewriting a snapshot. */
export function graphPayloadChanged(previous: unknown, next: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
    }
    return value;
  };
  return JSON.stringify(canonical(previous)) !== JSON.stringify(canonical(next));
}