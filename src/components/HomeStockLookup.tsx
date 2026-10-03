import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LongTermBuyDialog } from "@/components/LongTermBuyDialog";
import { AssignResearcherDialog } from "@/components/AssignResearcherDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeStock } from "@/lib/analyze.functions";
import type { AnalyzeResult } from "@/lib/analyze-types";

/** Compact ticker lookup: price, score, band, and a long-term buy action. */
export function HomeStockLookup() {
  const [ticker, setTicker] = useState("");
  const run = useServerFn(analyzeStock);
  const lookup = useMutation({
    mutationFn: (symbol: string) => run({ data: { ticker: symbol } }),
    onError: (error: Error) => toast.error(error.message),
  });
  const result = lookup.data as AnalyzeResult | undefined;

  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-4">
      <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Look up a stock</h2>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const symbol = ticker.trim().toUpperCase();
          if (symbol) lookup.mutate(symbol);
        }}
      >
        <Input
          value={ticker}
          onChange={(event) => setTicker(event.target.value.toUpperCase())}
          placeholder="Ticker, e.g. AAPL"
          className="max-w-[180px]"
          aria-label="Ticker"
        />
        <Button type="submit" disabled={lookup.isPending || !ticker.trim()}>
          {lookup.isPending ? "Checking…" : "Look up"}
        </Button>
      </form>

      {result ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span className="text-lg font-bold">{result.ticker}</span>
            <span className="tabular-nums">
              {result.close === null ? "—" : `$${result.close.toFixed(2)}`}
            </span>
            <span className="tabular-nums text-primary">
              {result.score === null ? "—" : `${result.score.toFixed(1)} pts`}
            </span>
            <span className="text-sm text-muted-foreground">{result.band}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {result.close && result.close > 0 ? (
              <LongTermBuyDialog ticker={result.ticker} price={result.close} />
            ) : null}
            <AssignResearcherDialog ticker={result.ticker} />
            <Link to="/analyze" className="text-xs text-primary hover:underline">
              Full analysis
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
