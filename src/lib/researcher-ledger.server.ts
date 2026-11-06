/**
 * Three-stage research pipeline, stages 2 and 3.
 *
 *   Stage 1  daily_bars           — stored market history (no opinions).
 *   Stage 2  runResearcherLedger  — each researcher walks the stored sessions in
 *                                   order, sees only bars up to that session,
 *                                   applies ITS OWN formula, and decides what
 *                                   it would hold.
 *   Stage 3  researcher_daily_ledger — one saved row per researcher per session.
 *                                   The Research Lab graphs read these rows and
 *                                   plot them; they never reconstruct results.
 *
 * Paper research only. Nothing here places orders or touches the trades table.
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  LANES,
  buildPanel,
  laneSeedParams,
  listResearchers,
  passesFilters,
  scoreWith,
  type LaneParams,
  type PanelRow,
} from "./department.server";
import { assemble, bandBonus, type Band, type MasterRule } from "./master-formula.server";
import { loadSlots, researcherHoldDays, type ResearcherEquityCurve } from "./race.server";
import { loadSettings, volumeShare } from "./scan.server";
import { simulateLane } from "./researcher-ledger";

export const LEDGER_ENGINE_VERSION = "v1";
export const LEDGER_BASE_EQUITY = 100;
const LEDGER_UNIVERSE = 300;
const LEDGER_HISTORY_DAYS = 2000;

/** Stage 2 + 3: replay every researcher across stored history and save the rows. */
export async function runResearcherLedger(): Promise<{ lanes: number; rows: number; sessions: number }> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const panel = await buildPanel(LEDGER_UNIVERSE, s.market_proxy, LEDGER_HISTORY_DAYS);

  // Only sessions with real coverage — a half-downloaded day is not a session.
  const byDate = new Map<string, PanelRow[]>();
  for (const r of panel.rows) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }
  const best = Math.max(0, ...[...byDate.values()].map((l) => l.length));
  const sessions = [...byDate.keys()]
    .filter((d) => (byDate.get(d)?.length ?? 0) >= best * 0.5)
    .sort();

  const researchers = await listResearchers();
  const slots = await loadSlots();
  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const master = assemble((ruleRows ?? []) as unknown as MasterRule[], {
    weights: {
      trend: Number(s.weight_trend),
      momentum: Number(s.weight_momentum),
      volume: Number(s.weight_volume),
      relative_strength: Number(s.weight_relative_strength),
      volatility_quality: Number(s.weight_volatility_quality),
    },
    min_score_to_trade: Number(s.min_score_to_trade),
    num_day_trades: 1,
    rsi_max: null,
    rsi_min: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  });

  const lanes: { lane: string; params: LaneParams; bands: Band[] }[] = LANES.map((lane) => {
    const row = researchers.find((r) => r.lane === lane.lane);
    const params =
      row?.params && (row.params as LaneParams).weights
        ? (row.params as LaneParams)
        : laneSeedParams(lane, s);
    return { lane: lane.lane, params, bands: [] };
  });
  lanes.push({ lane: "lead", params: master, bands: master.bands });

  let total = 0;
  for (const l of lanes) {
    const slot = slots.find((x) => x.lane === l.lane);
    const hold = slot ? researcherHoldDays(slot) : 3;
    const days = sessions.map((date) => {
      const rows = byDate.get(date) ?? [];
      const closes = new Map<string, number>();
      for (const r of rows) closes.set(r.ticker, r.close);
      // Point-in-time ranking: only the features computed from bars up to `date`.
      const ranked = rows
        .filter((r) => passesFilters(r, l.params, s, share))
        .map((r) => ({ ticker: r.ticker, score: scoreWith(r, l.params.weights) + bandBonus(r, l.bands) }))
        .filter((x) => x.score >= l.params.min_score_to_trade)
        .sort((a, b) => b.score - a.score);
      return { date, closes, pick: ranked[0]?.ticker ?? null };
    });
    const points = simulateLane(days, hold, LEDGER_BASE_EQUITY);
    const out = points.map((p) => ({
      lane: l.lane,
      session_date: p.date,
      strategy_id: slot?.strategy_id ?? null,
      equity: p.equity,
      pnl: p.pnl,
      pnl_pct: p.pnl_pct,
      daily_return_pct: p.daily_return_pct,
      held_ticker: p.held,
      action: p.action,
      engine_version: LEDGER_ENGINE_VERSION,
    }));
    for (let i = 0; i < out.length; i += 500) {
      const { error } = await supabaseAdmin
        .from("researcher_daily_ledger")
        .upsert(out.slice(i, i + 500), { onConflict: "lane,session_date" });
      if (error) throw new Error(error.message);
    }
    total += out.length;
  }
  return { lanes: lanes.length, rows: total, sessions: sessions.length };
}

/** Latest session saved in the ledger (null before the first run). */
export async function latestLedgerDate(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("researcher_daily_ledger")
    .select("session_date")
    .order("session_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.session_date ?? null;
}

/**
 * Stage 3 read: the saved rows, shaped for the chart. No reconstruction —
 * one point per saved row, P/L in dollars on the $100 base.
 */
export async function readLedgerCurves(): Promise<(ResearcherEquityCurve & { lane: string; source: "ledger"; basis: number })[]> {
  const rows: { lane: string; strategy_id: string | null; session_date: string; pnl: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("researcher_daily_ledger")
      .select("lane, strategy_id, session_date, pnl")
      .order("session_date", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as typeof rows;
    rows.push(...page);
    if (page.length < 1000) break;
  }
  const slots = await loadSlots();
  const byLane = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byLane.get(r.lane);
    if (list) list.push(r);
    else byLane.set(r.lane, [r]);
  }
  return [...byLane.entries()].map(([lane, list]) => ({
    lane,
    strategy_id: slots.find((x) => x.lane === lane)?.strategy_id ?? list[0]?.strategy_id ?? lane,
    points: list.map((r) => ({ date: r.session_date, equity: Number(r.pnl) })),
    coverage_from: list[0]?.session_date ?? null,
    coverage_to: list[list.length - 1]?.session_date ?? null,
    has_gaps: false,
    source: "ledger" as const,
    basis: LEDGER_BASE_EQUITY,
  }));
}
