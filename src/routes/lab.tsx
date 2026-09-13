import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { LAB_RANGES, PnlChart } from "@/components/PnlChart";
import { ResearchDepartment } from "@/components/ResearchDepartment";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import {
  adjustRaceCash,
  fetchRace,
  openRaceTrade,
  runRaceNow,
  updateRaceSlot,
} from "@/lib/race.functions";
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
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const qc = useQueryClient();
  const race = useQuery({ queryKey: ["race"], queryFn: () => fetchRace() });
  const setSlotFn = useServerFn(updateRaceSlot);
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

  const d = race.data;
  const slots = (d?.entrants ?? []).filter((e) => !e.live);
  const live = (d?.entrants ?? []).find((e) => e.live) ?? null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Research Lab</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Three scoring formulas trade a simulated book beside the live strategy, on the same
            stake and the same market data, so the only difference is the formula. Nothing here can
            place a broker order, and none of this money touches the live ledger.
          </p>
        </div>
        <Button onClick={() => run.mutate()} disabled={run.isPending}>
          {run.isPending ? "Running…" : "Run test pass"}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Days testing"
          value={`${d?.days_running ?? 0}`}
          hint={`a verdict needs ${d?.min_days ?? 28} days`}
          tone="accent"
        />
        <StatTile
          label="Live strategy"
          value={live ? `${live.total_pnl >= 0 ? "+" : ""}${money(live.total_pnl)}` : "—"}
          hint={live ? `${live.trades} closed trade(s)` : "the control line"}
          tone={live && live.total_pnl >= 0 ? "positive" : "default"}
        />
        <StatTile
          label="Best paper formula"
          value={slots[0] ? slots[0].name : "—"}
          hint={
            slots.length
              ? `${slots.reduce((best, s) => (s.total_pnl > best.total_pnl ? s : best), slots[0]!).total_pnl >= 0 ? "+" : ""}${money(
                  slots.reduce((best, s) => (s.total_pnl > best.total_pnl ? s : best), slots[0]!)
                    .total_pnl,
                )} realised`
              : "no slots yet"
          }
        />
      </section>

      {d?.suggestion ? (
        <section className="rounded-md border border-primary/40 bg-primary/10 p-4">
          <p className="font-semibold text-primary">
            {d.suggestion.name} is ahead of the live strategy by {money(d.suggestion.edge)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            After {d.days_running} days on the same stake. Nothing switched automatically — turn it
            on yourself from the{" "}
            <Link to="/strategy" className="text-primary hover:underline">
              Strategy tab
            </Link>{" "}
            if you want it trading real money.
          </p>
        </section>
      ) : null}

      {race.isLoading ? <p className="text-sm text-muted-foreground">Loading the race…</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {slots.map((slot) => (
          <SlotCard
            key={slot.key}
            slot={slot}
            strategies={d?.strategies ?? []}
            onPick={async (strategyId) => {
              try {
                await setSlotFn({ data: { id: slot.slot_id!, strategy_id: strategyId } });
                toast.success("Slot switched — its counters and start date reset.");
                await qc.invalidateQueries({ queryKey: ["race"] });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not switch the slot.");
              }
            }}
            onToggle={async (enabled) => {
              try {
                await setSlotFn({ data: { id: slot.slot_id!, enabled } });
                await qc.invalidateQueries({ queryKey: ["race"] });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not update the slot.");
              }
            }}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Every simulated trade is written to the{" "}
        <Link to="/trade-history" className="text-primary hover:underline">
          Trade Log
        </Link>{" "}
        with its own strategy tag, alongside clearly labeled live activity.
      </p>

      <hr className="border-border/60" />

      <ResearchDepartment />
    </div>
  );
}

type Entrant = NonNullable<Awaited<ReturnType<typeof fetchRace>>>["entrants"][number];

function SlotCard({
  slot,
  strategies,
  onPick,
  onToggle,
}: {
  slot: Entrant;
  strategies: { id: string; name: string; description: string }[];
  onPick: (strategyId: string) => Promise<void>;
  onToggle: (enabled: boolean) => Promise<void>;
}) {
  const [openTools, setOpenTools] = useState(false);

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            Rank #{slot.rank}
          </p>
          <h2 className="text-lg font-bold leading-tight">{slot.name}</h2>
          <p className="text-xs text-muted-foreground">
            {money(slot.stake)} per stock · {slot.stocks_per_day} at a time
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(!slot.enabled)}
          className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
            slot.enabled
              ? "bg-primary/20 text-primary"
              : "border border-border text-muted-foreground"
          }`}
        >
          {slot.enabled ? "Testing" : "Paused"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-border p-2">
          <p className="text-[10px] uppercase text-muted-foreground">P&amp;L</p>
          <p
            className={`text-sm font-bold tabular-nums ${
              slot.total_pnl >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {slot.total_pnl >= 0 ? "+" : ""}
            {money(slot.total_pnl)}
          </p>
        </div>
        <div className="rounded border border-border p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Win rate</p>
          <p className="text-sm font-bold tabular-nums">
            {slot.win_rate === null ? "—" : `${slot.win_rate}%`}
          </p>
        </div>
        <div className="rounded border border-border p-2">
          <p className="text-[10px] uppercase text-muted-foreground">Cash</p>
          <p className="text-sm font-bold tabular-nums">{money(slot.cash.available)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Holding</p>
        {slot.holdings.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing held right now.</p>
        ) : (
          slot.holdings.map((h) => (
            <div key={h.ticker} className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">{h.ticker}</span>
              <span
                className={`tabular-nums ${h.pl >= 0 ? "text-success" : "text-destructive"}`}
              >
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
            Nothing meets this formula's score bar yet.
          </p>
        )}
      </div>

      <PnlChart
        rows={slot.closed}
        ranges={LAB_RANGES}
        initialRange="live"
        title="Profit"
        compact
        unrealized={slot.unrealized}
        unrealizedToday={slot.unrealized_today}
        basis={slot.basis}
      />

      <button
        type="button"
        onClick={() => setOpenTools((v) => !v)}
        className="text-xs text-primary hover:underline"
      >
        {openTools ? "Hide tools" : "Slot tools"}
      </button>

      {openTools ? (
        <div className="space-y-4 border-t border-border pt-3">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Formula being tested
            </span>
            <select
              value={slot.strategy_id ?? ""}
              onChange={(e) => void onPick(e.target.value)}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            >
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <SlotCashTools strategyId={slot.strategy_id!} stake={slot.stake} />
        </div>
      ) : null}
    </section>
  );
}

/** Deposit/withdraw test cash and open a simulated position by hand. */
function SlotCashTools({ strategyId, stake }: { strategyId: string; stake: number }) {
  const qc = useQueryClient();
  const cashFn = useServerFn(adjustRaceCash);
  const tradeFn = useServerFn(openRaceTrade);
  const [amount, setAmount] = useState("20");
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState("");
  const [dollars, setDollars] = useState(String(stake));

  async function adjust(sign: 1 | -1) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    try {
      await cashFn({
        data: {
          strategy_id: strategyId,
          amount: sign * value,
          note: sign > 0 ? "manual paper deposit" : "manual paper withdrawal",
        },
      });
      toast.success(`${sign > 0 ? "Added" : "Removed"} ${money(value)} of test cash.`);
      await qc.invalidateQueries({ queryKey: ["race"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not adjust the test cash.");
    }
  }

  async function open() {
    try {
      await tradeFn({
        data: {
          strategy_id: strategyId,
          ticker,
          entry_price: Number(price),
          dollars: Number(dollars),
        },
      });
      toast.success(`Opened a simulated ${ticker.toUpperCase()} position.`);
      setTicker("");
      setPrice("");
      await qc.invalidateQueries({ queryKey: ["race"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the paper trade.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Adjust test cash
        </span>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          />
          <Button size="sm" variant="secondary" onClick={() => void adjust(1)}>
            Deposit
          </Button>
          <Button size="sm" variant="outline" onClick={() => void adjust(-1)}>
            Withdraw
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
          Open a paper trade
        </span>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Ticker"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-1.5 text-sm uppercase"
          />
          <input
            placeholder="Price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          />
          <input
            placeholder="$"
            inputMode="decimal"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            className="w-20 rounded border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          />
          <Button size="sm" onClick={() => void open()} disabled={!ticker || !price}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
