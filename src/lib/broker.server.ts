/**
 * Alpaca trading (order placement).
 *
 * Strictly separated from market data. Live orders use the real-money keys and
 * the live endpoint; simulated orders use the paper keys and the paper
 * endpoint. There is no fallback between the two — a missing key is an error,
 * never a silent switch to the other account.
 */

const LIVE_BASE = "https://api.alpaca.markets";
const PAPER_BASE = "https://paper-api.alpaca.markets";

export type BrokerMode = "live" | "paper";

function creds(mode: BrokerMode): { id: string; secret: string } {
  const prefix = mode === "live" ? "ALPACA_LIVE" : "ALPACA_PAPER";
  const id = process.env[`${prefix}_KEY_ID`]?.trim();
  const secret = process.env[`${prefix}_SECRET_KEY`]?.trim();
  if (!id || !secret) {
    throw new Error(
      `Alpaca ${mode} keys are not configured (${prefix}_KEY_ID / ${prefix}_SECRET_KEY).`,
    );
  }
  return { id, secret };
}

function headers(mode: BrokerMode): Record<string, string> {
  const c = creds(mode);
  return {
    "APCA-API-KEY-ID": c.id,
    "APCA-API-SECRET-KEY": c.secret,
    "Content-Type": "application/json",
  };
}

function base(mode: BrokerMode): string {
  return mode === "live" ? LIVE_BASE : PAPER_BASE;
}

async function call(
  mode: BrokerMode,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<any> {
  const res = await fetch(`${base(mode)}${path}`, {
    method: init.method ?? "GET",
    headers: headers(mode),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Alpaca ${mode} ${path} failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Alpaca ${mode} returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export interface BrokerAccount {
  mode: BrokerMode;
  status: string;
  cash: number;
  buying_power: number;
  equity: number;
  currency: string;
  trading_blocked: boolean;
  fractional: boolean;
}

export async function brokerAccount(mode: BrokerMode): Promise<BrokerAccount> {
  const a = await call(mode, "/v2/account");
  return {
    mode,
    status: String(a.status ?? "unknown"),
    cash: Number(a.cash ?? 0),
    buying_power: Number(a.buying_power ?? 0),
    equity: Number(a.equity ?? 0),
    currency: String(a.currency ?? "USD"),
    trading_blocked: Boolean(a.trading_blocked),
    fractional: String(a.account_number ?? "") !== "" && a.options_trading_level !== undefined,
  };
}

export interface BrokerFill {
  order_id: string;
  ticker: string;
  side: "buy" | "sell";
  status: string;
  filled_qty: number;
  filled_price: number | null;
  notional: number | null;
}

async function waitForFill(mode: BrokerMode, orderId: string): Promise<BrokerFill> {
  let last: any = null;
  // Market orders normally fill within a second; give it a short window.
  for (let attempt = 0; attempt < 10; attempt += 1) {
    last = await call(mode, `/v2/orders/${orderId}`);
    if (["filled", "canceled", "rejected", "expired"].includes(String(last.status))) break;
    await new Promise((r) => setTimeout(r, 700));
  }
  const filledQty = Number(last?.filled_qty ?? 0);
  const avg = last?.filled_avg_price === null || last?.filled_avg_price === undefined
    ? null
    : Number(last.filled_avg_price);
  return {
    order_id: String(last?.id ?? orderId),
    ticker: String(last?.symbol ?? ""),
    side: String(last?.side) === "sell" ? "sell" : "buy",
    status: String(last?.status ?? "unknown"),
    filled_qty: filledQty,
    filled_price: avg,
    notional: last?.notional === null || last?.notional === undefined ? null : Number(last.notional),
  };
}

/** Buy a dollar amount of a symbol at market (fractional shares). */
export async function buyNotional(
  mode: BrokerMode,
  ticker: string,
  dollars: number,
): Promise<BrokerFill> {
  const order = await call(mode, "/v2/orders", {
    method: "POST",
    body: {
      symbol: ticker.toUpperCase(),
      notional: Number(dollars.toFixed(2)),
      side: "buy",
      type: "market",
      time_in_force: "day",
    },
  });
  return waitForFill(mode, String(order.id));
}

export async function positionQty(mode: BrokerMode, ticker: string): Promise<number> {
  try {
    const p = await call(mode, `/v2/positions/${ticker.toUpperCase()}`);
    return Number(p?.qty ?? 0);
  } catch {
    return 0;
  }
}

/** Sell the entire position in a symbol at market. */
export async function sellPosition(mode: BrokerMode, ticker: string): Promise<BrokerFill | null> {
  const qty = await positionQty(mode, ticker);
  if (!qty) return null;
  const order = await call(mode, `/v2/positions/${ticker.toUpperCase()}?percentage=100`, {
    method: "DELETE",
  });
  if (!order?.id) return null;
  return waitForFill(mode, String(order.id));
}

/** Cancel any still-open orders for a symbol (used when a plan is abandoned). */
export async function cancelOpenOrders(mode: BrokerMode, ticker: string): Promise<number> {
  const open = (await call(mode, "/v2/orders?status=open")) ?? [];
  const mine = (Array.isArray(open) ? open : []).filter(
    (o: any) => String(o.symbol).toUpperCase() === ticker.toUpperCase(),
  );
  for (const o of mine) {
    try {
      await call(mode, `/v2/orders/${o.id}`, { method: "DELETE" });
    } catch {
      // already gone
    }
  }
  return mine.length;
}
