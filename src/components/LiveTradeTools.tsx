import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/lib/scan.functions";

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

/**
 * Hands-on controls for the real book: the capital ladder, logging a trade you
 * placed yourself, closing an open one and moving cash in or out. Lives on the
 * Strategy tab so the everyday tabs stay read-only.
 */
export function LiveTradeTools() {
  const qc = useQueryClient();
  const trades = useQuery(tradesQuery);
  const ledger = useQuery(ledgerQuery);
  const openFn = useServerFn(createTrade);
  const closeFn = useServerFn(exitTrade);
  const fundsFn = useServerFn(recordFunds);
  const priceFn = useServerFn(getLatestPrice);
  const cancelFn = useServerFn(cancelOpenTrade);

  const [form, setForm] = useState({
    ticker: "",
    entry_price: "",
    dollars: "20",
    kind: "day",
    mode: "live",
  });
  const [deposit, setDeposit] = useState("");
  const [exits, setExits] = useState<Record<string, string>>({});
  const [priceLoading, setPriceLoading] = useState(false);

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
      toast.success("Trade logged.");
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

  const entries = (ledger.data ?? []).map((e) => ({
    amount: Number(e.amount),
    available_on: String(e.available_on),
  }));
  const cash = cashSummary(entries);
  const rows = ((trades.data ?? []) as unknown as TradeRow[]).filter(
    (t) => (t.mode ?? "paper") !== "paper",
  );
  const openRows = rows.filter((t) => t.status === "open");

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Cash available" value={money(cash.available)} tone="accent" hint="stake pool" />
        <StatTile label="Unsettled" value={money(cash.pending)} hint="clears next session" />
        <StatTile
          label="Saved profit"
          value={money(cash.saved)}
          tone={cash.saved >= 0 ? "positive" : "negative"}
          hint="banked, never reinvested"
        />
        <StatTile label="Open positions" value={`${openRows.length}`} />
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
                <option value="live">live (real cash)</option>
                <option value="paper">paper (simulated)</option>
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

      {openRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Close an open position
          </h2>
          <ul className="space-y-2">
            {openRows.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 text-sm"
              >
                <span className="font-semibold">{t.ticker}</span>
                <span className="text-xs uppercase text-muted-foreground">{t.kind}</span>
                <span className="tabular-nums text-muted-foreground">
                  in ${Number(t.entry_price).toFixed(2)} · {money(Number(t.dollars))}
                </span>
                <span className="ml-auto flex items-center gap-2">
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
                    onClick={() => close.mutate({ id: t.id, exit_price: Number(exits[t.id]) })}
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
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
