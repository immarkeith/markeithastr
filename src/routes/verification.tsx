import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { getVerification, runVerificationNow } from "@/lib/verification.functions";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Research Verification — ASTR" },
      {
        name: "description",
        content:
          "Every researcher's recommendation independently checked against history by its own research assistant, through one shared backtesting engine.",
      },
      { property: "og:title", content: "Research Verification — ASTR" },
      {
        property: "og:description",
        content:
          "Comparable historical signals, win rate, average and median return, drawdown and profit factor for each researcher's current pick.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationPage,
});

const TONE: Record<string, string> = {
  SUPPORTED: "text-success",
  "WEAKLY SUPPORTED": "text-warning",
  NEUTRAL: "text-muted-foreground",
  CONTRADICTED: "text-destructive",
  "INSUFFICIENT DATA": "text-muted-foreground",
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

function VerificationPage() {
  const qc = useQueryClient();
  const load = useServerFn(getVerification);
  const run = useServerFn(runVerificationNow);
  const [open, setOpen] = useState<string | null>(null);

  const data = useQuery({ queryKey: ["verification"], queryFn: () => load() });

  const verify = useMutation({
    mutationFn: () => run({ data: { universe: 300 } }),
    onSuccess: async (res) => {
      toast.success(
        res.reports.length
          ? `${res.reports.length} assistant report(s) for ${res.as_of}.`
          : "No recommendations to verify yet — run a research pass first.",
      );
      await qc.invalidateQueries({ queryKey: ["verification"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = data.data?.latest ?? [];
  const supported = latest.filter((r) => r.conclusion === "SUPPORTED").length;
  const contradicted = latest.filter((r) => r.conclusion === "CONTRADICTED").length;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Research Verification</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every researcher now has an assistant whose only job is to check that researcher's own
          call against history. The assistant never picks a stock and never overrules its
          researcher. It asks one question through a single shared testing engine: when this exact
          formula produced a signal like today's in the past, what happened next? All six assistants
          share the engine, but results are kept strictly apart by researcher and by formula
          version — change a formula and its history starts fresh. Nothing here can move live money.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Assistants reporting" value={`${latest.length}`} />
        <StatTile label="Supported calls" value={`${supported}`} tone={supported ? "accent" : "default"} />
        <StatTile label="Contradicted calls" value={`${contradicted}`} />
        <StatTile
          label="History available"
          value={`${data.data?.history_days ?? 0} sessions`}
          hint={data.data?.data_source ?? ""}
        />
      </section>

      <section className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-4">
        <Button onClick={() => verify.mutate()} disabled={verify.isPending}>
          {verify.isPending ? "Verifying…" : "Run verification"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Replays price history already stored — no extra data requests, no orders. An identical
          check is reused rather than repeated.
        </span>
      </section>

      {(verify.data?.warnings ?? []).length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs text-muted-foreground">
          {verify.data!.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}
      {(verify.data?.failures ?? []).length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-muted-foreground">
          {verify.data!.failures.map((f) => (
            <p key={f.lane}>
              {f.lane}: {f.message}
            </p>
          ))}
        </div>
      )}

      {latest.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No verifications yet. Press “Run verification” — each researcher's current top pick will be
          checked against every comparable historical signal its own formula produced.
        </p>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {latest.map((r) => {
            const res = r.results;
            const expanded = open === r.id;
            return (
              <article key={r.id} className="space-y-3 rounded-md border border-border bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold uppercase tracking-wide">{r.scientist_name}</h2>
                  <span className="text-[11px] text-muted-foreground">
                    formula {r.strategy_version} · engine {r.backtest_version}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Recommendation: </span>
                  <span className="font-semibold">
                    {r.direction} {r.ticker}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    (signal {r.signal_strength} on {r.signal_date})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted-foreground">Assistant: </span>
                    <span className={`font-semibold ${TONE[r.conclusion] ?? ""}`}>
                      {r.conclusion}
                    </span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Confidence: </span>
                    {r.confidence}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    data quality {r.data_quality}
                  </span>
                </div>
                <div className="space-y-1 rounded-md border border-border/60 p-2">
                  <Row label="Comparable historical signals">
                    {res.comparable_signals} ({res.same_ticker_signals} on {r.ticker})
                  </Row>
                  <Row label="Win rate">{res.win_rate}%</Row>
                  <Row label="Average return">
                    <Signed value={res.avg_return} />
                  </Row>
                  <Row label="Median return">
                    <Signed value={res.median_return} />
                  </Row>
                  <Row label="Best / worst">
                    <Signed value={res.best_return} /> / <Signed value={res.worst_return} />
                  </Row>
                  <Row label="Max drawdown across signals">-{res.max_drawdown}%</Row>
                  <Row label="Profit factor">
                    {res.profit_factor === null ? "not enough data" : res.profit_factor}
                  </Row>
                  <Row label="Winners / losers">
                    {res.wins} / {res.losses}
                  </Row>
                  <Row label="Similar market conditions">
                    {res.similar_market.signals} signals · {res.similar_market.win_rate}% win ·{" "}
                    <Signed value={res.similar_market.avg_return} />
                  </Row>
                  <Row label="Similar volatility">
                    {res.similar_volatility.signals} signals · {res.similar_volatility.win_rate}% win
                    · <Signed value={res.similar_volatility.avg_return} />
                  </Row>
                  <Row label="Sample period">{res.sample_period}</Row>
                </div>

                <button
                  type="button"
                  className="text-xs underline text-muted-foreground"
                  onClick={() => setOpen(expanded ? null : r.id)}
                >
                  {expanded ? "Hide" : "Show"} holding periods and limitations
                </button>

                {expanded && (
                  <div className="space-y-2">
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/40 uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="p-2 text-left">Held</th>
                            <th className="p-2 text-right">Signals</th>
                            <th className="p-2 text-right">Win rate</th>
                            <th className="p-2 text-right">Average</th>
                            <th className="p-2 text-right">Median</th>
                          </tr>
                        </thead>
                        <tbody>
                          {res.by_horizon.map((h) => (
                            <tr key={h.horizon} className="border-t border-border/60">
                              <td className="p-2">{h.horizon} day(s)</td>
                              <td className="p-2 text-right tabular-nums">{h.signals}</td>
                              <td className="p-2 text-right tabular-nums">{h.win_rate}%</td>
                              <td className="p-2 text-right tabular-nums">
                                <Signed value={h.avg_return} />
                              </td>
                              <td className="p-2 text-right tabular-nums">
                                <Signed value={h.median_return} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {r.limitations.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Verification log — the Lead Researcher's raw evidence
        </h2>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-2 text-left">When</th>
                <th className="p-2 text-left">Researcher</th>
                <th className="p-2 text-left">Formula</th>
                <th className="p-2 text-left">Call</th>
                <th className="p-2 text-right">Signals</th>
                <th className="p-2 text-right">Win</th>
                <th className="p-2 text-right">Avg</th>
                <th className="p-2 text-left">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {(data.data?.log ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="p-2 text-xs text-muted-foreground">{r.created_at.slice(0, 16).replace("T", " ")}</td>
                  <td className="p-2">{r.scientist_name}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.strategy_version}</td>
                  <td className="p-2">
                    {r.direction} {r.ticker}
                  </td>
                  <td className="p-2 text-right tabular-nums">{r.results.comparable_signals}</td>
                  <td className="p-2 text-right tabular-nums">{r.results.win_rate}%</td>
                  <td className="p-2 text-right tabular-nums">
                    <Signed value={r.results.avg_return} />
                  </td>
                  <td className={`p-2 text-xs ${TONE[r.conclusion] ?? ""}`}>{r.conclusion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          These numbers are evidence for the research-level decision only. Your live trading rules
          are unchanged — nothing switches strategy on the strength of a verification.
        </p>
      </section>
    </div>
  );
}
