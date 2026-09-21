import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { CapitalAnalysisResult } from "@/lib/capital-analysis";
import { money } from "@/lib/queries";

export function FutureCapitalAnalysis({ analysis }: { analysis: CapitalAnalysisResult }) {
  const [bots, setBots] = useState(6);
  const positiveRate = (analysis.observed_annual_return_pct ?? 0) > 0;
  const totalCapital =
    analysis.status === "ready" && positiveRate
      ? analysis.target_yearly / ((analysis.observed_annual_return_pct ?? 0) / 100)
      : null;
  const perBot = totalCapital === null ? null : totalCapital / bots;

  return (
    <section className="space-y-5 border-y border-border py-5" aria-labelledby="capital-analysis-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Planning only</p>
          <h2 id="capital-analysis-title" className="mt-1 text-xl font-semibold">
            Future Capital Requirement
          </h2>
          <p className={`mt-1 text-sm font-semibold ${analysis.status === "ready" ? "text-success" : "text-primary"}`}>
            Capital Analysis: {analysis.status === "ready" ? "Ready" : "Collecting Data"}
          </p>
        </div>
        <div className="flex items-center gap-2" aria-label="Number of bots being modeled">
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Model one fewer bot"
            onClick={() => setBots((value) => Math.max(1, value - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="min-w-20 text-center">
            <p className="text-xl font-bold tabular-nums">{bots}</p>
            <p className="text-[10px] uppercase text-muted-foreground">Bots modeled</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Model one more bot"
            onClick={() => setBots((value) => Math.min(20, value + 1))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {analysis.progress.map((item) => {
          const percent = Math.min(100, Math.round((item.completed / item.required) * 100));
          return (
            <div key={item.key} className="space-y-2 border-l border-border pl-3">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-semibold">{item.label}</span>
                <span className={item.met ? "text-success" : "text-muted-foreground"}>
                  {item.completed} / {item.required}
                </span>
              </div>
              <Progress value={percent} className="h-1.5" />
            </div>
          );
        })}
      </div>

      {analysis.status === "collecting" ? (
        <p className="text-sm text-muted-foreground">
          ASTR will keep gathering completed results. No capital estimate is shown until every minimum is met.
        </p>
      ) : positiveRate && totalCapital !== null && perBot !== null ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CapitalMetric label="Capital per bot" value={money(perBot)} />
            <CapitalMetric label="Total modeled capital" value={money(totalCapital)} />
            <CapitalMetric label="Observed monthly rate" value={`${analysis.observed_monthly_return_pct}%`} />
            <CapitalMetric label="Observed annual rate" value={`${analysis.observed_annual_return_pct}%`} />
          </div>
          <p className="text-sm text-muted-foreground">
            At that modeled capital, the historical estimate is approximately {money(analysis.target_monthly)} per month and {money(analysis.target_yearly)} per year across {bots} bots.
          </p>
        </div>
      ) : (
        <p className="text-sm text-destructive">
          The completed research does not currently show a positive observed annual rate, so it cannot support a capital estimate for the target.
        </p>
      )}

      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{analysis.market_coverage.note}</p>
        <p>
          {analysis.first_result && analysis.last_result
            ? `Evidence window: ${analysis.first_result} through ${analysis.last_result} · ${analysis.research_days} completed same-day test date(s).`
            : "The evidence window will appear after completed results are available."}
        </p>
      </div>

      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-xs font-semibold">Strategies and historical evidence</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="pb-2 pr-3 font-medium">Strategy</th>
                <th className="pb-2 pr-3 font-medium">W / L</th>
                <th className="pb-2 pr-3 font-medium">Average</th>
                <th className="pb-2 pr-3 font-medium">Avg win</th>
                <th className="pb-2 pr-3 font-medium">Avg loss</th>
                <th className="pb-2 pr-3 font-medium">Max drawdown</th>
                <th className="pb-2 pr-3 font-medium">Loss streak</th>
                <th className="pb-2 font-medium">Trades / day</th>
              </tr>
            </thead>
            <tbody>
              {analysis.strategies.map((strategy) => (
                <tr key={`${strategy.lane}-${strategy.strategy_id}`} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-semibold">{strategy.name}</td>
                  <td className="py-2 pr-3 tabular-nums">{strategy.wins} / {strategy.losses}</td>
                  <PercentCell value={strategy.average_return_pct} />
                  <PercentCell value={strategy.average_winner_pct} />
                  <PercentCell value={strategy.average_loser_pct} />
                  <PercentCell value={strategy.max_drawdown_pct === null ? null : -strategy.max_drawdown_pct} />
                  <td className="py-2 pr-3 tabular-nums">{strategy.longest_losing_streak}</td>
                  <td className="py-2 tabular-nums">{strategy.trades_per_research_day}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-xs font-semibold">Assumptions and limitations</summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          {analysis.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      </details>
    </section>
  );
}

function CapitalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-primary">{value}</p>
    </div>
  );
}

function PercentCell({ value }: { value: number | null }) {
  return (
    <td className="py-2 pr-3 tabular-nums">
      {value === null ? "—" : `${value > 0 ? "+" : ""}${value}%`}
    </td>
  );
}