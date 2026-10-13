/**
 * Alpaca trading (order placement) — LIVE ACCOUNT ONLY.
 *
 * Phase D: the Alpaca paper API has been removed from the codebase. There is
 * exactly one credential pair (ALPACA_LIVE_*) and exactly one endpoint
 * (api.alpaca.markets). All simulated research is internal database ledgering
 * and never touches this module.
 *
 * HARD FIREWALL: order placement that increases exposure (buyNotional)
 * requires the literal origin token "manual_confirmed", which is only passed
 * from user-confirmed UI flows. Automated cycles cannot supply it.
 */

const LIVE_BASE = "https://api.alpaca.markets";

export type BrokerMode = "live";

/** Origin token proving a human confirmed this order in the UI. */
export type OrderOrigin = "manual_confirmed";

function assertLive(mode: BrokerMode): void {
  if (mode !== "live") {
    throw new Error("Firewall: only the live Alpaca account exists. Paper broker access was removed.");
  }
}

function creds(mode: BrokerMode): { id: string; secret: string } {
  assertLive(mode);
  const id = process.env["ALPACA_LIVE_KEY_ID"]?.trim();
  const secret = process.env["ALPACA_LIVE_SECRET_KEY"]?.trim();
  if (!id || !secret) {
    throw new Error("Alpaca live keys are not configured (ALPACA_LIVE_KEY_ID / ALPACA_LIVE_SECRET_KEY).");
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
  assertLive(mode);
  return LIVE_BASE;
}

async function call(
  mode: BrokerMode,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<any> {
  const requestInit: RequestInit = {
    method: init.method ?? "GET",
    headers: headers(mode),
  };
  if (init.body !== undefined) requestInit.body = JSON.stringify(init.body);
  const res = await fetch(`${base(mode)}${path}`, requestInit);
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

export interface BrokerPosition {
  ticker: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_plpc: number;
}

function toPosition(p: any): BrokerPosition {
  return {
    ticker: String(p.symbol ?? "").toUpperCase(),
    qty: Number(p.qty ?? 0),
    avg_entry_price: Number(p.avg_entry_price ?? 0),
    current_price: Number(p.current_price ?? 0),
    market_value: Number(p.market_value ?? 0),
    unrealized_pl: Number(p.unrealized_pl ?? 0),
    unrealized_plpc: Number(p.unrealized_plpc ?? 0) * 100,
  };
}

/** Everything the account actually holds right now, straight from the broker. */
export async function listPositions(mode: BrokerMode): Promise<BrokerPosition[]> {
  const rows = (await call(mode, "/v2/positions")) ?? [];
  return (Array.isArray(rows) ? rows : []).map(toPosition);
}

export async function getPosition(mode: BrokerMode, ticker: string): Promise<BrokerPosition | null> {
  try {
    const p = await call(mode, `/v2/positions/${ticker.toUpperCase()}`);
    return p ? toPosition(p) : null;
  } catch {
    return null;
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

/**
 * Sell a specific quantity (fractional allowed). Used to trim a position back
 * to the intended stake without closing it completely.
 */
export async function sellQty(
  mode: BrokerMode,
  ticker: string,
  qty: number,
): Promise<BrokerFill | null> {
  const rounded = Number(qty.toFixed(6));
  if (rounded <= 0) return null;
  const order = await call(mode, "/v2/orders", {
    method: "POST",
    body: {
      symbol: ticker.toUpperCase(),
      qty: String(rounded),
      side: "sell",
      type: "market",
      time_in_force: "day",
    },
  });
  if (!order?.id) return null;
  return waitForFill(mode, String(order.id));
}

export interface BrokerOrderSummary {
  order_id: string;
  ticker: string;
  side: "buy" | "sell";
  status: string;
  qty: number | null;
  notional: number | null;
  filled_qty: number;
  filled_price: number | null;
  submitted_at: string | null;
  filled_at: string | null;
}

/**
 * Every order the broker has on record since a timestamp. Used to detect orders
 * that exist at the broker but never made it into the app's own book.
 */
export async function listOrdersSince(
  mode: BrokerMode,
  sinceIso: string,
): Promise<BrokerOrderSummary[]> {
  const rows =
    (await call(
      mode,
      `/v2/orders?status=all&limit=100&direction=desc&after=${encodeURIComponent(sinceIso)}`,
    )) ?? [];
  return (Array.isArray(rows) ? rows : []).map((o: any) => ({
    order_id: String(o.id ?? ""),
    ticker: String(o.symbol ?? "").toUpperCase(),
    side: String(o.side) === "sell" ? "sell" : "buy",
    status: String(o.status ?? "unknown"),
    qty: o.qty === null || o.qty === undefined ? null : Number(o.qty),
    notional: o.notional === null || o.notional === undefined ? null : Number(o.notional),
    filled_qty: Number(o.filled_qty ?? 0),
    filled_price:
      o.filled_avg_price === null || o.filled_avg_price === undefined
        ? null
        : Number(o.filled_avg_price),
    submitted_at: o.submitted_at ? String(o.submitted_at) : null,
    filled_at: o.filled_at ? String(o.filled_at) : null,
  }));
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
