/** Signal inputs exclude the entry session; forward bars remain outcome-only. */
export function beforeSignal<T extends { date: string }>(bars: T[], signalDate: string): T[] {
  return bars.filter(bar => bar.date < signalDate);
}

export function inputBoundary(tickerEnd: string | undefined, proxyEnd: string | undefined): string | null {
  if (!tickerEnd || !proxyEnd) return null;
  return tickerEnd > proxyEnd ? tickerEnd : proxyEnd;
}