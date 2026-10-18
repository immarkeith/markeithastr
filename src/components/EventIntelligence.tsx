import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { fetchEvents } from "@/lib/events.functions";

const tone: Record<string, string> = {
  bearish: "text-destructive",
  bullish: "text-success",
  watch: "text-muted-foreground",
};

/**
 * Ticker-scoped Event Intelligence. Shown above the Analyze score tiles when
 * the searched ticker has qualifying SEC filings; hidden entirely otherwise.
 * Research context only — never read by trading, scoring, or position logic.
 */
export function EventIntelligence({ ticker }: { ticker: string }) {
  const fn = useServerFn(fetchEvents);
  const { data, isError } = useQuery({
    queryKey: ["events", ticker],
    queryFn: () => fn({ data: { ticker } }),
    // Switching tickers starts a fresh query; react-query keys isolate each
    // ticker's cache so a delayed old-ticker response can never overwrite the
    // current one.
    staleTime: 5 * 60_000,
    retry: false,
  });

  const events = data?.events ?? [];
  // Hide when empty. A retrieval failure is shown distinctly, never read as
  // "no events".
  if (isError) {
    return (
      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Event Intelligence — {ticker}
        </h2>
        <p className="mt-1 text-sm text-destructive">
          Event data could not be retrieved. This is not the same as having no events — try again shortly.
        </p>
      </section>
      );
  }
  if (events.length === 0) return null;

  return (
    <section className="space-y-2 rounded-md border border-border bg-card p-4">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
        Event Intelligence — {ticker}
      </h2>
      <p className="text-xs text-muted-foreground">
        SEC filings for this ticker. Research context only — never changes trading.
      </p>
      <ul className="divide-y divide-border text-sm">
        {events.map((e) => (
          <li key={`${e.ticker}-${e.filed_on}-${e.reason}`} className="flex justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="font-medium">{e.reason}</span>
              <span className="block text-xs text-muted-foreground">
                {e.filed_on} · {e.form ?? "8-K"}
                {e.items?.length ? ` · items ${e.items.join(", ")}` : ""}
              </span>
              <a
                href={e.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                View original SEC filing
              </a>
            </span>
            <span className={`shrink-0 text-right font-medium ${tone[e.sentiment] ?? ""}`}>
              {e.sentiment} {Number(e.score) > 0 ? "+" : ""}
              {e.score}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
