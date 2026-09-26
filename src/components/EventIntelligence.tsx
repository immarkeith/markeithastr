import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fetchEvents } from "@/lib/events.functions";

const tone: Record<string, string> = { bearish: "text-destructive", bullish: "text-primary", watch: "text-muted-foreground" };

export function EventIntelligence() {
  const fn = useServerFn(fetchEvents);
  const { data } = useQuery({ queryKey: ["events"], queryFn: () => fn(), staleTime: 60_000 });
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Event Intelligence</h2>
      <p className="text-xs text-muted-foreground">
        Free SEC 8-K filings for top candidates. Research only — never changes live trading.
      </p>
      {data?.latest?.verdict ? <p className="text-sm">Lead: {data.latest.verdict}</p> : null}
      {!data?.events.length ? (
        <p className="text-sm text-muted-foreground">No material filings found yet. Checked after each market day.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {data.events.map((e: any) => (
            <li key={e.ticker + e.filed_on + e.reason} className="flex justify-between gap-3 py-2">
              <span>
                <b>{e.ticker}</b> <span className="text-muted-foreground">{e.filed_on}</span>
                <br />
                <a href={e.url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">{e.reason}</a>
              </span>
              <span className={`shrink-0 font-medium ${tone[e.sentiment] ?? ""}`}>
                {e.sentiment} {Number(e.score) > 0 ? "+" : ""}{e.score}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
