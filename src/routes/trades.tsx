import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { CapitalLadder } from "@/components/CapitalLadder";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cashSummary, ledgerQuery, money, tradesQuery } from "@/lib/queries";
import {
  cancelOpenTrade,
  createTrade,
  exitTrade,
  getLatestPrice,
  recordFunds,
  simulateNow,
} from "@/lib/scan.functions";

export const Route = createFileRoute("/trades")({
  head: () => ({
    meta: [
      { title: "Trades & cash — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content: "Log entries and exits, track kept profit and settled cash availability.",
      },
      { property: "og:title", content: "Trades & cash — ASTR Daily Rotation Desk" },
      { property: "og:description", content: "Trade log with settled-cash tracking and P&L." },
    ],
  }),
  component: TradesPage,
});

interface TradeRow {
  id: string;
  ticker: string;
  kind: string;
  mode?: string;
  status: string;
  entry_date: string;
  entry_price: number;
  dollars: number;
  exit_date: string | null;
  exit_price: number | null;
  profit: number | null;
}

function TradesPage() {
  const qc = useQueryClient();
  const trades = useQuery(tradesQuery);
  const ledger = useQuery(ledgerQuery);
  const openFn = useServerFn(createTrade);
  const closeFn = useServerFn(exitTrade);
  const fundsFn = useServerFn(recordFunds);

  const simFn = useServerFn(simulateNow);
  const priceFn = useServerFn(getLatestPrice);
  const cancelFn = useServerFn(cancelOpenTrade);
  const [form, setForm] = useState({
    ticker: "",
    entry_price: "",
    dollars: "25",
    kind: "day",
    mode: "paper",
  });
  const [deposit, setDeposit] = useState("");
  const [exits, setExits] = useState<Record<string, string>>({});

  const refresh = () => qc.invalidateQueries();

  const open = useMutation({
    mutationFn: () =>
      openFn({
        data: {
          ticker: form.ticker.trim().toUpperCase(),
          kind: form.kind === "swing" ? "swing" : "day",
          entry_price: Number(form.entry_price),
          dollars: Number(form.dollars),
          mode: form.mode === "live" ? "live" : "paper",
        },
      }),
    onSuccess: async () => {
      setForm({ ...form, ticker: "", entry_price: "" });
      await refresh();
      toast.success("Trade opened.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: (input: { id: string; exit_price: number }) => closeFn({ data: input }),
    onSuccess: async (res) => {
      await refresh();
      if (!res.closed) toast.warning(res.note);
      else toast.success(`Closed — P&L ${money(res.profit)}, kept ${money(res.kept)}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: async (res) => {
      await refresh();
      toast.success(`${res.ticker} cancelled — nothing was traded.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [priceLoading, setPriceLoading] = useState(false);

  async function fillLatestPrice() {
    const ticker = form.ticker.trim().toUpperCase();
    if (!ticker) return;
    setPriceLoading(true);
    try {
      const res = await priceFn({ data: { ticker } });
      if (res.close === null) {
        toast.info(`No cached price for ${ticker} yet — type the price you paid.`);
      } else {
        setForm((f) => ({ ...f, ticker, entry_price: res.close!.toFixed(2) }));
        toast.success(`${ticker} last recorded close $${res.close.toFixed(2)} (${res.bar_date}).`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fetch the price.");
    } finally {
      setPriceLoading(false);
    }
  }

  const funds = useMutation({
    mutationFn: (sign: number) =>
      fundsFn({
        data: {
          amount: sign * Math.abs(Number(deposit)),
          note: sign < 0 ? "manual withdrawal" : "manual deposit",
        },
      }),
    onSuccess: async () => {
      setDeposit("");
      await refresh();
      toast.success("Cash adjusted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const entries = (ledger.data ?? []).map((e) => ({
    amount: Number(e.amount),
    available_on: String(e.available_on),
  }));
  const cash = cashSummary(entries);
  const all = (trades.data ?? []) as unknown as TradeRow[];
  const rows = all.filter((t) => (t.mode ?? "paper") !== "paper");
  const paper = all.filter((t) => (t.mode ?? "paper") === "paper");
  const closed = rows.filter((t) => t.status === "closed");
  const realised = closed.reduce((sum, t) => sum + Number(t.profit ?? 0), 0);
  const paperClosed = paper.filter((t) => t.status === "closed");
  const paperPnl = paperClosed.reduce((sum, t) => sum + Number(t.profit ?? 0), 0);
  const paperWins = paperClosed.filter((t) => Number(t.profit ?? 0) > 0).length;

  const sim = useMutation({
    mutationFn: () => simFn({}),
    onSuccess: async (res) => {
      await refresh();
      toast.success(
        `Simulation updated — ${res.opened.length} entries, ${res.closed.length} exits.`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Trades &amp; cash</h1>
        <Link to="/analyze" className="text-sm text-primary underline-offset-4 hover:underline">
          Analyze a stock →
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Cash available" value={money(cash.available)} tone="accent" hint="stake pool" />
        <StatTile label="Unsettled" value={money(cash.pending)} hint="clears after settlement" />
        <StatTile
          label="Saved profit"
          value={money(cash.saved)}
          tone={cash.saved >= 0 ? "positive" : "negative"}
          hint="banked, never reinvested"
        />
        <StatTile
          label="Realised P&L"
          value={money(realised)}
          tone={realised >= 0 ? "positive" : "negative"}
        />
        <StatTile label="Open positions" value={`${rows.filter((t) => t.status === "open").length}`} />
      </section>

      <CapitalLadder />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 rounded-md border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Open a trade</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                onBlur={() => {
                  if (form.ticker && !form.entry_price) void fillLatestPrice();
                }}
                placeholder="AAPL"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="entry">Entry price</Label>
              <div className="flex gap-2">
                <Input
                  id="entry"
                  inputMode="decimal"
                  placeholder="auto"
                  value={form.entry_price}
                  onChange={(e) => setForm({ ...form, entry_price: e.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={!form.ticker || priceLoading}
                  onClick={() => void fillLatestPrice()}
                >
                  {priceLoading ? "…" : "Last"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                "Last" fills the most recent recorded close — overwrite it with the price you
                actually paid.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dollars">Dollars</Label>
              <Input
                id="dollars"
                inputMode="decimal"
                value={form.dollars}
                onChange={(e) => setForm({ ...form, dollars: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="paper">paper (simulated)</option>
                <option value="live">live (real cash)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="day">day</option>
                <option value="swing">swing</option>
              </select>
            </div>
          </div>
          <Button
            onClick={() => open.mutate()}
            disabled={open.isPending || !form.ticker || !form.entry_price}
          >
            Open trade
          </Button>
        </div>

        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Adjust cash</h2>
          <Input
            inputMode="decimal"
            value={deposit}
            placeholder="50"
            onChange={(e) => setDeposit(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          <p className="text-[11px] text-muted-foreground">
            Enter a positive amount, then choose deposit or withdraw.
          </p>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => funds.mutate(1)}
              disabled={!Number(deposit) || funds.isPending}
            >
              Deposit
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => funds.mutate(-1)}
              disabled={!Number(deposit) || funds.isPending}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-md border border-primary/40 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Simulated (paper) book
          </h2>
          <Button size="sm" variant="secondary" onClick={() => sim.mutate()} disabled={sim.isPending}>
            {sim.isPending ? "Simulating…" : "Apply rules now"}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Paper P&L"
            value={money(paperPnl)}
            tone={paperPnl >= 0 ? "positive" : "negative"}
            hint={`${paperClosed.length} closed`}
          />
          <StatTile
            label="Win rate"
            value={paperClosed.length ? `${Math.round((paperWins / paperClosed.length) * 100)}%` : "—"}
            hint="simulated only"
          />
          <StatTile
            label="Open simulations"
            value={`${paper.filter((t) => t.status === "open").length}`}
            hint="no orders sent"
          />
        </div>
        {paper.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Run today's cycle on the Scan page to start the simulated book.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {paper.slice(0, 12).map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 tabular-nums">
                <span className="font-semibold">{t.ticker}</span>
                <span className="text-xs uppercase text-muted-foreground">{t.kind}</span>
                <span className="text-muted-foreground">
                  in ${Number(t.entry_price).toFixed(2)} {t.entry_date}
                </span>
                {t.status === "closed" ? (
                  <>
                    <span className="text-muted-foreground">
                      out ${Number(t.exit_price).toFixed(2)} {t.exit_date}
                    </span>
                    <span
                      className={
                        Number(t.profit ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }
                    >
                      {money(Number(t.profit ?? 0))}
                    </span>
                  </>
                ) : t.status === "cancelled" ? (
                  <span className="text-muted-foreground">cancelled</span>
                ) : (
                  <>
                    <span className="text-primary">open</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(t.id)}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Live trade log
        </h2>
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No live trades logged yet — the simulated book above is running instead.
          </p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Ticker</th>
                  <th className="px-3 py-2 text-left">Kind</th>
                  <th className="px-3 py-2 text-right">Entry</th>
                  <th className="px-3 py-2 text-right">Size</th>
                  <th className="px-3 py-2 text-right">Exit</th>
                  <th className="px-3 py-2 text-right">P&amp;L</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{t.ticker}</td>
                    <td className="px-3 py-2 text-muted-foreground">{t.kind}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${Number(t.entry_price).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(Number(t.dollars))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {t.exit_price === null ? "—" : `$${Number(t.exit_price).toFixed(2)}`}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        Number(t.profit ?? 0) >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {t.profit === null ? "—" : money(Number(t.profit))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {t.status === "open" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            className="h-8 w-24"
                            placeholder="exit"
                            inputMode="decimal"
                            value={exits[t.id] ?? ""}
                            onChange={(e) => setExits({ ...exits, [t.id]: e.target.value })}
                          />
                          <Button
                            size="sm"
                            disabled={!exits[t.id] || close.isPending}
                            onClick={() =>
                              close.mutate({ id: t.id, exit_price: Number(exits[t.id]) })
                            }
                          >
                            Close
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cancel.isPending}
                            onClick={() => cancel.mutate(t.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {t.status} {t.exit_date}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
