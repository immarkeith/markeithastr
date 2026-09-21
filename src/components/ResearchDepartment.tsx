import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getDepartment } from "@/lib/department.functions";

type Overview = NonNullable<Awaited<ReturnType<typeof getDepartment>>>;
type Notebook = Overview["notebook"][number];
type DeadEnd = Overview["dead_ends"][number];

function useDepartment() {
  const load = useServerFn(getDepartment);
  return useQuery({ queryKey: ["department"], queryFn: () => load() });
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

/** One researcher's notebook: every experiment, its change, result and horizons. */
function NotebookTable({ entries }: { entries: Notebook[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">No experiments written down yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-2 text-left">Gen</th>
            <th className="p-2 text-left">Experiment</th>
            <th className="p-2 text-left">Change</th>
            <th className="p-2 text-right">Same-Day</th>
            <th className="p-2 text-left">Conclusion</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((n) => (
            <tr key={n.id} className="border-t border-border/40 align-top">
              <td className="p-2 tabular-nums text-muted-foreground">
                {n.generation}.{n.experiment_no}
              </td>
              <td className="p-2">{n.variable}</td>
              <td className="p-2 text-xs tabular-nums text-muted-foreground">
                {n.previous_value} → {n.new_value}
              </td>
              <td className="p-2 text-right text-xs tabular-nums">
                {n.horizons["same_day"] !== undefined ? (
                  <Signed value={n.horizons["same_day"]!} />
                ) : n.horizons["1"] !== undefined ? (
                  <Signed value={n.horizons["1"]!} />
                ) : (
                  "—"
                )}
              </td>
              <td
                className={`max-w-[280px] p-2 text-xs ${
                  n.accepted ? "text-success" : "text-muted-foreground"
                }`}
              >
                {n.conclusion}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeadEndList({ entries }: { entries: DeadEnd[] }) {
  if (!entries.length) {
    return <p className="text-xs text-muted-foreground">Nothing ruled out yet.</p>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {entries.map((d) => (
        <li key={d.id}>
          <p className="text-sm">{d.label}</p>
          <p className="text-muted-foreground">
            {d.reason} · <Signed value={Number(d.edge ?? 0)} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Where researchers independently land on the same ground, and where they
 * disagree. Shown directly under the Lead Researcher's suggestions.
 */
export function ResearchDisagreements() {
  const dept = useDepartment();
  const cross = dept.data?.last_run?.summary?.cross_findings ?? [];
  return (
    <section className="space-y-2">
      <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
        Where researchers agree &amp; disagree
      </h2>
      {cross.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active disagreements need attention right now.
        </p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {cross.map((c) => (
          <li key={c} className="flex gap-2">
            <span
              className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                c.startsWith("CONVERGENCE") ? "bg-success" : "bg-warning"
              }`}
            />
            <span className="text-muted-foreground">{c}</span>
          </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Drop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details>
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

/**
 * The nested tabs shown inside one researcher's "details" dropdown on the
 * Research Lab: their standing, their notebook, and what they ruled out.
 */
export function ResearcherTabs({ name }: { name: string }) {
  const dept = useDepartment();
  const data = dept.data;
  const isLead = /lead/i.test(name);
  const researcher = (data?.researchers ?? []).find(
    (r) => r.name.toLowerCase() === name.toLowerCase(),
  );
  const lane = isLead ? "lead" : (researcher?.lane ?? "");
  const notebook = (data?.notebook ?? []).filter((n) => n.lane === lane);
  const deadEnds = (data?.dead_ends ?? []).filter((d) => d.lane === lane);
  const activeRules = (data?.master?.rules ?? []).filter((r) => r.status === "active");
  const objections = (data?.findings ?? [])
    .filter((f) => f.verdict === "vetoed")
    .slice(0, 6)
    .flatMap((f) => f.objections.slice(0, 2));

  return (
    <div className="space-y-3">
      <Drop label="Active · Generation · Experiments">
        {researcher ? (
          <p className="text-xs text-muted-foreground">
            {researcher.enabled ? "Active" : "Inactive"} · generation {researcher.generation} ·{" "}
            {researcher.experiments_run} experiments run
          </p>
        ) : isLead ? (
          <p className="text-xs text-muted-foreground">
            Always active · {activeRules.length} validated rule(s) in the Master Formula
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No record yet.</p>
        )}
      </Drop>
      <Drop label="Notebook">
        <NotebookTable entries={notebook.slice(0, 30)} />
      </Drop>
      <Drop label="Why it doesn&apos;t work">
        <DeadEndList entries={deadEnds} />
      </Drop>
      {isLead ? (
        <Drop label="Skeptic objections">
          {objections.length === 0 ? (
            <p className="text-xs text-muted-foreground">No objections raised yet.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {objections.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          )}
        </Drop>
      ) : null}
    </div>
  );
}

/** One researcher row: name opens, and inside it two more dropdowns. */
function ResearcherRow({
  name,
  subtitle,
  notebook,
  deadEnds,
  extra,
}: {
  name: string;
  subtitle: string;
  notebook: Notebook[];
  deadEnds: DeadEnd[];
  extra?: React.ReactNode;
}) {
  return (
    <details className="border-t border-border/40 py-2">
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{name}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{subtitle}</span>
      </summary>
      <div className="mt-3 space-y-3 pl-2">
        {extra}
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Notebook
          </summary>
          <div className="mt-2">
            <NotebookTable entries={notebook.slice(0, 30)} />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            What doesn&apos;t work
          </summary>
          <div className="mt-2">
            <DeadEndList entries={deadEnds} />
          </div>
        </details>
      </div>
    </details>
  );
}

export function ResearchDepartment() {
  const dept = useDepartment();
  const data = dept.data;
  const researchers = data?.researchers ?? [];
  const findings = data?.findings ?? [];
  const deadEnds = data?.dead_ends ?? [];
  const notebook = data?.notebook ?? [];
  const rotation = data?.last_run?.summary?.rotation ?? null;
  const master = data?.master;
  const activeRules = (master?.rules ?? []).filter((r) => r.status === "active");
  const leadTest = (master?.lead_tests ?? [])[0] ?? null;
  const todayBackups = (master?.backup_tests ?? []).filter(
    (b) => b.test_date === (master?.backup_tests ?? [])[0]?.test_date,
  );
  const ml = leadTest?.evidence?.ml_evaluation ?? null;
  const objections = findings.filter((f) => f.verdict === "vetoed").slice(0, 6);

  const ordered = [...researchers].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      {(leadTest || todayBackups.length > 0) && (
        <details>
          <summary className="cursor-pointer text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Today&apos;s three tests
          </summary>
          {rotation ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Sitting out: {rotation.sitting_out.join(", ") || "nobody"} · next up:{" "}
              {rotation.next.join(", ") || "—"}
            </p>
          ) : null}
          <div className="mt-3 grid gap-5 lg:grid-cols-3">
            {leadTest ? (
              <article className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-primary">Lead Researcher</h3>
                  <span className="text-[11px] text-muted-foreground">
                    Master Formula v{leadTest.master_version}
                  </span>
                </div>
                <p className="text-sm">
                  {leadTest.picks.length
                    ? leadTest.picks.map((p) => p.ticker).join(", ")
                    : "Nothing cleared its conditions"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="text-chart-4">Same-Day</span>{" "}
                  <Signed value={Number(leadTest.horizons["same_day"] ?? 0)} /> · edge{" "}
                  <Signed value={Number(leadTest.edge ?? 0)} />
                </p>
                <p className="text-xs text-muted-foreground">{leadTest.note}</p>
              </article>
            ) : null}
            {todayBackups.slice(0, 2).map((b) => (
              <article key={b.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{b.researcher_name}</h3>
                  <span className="text-[11px] text-muted-foreground">{b.formula_version}</span>
                </div>
                <p className="text-sm">
                  {b.picks.length
                    ? b.picks.map((p) => p.ticker).join(", ")
                    : "Nothing met its own bar"}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  <span className="text-chart-4">Same-Day</span>{" "}
                  <Signed value={Number(b.horizons["same_day"] ?? 0)} /> · edge{" "}
                  <Signed value={Number(b.edge ?? 0)} />
                </p>
                <p className="text-xs text-muted-foreground">{b.note}</p>
              </article>
            ))}
          </div>
        </details>
      )}

      <details>
        <summary className="cursor-pointer text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Master Formula &amp; model tests
        </summary>
        <div className="mt-3 space-y-2">
          {activeRules.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No rule has cleared the bar yet — the Lead keeps testing the current live weights.
            </p>
          ) : (
            <ul className="space-y-1 text-xs">
              {activeRules.map((r) => (
                <li key={r.id}>
                  <span className="text-sm">{r.label}</span>{" "}
                  <span className="text-muted-foreground">
                    found by {r.discovered_by} · confirmed {r.confirmations}x ·{" "}
                    <Signed value={Number(r.last_edge ?? 0)} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          {ml ? (
            <div className="text-xs">
              <p className="font-semibold">
                Predictive model test —{" "}
                {ml.covered_dates >= 5
                  ? ml.accepted
                    ? "accepted for now"
                    : "rejected"
                  : "gathering evidence"}
              </p>
              <p className="text-muted-foreground">{ml.conclusion}</p>
              {ml.covered_dates >= 5 ? (
                <p className="tabular-nums text-muted-foreground">
                  pure formula <Signed value={ml.pure_avg_return_pct} /> · with model{" "}
                  <Signed value={ml.blended_avg_return_pct} /> · difference{" "}
                  <Signed value={ml.delta} /> per trade
                </p>
              ) : null}
            </div>
          ) : null}
          {objections.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {objections.flatMap((f) => f.objections.slice(0, 2)).map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </div>
  );
}
