import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { getDepartment, runDepartmentNow } from "@/lib/department.functions";

type Overview = NonNullable<Awaited<ReturnType<typeof getDepartment>>>;
type Board = NonNullable<Overview["last_run"]>["summary"]["board"];
type BoardStock = NonNullable<Board>["stocks"][number];
type Notebook = Overview["notebook"][number];

const LANE_BLURB: Record<string, string> = {
  trend: "Follows strength: momentum, trend, breakouts.",
  contrarian: "Looks for names the market has oversold or overlooked.",
  consistency: "Prefers steady, repeatable behaviour over excitement.",
  growth: "Hunts improving, accelerating performance.",
  risk: "Wants return per unit of risk, not raw return.",
  skeptic: "Attacks every finding and can veto it.",
};

const BOARD_COUNTS = [25, 50, 100, "all"] as const;
type BoardCount = (typeof BOARD_COUNTS)[number];

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

/** One ranked board, transparent down to the individual factor points. */
function BoardTable({ stocks, lanes, count }: { stocks: BoardStock[]; lanes: string[]; count: number }) {
  const shown = stocks.slice(0, count);
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Stock</th>
            <th className="p-2 text-right">Close</th>
            {lanes.map((l) => (
              <th key={l} className="p-2 text-right capitalize">
                {l.slice(0, 5)}
              </th>
            ))}
            <th className="p-2 text-right">Consensus</th>
            <th className="p-2 text-left">Agrees</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s, i) => {
            const values = Object.values(s.scores);
            const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
            return (
              <tr key={s.ticker} className="border-t border-border/60 align-top">
                <td className="p-2 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="p-2 font-semibold">
                  {s.ticker}
                  {s.likes.length === lanes.length && lanes.length > 1 ? (
                    <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                      all agree
                    </span>
                  ) : s.likes.length === 1 ? (
                    <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-warning">
                      {s.likes[0]} only
                    </span>
                  ) : null}
                </td>
                <td className="p-2 text-right tabular-nums">${s.close.toFixed(2)}</td>
                {lanes.map((l) => (
                  <td
                    key={l}
                    className={`p-2 text-right tabular-nums ${
                      s.likes.includes(l) ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.scores[l] !== undefined ? s.scores[l] : "—"}
                  </td>
                ))}
                <td className="p-2 text-right tabular-nums">
                  <span className="font-semibold">{s.consensus}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground">±{spread.toFixed(0)}</span>
                </td>
                <td className="p-2 text-[11px] capitalize text-muted-foreground">
                  {s.likes.length ? s.likes.join(", ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {shown.length === 0 && (
        <p className="p-3 text-xs text-muted-foreground">
          No ranked board yet — run a research generation first.
        </p>
      )}
    </div>
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
  const [boardCount, setBoardCount] = useState<BoardCount>(25);

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
  const board = data?.last_run?.summary?.board ?? null;
  const objections = findings.filter((f) => f.verdict === "vetoed").slice(0, 6);
  const latestByLane = new Map<string, (typeof findings)[number]>();
  for (const f of findings) if (!latestByLane.has(f.lane)) latestByLane.set(f.lane, f);

  const pickingLanes = researchers.filter((r) => r.lane !== "skeptic").map((r) => r.lane);
  const tabs = useMemo(
    () => [
      { id: "all", label: "All researchers" },
      { id: "lead", label: "Lead Researcher" },
      ...researchers.map((r) => ({ id: r.lane, label: r.name })),
    ],
    [researchers],
  );

  const boardStocks = board?.stocks ?? [];
  const boardCountN = boardCount === "all" ? boardStocks.length || 1000 : boardCount;
  const singleLaneStocks =
    tab !== "all" && tab !== "lead"
      ? [...boardStocks]
          .filter((s) => s.scores[tab] !== undefined)
          .sort((a, b) => (b.scores[tab] ?? 0) - (a.scores[tab] ?? 0))
      : boardStocks;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-lg font-bold tracking-tight">Research department</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Five specialists with genuinely different philosophies, each tuning only its own
          variables, plus a Skeptic that tries to break their conclusions and a Lead Researcher
          that merges the survivors into one Balanced Strategy proposal. Every experiment is
          written into a permanent notebook — including the failures — and when researchers
          independently agree, that agreement is treated as a finding, not forced apart.
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
          hint={balanced ? (balanced.filed ? "filed as a candidate" : "not better than the current rule") : "waiting on a pass"}
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
          {researchers.map((r) => {
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
                  <h3 className="font-semibold">{r.name}</h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    generation {r.generation} · {r.experiments_run} experiments
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{LANE_BLURB[r.lane] ?? r.focus}</p>
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
                <p className="text-xs text-muted-foreground">{LANE_BLURB[r.lane] ?? r.focus}</p>
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

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Ranked board{board ? ` — ${board.date}` : ""}
            {tab !== "all" && tab !== "lead" ? ` · ${tab}` : " · consensus"}
          </h3>
          <div className="flex gap-1">
            {BOARD_COUNTS.map((c) => (
              <button
                key={String(c)}
                type="button"
                onClick={() => setBoardCount(c)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  boardCount === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {c === "all" ? "ALL" : `Top ${c}`}
              </button>
            ))}
          </div>
        </div>
        <BoardTable
          stocks={singleLaneStocks}
          lanes={tab !== "all" && tab !== "lead" ? [tab] : pickingLanes}
          count={boardCountN}
        />
        <p className="text-xs text-muted-foreground">
          Bold scores clear that researcher's own bar. "All agree" means every specialist wants the
          stock; a single-name tag means only one formula sees it — genuine disagreement, kept
          visible on purpose.
        </p>
      </section>

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
