import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeStock, requestMonitoredStock } from "@/lib/analyze.functions";
import type { AnalyzeResult } from "@/lib/analyze-types";
import { FACTOR_LABELS } from "@/lib/scoring";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze a stock — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Score any ticker with the same ASTR factor engine the daily scanner uses, and request to add it to the monitored list.",
      },
      { property: "og:title", content: "Analyze a stock — ASTR Daily Rotation Desk" },
      {
        property: "og:description",
        content: "On-demand factor scoring for any ticker, using the live strategy weights.",
      },
    ],
  }),
  component: AnalyzePage,
});

const BAND_TONE: Record<string, "positive" | "negative" | "accent" | "default"> = {
  Strong: "positive",
  Good: "positive",
  Neutral: "accent",
  Weak: "negative",
  Avoid: "negative",
  Ineligible: "default",
};

function AnalyzePage() {
  const [ticker, setTicker] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const analyzeFn = useServerFn(analyzeStock);
  const requestFn = useServerFn(requestMonitoredStock);

  const analyze = useMutation({
    mutationFn: (t: string) => analyzeFn({ data: { ticker: t } }),
    onSuccess: (data) => setResult(data as AnalyzeResult),
    onError: (error: Error) => toast.error(error.message),
  });

  const request = useMutation({
    mutationFn: (t: string) => requestFn({ data: { ticker: t } }),
    onSuccess: (res) => {
      if (res.status === "already_monitored") toast.success("Already monitored.");
      else if (res.status === "approved") toast.success("Already approved on the watchlist.");
      else if (res.status === "rejected") toast.message("This ticker was previously rejected.");
      else toast.success("Request filed — approve it on the Watchlist page.");
      if (result) setResult({ ...result, watchlist_status: "requested" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    analyze.mutate(t);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyze a stock</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scores any ticker with the live strategy weights and gates. Read-only — nothing is bought,
          sold or added to the traded universe from this page.
        </p>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <Label htmlFor="analyze-ticker" className="text-[11px] uppercase tracking-[0.15em]">
          Ticker
        </Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="analyze-ticker"
            value={ticker}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={10}
            placeholder="AAPL"
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="uppercase"
          />
          <Button onClick={submit} disabled={analyze.isPending || !ticker.trim()}>
            {analyze.isPending ? "Analyzing…" : "Analyze"}
          </Button>
        </div>
      </div>

      {result ? <ResultCard result={result} request={request} /> : null}
    </div>
  );
}

function ResultCard({
  result,
  request,
}: {
  result: AnalyzeResult;
  request: { mutate: (t: string) => void; isPending: boolean };
}) {
  const showRequest =
    !result.monitored && result.meets_min && result.watchlist_status !== "requested";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label={result.ticker}
          value={result.score === null ? "—" : result.score.toFixed(1)}
          hint={result.band}
          tone={BAND_TONE[result.band] ?? "default"}
        />
        <StatTile
          label="Minimum to trade"
          value={result.min_score.toFixed(0)}
          hint={result.meets_min ? "clears the bar" : "below the bar"}
          tone={result.meets_min ? "positive" : "negative"}
        />
        <StatTile
          label="Last close"
          value={result.close === null ? "—" : `$${result.close.toFixed(2)}`}
          hint={result.sma20 === null ? "—" : `SMA20 $${result.sma20.toFixed(2)}`}
        />
        <StatTile
          label="Would rank"
          value={result.would_rank === null ? "—" : `#${result.would_rank}`}
          hint={result.peer_run_date ? `vs scan ${result.peer_run_date}` : "no scan yet"}
          tone="accent"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-4">
        {result.monitored ? (
          <Badge variant="default">✓ Already monitored</Badge>
        ) : result.watchlist_status === "requested" ? (
          <Badge variant="secondary">Request pending approval</Badge>
        ) : result.meets_min ? (
          <Button
            size="sm"
            disabled={request.isPending}
            onClick={() => request.mutate(result.ticker)}
          >
            Request to Add to Monitored Stocks
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Does not currently qualify for monitored-stock consideration.
          </p>
        )}
        {showRequest ? (
          <span className="text-xs text-muted-foreground">
            Approval still happens on the Watchlist page.
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {result.sessions} sessions · data {result.bars_as_of ?? "n/a"} ·{" "}
          {result.source === "cache" ? "cached history" : "fetched on demand"}
        </span>
      </div>

      {result.failed.length ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-destructive">
            Failed criteria
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.failed.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.factors.length ? (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Factor</th>
                <th className="px-3 py-2 text-right">Points</th>
                <th className="hidden px-3 py-2 text-left sm:table-cell">Why</th>
              </tr>
            </thead>
            <tbody>
              {result.factors.map((f) => (
                <tr key={f.key} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">
                    {FACTOR_LABELS[f.key] ?? f.key}
                    <span className="ml-2 text-xs text-muted-foreground">{f.pct}%</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span
                      className={
                        f.verdict === "helped"
                          ? "text-success"
                          : f.verdict === "hurt"
                            ? "text-destructive"
                            : undefined
                      }
                    >
                      {f.weighted_points.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground"> / {f.weight}</span>
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                    {f.reasons.length ? f.reasons.join("; ") : "no contribution"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-success">Helped</p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.helped.length ? (
              result.helped.map((r) => <li key={r}>• {r}</li>)
            ) : (
              <li className="text-muted-foreground">Nothing scored strongly.</li>
            )}
          </ul>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-destructive">Hurt</p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.hurt.length ? (
              result.hurt.map((r) => <li key={r}>• {r}</li>)
            ) : (
              <li className="text-muted-foreground">No major drags.</li>
            )}
          </ul>
        </div>
      </div>

      {result.invalidation ? (
        <div className="rounded-md border border-border bg-card p-4 text-sm">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Invalidation
          </p>
          <p className="mt-1">{result.invalidation}</p>
        </div>
      ) : null}

      {result.peers.length ? (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Today's top eligible names
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {result.peers.map((p) => (
              <li key={p.ticker} className="flex justify-between tabular-nums">
                <span>
                  #{p.rank} {p.ticker}
                </span>
                <span>{p.score.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Market proxy 5-day move used for relative strength: {result.market_roc5.toFixed(2)}%
          </p>
        </div>
      ) : null}
    </div>
  );
}
