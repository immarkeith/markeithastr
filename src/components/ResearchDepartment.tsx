import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getDepartment } from "@/lib/department.functions";
import { getStability } from "@/lib/stability.functions";

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


/**
 * One researcher's own learned profile: the characteristics it has tested
 * against its accumulated examples, how confident it currently is, and the
 * assumptions it has dropped because they stopped holding up. Research only —
 * nothing here changes live trading.
 */
function LearnedProfile({ lane, data }: { lane: string; data: Overview | undefined }) {
  const learning = data?.learning;
  const beliefs = (learning?.beliefs ?? []).filter((b) => b.lane === lane);
  const counts = learning?.example_counts?.[lane] ?? {};
  const minimums = (learning?.minimums ?? {}) as Record<string, number>;
  const horizons = ["same_day", "1M", "3M", "9M"] as const;
  const labels: Record<string, string> = {
    same_day: "Same-day",
    "1M": "1 month",
    "3M": "3 months",
    "9M": "9 months",
  };

  const live = beliefs.filter((b) => b.status !== "dropped");
  const dropped = beliefs.filter((b) => b.status === "dropped");

  const statusTone: Record<string, string> = {
    supported: "text-success",
    forming: "text-muted-foreground",
    weakening: "text-warning",
    dropped: "text-destructive",
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Examples studied: {" "}
        {horizons
          .map(
            (h) =>
              `${labels[h]} ${counts[h] ?? 0}${minimums[h] ? `/${minimums[h]}` : ""}`,
          )
          .join(" · ")}
      </p>
      {live.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Still collecting completed examples — no characteristic has enough evidence to
          test yet.
        </p>
      ) : (
        <ul className="space-y-2 text-xs">
          {live.slice(0, 12).map((b) => (
            <li key={b.id} className="border-t border-border/40 pt-2 first:border-0 first:pt-0">
              <p className="text-sm">
                {b.hypothesis}
              </p>
              <p className="text-muted-foreground">
                {labels[b.horizon] ?? b.horizon} ·{" "}
                <span className={statusTone[b.status] ?? "text-muted-foreground"}>
                  {b.status}
                </span>{" "}
                · confidence {Math.round(Number(b.confidence))}% · {b.sample_size} examples ·{" "}
                {b.direction === "helps" ? "better by " : "worse by "}
                <Signed value={Number(b.lift ?? 0)} /> per example
              </p>
              <p className="text-muted-foreground">
                Win rate {b.win_rate_in ?? 0}% vs {b.win_rate_out ?? 0}% without it · hold-out
                half <Signed value={Number(b.second_half_lift ?? 0)} />
                {b.note ? ` · ${b.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {dropped.length > 0 ? (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Assumptions dropped
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {dropped.slice(0, 8).map((b) => (
              <li key={b.id}>
                {b.hypothesis} — stopped holding up after {b.failures} re-test(s).
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type Stability = NonNullable<Awaited<ReturnType<typeof getStability>>>;
type LaneStabilityRow = Stability["lanes"][number];

const VERDICT_TONE: Record<string, string> = {
  robust: "text-success",
  watch: "text-warning",
  brittle: "text-destructive",
};

/**
 * "Show me why" diagnostics for one researcher: its exact formula parameters,
 * its own calibrated qualification bar with the evidence behind it, and how
 * the formula held up when every parameter was nudged slightly.
 */
function FormulaDiagnostics({ lane }: { lane: string }) {
  const load = useServerFn(getStability);
  const query = useQuery({ queryKey: ["stability"], queryFn: () => load() });
  const report = query.data;
  const row: LaneStabilityRow | undefined = report?.lanes.find((l) => l.lane === lane);

  if (query.isLoading) {
    return <p className="text-xs text-muted-foreground">Loading formula diagnostics…</p>;
  }
  if (!row) {
    return (
      <p className="text-xs text-muted-foreground">
        No stability pass has run for this researcher yet — diagnostics appear after the first
        parameter-stability check.
      </p>
    );
  }

  const p = row.params;
  const weights = Object.entries(p.weights).filter(([, v]) => Number(v) > 0);
  const gates: string[] = [`score ≥ ${p.min_score_to_trade}`];
  if (p.rsi_min !== null) gates.push(`RSI ≥ ${p.rsi_min}`);
  if (p.rsi_max !== null) gates.push(`RSI ≤ ${p.rsi_max}`);
  if (p.atr_pct_min !== null) gates.push(`ATR ≥ ${p.atr_pct_min}%`);
  if (p.atr_pct_max !== null) gates.push(`ATR ≤ ${p.atr_pct_max}%`);
  if (p.rel_volume_min !== null) gates.push(`volume ≥ ${p.rel_volume_min}x avg`);
  const ev = row.threshold_evidence;
  const worst = [...row.perturbations].sort((a, b) => a.objective_delta - b.objective_delta)[0];

  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Formula</p>
        <p className="mt-1 tabular-nums text-muted-foreground">
          {weights.map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(" · ") || "No weights"}
        </p>
        <p className="mt-0.5 text-muted-foreground">Gates: {gates.join(" · ")}</p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Its own qualification bar
        </p>
        {row.qualified_min_score !== null && ev ? (
          <p className="mt-1 text-muted-foreground">
            Qualifies at score ≥{" "}
            <span className="font-semibold text-foreground">{row.qualified_min_score}</span> —
            calibrated from {ev.picks} of its own past setups (avg{" "}
            <Signed value={ev.avg_return_pct} />, {ev.win_rate}% up, {ev.sessions} sessions). This
            bar is re-learned on every stability pass, never hardcoded.
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">
            No calibrated bar yet — not enough of this formula&apos;s own historical evidence.
          </p>
        )}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Parameter stability
        </p>
        <p className="mt-1">
          <span className={`font-semibold ${VERDICT_TONE[row.verdict] ?? ""}`}>
            {row.verdict}
          </span>{" "}
          <span className="text-muted-foreground">
            — {row.stability}% of small nudges (weights ±5, gates ±5, RSI/ATR/volume bounds) kept a
            positive out-of-sample edge over {row.baseline.picks} uncapped setups.
          </span>
        </p>
        {worst ? (
          <p className="mt-0.5 text-muted-foreground">
            Weakest nudge: {worst.label} (<Signed value={worst.avg_return_pct} /> avg over{" "}
            {worst.picks} setups).
          </p>
        ) : null}
        {report?.as_of ? (
          <p className="mt-0.5 text-muted-foreground">Tested on history through {report.as_of}.</p>
        ) : null}
      </div>
    </div>
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
      <Drop label="What I&apos;ve learned">
        <LearnedProfile lane={lane} data={data} />
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
            Today&apos;s tests
          </summary>
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
            {todayBackups.map((b) => (
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
