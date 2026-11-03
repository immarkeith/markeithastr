/**
 * Read-only inventory of research trades that may be carrying an invented exit
 * mark (closed, profit = 0, exit_price = entry_price).
 *
 * This script NEVER writes to the database. It classifies each candidate so a
 * reconciliation can be approved record by record instead of in bulk:
 *
 *   confirmed_contaminated   the exact-session bar exists and contradicts the
 *                            stored exit price (recoverable from that bar)
 *   recoverable_exact_session no cached bar, but an exact-session close was
 *                            fetched successfully (only with --probe)
 *   missing_historical_price  no authentic exact-session close is available
 *   same_session_round_trip   entry and exit on the same session, and the bar
 *                            confirms the price — a rebuild artifact, not proof
 *                            of a fabricated mark
 *   legitimate_breakeven      prices differ but the stake is too small for the
 *                            move to round above $0.00
 *   unpriced                  exit price already null
 *
 * Usage (inside the app container):
 *   bun scripts/inventory-research-marks.ts [--probe] [--json <path>]
 */
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

type Row = Record<string, unknown>;

interface Trade {
  id: string;
  ticker: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number | null;
  dollars: number;
  strategy_id: string | null;
  status_note: string | null;
}

interface Verdict {
  id: string;
  ticker: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  stored_exit: number | null;
  dollars: number;
  strategy_id: string | null;
  status_note: string | null;
  klass: string;
  authentic_mark: number | null;
  recovered_profit: number | null;
}

const PAGE = 1000;
const args = process.argv.slice(2);
const probe = args.includes("--probe");
const jsonIndex = args.indexOf("--json");
const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : null;

/** PostgREST caps a single response at 1000 rows: page explicitly. */
async function pageAll(
  build: (offset: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<Row[]> {
  const out: Row[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await build(offset);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function candidates(): Promise<Trade[]> {
  const rows = await pageAll((offset) =>
    supabaseAdmin
      .from("trades")
      .select(
        "id, ticker, entry_date, exit_date, entry_price, exit_price, dollars, strategy_id, status_note",
      )
      .eq("status", "closed")
      .eq("profit", 0)
      .not("exit_date", "is", null)
      .order("id")
      .range(offset, offset + PAGE - 1),
  );
  return rows.map((r) => ({
    id: String(r["id"]),
    ticker: String(r["ticker"]),
    entry_date: String(r["entry_date"]),
    exit_date: String(r["exit_date"]),
    entry_price: Number(r["entry_price"]),
    exit_price: r["exit_price"] === null ? null : Number(r["exit_price"]),
    dollars: Number(r["dollars"]),
    strategy_id: (r["strategy_id"] as string | null) ?? null,
    status_note: (r["status_note"] as string | null) ?? null,
  }));
}

/** Cached exact-session closes, keyed `TICKER|YYYY-MM-DD`. */
async function exactBars(tickers: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (let i = 0; i < tickers.length; i += 20) {
    const chunk = tickers.slice(i, i + 20);
    const rows = await pageAll((offset) =>
      supabaseAdmin
        .from("daily_bars")
        .select("ticker, bar_date, close")
        .in("ticker", chunk)
        .order("ticker")
        .order("bar_date")
        .range(offset, offset + PAGE - 1),
    );
    for (const row of rows) {
      map.set(`${String(row["ticker"])}|${String(row["bar_date"])}`, Number(row["close"]));
    }
  }
  return map;
}

function same(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-6;
}

async function main(): Promise<void> {
  const rows = await candidates();
  const equalPriced = rows.filter(
    (r) =>
      r.exit_price !== null && Number.isFinite(r.entry_price) && same(r.exit_price, r.entry_price),
  );
  const bars = await exactBars([...new Set(equalPriced.map((r) => r.ticker))]);
  const { researchMarketMark } = await import("../src/lib/research-market-mark.server");

  const verdicts: Verdict[] = [];
  for (const trade of rows) {
    const base: Verdict = {
      id: trade.id,
      ticker: trade.ticker,
      entry_date: trade.entry_date,
      exit_date: trade.exit_date,
      entry_price: trade.entry_price,
      stored_exit: trade.exit_price,
      dollars: trade.dollars,
      strategy_id: trade.strategy_id,
      status_note: trade.status_note,
      klass: "",
      authentic_mark: null,
      recovered_profit: null,
    };

    if (trade.exit_price === null) {
      verdicts.push({ ...base, klass: "unpriced" });
      continue;
    }
    if (!same(trade.exit_price, trade.entry_price)) {
      verdicts.push({ ...base, klass: "legitimate_breakeven" });
      continue;
    }

    const cached = bars.get(`${trade.ticker}|${trade.exit_date}`) ?? null;
    let mark = cached;
    if (mark === null && probe) {
      try {
        mark = await researchMarketMark(trade.ticker, trade.exit_date);
      } catch {
        mark = null;
      }
    }
    const profit =
      mark === null ? null : Number((trade.dollars * (mark / trade.entry_price - 1)).toFixed(2));

    if (mark === null) {
      verdicts.push({ ...base, klass: "missing_historical_price" });
    } else if (!same(mark, trade.entry_price)) {
      // Authentic close disagrees with what was booked: the mark was invented.
      verdicts.push({
        ...base,
        klass: "confirmed_contaminated",
        authentic_mark: mark,
        recovered_profit: profit,
      });
    } else if (trade.entry_date === trade.exit_date) {
      verdicts.push({
        ...base,
        klass: "same_session_round_trip",
        authentic_mark: mark,
        recovered_profit: profit,
      });
    } else if (cached === null) {
      verdicts.push({
        ...base,
        klass: "recoverable_exact_session",
        authentic_mark: mark,
        recovered_profit: profit,
      });
    } else {
      // A multi-session hold whose close genuinely landed on the entry price.
      verdicts.push({
        ...base,
        klass: "legitimate_breakeven",
        authentic_mark: mark,
        recovered_profit: profit,
      });
    }
  }

  const tally = new Map<string, number>();
  for (const v of verdicts) tally.set(v.klass, (tally.get(v.klass) ?? 0) + 1);

  console.log(
    `Research mark inventory — ${verdicts.length} closed $0 trades inspected (read-only)`,
  );
  console.log(`  equal entry/exit price: ${equalPriced.length}`);
  for (const [klass, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${klass.padEnd(26)} ${count}`);
  }
  const byMonth = new Map<string, number>();
  for (const v of verdicts) {
    if (v.klass === "confirmed_contaminated" || v.klass === "missing_historical_price") {
      const key = v.exit_date.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }
  }
  if (byMonth.size > 0) {
    console.log("  by month (contaminated + missing only):");
    for (const [month, count] of [...byMonth.entries()].sort())
      console.log(`    ${month}  ${count}`);
  }

  if (jsonPath) {
    await Bun.write(
      jsonPath,
      JSON.stringify({ generated_at: new Date().toISOString(), verdicts }, null, 1),
    );
    console.log(`  detail written to ${jsonPath}`);
  }
}

await main();
