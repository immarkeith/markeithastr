import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { getDepartment, runDepartmentNow } from "@/lib/department.functions";

type Overview = NonNullable<Awaited<ReturnType<typeof getDepartment>>>;
type Notebook = Overview["notebook"][number];

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

/** One researcher's notebook: every experiment, its change, result and horizons. */
function NotebookTable({ entries }: { entries: Notebook[] }) {
  if (!entries.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No experiments written yet — run a generation and every trial lands here.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-2 text-left">Gen</th>
            <th className="p-2 text-left">Experiment</th>
            <th className="p-2 text-left">Change</th>
            <th className="p-2 text-left">Result</th>
            <th className="p-2 text-right">1d</th>
            <th className="p-2 text-right">3d</th>
            <th className="p-2 text-right">5d</th>
            <th className="p-2 text-right">10d</th>
            <th className="p-2 text-left">Conclusion</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((n) => (
            <tr key={n.id} className="border-t border-border/60 align-top">
              <td className="p-2 tabular-nums text-muted-foreground">
                {n.generation}.{n.experiment_no}
              </td>
              <td className="p-2">{n.variable}</td>
              <td className="p-2 text-xs tabular-nums text-muted-foreground">
                {n.previous_value} → {n.new_value}
              </td>
              <td className="p-2 text-xs">
                <Signed value={Number(n.edge ?? 0)} />
              </td>
              {["1", "3", "5", "10"].map((h) => (
                <td key={h} className="p-2 text-right text-xs tabular-nums">
                  {n.horizons[h] !== undefined ? <Signed value={n.horizons[h]!} /> : "—"}
                </td>
              ))}
              <td className={`max-w-[280px] p-2 text-xs ${n.accepted ? "text-success" : "text-muted-foreground"}`}>
                {n.conclusion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ResearchDepartment() {
  const qc = useQueryClient();
  const load = useServerFn(getDepartment);
  const runFn = useServerFn(runDepartmentNow);
  const [universe, setUniverse] = useState("250");
  const [tab, setTab] = useState("all");

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
  const notebook = data?.notebook ?? [];
  const balanced = data?.last_run?.summary?.balanced ?? null;
  const cross = data?.last_run?.summary?.cross_findings ?? [];
  const rotation = data?.last_run?.summary?.rotation ?? null;
  const master = data?.master;
  const rules = master?.rules ?? [];
  const activeRules = rules.filter((r) => r.status === "active");
  const watchRules = rules.filter((r) => r.status === "observation");
  const retiredRules = rules.filter((r) => r.status === "retired");
  const versions = master?.versions ?? [];
  const leadTest = (master?.lead_tests ?? [])[0] ?? null;
  const todayBackups = (master?.backup_tests ?? []).filter(
    (b) => b.test_date === (master?.backup_tests ?? [])[0]?.test_date,
  );
  const objections = findings.filter((f) => f.verdict === "vetoed").slice(0, 6);
  const latestByLane = new Map<string, (typeof findings)[number]>();
  for (const f of findings) if (!latestByLane.has(f.lane)) latestByLane.set(f.lane, f);

  const orderedResearchers = useMemo(
    () =>
      [...researchers].sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        return String(b.last_run_at ?? "").localeCompare(String(a.last_run_at ?? ""));
      }),
    [researchers],
  );
  const tabs = useMemo(
    () => [
      { id: "all", label: "All researchers" },
      { id: "lead", label: "Lead Researcher" },
      ...orderedResearchers.map((r) => ({ id: r.lane, label: r.name })),
    ],
    [orderedResearchers],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight">Research department</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One permanent Lead Researcher and six backup scientists. Each market day the Lead tests
          the current Master Formula and two of the six backups get a test slot, so every lane gets
          regular turns. Backups may change their own formulas freely; only the Lead can change the
          Master Formula, and only after a finding has been confirmed on separate days it was never
          tuned on. Every experiment is written down — including the failures.
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
          label="Master Formula"
          value={leadTest ? `v${leadTest.master_version}` : "—"}
          hint={
            leadTest
              ? `${activeRules.length} validated rule(s) · ${leadTest.verdict}`
              : `${activeRules.length} validated rule(s)`
          }
          tone={leadTest && Number(leadTest.edge ?? 0) > 0 ? "positive" : "default"}
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

      {cross.length > 0 && (
        <section className="space-y-2 rounded-md border border-border bg-card p-4">
          <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Where researchers agree &amp; disagree
          </h3>
          <ul className="space-y-1.5 text-sm">
            {cross.map((c) => (
              <li key={c} className="flex gap-2">
                <span
                  className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    c.startsWith("CONVERGENCE") ? "bg-success" : "bg-warning"
                  }`}
                />
                <span className="text-muted-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(leadTest || todayBackups.length > 0) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
              Today's three tests
            </h3>
            {rotation ? (
              <p className="text-xs text-muted-foreground">
                Sitting out: {rotation.sitting_out.join(", ") || "nobody"} · next up:{" "}
                {rotation.next.join(", ") || "—"}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {leadTest ? (
              <article className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-semibold text-primary">Lead Researcher</h4>
                  <span className="text-[11px] text-muted-foreground">
                    Master Formula v{leadTest.master_version}
                  </span>
                </div>
                <p className="text-sm">
                  Picked{" "}
                  {leadTest.picks.length
                    ? leadTest.picks.map((p) => p.ticker).join(", ")
                    : "nothing — nothing cleared its conditions"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="text-chart-4">Same-Day</span>{" "}
                  <Signed value={Number(leadTest.horizons['same_day'] ?? 0)} /> ·{" "}
                  <span className="text-chart-2">3-Day</span>{" "}
                  <Signed value={Number(leadTest.horizons['3'] ?? 0)} /> · edge{" "}
                  <Signed value={Number(leadTest.edge ?? 0)} />
                </p>

                <p className="text-xs text-muted-foreground">{leadTest.note}</p>
                <button
                  type="button"
                  onClick={() => setTab("lead")}
                  className="text-xs text-primary hover:underline"
                >
                  See the Master Formula
                </button>
              </article>
            ) : null}
            {todayBackups.slice(0, 2).map((b) => (
              <article key={b.id} className="space-y-2 rounded-md border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-semibold">{b.researcher_name}</h4>
                  <span className="text-[11px] text-muted-foreground">{b.formula_version}</span>
                </div>
                <p className="text-sm">
                  Picked{" "}
                  {b.picks.length
                    ? b.picks.map((p) => p.ticker).join(", ")
                    : "nothing that met its own bar"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="text-chart-4">Same-Day</span>{" "}
                  <Signed value={Number(b.horizons['same_day'] ?? 0)} /> ·{" "}
                  <span className="text-chart-2">3-Day</span>{" "}
                  <Signed value={Number(b.horizons['3'] ?? 0)} /> · edge{" "}
                  <Signed value={Number(b.edge ?? 0)} />
                </p>

                {b.worked.length > 0 && (
                  <p className="text-xs text-success">Worked: {b.worked[0]}</p>
                )}
                {b.failed.length > 0 && (
                  <p className="text-xs text-warning">Fell short: {b.failed[0]}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {b.repeatable ? "Repeatable across both halves. " : "Not repeatable yet. "}
                  {b.note}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "all" && (
        <section className="grid gap-3 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => setTab("lead")}
            className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-4 text-left transition-colors hover:border-primary"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-primary">#1 Lead Researcher</h3>
              <span className="text-xs text-muted-foreground">permanent lead</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {balanced?.summary ?? "Reviewing specialist findings; no Balanced Strategy proposal yet."}
            </p>
          </button>
          {orderedResearchers.map((r, index) => {
            const latest = latestByLane.get(r.lane);
            const leg = latest?.evidence?.out_of_sample;
            return (
              <button
                type="button"
                key={r.id}
                onClick={() => setTab(r.lane)}
                className="space-y-2 rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">#{index + 2} {r.name}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {r.enabled ? "active" : "inactive"} · generation {r.generation} · {r.experiments_run} experiments
                  </span>
                </div>
                {r.lane === "skeptic" ? (
                  <p className="text-sm text-muted-foreground">
                    {objections.length
                      ? `${objections.length} idea(s) vetoed most recently.`
                      : "No vetoes on the table right now."}
                  </p>
                ) : latest ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {verdictChip(latest.verdict)}
                    <span className="text-sm">{latest.change_summary}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      edge <Signed value={Number(latest.edge ?? 0)} />
                      {leg ? ` · ${leg.picks} fresh trades · ${leg.win_rate}% win` : ""}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing tested yet.</p>
                )}
              </button>
            );
          })}
        </section>
      )}

      {tab === "lead" && (
        <section className="space-y-4">
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                Master Formula {leadTest ? `v${leadTest.master_version}` : ""}
              </h3>
              <span className="text-xs text-muted-foreground">
                {activeRules.length} validated · {watchRules.length} still being watched ·{" "}
                {retiredRules.length} retired
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Only the Lead Researcher changes this. A finding joins after three separate
              confirmations on days it was never tuned on, and leaves only after four sustained
              failures — so one good or bad day never moves it.
            </p>

            {activeRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rule has cleared the bar yet. Until one does, the Lead tests the current live
                weights as a placeholder.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeRules.map((r) => (
                  <li key={r.id} className="rounded border border-success/30 bg-success/5 p-2">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      found by {r.discovered_by} · confirmed {r.confirmations}x · last test{" "}
                      <Signed value={Number(r.last_edge ?? 0)} />
                      {r.promoted_on ? ` · added ${r.promoted_on}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {watchRules.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Being watched, not yet trusted
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {watchRules.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      {r.label} — {r.confirmations} of 3 confirmations ({r.discovered_by})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {retiredRules.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                  Retired
                </h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {retiredRules.slice(0, 6).map((r) => (
                    <li key={r.id}>
                      {r.label} — dropped after {r.failures} failed re-tests
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {leadTest && (
            <div className="space-y-2 rounded-md border border-border bg-card p-4">
              <h3 className="font-semibold">
                The Lead's own test — {leadTest.test_date} · {leadTest.verdict}
              </h3>
              <p className="text-sm">
                Entry: {leadTest.entry_conditions.join("; ") || "—"}. Exit:{" "}
                {leadTest.exit_conditions.join("; ") || "—"}.
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                same day <Signed value={Number(leadTest.horizons['same_day'] ?? 0)} /> · 1d{" "}
                <Signed value={Number(leadTest.horizons['1'] ?? 0)} /> · 3d{" "}
                <Signed value={Number(leadTest.horizons['3'] ?? 0)} /> · 5d{" "}
                <Signed value={Number(leadTest.horizons['5'] ?? 0)} /> · 10d{" "}
                <Signed value={Number(leadTest.horizons['10'] ?? 0)} />
              </p>
              {leadTest.winning_conditions.length > 0 && (
                <p className="text-xs text-success">
                  Winning conditions: {leadTest.winning_conditions.join(" · ")}
                </p>
              )}
              {leadTest.losing_conditions.length > 0 && (
                <p className="text-xs text-warning">
                  Losing conditions: {leadTest.losing_conditions.join(" · ")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{leadTest.note}</p>
            </div>
          )}

          {versions.length > 0 && (
            <div className="space-y-2 rounded-md border border-border bg-card p-4">
              <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
                Version history
              </h3>
              <ul className="space-y-2">
                {versions.map((v) => (
                  <li key={v.id} className="border-t border-border/60 pt-2 first:border-0 first:pt-0">
                    <p className="text-sm font-medium">
                      v{v.version}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        {v.created_at.slice(0, 10)} · {v.tests} test(s)
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{v.change_summary}</p>
                    <p className="text-xs text-muted-foreground">{v.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {balanced ? (
            <div className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-4">
              <h3 className="font-semibold text-primary">Lead Researcher — Balanced Strategy</h3>
              <p className="text-sm">{balanced.summary}</p>
              <p className="text-sm text-muted-foreground">{balanced.note}</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                Fresh-day result: {balanced.out_of_sample.picks} trades ·{" "}
                {balanced.out_of_sample.win_rate}% win · edge <Signed value={balanced.edge} />
              </p>
            </div>
          ) : (
            <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              The Lead Researcher only speaks when at least two researchers independently validate
              findings that beat the current rule on fresh days. No proposal yet — that silence is
              the safeguard working, not a missing feature.
            </p>
          )}
          {objections.length > 0 && (
            <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <h3 className="text-sm font-semibold text-destructive">Open disagreements the Lead is investigating</h3>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {objections.flatMap((f) => f.objections.slice(0, 2)).map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab !== "all" && tab !== "lead" && (
        <section className="space-y-4">
          {(() => {
            const r = researchers.find((x) => x.lane === tab);
            if (!r) return null;
            const latest = latestByLane.get(r.lane);
            return (
              <article className="space-y-2 rounded-md border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{r.name}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    generation {r.generation} · {r.experiments_run} experiments · best edge{" "}
                    {r.best_edge !== null ? <Signed value={Number(r.best_edge)} /> : "—"}
                  </span>
                </div>
                {r.lane === "skeptic" ? (
                  objections.length ? (
                    <ul className="list-disc space-y-1 pl-4 text-xs text-warning">
                      {objections.flatMap((f) => f.objections).map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No vetoes on the table right now.</p>
                  )
                ) : latest ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {verdictChip(latest.verdict)}
                      <span className="text-sm">{latest.change_summary}</span>
                    </div>
                    <p className="text-xs italic text-muted-foreground">{latest.hypothesis}</p>
                    {latest.objections.length > 0 && (
                      <ul className="list-disc space-y-1 pl-4 text-xs text-warning">
                        {latest.objections.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing tested yet — run a generation.</p>
                )}
              </article>
            );
          })()}
          <div className="space-y-2">
            <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Notebook</h3>
            <NotebookTable entries={notebook.filter((n) => n.lane === tab).slice(0, 30)} />
          </div>
        </section>
      )}

      {tab === "all" && notebook.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Latest notebook entries
          </h3>
          <NotebookTable entries={notebook.slice(0, 15)} />
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
