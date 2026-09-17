/**
 * The paper strategy race.
 *
 * Three saved strategies trade a simulated book side by side with the one live
 * strategy, using the SAME cached daily bars the live scan already downloaded —
 * so the race costs no extra market-data requests and sends no broker orders.
 *
 * Isolation rule: every simulated trade and every simulated cash entry carries
 * a `strategy_id`. Live rows always have `strategy_id = null`. Nothing in this
 * module ever touches a null-strategy row, and nothing in the live path counts a
 * non-null one. That is what keeps real money and test money apart.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { evaluateLadder, STANDARD_DOLLARS, type LadderState } from "./capital.server";
import {
  isTradingDay,
  marketStatus,
  nextTradingDay,
  nyParts,
  sessionCloseMinutes,
} from "./market-calendar";

import { HISTORY_DAYS, loadSettings, scoreConfig, volumeShare, type Settings } from "./scan.server";
import { scoreSecurity, type Bar, type ScoreConfig } from "./scoring";

export interface RaceSlot {
  id: number;
  /** Which researcher owns this paper book: "lead" or one of the six lanes. */
  lane: string | null;
  strategy_id: string;
  name: string;
  description: string;
  params: Record<string, number>;
  enabled: boolean;
  stocks_per_day: number;
  position_dollars: number;
  stable_days: number;
  breach_days: number;
  last_evaluated_date: string | null;
  started_on: string;
}

export interface RankRow {
  ticker: string;
  rank: number;
  score: number;
  close: number;
  sma20: number | null;
  tradeable: boolean;
  invalidation: string;
}

/** The Lead Researcher plus the six rotating researchers. */
const MAX_SLOTS = 7;
/** A researcher never runs more than one stock at a time. */
const STOCKS_PER_RESEARCHER = 1;
/** How many of the six researchers open a new position on a market day. */
const ROTATION_PER_DAY = 2;
/** A month of sessions before the race is allowed to suggest a switch. */
export const RACE_MIN_DAYS = 28;
/**
 * How long a research paper position is held, counted in TRADING days with the
 * entry day as day 1. Paper research only — the live strategy still exits the
 * same session it entered.
 */
export const HOLD_TRADING_DAYS = 3;


/** Today's New York trading date — the calendar the market actually keeps. */
function today(): string {
  return nyParts().date;
}

/**
 * Settlement date for a sale made on `from`, counted in TRADING days.
 * Weekends and market holidays are not settlement days, so T+1 on a Friday
 * lands on Monday (or the next open session after a holiday).
 */
export function settlementDate(from: string, days: number): string {
  let cursor = from;
  for (let i = 0; i < Math.max(0, Math.round(days)); i++) cursor = nextTradingDay(cursor);
  return cursor;
}



// ------------------------------------------------------------------ slots ----

export async function loadSlots(): Promise<RaceSlot[]> {
  const { data, error } = await supabaseAdmin
    .from("paper_slots" as never)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const ids = rows.map((r) => String(r['strategy_id'] ?? "")).filter(Boolean);
  const { data: strategies } = ids.length
    ? await supabaseAdmin.from("strategies").select("id, name, description, params").in("id", ids)
    : { data: [] as unknown[] };
  const byId = new Map(
    ((strategies ?? []) as unknown as Record<string, unknown>[]).map((s) => [String(s['id']), s]),
  );
  return rows
    // Only the researchers' own books count: one for the Lead Researcher and
    // one for each of the six lanes. Retired prototype books stay in the data
    // for their history but are no longer traded or displayed.
    .filter((r) => r['strategy_id'] && r['lane'])
    .map((r) => {
      const strategy = byId.get(String(r['strategy_id'])) ?? {};
      return {
        id: Number(r['id']),
        lane: (r['lane'] as string | null) ?? null,
        strategy_id: String(r['strategy_id']),
        name: String(strategy['name'] ?? "Unnamed strategy"),
        description: String(strategy['description'] ?? ""),
        params: (strategy['params'] ?? {}) as Record<string, number>,
        enabled: r['enabled'] !== false,
        // Hard cap: a researcher can only ever hold one stock at a time.
        stocks_per_day: STOCKS_PER_RESEARCHER,
        position_dollars: Number(r['position_dollars'] ?? STANDARD_DOLLARS),
        stable_days: Number(r['stable_days'] ?? 0),
        breach_days: Number(r['breach_days'] ?? 0),
        last_evaluated_date: (r['last_evaluated_date'] as string | null) ?? null,
        started_on: String(r['started_on'] ?? today()),
      } satisfies RaceSlot;
    })
    .slice(0, MAX_SLOTS);
}

/** Point a slot at a different strategy, or turn it off. */
export async function setSlot(input: {
  id: number;
  strategy_id?: string | undefined;
  enabled?: boolean | undefined;
}): Promise<{ ok: true }> {
  const patch: Record<string, unknown> = {};
  if (input.strategy_id) {
    patch['strategy_id'] = input.strategy_id;
    // A different formula is a different experiment: counters and the start
    // date reset so the 4-week clock is honest.
    patch['stable_days'] = 0;
    patch['breach_days'] = 0;
    patch['last_evaluated_date'] = null;
    patch['started_on'] = today();
  }
  if (typeof input.enabled === "boolean") patch['enabled'] = input.enabled;
  if (Object.keys(patch).length === 0) return { ok: true };
  const { error } = await supabaseAdmin
    .from("paper_slots" as never)
    .update(patch as never)
    .eq("id", input.id);
  if (error) throw new Error(error.message);

  // Make sure a newly chosen strategy has starting cash of its own.
  if (input.strategy_id) await ensureSeedCash(input.strategy_id);
  return { ok: true };
}

