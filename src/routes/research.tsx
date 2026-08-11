import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  decideCandidate,
  getResearchCandidates,
  runResearchNow,
} from "@/lib/research.functions";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research engine — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Continuous strategy research: hypotheses tested out-of-sample against cached history, filed as candidates you approve or dismiss.",
      },
      { property: "og:title", content: "Research engine — ASTR" },
      {
        property: "og:description",
        content:
          "Alternative rules tested on days they were never tuned on, with robustness scores and plain-English warnings.",
      },
    ],
  }),
  component: ResearchPage,
});

interface Leg {
  picks: number;
  win_rate: number;
  avg_return_pct: number;
  total_return_pct: number;
  avg_vs_benchmark_pct: number;
}

function Signed({ value, suffix = "%" }: { value: number; suffix?: string }) {
  return (
    <span className={value >= 0 ? "text-success" : "text-destructive"}>
      {value >= 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function LegLine({ label, leg }: { label: string; leg: Leg }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">
        {leg.picks} trades · {leg.win_rate}% win · <Signed value={leg.avg_return_pct} /> avg · vs SPY{" "}
        <Signed value={leg.avg_vs_benchmark_pct} />
      </span>
    </div>
  );
}

function ResearchPage() {
  const qc = useQueryClient();
  const load = useServerFn(getResearchCandidates);
  const run = useServerFn(runResearchNow);
  const decide = useServerFn(decideCandidate);
  const [universe, setUniverse] = useState("300");

  const data = useQuery({ queryKey: ["research"], queryFn: () => load() });

  const research = useMutation({
    mutationFn: () => run({ data: { universe: Number(universe) || 300 } }),
    onSuccess: async (res) => {
      toast.success(
        res.saved > 0
          ? `${res.saved} candidate${res.saved === 1 ? "" : "s"} filed from ${res.tested} experiments.`
          : `Tested ${res.tested} ideas — none beat the current strategy convincingly.`,
      );
      await qc.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const act = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "approve_activate" | "dismiss" }) =>
      decide({ data: input }),
    onSuccess: async (_res, input) => {
      toast.success(
        input.decision === "dismiss"
          ? "Candidate dismissed."
          : input.decision === "approve_activate"
            ? "Saved as a strategy and switched to it — the old one is still in the library."
            : "Saved to your strategy library. Nothing live changed.",
      );
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposed = (data.data?.candidates ?? []).filter((c) => c.status === "proposed");
  const decided = (data.data?.candidates ?? []).filter((c) => c.status !== "proposed");
  const lastRun = data.data?.runs?.find((r) => r.kind === "strategy_research");
  const summary = (lastRun?.summary ?? {}) as {
    baseline_out?: Leg;
    tested?: number;
    kept?: number;
    best?: string | null;
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Research engine</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This runs beside your live strategy and never touches it. It forms hypotheses — factor
          weight tilts, different score gates, overbought and volatility filters, more or fewer
          picks a day — then replays each one on cached history, tuning on older sessions and
          confirming on newer sessions it never saw. Only ideas that survive both blocks get filed
          below, with their weak points spelled out. You decide whether anything changes.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open candidates" value={`${proposed.length}`} tone={proposed.length ? "accent" : "default"} />
        <StatTile label="Last pass tested" value={`${summary.tested ?? 0} ideas`} hint={summary.best ? `best: ${summary.best}` : "no pass yet"} />
        <StatTile
          label="Current rule (confirmation block)"
          value={`${summary.baseline_out?.avg_return_pct ?? 0}%`}
          hint={`${summary.baseline_out?.picks ?? 0} trades · ${summary.baseline_out?.win_rate ?? 0}% win`}
        />
        <StatTile label="Decided" value={`${decided.length}`} hint="approved or dismissed" />
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="universe">Tickers per session</Label>
          <Input
            id="universe"
            className="w-28"
            inputMode="numeric"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
          />
        </div>
        <Button onClick={() => research.mutate()} disabled={research.isPending}>
          {research.isPending ? "Researching…" : "Run research pass"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Uses price history already cached — no extra data requests, no orders.
        </span>
      </section>

      {(research.data?.warnings ?? []).length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
          {research.data!.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Candidates awaiting your call
        </h2>
        {proposed.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing filed yet. Run a pass — if no idea beats your current rule out-of-sample, that's
            a useful answer too.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {proposed.map((c) => {
              const ev = c.evidence as Record<string, Leg | number | undefined>;
              return (
                <article key={c.id} className="space-y-3 rounded-md border border-border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{c.name}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      confidence {c.confidence ?? 0}% · robustness {c.robustness ?? 0}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.hypothesis}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Change: </span>
                    {c.change_summary}
                  </p>
                  <p className="text-sm">
                    Expected edge per trade:{" "}
                    <Signed value={Number(c.expected_improvement ?? 0)} />
                  </p>
                  <div className="space-y-1 rounded-md border border-border/60 p-2">
                    <LegLine label="Discovery block" leg={ev.in_sample as Leg} />
                    <LegLine label="Confirmation block" leg={ev.out_of_sample as Leg} />
                    <LegLine label="Confirmation, first half" leg={ev.first_half as Leg} />
                    <LegLine label="Confirmation, second half" leg={ev.second_half as Leg} />
                    <LegLine label="Market-up days" leg={ev.up_market as Leg} />
                    <LegLine label="Market-down days" leg={ev.down_market as Leg} />
                  </div>
                  {c.warnings.length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-warning">
                      {c.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => act.mutate({ id: c.id, decision: "approve_activate" })}
                      disabled={act.isPending}
                    >
                      Approve &amp; switch to it
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => act.mutate({ id: c.id, decision: "approve" })}
                      disabled={act.isPending}
                    >
                      Save to library only
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => act.mutate({ id: c.id, decision: "dismiss" })}
                      disabled={act.isPending}
                    >
                      Dismiss
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {decided.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Decision log
          </h2>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Idea</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Edge</th>
                  <th className="p-2 text-left">Decided</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((c) => (
                  <tr key={c.id} className="border-t border-border/60">
                    <td className="p-2">{c.name}</td>
                    <td className="p-2 capitalize">{c.status}</td>
                    <td className="p-2 text-right tabular-nums">
                      <Signed value={Number(c.expected_improvement ?? 0)} />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {c.decided_at ? c.decided_at.slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
