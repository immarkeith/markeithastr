/** Integer-cent accounting. Paper and live capital must never share a book. */
export interface AccountingTrade {
  strategy_id: string | null;
  mode: string;
  status: string;
  dollars: number;
  profit: number | null;
  status_note?: string | null;
}
export interface AccountingEntry {
  strategy_id: string | null;
  kind: string;
  amount: number;
}
export function cents(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Non-finite accounting amount");
  return Math.round(n * 100);
}
export const isHistoricalResearch = (trade: { status_note?: string | null }) =>
  trade.status_note === "historical rebuild";
export const isLiveTrade = (trade: { mode: string; strategy_id: string | null }) =>
  trade.mode === "live" && trade.strategy_id === null;

/** Full proceeds = returned principal + retained profit + unretained profit. */
export function saleCash(dollars: number, profit: number, kept: number) {
  const cost = cents(dollars);
  const pl = cents(profit);
  const saved = pl > 0 ? Math.min(pl, Math.max(0, cents(kept))) : 0;
  return { settle: (cost + pl - saved) / 100, reserve: saved / 100 };
}

export function reconcileBooks(entries: AccountingEntry[], trades: AccountingTrade[]) {
  const books = new Map<
    string,
    { flow: number; cash: number; realized: number; openCost: number }
  >();
  const get = (key: string) => {
    if (!books.has(key)) books.set(key, { flow: 0, cash: 0, realized: 0, openCost: 0 });
    return books.get(key)!;
  };
  const kinds = new Set([
    "deposit",
    "withdrawal",
    "adjust",
    "deploy",
    "settle",
    "reserve",
    "cancel",
  ]);
  for (const row of entries) {
    if (!kinds.has(row.kind)) throw new Error(`Unknown ledger kind: ${row.kind}`);
    const book = get(row.strategy_id ?? "live");
    const amount = cents(row.amount);
    book.cash += amount; // withdrawals are already negative; never subtract twice
    if (["deposit", "withdrawal", "adjust"].includes(row.kind)) book.flow += amount;
  }
  for (const trade of trades) {
    // Historical evaluations have no funded ledger and are not cash P&L.
    if (isHistoricalResearch(trade)) continue;
    if (!isLiveTrade(trade) && !(trade.mode === "paper" && trade.strategy_id)) continue;
    const book = get(trade.strategy_id ?? "live");
    if (trade.status === "closed") book.realized += cents(trade.profit ?? 0);
    if (trade.status === "open") book.openCost += cents(trade.dollars);
  }
  return [...books].map(([key, b]) => ({
    key,
    netFunding: b.flow / 100,
    realized: b.realized / 100,
    openCost: b.openCost / 100,
    cash: b.cash / 100, // settled + pending + reserves
    expected: (b.flow + b.realized) / 100,
    actual: (b.cash + b.openCost) / 100,
    difference: (b.cash + b.openCost - b.flow - b.realized) / 100,
  }));
}

/** Independently derive recorded trade profit from its executed prices/shares. */
export function reconstructedProfit(trade: {
  mode: string;
  dollars: number;
  entry_price: number;
  exit_price: number;
  filled_qty: number | null;
}) {
  const { entry_price: entry, exit_price: exit } = trade;
  const qty =
    trade.mode === "live" && trade.filled_qty !== null
      ? Number(trade.filled_qty)
      : Number(trade.dollars) / Number(entry);
  if (!(entry > 0) || !(exit > 0) || !(qty > 0)) throw new Error("Invalid recorded fill values");
  return cents(qty * (Number(exit) - Number(entry))) / 100;
}
