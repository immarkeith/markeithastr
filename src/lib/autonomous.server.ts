/**
 * Phase L — autonomous live selector and strict time-based exits. Server-only.
 * Default OFF. Buys at most the daily cap after the fresh post-open scan; sells
 * every AUTO_TIMED position at the pre-close pass once its exit date arrives.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { AUTO_MAX_STAKE, entryBlockers, holdUntil, isExitDue, selectCandidate, type LaneRecord } from "./autonomous";

const LOOKBACK_SESSIONS = 60;

async function laneRecords(): Promise<LaneRecord[]> {
  const { loadSlots, researcherHoldDays } = await import("./race.server");
  const slots = await loadSlots();
  const { data } = await supabaseAdmin
    .from("researcher_daily_ledger")
    .select("lane, session_date, equity, held_ticker")
    .order("session_date", { ascending: false })
    .limit(LOOKBACK_SESSIONS * 10);
  const byLane = new Map<string, { equity: number; held: string | null }[]>();
  for (const r of data ?? []) {
    const list = byLane.get(r.lane) ?? [];
    if (list.length < LOOKBACK_SESSIONS) list.push({ equity: Number(r.equity), held: r.held_ticker });
    byLane.set(r.lane, list);
  }
  return [...byLane.entries()].map(([lane, rows]) => {
    const latest = rows[0]!;
    const oldest = rows[rows.length - 1]!;
    const slot = slots.find((s) => s.lane === lane);
    return {
      lane,
      track_pct: oldest.equity > 0 ? (latest.equity / oldest.equity - 1) * 100 : 0,
      pick: latest.held,
      hold_days: slot ? researcherHoldDays(slot) : 3,
    };
  });
}

async function spyMovePct(proxy: string): Promise<number | null> {
  try {
    const { alpacaLatestPrices } = await import("./market-data.server");
    const now = (await alpacaLatestPrices([proxy])).get(proxy);
    const { data } = await supabaseAdmin
      .from("daily_bars")
      .select("close, bar_date")
      .eq("ticker", proxy)
      .order("bar_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!now || !data?.close) return null;
    return (now / Number(data.close) - 1) * 100;
  } catch {
    return null;
  }
}

export interface AutoEntryResult {
  bought: boolean;
  reason: string;
  ticker?: string;
  owning_researcher?: string;
  hold_until?: string;
}

export async function runAutonomousEntry(): Promise<AutoEntryResult> {
  const { loadSettings, availableCash } = await import("./scan.server");
  const { nyParts } = await import("./market-calendar");
  const { notify } = await import("./notify.server");
  const s = (await loadSettings()) as unknown as Record<string, any>;
  if (!s["auto_live_trading"]) return { bought: false, reason: "Autonomous live trading is off." };
  const today = nyParts().date;

  const { data: todays } = await supabaseAdmin
    .from("trades").select("profit, status").eq("auto_managed", true).eq("mode", "live").eq("entry_date", today);
  const { data: closedToday } = await supabaseAdmin
    .from("trades").select("profit").eq("auto_managed", true).eq("mode", "live").eq("exit_date", today);
  const { data: openAuto } = await supabaseAdmin
    .from("trades").select("ticker").eq("auto_managed", true).eq("mode", "live").eq("status", "open");

  const { brokerAccount, listPositions, buyNotional } = await import("./broker.server");
  let active = false;
  let unrealized = 0;
  try {
    const acct = await brokerAccount("live");
    active = acct.status === "ACTIVE" && !acct.trading_blocked;
    const mine = new Set((openAuto ?? []).map((t) => t.ticker));
    for (const p of await listPositions("live")) if (mine.has(p.ticker)) unrealized += p.unrealized_pl;
  } catch { active = false; }

  const stake = Math.min(Number(s["auto_max_trade_dollars"] ?? 25), AUTO_MAX_STAKE);
  const blockers = entryBlockers({
    enabled: true,
    paper_mode: s["paper_mode"] !== false,
    trades_today: (todays ?? []).length,
    max_daily_trades: Number(s["auto_max_daily_trades"] ?? 1),
    realized_today: (closedToday ?? []).reduce((a, t) => a + Number(t.profit ?? 0), 0),
    unrealized_open: unrealized,
    daily_loss_limit: Number(s["auto_daily_loss_limit"] ?? 50),
    stake,
    max_stake: AUTO_MAX_STAKE,
    cash: await availableCash(),
    account_active: active,
    kill_switch: s["auto_volatility_kill_switch"] !== false,
    spy_move_pct: await spyMovePct(String(s["market_proxy"] ?? "SPY")),
    spy_limit_pct: Number(s["auto_spy_move_limit_pct"] ?? 1.8),
  });
  if (blockers.length) {
    await notify({ kind: "health", title: "Autonomous buy skipped", body: blockers.join(" "), severity: "info", action: "No trade", dedupe_key: `auto-skip:${today}` });
    return { bought: false, reason: blockers.join(" ") };
  }

  const { data: run } = await supabaseAdmin.from("scan_runs").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const { data: scores } = run
    ? await supabaseAdmin.from("scan_scores").select("ticker, score, tradeable").eq("run_id", run.id).order("rank").limit(20)
    : { data: [] };
  const held = new Set((openAuto ?? []).map((t) => t.ticker));
  const pick = selectCandidate(
    (scores ?? []).filter((c) => !held.has(c.ticker)).map((c) => ({ ticker: c.ticker, score: Number(c.score), tradeable: Boolean(c.tradeable) })),
    await laneRecords(),
  );
  if (!pick) return { bought: false, reason: "No eligible stock with a trusted researcher today." };

  const fill = await buyNotional("live", pick.ticker, stake, "autonomous_authorized");
  if (fill.status !== "filled" || !fill.filled_price) {
    return { bought: false, reason: `Broker did not fill ${pick.ticker} (${fill.status}).` };
  }
  const until = holdUntil(today, pick.hold_days);
  const { data: row, error } = await supabaseAdmin.from("trades").insert({
    ticker: pick.ticker, kind: "auto", entry_date: today, entry_at: new Date().toISOString(),
    entry_price: fill.filled_price, dollars: stake, status: "open", mode: "live",
    position_type: "AUTO_TIMED", filled_qty: fill.filled_qty, broker_order_id: fill.order_id,
    hold_days: pick.hold_days, hold_target_date: until, auto_managed: true,
    owning_researcher: pick.owning_researcher,
    status_note: `Autonomous pick — ${pick.owning_researcher} (agreeing: ${pick.agreeing.join(", ") || "none"}), confidence ${pick.confidence}`,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("ledger_entries").insert({ kind: "deploy", amount: -stake, trade_id: row.id, note: `Autonomous buy ${pick.ticker} @ ${fill.filled_price} order ${fill.order_id}` });
  await notify({
    kind: "entry", ticker: pick.ticker, severity: "good", action: "Autonomous live entry",
    title: `Bought $${stake.toFixed(2)} of ${pick.ticker} @ $${fill.filled_price.toFixed(2)}`,
    body: `Picked by ${pick.owning_researcher}. Strict hold: ${pick.hold_days} trading day(s), sells at the pre-close pass on ${until}.`,
    dedupe_key: `auto-entry:${pick.ticker}:${today}`,
  });
  return { bought: true, reason: "Bought", ticker: pick.ticker, owning_researcher: pick.owning_researcher, hold_until: until };
}

/** Strict time exits. Runs even if the switch was turned off later. */
export async function runAutonomousExits(): Promise<{ sold: string[]; failed: string[] }> {
  const { closeTrade } = await import("./scan.server");
  const { nyParts } = await import("./market-calendar");
  const { notify } = await import("./notify.server");
  const today = nyParts().date;
  const { data } = await supabaseAdmin
    .from("trades").select("id, ticker, entry_price, hold_target_date, owning_researcher")
    .eq("auto_managed", true).eq("mode", "live").eq("status", "open");
  const sold: string[] = [];
  const failed: string[] = [];
  for (const t of data ?? []) {
    if (!isExitDue(t.hold_target_date, today)) continue;
    try {
      const r = await closeTrade({ id: t.id, exit_price: Number(t.entry_price) });
      sold.push(t.ticker);
      await notify({
        kind: "exit", ticker: t.ticker, severity: r.profit >= 0 ? "good" : "bad", action: "Autonomous timed exit",
        title: `Sold ${t.ticker} — hold time reached (${r.profit >= 0 ? "+" : ""}$${r.profit.toFixed(2)})`,
        body: `${t.owning_researcher ?? "Researcher"}'s hold window ended ${t.hold_target_date}; sold at market regardless of price, as designed.`,
        dedupe_key: `auto-exit:${t.ticker}:${today}`,
      });
    } catch (e) {
      failed.push(t.ticker);
      console.error("autonomous exit failed:", t.ticker, e instanceof Error ? e.message : e);
    }
  }
  return { sold, failed };
}
