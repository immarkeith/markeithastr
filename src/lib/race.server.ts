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
import { HISTORY_DAYS, loadSettings, scoreConfig, volumeShare, type Settings } from "./scan.server";
import { scoreSecurity, type Bar, type ScoreConfig } from "./scoring";

export interface RaceSlot {
  id: number;
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

const MAX_SLOTS = 3;
/** A month of sessions before the race is allowed to suggest a switch. */
export const RACE_MIN_DAYS = 28;

function today(): string {
  return new Date().toISOString().slice(0, 10);
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
    .filter((r) => r['strategy_id'])
    .map((r) => {
      const strategy = byId.get(String(r['strategy_id'])) ?? {};
      return {
        id: Number(r['id']),
        strategy_id: String(r['strategy_id']),
        name: String(strategy['name'] ?? "Unnamed strategy"),
        description: String(strategy['description'] ?? ""),
        params: (strategy['params'] ?? {}) as Record<string, number>,
        enabled: r['enabled'] !== false,
        stocks_per_day: Number(r['stocks_per_day'] ?? 1),
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

/** Ranking for every enabled slot, keyed by slot id. */
export async function rankSlots(slots: RaceSlot[]): Promise<Map<number, RankRow[]>> {
  const base = await loadSettings();
  const share = await volumeShare(base);
  const configs = slots.map((slot) => {
    const merged = settingsFor(base, slot.params);
    return {
      key: String(slot.id),
      config: scoreConfig(merged, share),
      minScore: Number(merged.min_score_to_trade),
    };
  });
  const ranked = await rankUniverse(configs);
  const out = new Map<number, RankRow[]>();
  for (const slot of slots) out.set(slot.id, ranked.get(String(slot.id)) ?? []);
  return out;
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
  const { data, error } = await supabaseAdmin
    .from("trades")
    .insert({
      ticker,
      kind: "day",
      entry_date: today(),
      entry_at: new Date().toISOString(),
      entry_price: price,
      dollars,
      status: "open",
      mode: "paper",
      strategy_id: slot.strategy_id,
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

async function closeSlotTrade(
  slot: RaceSlot,
  trade: Record<string, unknown>,
  price: number,
  why: string,
  settlementDays: number,
  keepPct: number,
): Promise<number> {
  const dollars = Number(trade['dollars']);
  const entry = Number(trade['entry_price']);
  const profit = dollars * (price / entry - 1);
  const kept = profit > 0 ? profit * keepPct : profit;

  const { error } = await supabaseAdmin
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
    .eq("id", trade['id'] as string);
  if (error) throw new Error(error.message);

  const available = new Date();
  available.setUTCDate(available.getUTCDate() + settlementDays);
  const availableOn = available.toISOString().slice(0, 10);
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
  options: { phase?: "entry" | "exit" | "both" } = {},
): Promise<RacePassResult> {
  const phase = options.phase ?? "both";
  const base = await loadSettings();
  const slots = (await loadSlots()).filter((s) => s.enabled);
  const result: RacePassResult = { slots: [] };
  if (slots.length === 0) return result;

  const rankings = await rankSlots(slots);
  const settlementDays = Number(base.settlement_days);
  const keepPct = Number(base.profit_keep_pct);

  for (const slot of slots) {
    const entry = {
      id: slot.id,
      name: slot.name,
      opened: [] as { ticker: string; price: number }[],
      closed: [] as { ticker: string; exit: number; profit: number; why: string }[],
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

      // Names this slot may carry overnight: still its own top-ranked picks.
      const holdSlots = Math.max(1, slot.stocks_per_day);
      const holdSet = new Set(
        ranked.filter((r) => r.tradeable).slice(0, holdSlots).map((r) => r.ticker),
      );

      // ---- exits
      if (phase !== "entry") {
        for (const trade of open) {
          const ticker = String(trade.ticker);
          const score = byTicker.get(ticker);
          const price = Number(closes.get(ticker) ?? score?.close ?? trade.entry_price ?? 0);
          if (!price) continue;
          const heldDays = Math.round(
            (Date.parse(`${today()}T00:00:00Z`) -
              Date.parse(`${String(trade.entry_date)}T00:00:00Z`)) /
              86400000,
          );
          if (heldDays < 1) continue;
          if (base.hold_qualifying_positions !== false && holdSet.has(ticker)) {
            entry.held.push(ticker);
            continue;
          }
          const why = "paper day-trade exit before the close";
          const profit = await closeSlotTrade(
            slot,
            trade as unknown as Record<string, unknown>,
            price,
            why,
            settlementDays,
            keepPct,
          );
          entry.closed.push({ ticker, exit: price, profit, why });
        }

        // Scale this slot's own ladder once per trading day, after its exits.
        await applySlotLadder(slot);
      }

      // ---- entries
      if (phase !== "exit") {
        const cash = cashOf(await slotLedger(slot.strategy_id));
        const stillOpen = new Set(
          open
            .filter((t) => !entry.closed.some((c) => c.ticker === String(t.ticker)))
            .map((t) => String(t.ticker)),
        );
        const free = Math.max(0, slot.stocks_per_day - stillOpen.size);
        let cashLeft = cash.available;
        const stake = Number(slot.position_dollars);
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
      }
    } catch (error) {
      entry.skipped = error instanceof Error ? error.message : "slot failed";
      console.error(`race slot ${slot.id} failed:`, entry.skipped);
    }
    result.slots.push(entry);
  }
  return result;
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

// ------------------------------------------------------------- standings -----

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
  holdings: { ticker: string; entry_price: number; price: number; pl: number; pl_pct: number }[];
  up_next: { ticker: string; score: number; close: number; invalidation: string } | null;
  closed: { exit_date: string; profit: number }[];
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
    const [ledger, open, closedRows] = await Promise.all([
      slotLedger(slot.strategy_id),
      slotOpenTrades(slot.strategy_id),
      supabaseAdmin
        .from("trades")
        .select("exit_date, profit")
        .eq("strategy_id", slot.strategy_id)
        .eq("status", "closed")
        .order("exit_date", { ascending: true })
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
      holdings: open.map((t) => {
        const price = Number(closes.get(String(t.ticker)) ?? t.entry_price);
        const entryPrice = Number(t.entry_price);
        return {
          ticker: String(t.ticker),
          entry_price: entryPrice,
          price,
          pl: Number((Number(t.dollars) * (price / entryPrice - 1)).toFixed(2)),
          pl_pct: Number(((price / entryPrice - 1) * 100).toFixed(2)),
        };
      }),
      up_next: next
        ? {
            ticker: next.ticker,
            score: next.score,
            close: next.close,
            invalidation: next.invalidation,
          }
        : null,
      closed,
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
    .select("ticker, entry_price, dollars")
    .is("strategy_id", null)
    .eq("status", "open");
  const liveCloses = await latestCloses((liveOpen ?? []).map((t) => String(t.ticker)));
  const { loadLadder } = await import("./capital.server");
  const ladder = await loadLadder();

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
    cash: cashOf(
      (
        await supabaseAdmin
          .from("ledger_entries")
          .select("amount, available_on, kind")
          .is("strategy_id", null)
      ).data?.map((r) => ({
        amount: Number(r.amount),
        available_on: String(r.available_on),
        kind: String(r.kind),
      })) ?? [],
    ),
    total_pnl: Number(liveClosed.reduce((sum, c) => sum + c.profit, 0).toFixed(2)),
    win_rate: liveClosed.length ? Math.round((liveWins / liveClosed.length) * 100) : null,
    trades: liveClosed.length,
    wins: liveWins,
    rank: 0,
    holdings: (liveOpen ?? []).map((t) => {
      const price = Number(liveCloses.get(String(t.ticker)) ?? t.entry_price);
      const entryPrice = Number(t.entry_price);
      return {
        ticker: String(t.ticker),
        entry_price: entryPrice,
        price,
        pl: Number((Number(t.dollars) * (price / entryPrice - 1)).toFixed(2)),
        pl_pct: Number(((price / entryPrice - 1) * 100).toFixed(2)),
      };
    }),
    up_next: null,
    closed: liveClosed,
  });

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
