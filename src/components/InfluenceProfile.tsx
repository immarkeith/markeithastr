import { useQuery } from "@tanstack/react-query";

import { getAssignments } from "@/lib/assign.functions";

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);

export function InfluenceProfile() {
  const q = useQuery({ queryKey: ["assignments"], queryFn: () => getAssignments() });
  const rows = q.data?.assignments ?? [];
  const tips = rows.filter((r) => r.influence);
  const core = rows.filter((r) => !r.influence);

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Influence Researcher</h2>
      <p className="text-xs text-muted-foreground">
        Tracks outside stock tips from the day they were made and compares them with SPY. Research only.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(q.data?.influence_profile ?? []).map((h) => (
          <div key={h.horizon} className="rounded-md border border-border p-2 text-xs">
            <p className="font-semibold">{h.horizon} · {h.count} finished</p>
            <p className="text-muted-foreground">Win {pct(h.win_rate).replace("+", "")} · Beat SPY {pct(h.beat_spy_rate).replace("+", "")}</p>
            <p className="text-muted-foreground">Avg {pct(h.avg_return)}</p>
          </div>
        ))}
      </div>
      {tips.length ? (
        <ul className="space-y-2 text-sm">
          {tips.map((t) => (
            <li key={t.id} className="border-t border-border pt-2">
              <span className="font-semibold">{t.ticker}</span> · {t.horizon} from {t.tip_date}
              {t.source ? ` · ${t.source}` : ""}
              <span className="block text-xs text-muted-foreground">
                {t.result
                  ? `${pct(t.result.return_pct)} vs SPY ${pct(t.result.spy_pct)} over ${t.result.sessions} sessions${t.result.complete ? "" : " (still running)"}`
                  : "No price history for this date yet."}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-muted-foreground">No tips logged yet. Use Assign to Researcher and pick Influence Researcher.</p>}
      {core.length ? (
        <div className="space-y-1">
          <h3 className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Assigned to researchers</h3>
          {core.slice(0, 20).map((a) => (
            <p key={a.id} className="text-xs">
              <span className="font-semibold">{a.ticker}</span> → {a.researcher} · {a.assigned_at.slice(0, 10)}
              {a.snapshot.unavailable.length ? <span className="text-muted-foreground"> · not enough history for {a.snapshot.unavailable.join(", ")}</span> : null}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
