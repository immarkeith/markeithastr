/**
 * Market data adapters. Server-only: reads MARKET_DATA_API_KEY.
 *
 * Two strategies:
 *  - "polygon": whole-market grouped daily bars — ONE request returns every
 *    US ticker's OHLCV for a given trading day. This is what makes a
 *    multi-thousand-ticker universe cheap.
 *  - "alpaca": batched multi-symbol bars over a date range (no whole-market
 *    endpoint), against a shortlist of active US equities.
 */

export type Provider = "polygon" | "alpaca";

export interface BarRow {
  ticker: string;
  bar_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function apiKey(): string {
  const key = process.env["MARKET_DATA_API_KEY"]?.trim();
  if (!key) throw new Error("MARKET_DATA_API_KEY is not configured.");
  return key;
}

/** Live (real-money) Alpaca credentials, kept strictly separate from paper. */
function alpacaLiveCreds(): { id: string; secret: string } | null {
  const id = process.env["ALPACA_LIVE_KEY_ID"]?.trim();
  const secret = process.env["ALPACA_LIVE_SECRET_KEY"]?.trim();
  return id && secret ? { id, secret } : null;
}

/** Paper (simulated) Alpaca credentials — never used for real orders. */
function alpacaPaperCreds(): { id: string; secret: string } | null {
  const id = process.env["ALPACA_PAPER_KEY_ID"]?.trim();
  const secret = process.env["ALPACA_PAPER_SECRET_KEY"]?.trim();
  return id && secret ? { id, secret } : null;
}


function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Most recent N weekdays, oldest first, ending on `endDate` (inclusive). */
export function recentWeekdays(count: number, endDate = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  while (out.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out.reverse();
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { headers });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Market data request failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Market data returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

const TICKER_OK = /^[A-Z]{1,5}$/;

// --------------------------------------------------------------- Polygon ----

/**
 * Whole-market daily bars for one date. Returns [] on non-trading days.
 * Cost: exactly one API request per trading day, regardless of universe size.
 */
export async function polygonGroupedDay(date: string): Promise<BarRow[]> {
  const url =
    `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}` +
    `?adjusted=true&apiKey=${encodeURIComponent(apiKey())}`;
  const json = await getJson(url);
  const results: any[] = Array.isArray(json?.results) ? json.results : [];
  const rows: BarRow[] = [];
  for (const r of results) {
    const ticker = String(r?.T ?? "").toUpperCase();
    if (!TICKER_OK.test(ticker)) continue;
    if ([r.o, r.h, r.l, r.c, r.v].some((v) => typeof v !== "number")) continue;
    rows.push({
      ticker,
      bar_date: date,
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    });
  }
  return rows;
}

// ---------------------------------------------------------------- Alpaca ----

const ALPACA_DATA = "https://data.alpaca.markets";

function alpacaHeaders(): Record<string, string> {
  // Alpaca market data accepts a single-token broker key via Authorization,
  // or key/secret pair. We support "KEY_ID:SECRET" in one secret value.
  const raw = apiKey();
  if (raw.includes(":")) {
    const [id, secret] = raw.split(":");
    return { "APCA-API-KEY-ID": id!.trim(), "APCA-API-SECRET-KEY": secret!.trim() };
  }
  return { Authorization: `Bearer ${raw}` };
}

/** Active, tradable US equities from Alpaca's assets list. */
export async function alpacaUniverse(limit: number): Promise<string[]> {
  const json = await getJson(
    "https://api.alpaca.markets/v2/assets?status=active&asset_class=us_equity",
    alpacaHeaders(),
  );
  const list: any[] = Array.isArray(json) ? json : [];
  return list
    .filter((a) => a?.tradable && a?.exchange !== "OTC" && TICKER_OK.test(String(a?.symbol ?? "")))
    .map((a) => String(a.symbol).toUpperCase())
    .slice(0, limit);
}

/** Daily bars for many symbols over a date range, batched + paginated. */
export async function alpacaBars(
  symbols: string[],
  start: string,
  end: string,
): Promise<BarRow[]> {
  const rows: BarRow[] = [];
  const chunkSize = 200;
  for (let i = 0; i < symbols.length; i += chunkSize) {
    const chunk = symbols.slice(i, i + chunkSize);
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        symbols: chunk.join(","),
        timeframe: "1Day",
        start,
        end,
        adjustment: "all",
        limit: "10000",
        feed: "iex",
      });
      if (pageToken) params.set("page_token", pageToken);
      const json = await getJson(`${ALPACA_DATA}/v2/stocks/bars?${params}`, alpacaHeaders());
      const bars = json?.bars ?? {};
      for (const [symbol, list] of Object.entries<any>(bars)) {
        if (!Array.isArray(list)) continue;
        for (const b of list) {
          if ([b?.o, b?.h, b?.l, b?.c, b?.v].some((v) => typeof v !== "number")) continue;
          rows.push({
            ticker: symbol.toUpperCase(),
            bar_date: String(b.t).slice(0, 10),
            open: b.o,
            high: b.h,
            low: b.l,
            close: b.c,
            volume: b.v,
          });
        }
      }
      pageToken = json?.next_page_token ?? undefined;
    } while (pageToken);
  }
  return rows;
}

/** Single-symbol daily bars — used for the market proxy on Polygon. */
export async function polygonSymbolBars(
  symbol: string,
  start: string,
  end: string,
): Promise<BarRow[]> {
  const url =
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${start}/${end}` +
    `?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(apiKey())}`;
  const json = await getJson(url);
  const results: any[] = Array.isArray(json?.results) ? json.results : [];
  return results
    .filter((r) => [r?.o, r?.h, r?.l, r?.c, r?.v].every((v) => typeof v === "number"))
    .map((r) => ({
      ticker: symbol.toUpperCase(),
      bar_date: isoDate(new Date(r.t)),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }));
}
