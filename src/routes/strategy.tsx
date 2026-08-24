import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LiveTradeTools } from "@/components/LiveTradeTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strategiesQuery } from "@/lib/queries";
import { removeStrategy, saveStrategy, toggleStrategy, useStrategy } from "@/lib/scan.functions";

export const Route = createFileRoute("/strategy")({
  head: () => ({
    meta: [
      { title: "Strategy — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Switch buy/sell strategies on and off, read what each one does, and save the current settings as a strategy you can come back to.",
      },
      { property: "og:title", content: "Strategy — ASTR Daily Rotation Desk" },
      {
        property: "og:description",
        content: "Turn strategies on or off and switch back to an older formula in one tap.",
      },
    ],
  }),
  component: StrategyPage,
});

const PARAM_LABELS: Record<string, string> = {
  weight_trend: "Trend",
  weight_momentum: "Momentum",
  weight_volume: "Volume",
  weight_relative_strength: "Rel. strength",
  weight_volatility_quality: "Vol. quality",
  min_score_to_trade: "Min score",
  num_day_trades: "Day trades",
  dollars_per_day_trade: "$ / day trade",
  swing_dollars: "$ / swing",
  swing_max_hold_days: "Max hold (d)",
  min_price: "Min price",
  min_avg_dollar_volume: "Min $ volume",
};

function StrategyPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(strategiesQuery);
  const activateFn = useServerFn(useStrategy);
  const toggleFn = useServerFn(toggleStrategy);
  const saveFn = useServerFn(saveStrategy);
  const deleteFn = useServerFn(removeStrategy);

  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", description: "" });

  const refresh = () => qc.invalidateQueries();

  const activate = useMutation({
    mutationFn: (id: string) => activateFn({ data: { id } }),
    onSuccess: async (res) => {
      await refresh();
      toast.success(`${res.name} is now running.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => toggleFn({ data: { enabled } }),
    onSuccess: async (res) => {
      await refresh();
      toast.success(
        res.enabled
          ? "Strategy running — new entries allowed again."
          : "Strategy paused — scoring and exits keep running, no new buys.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: draft }),
    onSuccess: async () => {
      setDraft({ name: "", description: "" });
      await refresh();
      toast.success("Saved the current settings as a strategy.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Strategy deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enabled = data?.strategy_enabled !== false;
  const activeId = data?.active_strategy_id ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Strategy</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One strategy runs at a time. Switching pauses the current formula and loads the numbers
          from the one you pick, so you can always go back to an older buy/sell approach.
        </p>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">
            Strategy is {enabled ? "running" : "paused"}
            <span
              className={`ml-2 inline-block size-2 rounded-full ${enabled ? "bg-success" : "bg-destructive"}`}
            />
          </p>
          <p className="text-xs text-muted-foreground">
            Paused still scores the market, sends alerts and closes existing positions — it just
            stops taking new entries.
          </p>
        </div>
        <Button
          variant={enabled ? "outline" : "default"}
          onClick={() => toggle.mutate(!enabled)}
          disabled={toggle.isPending}
        >
          {enabled ? "Turn off" : "Turn on"}
        </Button>
      </section>

      <section className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading strategies…</p> : null}
        {(data?.strategies ?? []).map((s) => {
          const isActive = s.id === activeId;
          return (
            <article
              key={s.id}
              className={`space-y-3 rounded-xl border p-4 transition-colors ${
                isActive ? "border-primary/60 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{s.name}</h2>
                  <button
                    type="button"
                    aria-label={`What does ${s.name} do?`}
                    onClick={() => setOpenInfo(openInfo === s.id ? null : s.id)}
                    className="inline-flex size-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    i
                  </button>
                  {isActive ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {enabled ? "active" : "active · paused"}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "default"}
                    onClick={() => activate.mutate(s.id)}
                    disabled={activate.isPending || (isActive && enabled)}
                  >
                    {isActive && enabled ? "Running" : "Start this"}
                  </Button>
                  {!s.builtin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove.mutate(s.id)}
                      disabled={remove.isPending || isActive}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              {openInfo === s.id ? (
                <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
                  {s.description || "No description saved for this strategy."}
                </p>
              ) : null}

              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {Object.entries(s.params ?? {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-secondary/40 px-2 py-1.5">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {PARAM_LABELS[key] ?? key}
                    </dt>
                    <dd className="tabular-nums font-semibold">{Number(value)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Save current settings as a strategy
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sname">Name</Label>
            <Input
              id="sname"
              value={draft.name}
              placeholder="My tweaked mix"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sdesc">What it does</Label>
            <Input
              id="sdesc"
              value={draft.description}
              placeholder="Heavier on momentum, tighter score bar"
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => save.mutate()}
          disabled={save.isPending || draft.name.trim().length < 2}
        >
          Save strategy
        </Button>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Money &amp; positions</h2>
          <p className="text-sm text-muted-foreground">
            The capital ladder, logging a trade you placed yourself, and moving cash in or out.
          </p>
        </div>
        <LiveTradeTools />
      </section>
    </div>
  );
}
