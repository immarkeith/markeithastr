/** Recover a missing API function without mistaking a failed read for an empty cache. */
export interface CoverageDay { bar_date: string; ticker_count: number }
export function isMissingCoverageFunction(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /PGRST202|could not find the function.*bar_dates_present_since|bar_dates_present_since.*schema cache/i.test(message);
}
export async function resilientCoverage(
  read: () => Promise<CoverageDay[]>,
  fallback: () => Promise<CoverageDay[]>,
  recovered?: () => void,
): Promise<CoverageDay[]> {
  try { return await read(); } catch (error) {
    if (!isMissingCoverageFunction(error)) throw error;
    // One retry for a schema cache that may have caught up in the meantime.
    try {
      const result = await read();
      recovered?.();
      return result;
    } catch (retryError) {
      if (!isMissingCoverageFunction(retryError)) throw retryError;
      const result = await fallback();
      recovered?.();
      return result;
    }
  }
}