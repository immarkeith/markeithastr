import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { getDepartment, runDepartmentNow } from "@/lib/department.functions";

const LANE_BLURB: Record<string, string> = {
  trend: "Follows strength: momentum, trend, breakouts.",
  contrarian: "Looks for names the market has oversold or overlooked.",
  consistency: "Prefers steady, repeatable behaviour over excitement.",
  growth: "Hunts improving, accelerating performance.",
  risk: "Wants return per unit of risk, not raw return.",
  skeptic: "Attacks every finding and can veto it.",
};

function Signed({ value, suffix = "%" }: { value: number; suffix?: string }) {
  return (
    <span className={value >= 0 ? "text-success" : "text-destructive"}>
      {value >= 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function verdictChip(verdict: string) {
  const tone =
    verdict === "validated"
      ? "bg-success/15 text-success"
      : verdict === "vetoed"
        ? "bg-destructive/15 text-destructive"
        : "border border-border text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tone}`}>
      {verdict}
    </span>
  );
}

export function ResearchDepartment() {
  const qc = useQueryClient();
  const load = useServerFn(getDepartment);
  const runFn = useServerFn(runDepartmentNow);
  const [universe, setUniverse] = useState("250");

  const dept = useQuery({ queryKey: ["department"], queryFn: () => load() });

  const run = useMutation({
    mutationFn: () => runFn({ data: { universe: Number(universe) || 250 } }),
    onSuccess: async (res) => {
      const validated = res.lanes.filter((l) => l.verdict === "validated").length;
      toast.success(
        res.balanced?.filed
          ? `Balanced Strategy filed — ${validated} validated finding(s) merged.`
          : `${validated} validated finding(s); nothing worth changing live yet.`,
      );
      await qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = dept.data;
  const researchers = data?.researchers ?? [];
  const findings = data?.findings ?? [];
  const deadEnds = data?.dead_ends ?? [];
  const balanced = data?.last_run?.summary?.balanced ?? null;
  const objections = findings.filter((f) => f.verdict === "vetoed").slice(0, 6);
  const latestByLane = new Map<string, (typeof findings)[number]>();
  for (const f of findings) if (!latestByLane.has(f.lane)) latestByLane.set(f.lane, f);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight">Research department</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Five specialists with genuinely different philosophies, each tuning only its own
          variables, plus a Skeptic that tries to break their conclusions and a Lead Researcher that
          merges the survivors into one Balanced Strategy proposal. If two specialists end up
          agreeing, that agreement is treated as a finding, not something to force apart.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Validated this generation"
          value={`${findings.filter((f) => f.verdict === "validated" && f.generation === Math.max(...researchers.map((r) => r.generation), 0)).length}`}
          hint="ideas that survived the Skeptic"
          tone="accent"
        />
        <StatTile
          label="Generations run"
          value={`${Math.max(...researchers.map((r) => r.generation), 0)}`}
          hint={data?.last_run ? `last pass ${data.last_run.created_at.slice(0, 10)}` : "no pass yet"}
        />
        <StatTile
          label="Balanced Strategy"
          value={balanced ? `${balanced.edge >= 0 ? "+" : ""}${balanced.edge}%` : "—"}
          hint={balanced ? (balanced.filed ? "filed as a candidate above" : "not better than the current rule") : "waiting on a pass"}
          tone={balanced?.filed ? "positive" : "default"}
        />
        <StatTile
          label="Known dead ends"
          value={`${deadEnds.length}`}
          hint="never re-tested"
        />
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <label className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Tickers per session
          </span>
          <input
            inputMode="numeric"
            value={universe}
            onChange={(e) => setUniverse(e.target.value)}
            className="w-24 rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Department working…" : "Run a research generation"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Replays cached price history only — no extra market data requests, no orders.
        </span>
      </section>

      {(run.data?.warnings ?? []).length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
          {run.data!.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <section className="grid gap-3 lg:grid-cols-2">
        {researchers.map((r) => {
          const latest = latestByLane.get(r.lane);
          const leg = latest?.evidence?.out_of_sample;
          return (
            <article key={r.id} className="space-y-2 rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{r.name}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">
                  generation {r.generation} · {r.experiments_run} experiments
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{LANE_BLURB[r.lane] ?? r.focus}</p>
              {r.lane === "skeptic" ? (
                <p className="text-sm text-muted-foreground">
                  {objections.length
                    ? `${objections.length} idea(s) vetoed most recently — see the objections below.`
                    : "No vetoes on the table right now."}
                </p>
              ) : latest ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {verdictChip(latest.verdict)}
                    <span className="text-sm">{latest.change_summary}</span>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    edge <Signed value={Number(latest.edge ?? 0)} /> per trade
                    {leg ? ` · ${leg.picks} fresh trades · ${leg.win_rate}% win` : ""}
                  </p>
                  {latest.objections.length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-warning">
                      {latest.objections.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing tested yet — run a generation.
                </p>
              )}
            </article>
          );
        })}
      </section>

      {balanced && (
        <section className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-4">
          <h3 className="font-semibold text-primary">Lead Researcher — Balanced Strategy</h3>
          <p className="text-sm">{balanced.summary}</p>
          <p className="text-sm text-muted-foreground">{balanced.note}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            Fresh-day result: {balanced.out_of_sample.picks} trades ·{" "}
            {balanced.out_of_sample.win_rate}% win · edge <Signed value={balanced.edge} />
          </p>
        </section>
      )}

      {deadEnds.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            What doesn't work
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Idea</th>
                  <th className="p-2 text-left">Why it was dropped</th>
                  <th className="p-2 text-right">Edge</th>
                </tr>
              </thead>
              <tbody>
                {deadEnds.map((d) => (
                  <tr key={d.id} className="border-t border-border/60">
                    <td className="p-2">{d.label}</td>
                    <td className="p-2 text-xs text-muted-foreground">{d.reason}</td>
                    <td className="p-2 text-right tabular-nums">
                      <Signed value={Number(d.edge ?? 0)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            These experiments are excluded from every future generation, so the department never
            spends time making the same mistake twice.
          </p>
        </section>
      )}
    </div>
  );
}