async function ensureSeedCash(strategyId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("ledger_entries")
    .select("id")
    .eq("strategy_id", strategyId)
    .limit(1);
  if ((data ?? []).length > 0) return;
  await supabaseAdmin.from("ledger_entries").insert({
    kind: "deposit",
    amount: 50,
    note: "Paper test starting cash",
    strategy_id: strategyId,
  });
}

/** Deposit or withdraw test cash for one slot. */
export async function adjustSlotCash(
  strategyId: string,
  amount: number,
  note: string,
): Promise<{ ok: true }> {
  const { error } = await supabaseAdmin.from("ledger_entries").insert({
    kind: amount >= 0 ? "deposit" : "withdrawal",
    amount,
    note: note || "manual paper adjustment",
    strategy_id: strategyId,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

// ------------------------------------------------------------- ranking -------

type RawBars = [string, number, number, number, number, number][];

function toBars(raw: RawBars): Bar[] {
  return raw.map(([date, open, high, low, close, volume]) => ({
    date,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}

async function marketRoc5(proxy: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("daily_bars")
    .select("close")
    .eq("ticker", proxy.toUpperCase())
    .order("bar_date", { ascending: false })
    .limit(10);
  const closes = (data ?? []).map((r) => Number(r.close));
  const last = closes[0];
  const prior = closes[5];
  if (last === undefined || !prior) return 0;
  return ((last - prior) / prior) * 100;
}

/** Merge a strategy's saved numbers over the live settings (live is untouched). */
export function settingsFor(base: Settings, params: Record<string, number>): Settings {
  return { ...base, ...params } as Settings;
}

/**
 * Score the cached universe once per requested config. The bars are read from
 * the database a single time and re-scored in memory, so N strategies cost one
 * database pass, not N.
 */
export async function rankUniverse(
  configs: { key: string; config: ScoreConfig; minScore: number }[],
): Promise<Map<string, RankRow[]>> {
  const out = new Map<string, { ticker: string; result: NonNullable<ReturnType<typeof scoreSecurity>> }[]>();
  for (const c of configs) out.set(c.key, []);
  const settings = await loadSettings();
  const roc5 = await marketRoc5(settings.market_proxy);

  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin.rpc("scan_input", {
      p_days: HISTORY_DAYS,
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) throw new Error(error.message);
    const page = (data ?? []) as { ticker: string; bars: RawBars }[];
    if (page.length === 0) break;
    for (const row of page) {
      const bars = toBars(row.bars);
      for (const c of configs) {
        const result = scoreSecurity(bars, roc5, c.config);
        if (result) out.get(c.key)!.push({ ticker: row.ticker, result });
      }
    }
    if (page.length < pageSize) break;
  }

  const ranked = new Map<string, RankRow[]>();
  for (const c of configs) {
    const list = out.get(c.key)!;
    list.sort((a, b) => b.result.score - a.result.score);
    ranked.set(
      c.key,
      list.slice(0, 60).map((entry, i) => ({
        ticker: entry.ticker,
        rank: i + 1,
        score: Number(entry.result.score.toFixed(2)),
        close: entry.result.close,
        sma20: entry.result.sma20,
        tradeable: entry.result.score >= c.minScore,
        invalidation: entry.result.invalidation,
      })),
    );
  }
  return ranked;
}

/**
 * Ranking for every research book, keyed by slot id.
 *
 * Each book is ranked by ITS OWN researcher formula — the six lanes with their
 * own factor weights and entry filters, the Lead Researcher with the Master
 * Formula. Two researchers landing on the same ticker is agreement, not a
 * shared calculation.
 */
export async function rankSlots(slots: RaceSlot[]): Promise<Map<number, RankRow[]>> {
  const out = new Map<number, RankRow[]>();
  if (slots.length === 0) return out;
  const { researchBoards } = await import("./research-boards.server");
  const { boards } = await researchBoards();
  for (const slot of slots) {
    out.set(slot.id, slot.lane ? (boards.get(slot.lane) ?? []) : []);
  }
  return out;
}

/**
 * Which researchers may open a new position today. The Lead Researcher always
 * may; of the six others only the two who have waited longest since their last
 * paper entry take a turn, so all six get regular turns and nobody doubles up.
 * A researcher already holding a stock is never eligible.
 */
async function rotationToday(slots: RaceSlot[]): Promise<Set<string>> {
  const waiting: { lane: string; last: string }[] = [];
  for (const slot of slots) {
    if (!slot.lane || slot.lane === "lead" || !slot.enabled) continue;
    const open = await slotOpenTrades(slot.strategy_id);
    if (open.length > 0) continue;
    const { data } = await supabaseAdmin
      .from("trades")
      .select("entry_date")
      .eq("strategy_id", slot.strategy_id)
      .order("entry_date", { ascending: false })
      .limit(1);
    waiting.push({ lane: slot.lane, last: String(data?.[0]?.entry_date ?? "") });
  }
  waiting.sort((a, b) => (a.last === b.last ? a.lane.localeCompare(b.lane) : a.last < b.last ? -1 : 1));
  return new Set(waiting.slice(0, ROTATION_PER_DAY).map((w) => w.lane));
}

// ------------------------------------------------------- slot cash + book ----

interface LedgerRow {
  amount: number;
  available_on: string;
  kind: string;
}

async function slotLedger(strategyId: string): Promise<LedgerRow[]> {
  const { data, error } = await supabaseAdmin
    .from("ledger_entries")
    .select("amount, available_on, kind")
    .eq("strategy_id", strategyId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    amount: Number(r.amount),
    available_on: String(r.available_on),
    kind: String(r.kind),
  }));
}

/**
 * Keep a research slot funded. Paper money is a measuring stick, not a real
 * account: if a slot cannot cover today's planned positions (drawdown, saved
 * paper profit, cash still "settling"), release the saved profit first and then
 * add whatever is still missing. Recorded as a deposit so return percentages
 * still divide by all the test money the slot has been given.
 */
async function ensureTestCash(slot: RaceSlot, needed: number): Promise<void> {
  if (needed <= 0) return;
  const rows = await slotLedger(slot.strategy_id);
  const cash = cashOf(rows);
  if (cash.available >= needed) return;

  // Saved paper profit goes back to work before any new test money.
  if (cash.saved > 0.01) {
    await supabaseAdmin.from("ledger_entries").insert({
      strategy_id: slot.strategy_id,
      kind: "deposit",
      amount: Number(cash.saved.toFixed(2)),
      available_on: today(),
      note: "Released saved paper profit back into the test",
    });
    await supabaseAdmin.from("ledger_entries").insert({
      strategy_id: slot.strategy_id,
      kind: "reserve",
      amount: Number((-cash.saved).toFixed(2)),
      available_on: today(),
      note: "Released saved paper profit back into the test",
    });
  }

  const shortfall = Number((needed - cash.available - Math.max(0, cash.saved)).toFixed(2));
  if (shortfall > 0.01) {
    await supabaseAdmin.from("ledger_entries").insert({
      strategy_id: slot.strategy_id,
      kind: "deposit",
      amount: shortfall,
      available_on: today(),
      note: "Auto top-up — simulated research capital (never real money)",
    });
  }
}


export function cashOf(rows: LedgerRow[]): {
  available: number;
  pending: number;
  saved: number;
  capital: number;
} {
  const day = today();
  let available = 0;
  let pending = 0;
  let saved = 0;
  for (const row of rows) {
    if (row.kind === "reserve") {
      saved += row.amount;
      continue;
    }
    if (row.available_on <= day) available += row.amount;
    else pending += row.amount;
  }
  return {
    available: Number(available.toFixed(2)),
    pending: Number(pending.toFixed(2)),
    saved: Number(saved.toFixed(2)),
    capital: Number((available + pending + saved).toFixed(2)),
  };
}

async function slotOpenTrades(strategyId: string) {
  const { data, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("strategy_id", strategyId)
    .eq("status", "open");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function latestCloses(tickers: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (tickers.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker, bar_date, close")
    .in("ticker", tickers)
    .order("bar_date", { ascending: true });
  for (const row of data ?? []) map.set(String(row.ticker), Number(row.close));
  return map;
}

async function openSlotTrade(
  slot: RaceSlot,
  ticker: string,
  price: number,
  dollars: number,
): Promise<void> {
  const day = today();
  const { data, error } = await supabaseAdmin
    .from("trades")
    .insert({
      ticker,
      kind: "day",
      entry_date: day,
      entry_at: new Date().toISOString(),
      entry_price: price,
      dollars,
      status: "open",
      mode: "paper",
      strategy_id: slot.strategy_id,
      // The 3-trading-day research hold: entry day counts as day 1, so the
      // exit lands two further trading days later (weekends/holidays skipped).
      hold_target_date: settlementDate(day, HOLD_TRADING_DAYS - 1),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("ledger_entries").insert({
    kind: "deploy",
    amount: -Math.abs(dollars),
    trade_id: data!.id,
    strategy_id: slot.strategy_id,
    note: `[${slot.name}] paper buy ${ticker} @ ${price.toFixed(2)}`,
  });
}

/** The trading day this paper position is due to be sold. */
function holdTarget(trade: Record<string, unknown>): string {
  const stored = trade['hold_target_date'];
  if (stored) return String(stored);
  return settlementDate(String(trade['entry_date'] ?? today()), HOLD_TRADING_DAYS - 1);
}

/**
 * Record what this paper position WOULD have made if it had been sold at the
 * normal same-day exit time. Nothing is sold and no cash moves — this is the
 * hypothetical short-term leg of the two-horizon comparison. Written once: the
 * update only matches a row that has no same-day figure yet.
 */
async function recordSameDay(
  trade: Record<string, unknown>,
  price: number,
): Promise<number | null> {
  const dollars = Number(trade['dollars']);
  const entryPrice = Number(trade['entry_price']);
  if (!entryPrice || !price) return null;
  const profit = dollars * (price / entryPrice - 1);
  const pct = (price / entryPrice - 1) * 100;
  const { data, error } = await supabaseAdmin
    .from("trades")
    .update({
      same_day_price: Number(price.toFixed(4)),
      same_day_profit: Number(profit.toFixed(2)),
      same_day_pct: Number(pct.toFixed(2)),
      same_day_at: new Date().toISOString(),
    })
    .eq("id", trade['id'] as string)
    .is("same_day_profit", null)
    .select("id");
  if (error) throw new Error(error.message);
  if ((data ?? []).length === 0) return null;
  return Number(profit.toFixed(2));
}


/**
 * Sell one simulated position. Idempotent: the update only matches a row that
 * is still `open`, so a retry or the safety close can never book a second sell,
 * duplicate P&L, or duplicate cash. Returns null when the row was already closed.
 */
async function closeSlotTrade(
  slot: RaceSlot,
  trade: Record<string, unknown>,
  price: number,
  why: string,
  settlementDays: number,
  keepPct: number,
): Promise<number | null> {
  const dollars = Number(trade['dollars']);
  const entry = Number(trade['entry_price']);
  const profit = dollars * (price / entry - 1);
  const kept = profit > 0 ? profit * keepPct : profit;

  const { data: claimed, error } = await supabaseAdmin
    .from("trades")
    .update({
      exit_date: today(),
      exit_at: new Date().toISOString(),
      exit_price: price,
      profit: Number(profit.toFixed(2)),
      kept: Number(kept.toFixed(2)),
      status: "closed",
      status_note: why,
    })
    .eq("id", trade['id'] as string)
    .eq("status", "open")
    .select("id");
  if (error) throw new Error(error.message);
  if ((claimed ?? []).length === 0) return null; // someone else already sold it


  // Cash settles on the trading calendar (T+1 skips weekends and holidays).
  // This affects when the money is spendable — never whether the stock closed.
  const availableOn = settlementDate(today(), settlementDays);

  const rows: Record<string, unknown>[] = [
    {
      kind: "settle",
      amount: Number((dollars + Math.min(profit, 0)).toFixed(2)),
      available_on: availableOn,
      trade_id: trade['id'],
      strategy_id: slot.strategy_id,
      note: `[${slot.name}] paper sell ${trade['ticker']} @ ${price.toFixed(2)} (P&L ${profit.toFixed(2)})`,
    },
  ];
  if (profit > 0) {
    rows.push({
      kind: "reserve",
      amount: Number(kept.toFixed(2)),
      available_on: availableOn,
      trade_id: trade['id'],
      strategy_id: slot.strategy_id,
      note: `[${slot.name}] saved profit`,
    });
    const rest = profit - kept;
    if (rest > 0.004) {
      rows.push({
        kind: "settle",
        amount: Number(rest.toFixed(2)),
        available_on: availableOn,
        trade_id: trade['id'],
        strategy_id: slot.strategy_id,
        note: `[${slot.name}] profit returned to the stake pool`,
      });
    }
  }
  await supabaseAdmin.from("ledger_entries").insert(rows as never);
  return Number(profit.toFixed(2));
}

// --------------------------------------------------------------- the pass ----

export interface RacePassResult {
  slots: {
    id: number;
    name: string;
    opened: { ticker: string; price: number }[];
    closed: { ticker: string; exit: number; profit: number; why: string }[];
    /** Hypothetical same-day results recorded without selling. */
    same_day: { ticker: string; price: number; profit: number }[];
    held: string[];
    skipped: string | null;
  }[];
}


/**
 * Run the simulated book for every enabled slot. `phase` mirrors the live
 * passes: "exit" before the close, "entry" after the open.
 *
 * Never throws into the live pass: each slot is isolated in its own try block.
 */
export async function runRacePass(
  options: { phase?: "entry" | "exit" | "both"; force?: boolean } = {},
): Promise<RacePassResult> {
  const phase = options.phase ?? "both";
  // The race owns its own calendar guard: it keeps testing and scoring alive
  // even when the live bot switch is off, but still skips closed sessions.
  if (!options.force) {
    const { marketStatus } = await import("./market-calendar");
    const status = marketStatus();
    if (!status.tradingDay) return { slots: [] };
  }
  const base = await loadSettings();
  const slots = (await loadSlots()).filter((s) => s.enabled);
  const result: RacePassResult = { slots: [] };
  if (slots.length === 0) return result;

  const rankings = await rankSlots(slots);
  const rotation = phase === "exit" ? new Set<string>() : await rotationToday(slots);
  const settlementDays = Number(base.settlement_days);
  const keepPct = Number(base.profit_keep_pct);

  for (const slot of slots) {
    const entry = {
      id: slot.id,
      name: slot.name,
      opened: [] as { ticker: string; price: number }[],
      closed: [] as { ticker: string; exit: number; profit: number; why: string }[],
      same_day: [] as { ticker: string; price: number; profit: number }[],
      held: [] as string[],
      skipped: null as string | null,
    };

    try {
      const ranked = rankings.get(slot.id) ?? [];
      const byTicker = new Map(ranked.map((r) => [r.ticker, r]));
      const open = await slotOpenTrades(slot.strategy_id);
      const closes = await latestCloses([
        ...open.map((t) => String(t.ticker)),
        ...ranked.slice(0, 10).map((r) => r.ticker),
      ]);

      // ---- exits (paper research only)
      // Two horizons from the SAME position: at the normal pre-close exit time
      // the hypothetical same-day result is recorded but nothing is sold, and
      // the position is carried until its 3rd trading day, when it is actually
      // sold in the paper book. Cash settlement (T+1) is handled separately in
      // closeSlotTrade and never decides whether a position stays open.
      if (phase !== "entry") {
        const marks = new Map(closes);
        try {
          const { alpacaLatestPrices } = await import("./market-data.server");
          const live = open.length
            ? await alpacaLatestPrices(open.map((t) => String(t.ticker)))
            : new Map<string, number>();
          for (const [ticker, price] of live) if (price) marks.set(ticker, price);
        } catch {
          // No live quote available: the latest cached close is the mark.
        }
        for (const trade of open) {
          if (String(trade.status) !== "open") continue; // already closed: no second sell
          const ticker = String(trade.ticker);
          const score = byTicker.get(ticker);
          const price = Number(marks.get(ticker) ?? score?.close ?? trade.entry_price ?? 0);
          if (!price) continue;
          const row = trade as unknown as Record<string, unknown>;

          // Short-term leg: what a normal same-day sale would have produced.
          if (row['same_day_profit'] === null || row['same_day_profit'] === undefined) {
            const hypothetical = await recordSameDay(row, price);
            if (hypothetical !== null) {
              entry.same_day.push({ ticker, price, profit: hypothetical });
            }
          }

          // 3-day leg: keep holding until the third trading day.
          const target = holdTarget(row);
          if (today() < target) {
            entry.held.push(ticker);
            continue;
          }

          const why = "paper 3-trading-day hold complete";
          const profit = await closeSlotTrade(
            slot,
            row,
            price,
            why,
            settlementDays,
            keepPct,
          );
          if (profit === null) continue; // already closed elsewhere
          entry.closed.push({ ticker, exit: price, profit, why });
        }



        // Scale this slot's own ladder once per trading day, after its exits.
        await applySlotLadder(slot);
      }

      // ---- entries
      const myTurn = slot.lane === "lead" || (slot.lane !== null && rotation.has(slot.lane));
      if (phase !== "exit" && myTurn) {
        const stillOpen = new Set(
          open
            .filter((t) => !entry.closed.some((c) => c.ticker === String(t.ticker)))
            .map((t) => String(t.ticker)),
        );
        // One stock at a time, always: if the researcher is still holding
        // something, it buys nothing until that position closes.
        const free = stillOpen.size > 0 ? 0 : STOCKS_PER_RESEARCHER;
        const stake = Number(slot.position_dollars);
        // Research capital is imaginary, so a shortfall must never stop the
        // testing. Top the slot up to whatever today's plan needs (saved paper
        // profit counts first) and record it as a deposit so the return figures
        // stay honest about how much test money was used.
        await ensureTestCash(slot, stake * Math.max(0, free));
        const cash = cashOf(await slotLedger(slot.strategy_id));
        let cashLeft = cash.available;
        const plan = ranked
          .filter((r) => r.tradeable && !stillOpen.has(r.ticker))
          .slice(0, free);
        if (plan.length === 0 && free > 0) entry.skipped = "nothing met this strategy's score bar";
        for (const row of plan) {
          if (cashLeft < stake) {
            entry.skipped = `waiting on test cash to clear ($${cashLeft.toFixed(2)} of $${stake.toFixed(2)})`;
            break;
          }

          const price = Number(closes.get(row.ticker) ?? row.close);
          if (!price) continue;
          await openSlotTrade(slot, row.ticker, price, stake);
          cashLeft = Number((cashLeft - stake).toFixed(2));
          entry.opened.push({ ticker: row.ticker, price });
        }
      } else if (phase !== "exit" && !myTurn) {
        entry.skipped = open.length > 0 ? "holding its current test position" : "not in today's rotation";
      }
    } catch (error) {
      entry.skipped = error instanceof Error ? error.message : "slot failed";
      console.error(`race slot ${slot.id} failed:`, entry.skipped);
    }
    result.slots.push(entry);
  }
  return result;
}

export interface SafetyCloseResult {
  closed: { slot: number; ticker: string; exit: number; profit: number; why: string }[];
  checked: number;
}

/**
 * Safety net for the research testers.
 *
 * A paper position is meant to live for 3 trading days, so this no longer
 * closes anything just because a session ended. It closes positions that are
 * PAST their hold target date (a missed or failed pre-close pass, a weekend or
 * holiday in between), and it back-fills a missing same-day figure so the
 * short-term leg of the comparison is never lost. Idempotent: it only touches
 * rows still marked `open`, and `closeSlotTrade` claims the row atomically.
 *
 * Note this closes the STOCK only. Sale proceeds keep following T+1 on the
 * trading calendar; unsettled cash is never a reason to hold a position open.
 */
export async function safetyCloseStalePaper(
  options: { force?: boolean } = {},
): Promise<SafetyCloseResult> {
  const day = today();
  const parts = nyParts();
  const sessionOver =
    !isTradingDay(day, parts.weekday) || parts.minutes >= sessionCloseMinutes(day);
  const base = await loadSettings();
  const settlementDays = Number(base.settlement_days);
  const keepPct = Number(base.profit_keep_pct);
  const out: SafetyCloseResult = { closed: [], checked: 0 };

  // Every slot, enabled or not: a disabled slot must not strand a position.
  for (const slot of await loadSlots()) {
    try {
      const open = await slotOpenTrades(slot.strategy_id);
      out.checked += open.length;
      const marks = await latestCloses(open.map((t) => String(t.ticker)));

      // Back-fill the hypothetical same-day result for anything that has moved
      // past its entry session without one recorded.
      for (const trade of open) {
        const row = trade as unknown as Record<string, unknown>;
        if (row['same_day_profit'] !== null && row['same_day_profit'] !== undefined) continue;
        const pastEntrySession = String(trade.entry_date) < day || sessionOver;
        if (!pastEntrySession && options.force !== true) continue;
        const price = Number(marks.get(String(trade.ticker)) ?? trade.entry_price ?? 0);
        if (price) await recordSameDay(row, price);
      }

      const stale = open.filter((t) => {
        const target = holdTarget(t as unknown as Record<string, unknown>);
        if (target < day) return true; // the 3-day hold ended on an earlier session
        if (target === day) return options.force === true || sessionOver;
        return false;
      });
      if (stale.length === 0) continue;
      for (const trade of stale) {
        const ticker = String(trade.ticker);
        const price = Number(marks.get(ticker) ?? trade.entry_price ?? 0);
        if (!price) continue;
        const why =
          holdTarget(trade as unknown as Record<string, unknown>) < day
            ? "paper safety close — the 3-day research hold had already ended"
            : "paper 3-trading-day hold complete (safety close)";
        const profit = await closeSlotTrade(
          slot,
          trade as unknown as Record<string, unknown>,
          price,
          why,
          settlementDays,
          keepPct,
        );
        if (profit === null) continue; // already closed: never sell twice
        out.closed.push({ slot: slot.id, ticker, exit: price, profit, why });
      }

    } catch (error) {
      console.error(
        `paper safety close failed for slot ${slot.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return out;
}


/** Per-slot capital ladder: same rules as live, its own counters. */
async function applySlotLadder(slot: RaceSlot): Promise<void> {
  const day = today();
  if (slot.last_evaluated_date === day) return;
  const cash = cashOf(await slotLedger(slot.strategy_id));
  const open = await slotOpenTrades(slot.strategy_id);
  let capital = cash.capital;
  for (const t of open) capital += Number(t.dollars);

  const state: LadderState = {
    stocks_per_day: slot.stocks_per_day,
    position_dollars: slot.position_dollars,
    stable_days: slot.stable_days,
    breach_days: slot.breach_days,
    hold_level: false,
    last_evaluated_date: slot.last_evaluated_date,
  };
  const decision = evaluateLadder(state, Number(capital.toFixed(2)));
  await supabaseAdmin
    .from("paper_slots" as never)
    .update({
      stocks_per_day: decision.step.stocks,
      position_dollars: decision.step.dollars,
      stable_days: decision.stable_days,
      breach_days: decision.breach_days,
      last_evaluated_date: day,
    } as never)
    .eq("id", slot.id);
  slot.stocks_per_day = decision.step.stocks;
  slot.position_dollars = decision.step.dollars;
}

/** Manually open a simulated position inside one slot (Research Lab tool). */
export async function openSlotTradeManual(input: {
  strategy_id: string;
  ticker: string;
  entry_price: number;
  dollars: number;
}): Promise<{ ok: true; ticker: string }> {
  const slots = await loadSlots();
  const slot = slots.find((s) => s.strategy_id === input.strategy_id);
  if (!slot) throw new Error("That strategy is not in a test slot.");
  const ticker = input.ticker.trim().toUpperCase();
  const open = await slotOpenTrades(slot.strategy_id);
  if (open.some((t) => String(t.ticker).toUpperCase() === ticker)) {
    throw new Error(`${ticker} is already open in ${slot.name}.`);
  }
  await openSlotTrade(slot, ticker, input.entry_price, input.dollars);
  return { ok: true, ticker };
}

// ------------------------------------------------------------ mark to market --

/** Shape one open trade row into an entrant holding (marked at its last close). */
function holdingOf(
  trade: Record<string, unknown>,
  closes: Map<string, number>,
): RaceEntrant["holdings"][number] {
  const ticker = String(trade['ticker']);
  const entryPrice = Number(trade['entry_price']);
  const dollars = Number(trade['dollars']);
  const prevClose = Number(closes.get(ticker) ?? entryPrice);
  return {
    ticker,
    entry_date: String(trade['entry_date'] ?? today()),
    entry_price: entryPrice,
    prev_close: prevClose,
    price: prevClose,
    dollars,
    pl: Number((dollars * (prevClose / entryPrice - 1)).toFixed(2)),
    pl_pct: Number(((prevClose / entryPrice - 1) * 100).toFixed(2)),
    today_pl: 0,
    hold_until: holdTarget(trade),

  };
}

/**
 * Re-price every open position across all entrants in a single request, then
 * fill in each entrant's unrealized totals and percent basis.
 */
async function markToMarket(entrants: RaceEntrant[]): Promise<void> {
  const tickers = entrants.flatMap((e) => e.holdings.map((h) => h.ticker));
  const { alpacaLatestPrices } = await import("./market-data.server");
  const live = tickers.length ? await alpacaLatestPrices(tickers) : new Map<string, number>();
  const day = today();
  for (const entrant of entrants) {
    let unrealized = 0;
    let todays = 0;
    let atWork = 0;
    for (const h of entrant.holdings) {
      const price = Number(live.get(h.ticker) ?? h.prev_close);
      h.price = Number(price.toFixed(4));
      h.pl = Number((h.dollars * (price / h.entry_price - 1)).toFixed(2));
      h.pl_pct = Number(((price / h.entry_price - 1) * 100).toFixed(2));
      // Bought today? The whole move is today's. Carried overnight? Only the
      // move since yesterday's close counts as today.
      const from = h.entry_date === day ? h.entry_price : h.prev_close;
      h.today_pl = Number((h.dollars * (price / from - 1)).toFixed(2));
      unrealized += h.pl;
      todays += h.today_pl;
      atWork += h.dollars;
    }
    entrant.unrealized = Number(unrealized.toFixed(2));
    entrant.unrealized_today = Number(todays.toFixed(2));
    entrant.basis = Number(Math.max(1, entrant.cash.capital + atWork).toFixed(2));
  }
}

// ------------------------------------------------------------- standings -----

/** One time-horizon's performance profile for a paper entrant. */
export interface HorizonStats {
  total_pnl: number;
  trades: number;
  wins: number;
  win_rate: number | null;
  return_pct: number | null;
  /** Portfolio value on this horizon: money put in plus this horizon's P&L. */
  value: number;
  /** Chart series, keyed by day the result belongs to. */
  rows: { exit_date: string; profit: number }[];
}

/** Money actually put into (or taken out of) a book, the percent denominator. */
function depositsOf(rows: LedgerRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (row.kind === "deposit" || row.kind === "withdrawal") total += row.amount;
  }
  return Number(total.toFixed(2));
}

function horizonStats(
  rows: { date: string; profit: number }[],
  deposits: number,
): HorizonStats {
  const total = rows.reduce((sum, r) => sum + r.profit, 0);
  const wins = rows.filter((r) => r.profit > 0).length;
  return {
    total_pnl: Number(total.toFixed(2)),
    trades: rows.length,
    wins,
    win_rate: rows.length ? Math.round((wins / rows.length) * 100) : null,
    return_pct: deposits > 0 ? Number(((total / deposits) * 100).toFixed(2)) : null,
    value: Number((deposits + total).toFixed(2)),
    rows: rows.map((r) => ({ exit_date: r.date, profit: Number(r.profit.toFixed(2)) })),
  };
}

export interface RaceEntrant {
  key: string;
  slot_id: number | null;
  strategy_id: string | null;
  name: string;
  live: boolean;
  enabled: boolean;
  started_on: string | null;
  stake: number;
  stocks_per_day: number;
  cash: { available: number; pending: number; saved: number; capital: number };
  total_pnl: number;
  win_rate: number | null;
  trades: number;
  wins: number;
  rank: number;
  /** Money put into this book, used as the return-percent denominator. */
  deposits: number;
  /**
   * The hypothetical short-term leg: what each position would have made if it
   * had been sold at the normal same-day exit time. Paper research only.
   */
  same_day: HorizonStats;
  /** The real paper leg: positions held for 3 trading days, then sold. */
  three_day: HorizonStats;
  holdings: {
    ticker: string;
    entry_date: string;
    entry_price: number;
    prev_close: number;
    price: number;
    dollars: number;
    pl: number;
    pl_pct: number;
    today_pl: number;
    /** The trading day this paper position is due to be sold (3-day hold). */
    hold_until: string;

  }[];
  up_next: { ticker: string; score: number; close: number; invalidation: string } | null;
  closed: { exit_date: string; profit: number }[];
  /** Open-position profit right now, marked to the latest traded price. */
  unrealized: number;
  /** How much of that unrealized move happened today. */
  unrealized_today: number;
  /** Cash + money at work, used as the percent-change denominator. */
  basis: number;
}


/**
 * Everything the Research Lab and the paper trade log render: one entrant per
 * paper slot plus the live strategy, ranked best-first on realised P&L.
 */
export async function raceStandings(): Promise<{
  entrants: RaceEntrant[];
  days_running: number;
  min_days: number;
  suggestion: { name: string; strategy_id: string; edge: number } | null;
}> {
  const base = await loadSettings();
  const slots = await loadSlots();
  const rankings = await rankSlots(slots.filter((s) => s.enabled));

  const entrants: RaceEntrant[] = [];

  for (const slot of slots) {
    const [ledger, open, closedRows, sameDayRows] = await Promise.all([
      slotLedger(slot.strategy_id),
      slotOpenTrades(slot.strategy_id),
      supabaseAdmin
        .from("trades")
        .select("exit_date, profit")
        .eq("strategy_id", slot.strategy_id)
        .eq("status", "closed")
        .order("exit_date", { ascending: true })
        .limit(400),
      supabaseAdmin
        .from("trades")
        .select("entry_date, same_day_profit")
        .eq("strategy_id", slot.strategy_id)
        .not("same_day_profit", "is", null)
        .order("entry_date", { ascending: true })
        .limit(400),
    ]);
    const closed = (closedRows.data ?? []).map((r) => ({
      exit_date: String(r.exit_date),
      profit: Number(r.profit ?? 0),
    }));
    const ranked = rankings.get(slot.id) ?? [];
    const closes = await latestCloses(open.map((t) => String(t.ticker)));
    const wins = closed.filter((c) => c.profit > 0).length;
    const heldTickers = new Set(open.map((t) => String(t.ticker)));
    const next = ranked.find((r) => r.tradeable && !heldTickers.has(r.ticker)) ?? null;
    const deposits = depositsOf(ledger);
    const sameDay = horizonStats(
      ((sameDayRows.data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
        date: String(r['entry_date']),
        profit: Number(r['same_day_profit'] ?? 0),
      })),
      deposits,
    );
    const threeDay = horizonStats(
      closed.map((c) => ({ date: c.exit_date, profit: c.profit })),
      deposits,
    );

    entrants.push({
      key: `slot-${slot.id}`,
      slot_id: slot.id,
      strategy_id: slot.strategy_id,
      name: slot.name,
      live: false,
      enabled: slot.enabled,
      started_on: slot.started_on,
      stake: slot.position_dollars,
      stocks_per_day: slot.stocks_per_day,
      cash: cashOf(ledger),
      total_pnl: Number(closed.reduce((sum, c) => sum + c.profit, 0).toFixed(2)),
      win_rate: closed.length ? Math.round((wins / closed.length) * 100) : null,
      trades: closed.length,
      wins,
      rank: 0,
      deposits,
      same_day: sameDay,
      three_day: threeDay,
      holdings: open.map((t) => holdingOf(t as unknown as Record<string, unknown>, closes)),
      up_next: next
        ? {
            ticker: next.ticker,
            score: next.score,
            close: next.close,
            invalidation: next.invalidation,
          }
        : null,
      closed,
      unrealized: 0,
      unrealized_today: 0,
      basis: 0,
    });
  }


  // The live strategy as the control line.
  const { data: liveStrategy } = base.active_strategy_id
    ? await supabaseAdmin
        .from("strategies")
        .select("name")
        .eq("id", base.active_strategy_id)
        .maybeSingle()
    : { data: null };
  const { data: liveClosedRows } = await supabaseAdmin
    .from("trades")
    .select("exit_date, profit")
    .is("strategy_id", null)
    .eq("status", "closed")
    .order("exit_date", { ascending: true })
    .limit(400);
  const liveClosed = (liveClosedRows ?? []).map((r) => ({
    exit_date: String(r.exit_date),
    profit: Number(r.profit ?? 0),
  }));
  const liveWins = liveClosed.filter((c) => c.profit > 0).length;
  const { data: liveOpen } = await supabaseAdmin
    .from("trades")
    .select("ticker, entry_price, dollars, entry_date")
    .is("strategy_id", null)
    .eq("status", "open");
  const liveCloses = await latestCloses((liveOpen ?? []).map((t) => String(t.ticker)));
  const { loadLadder } = await import("./capital.server");
  const ladder = await loadLadder();
  const liveLedger: LedgerRow[] =
    (
      await supabaseAdmin
        .from("ledger_entries")
        .select("amount, available_on, kind")
        .is("strategy_id", null)
    ).data?.map((r) => ({
      amount: Number(r.amount),
      available_on: String(r.available_on),
      kind: String(r.kind),
    })) ?? [];
  const liveDeposits = depositsOf(liveLedger);
  // The live strategy already exits the same session it enters, so both
  // horizons are the same thing for it: its own realised results.
  const liveHorizon = horizonStats(
    liveClosed.map((c) => ({ date: c.exit_date, profit: c.profit })),
    liveDeposits,
  );

  entrants.push({
    key: "live",
    slot_id: null,
    strategy_id: base.active_strategy_id,
    name: `${liveStrategy?.name ?? "Live strategy"} (live)`,
    live: true,
    enabled: base.strategy_enabled !== false,
    started_on: null,
    stake: Number(ladder.position_dollars),
    stocks_per_day: Number(ladder.stocks_per_day),
    cash: cashOf(liveLedger),
    total_pnl: Number(liveClosed.reduce((sum, c) => sum + c.profit, 0).toFixed(2)),
    win_rate: liveClosed.length ? Math.round((liveWins / liveClosed.length) * 100) : null,
    trades: liveClosed.length,
    wins: liveWins,
    rank: 0,
    deposits: liveDeposits,
    same_day: liveHorizon,
    three_day: liveHorizon,
    holdings: (liveOpen ?? []).map((t) =>
      holdingOf(t as unknown as Record<string, unknown>, liveCloses),
    ),
    up_next: null,
    closed: liveClosed,
    unrealized: 0,
    unrealized_today: 0,
    basis: 0,
  });


  // One free-feed request marks every open position (live and paper) to the
  // latest traded price, so the "LIVE" graph moves before anything is sold.
  await markToMarket(entrants);

  entrants.sort((a, b) => b.total_pnl - a.total_pnl);
  entrants.forEach((e, i) => {
    e.rank = i + 1;
  });

  // How long the race has been running: the oldest slot start date.
  const starts = slots.map((s) => s.started_on).filter(Boolean) as string[];
  const oldest = starts.sort()[0];
  const daysRunning = oldest
    ? Math.max(
        0,
        Math.round((Date.parse(`${today()}T00:00:00Z`) - Date.parse(`${oldest}T00:00:00Z`)) / 86400000),
      )
    : 0;

  const leader = entrants[0];
  const live = entrants.find((e) => e.live);
  const suggestion =
    leader && live && !leader.live && daysRunning >= RACE_MIN_DAYS && leader.trades >= 5
      ? {
          name: leader.name,
          strategy_id: leader.strategy_id!,
          edge: Number((leader.total_pnl - live.total_pnl).toFixed(2)),
        }
      : null;

  return { entrants, days_running: daysRunning, min_days: RACE_MIN_DAYS, suggestion };
}

/**
 * Suggest-only: after a full month, if a paper strategy is ranked first and
 * ahead of the live one, alert once a week until it is acted on or loses the
 * lead. Nothing about the live strategy is ever changed automatically.
 */
export async function maybeSuggestSwitch(): Promise<string | null> {
  const standings = await raceStandings();
  if (!standings.suggestion) return null;
  const { notify } = await import("./notify.server");
  const week = `${new Date().getUTCFullYear()}-W${Math.ceil(
    ((Date.now() - Date.parse(`${new Date().getUTCFullYear()}-01-01T00:00:00Z`)) / 86400000 + 1) / 7,
  )}`;
  await notify({
    kind: "theme",
    title: `${standings.suggestion.name} is beating the live strategy`,
    body: `Over ${standings.days_running} days of paper testing it is ahead by $${standings.suggestion.edge.toFixed(
      2,
    )} on the same $${standings.entrants[0]?.stake ?? 20} stake. Nothing changed automatically — switch it on from the Strategy tab if you want it live.`,
    severity: "info",
    action: "Review on Strategy",
    dedupe_key: `race-suggest:${standings.suggestion.strategy_id}:${week}`,
  });
  return standings.suggestion.name;
}

/**
 * The paper race, independent of the live bot switch.
 *
 * Scoring and simulated trading must keep running even when live automation is
 * off (there may be no money in the real account yet), so this tops up any
 * missing price history, re-scores the universe once, then runs the simulated
 * pass. Everything it touches carries a strategy_id, so the live book is never
 * affected. Costs nothing extra: the same cached bars feed both sides.
 */
export async function runPaperTesting(
  phase: "entry" | "exit" | "both",
): Promise<{
  ran: boolean;
  reason?: string;
  scored?: number;
  slots?: RacePassResult["slots"];
  safety?: SafetyCloseResult;
}> {
  const status = marketStatus();
  // The safety net runs on every pass, including closed days: a position left
  // open from an earlier session must never survive into the next one.
  const safety = await safetyCloseStalePaper();
  if (!status.tradingDay) return { ran: false, reason: "market closed today", safety };

  let scored: number | undefined;
  try {
    const { missingDates, cacheOneDay, runScan } = await import("./scan.server");
    for (const date of (await missingDates()).slice(-3)) await cacheOneDay(date);
    scored = (await runScan()).scored_count;
  } catch (error) {
    console.error("paper scoring failed:", error instanceof Error ? error.message : error);
  }

  const pass = await runRacePass({ phase, force: true });
  let finalSafety = safety;
  if (phase !== "entry") {
    // After the pre-close pass: force-close anything the normal exit missed,
    // so the session cannot end with an open research position.
    const second = await safetyCloseStalePaper({ force: true });
    finalSafety = {
      closed: [...safety.closed, ...second.closed],
      checked: safety.checked + second.checked,
    };
    try {
      await maybeSuggestSwitch();
    } catch (error) {
      console.error("race suggestion failed:", error instanceof Error ? error.message : error);
    }
  }

  return {
    ran: true,
    ...(scored === undefined ? {} : { scored }),
    slots: pass.slots,
    safety: finalSafety,
  };

}
