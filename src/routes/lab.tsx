import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { InfoDot } from "@/components/InfoDot";
import { FutureCapitalAnalysis } from "@/components/FutureCapitalAnalysis";
import { EventIntelligence } from "@/components/EventIntelligence";
import { LAB_RANGES, PnlChart } from "@/components/PnlChart";
import {
  ResearchDepartment,
  ResearchDisagreements,
  ResearcherTabs,
} from "@/components/ResearchDepartment";
import { Button } from "@/components/ui/button";
import { fetchRace, runRaceNow, setResearchRunning } from "@/lib/race.functions";
import { runRegimeNow } from "@/lib/regime.functions";
import { runStabilityNow } from "@/lib/stability.functions";
import { RegimeMatrix } from "@/components/RegimeMatrix";
import { money } from "@/lib/queries";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Research Lab — ASTR Strategy Race" },
      {
        name: "description",
        content:
          "Three scoring formulas trade a simulated book side by side with the live strategy on the same $20 stake, so a clear winner can be seen before anything changes.",
      },
      { property: "og:title", content: "Research Lab — ASTR Strategy Race" },
      {
        property: "og:description",
        content: "Paper-test scoring formulas in parallel with live trading on identical stakes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const qc = useQueryClient();
  const race = useQuery({ queryKey: ["race"], queryFn: () => fetchRace() });
  const runFn = useServerFn(runRaceNow);

  const run = useMutation({
    mutationFn: () => runFn({ data: { phase: "both" } }),
    onSuccess: async (res) => {
      const opened = res.slots.reduce((n, s) => n + s.opened.length, 0);
      const closed = res.slots.reduce((n, s) => n + s.closed.length, 0);
      toast.success(`Test pass done — ${opened} simulated buy(s), ${closed} sell(s).`);
      await qc.invalidateQueries({ queryKey: ["race"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleFn = useServerFn(setResearchRunning);
  const toggle = useMutation({
    mutationFn: (running: boolean) => toggleFn({ data: { running } }),
    onSuccess: async (res) => {
      toast.success(res.running ? "Researchers started." : "Researchers stopped.");
      await qc.invalidateQueries({ queryKey: ["race"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const stabilityFn = useServerFn(runStabilityNow);
  const stability = useMutation({
    mutationFn: () => stabilityFn({}),
    onSuccess: async (res) => {
      toast.success(
        `Stability audit done — ${res.lanes.length} lanes scored over ${res.sessions} sessions.`,
      );
      await qc.invalidateQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const d = race.data;
  const slots = (d?.entrants ?? []).filter((e) => !e.live);

  const researchRunning = d?.research_running !== false;
  // Lead first, then every assistant by rank — they all test every market day.
  const ordered = [...slots].sort((a, b) => {
    const lead = (s: Entrant) => (/lead/i.test(s.name) ? 0 : 1);
    if (lead(a) !== lead(b)) return lead(a) - lead(b);
    return a.rank - b.rank;
  });
  const active = ordered.filter((s) => s.enabled);
  // The Best Formula is never the Lead's own formula — the Lead validates and
  // combines what the assistant researchers discover.
  const assistants = slots.filter((s) => !/lead/i.test(s.name));
  const best = assistants.length
    ? assistants.reduce(
        (top, s) => (s.same_day.total_pnl > top.same_day.total_pnl ? s : top),
        assistants[0]!,
      )
    : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Research Lab</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => stability.mutate()}
            disabled={stability.isPending}
          >
            {stability.isPending ? "Auditing…" : "Run stability audit"}
          </Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Running…" : "Run test pass"}
          </Button>
        </div>
      </header>

      {/* Researchers only — this never starts or stops live trading. */}
      <section className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              researchRunning ? "bg-success" : "bg-destructive"
            }`}
          />
          Researchers {researchRunning ? "running" : "stopped"}
        </span>
        <Button
          size="sm"
          variant={researchRunning ? "outline" : "default"}
          disabled={toggle.isPending}
          onClick={() => toggle.mutate(!researchRunning)}
        >
          {toggle.isPending ? "Working…" : researchRunning ? "Stop researchers" : "Start researchers"}
        </Button>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] uppercase tracking-[0.15em] text-primary">
          Lead Researcher suggestions
        </h2>
        {d?.suggestion ? (
          <>
            <p className="font-semibold text-primary">
              {d.suggestion.name} is ahead of the live strategy by {money(d.suggestion.edge)}
            </p>
            <p className="text-sm text-muted-foreground">
              After {d.days_running} days on the same stake. Nothing switches automatically — you
              decide from the{" "}
              <Link to="/strategy" className="text-primary hover:underline">
                Strategy page
              </Link>
              .
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No formula has enough validated evidence to suggest yet — testing continues.
          </p>
        )}
      </section>

      {/* Findings that agree or conflict sit directly under the Lead's suggestions. */}
      <ResearchDisagreements />

      {d?.capital_analysis ? <FutureCapitalAnalysis analysis={d.capital_analysis} /> : null}
      <EventIntelligence />

      <section>
        <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Best formula
          <InfoDot title="Best formula">
            A validated formula from the assistant researchers. The Lead Researcher evaluates and
            combines findings, so the Lead itself is never the Best Formula.
          </InfoDot>
        </p>
        <p className="mt-1 text-2xl font-semibold text-primary">{best ? best.name : "—"}</p>
      </section>

      {race.isLoading ? <p className="text-sm text-muted-foreground">Loading the race…</p> : null}

      {race.isError ? (
        <section className="rounded border border-destructive/60 bg-destructive/10 p-3 text-sm">
          <p className="font-semibold text-destructive">Researcher data could not be loaded.</p>
          <p className="mt-1 text-xs text-muted-foreground break-words">
            {(race.error as Error)?.message ?? "Unknown error"}
          </p>
        </section>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Testing today</h2>
        {!race.isLoading && !race.isError && active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No researcher is testing today yet — results appear after the next test pass.
          </p>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {active.map((slot) => (
            <SlotCard
              key={slot.key}
              slot={slot}
              longTermRates={slot.lane ? (d?.long_term_win_rates[slot.lane] ?? []) : []}
            />
          ))}
        </div>
      </div>

      <ResearchDepartment />

      <footer className="space-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <p>
          The Lead and every assistant researcher always use simulated money, completely separate
          from live trading. Each short-term result shows what a same-day sale would have made.
        </p>
        <p>
          Every simulated trade is written to the{" "}
          <Link to="/trade-history" className="text-primary hover:underline">
            Trade Log
          </Link>{" "}
          with its own strategy tag, alongside clearly labeled live activity.
        </p>
      </footer>
    </div>
  );
}

type Entrant = NonNullable<Awaited<ReturnType<typeof fetchRace>>>["entrants"][number];

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-chart-4">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type LongTermRate = {
  horizon: "1M" | "3M" | "9M";
  wins: number;
  completed: number;
  win_rate: number | null;
};

function LongTermWinRate({ rates }: { rates: LongTermRate[] }) {
  const [horizon, setHorizon] = useState<"1M" | "3M" | "9M">("1M");
  const selected = rates.find((rate) => rate.horizon === horizon);
  const labels = { "1M": "1 Month", "3M": "3 Months", "9M": "9 Months" } as const;

  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
        Long-Term Win Rate
      </p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Long-term win-rate horizon">
        {(Object.keys(labels) as Array<keyof typeof labels>).map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={horizon === value ? "secondary" : "ghost"}
            onClick={() => setHorizon(value)}
          >
            {labels[value]}
          </Button>
        ))}
      </div>
      {!selected || selected.completed === 0 ? (
        <p className="text-xs text-muted-foreground">
          Insufficient data — no completed {labels[horizon].toLowerCase()} predictions yet.
        </p>
      ) : (
        <p className="text-sm tabular-nums">
          <span className="font-semibold">{selected.win_rate}%</span>{" "}
          <span className="text-xs text-muted-foreground">
            {selected.wins} correct of {selected.completed} completed predictions
          </span>
        </p>
      )}
    </section>
  );
}

function SlotCard({
  slot,
  longTermRates,
}: {
  slot: Entrant;
  longTermRates: LongTermRate[];
}) {
  return (
    <section className="space-y-4">
      {/* Every researcher tests every market day, so no status badge is needed. */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold leading-tight">{slot.name}</h2>
      </div>

      {/* Main level: P/L and Win Rate only. */}
      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Same-Day P&amp;L"
          value={`${slot.same_day.total_pnl >= 0 ? "+" : ""}${money(slot.same_day.total_pnl)}`}
        />
        <Metric
          label="Same-Day Win Rate"
          value={slot.same_day.win_rate === null ? "—" : `${slot.same_day.win_rate}%`}
        />
      </div>


      <PnlChart
        rows={slot.same_day.rows}
        primaryLabel="Same-Day"
        ranges={LAB_RANGES}
        initialRange="month"
        title="Today's Active"
        compact
        percent
        basis={slot.basis}
        activeTicker={slot.holdings[0]?.ticker ?? null}
      />

      {/* Everything secondary lives under this researcher's own dropdown. */}
      <details className="rounded border border-border/70 p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          {slot.name} — details
        </summary>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric
              label="Same-Day Return"
              value={
                slot.same_day.return_pct === null
                  ? "—"
                  : `${slot.same_day.return_pct >= 0 ? "+" : ""}${slot.same_day.return_pct}%`
              }
            />
            <Metric
              label="Same-Day Value"
              value={money(slot.same_day.value)}
              hint={`${money(slot.cash.available)} cash ready`}
            />
          </div>
          <LongTermWinRate rates={longTermRates} />
          <p className="text-xs text-muted-foreground">
            Rank #{slot.rank} · {money(slot.stake)} per stock · {slot.stocks_per_day} at a time
          </p>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Holding</p>
            {slot.holdings.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing held right now.</p>
            ) : (
              slot.holdings.map((h) => (
                <div key={h.ticker} className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold">
                    {h.ticker}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      held to {h.hold_until}
                    </span>
                  </span>
                  <span className={`tabular-nums ${h.pl >= 0 ? "text-success" : "text-destructive"}`}>
                    {h.pl >= 0 ? "+" : ""}
                    {money(h.pl)} ({h.pl_pct.toFixed(2)}%)
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Up next</p>
            {slot.up_next ? (
              <p className="text-sm">
                <span className="font-semibold">{slot.up_next.ticker}</span>{" "}
                <span className="tabular-nums text-primary">
                  {slot.up_next.score.toFixed(1)} pts
                </span>{" "}
                <span className="text-xs text-muted-foreground">
                  at ~${slot.up_next.close.toFixed(2)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Nothing meets this formula&apos;s score bar yet.
              </p>
            )}
          </div>
          <ResearcherTabs name={slot.name} />
        </div>
      </details>
    </section>
  );
}

