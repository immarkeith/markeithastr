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
import { simulateLaneRun } from "./researcher-ledger";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { ledgerReturnMatches } from './research-certification';

export const LEDGER_ENGINE_VERSION = "v2-t1";
export const LEDGER_BASE_EQUITY = 100;
const LEDGER_UNIVERSE = 300;
const LEDGER_HISTORY_DAYS = 2000;
const LEDGER_PAGE = 25;
const checkpointSchema = z.object({
  date: z.string().nullable(), cash: z.number().finite(),
  pos: z.object({ ticker: z.string(), shares: z.number().finite().positive(), mark: z.number().finite().positive(), held: z.number().int().nonnegative(), tranche: z.enum(["A", "B"]).nullable() }).nullable(),
  pending: z.array(z.object({ amount: z.number().finite().nonnegative(), available: z.string(), tranche: z.enum(["A", "B"]).nullable() })),
  pools: z.object({ A: z.number().finite(), B: z.number().finite() }),
  last: z.enum(["A", "B"]).nullable(), activated: z.boolean(), prevEquity: z.number().finite(),
});

/** Stage 2 + 3: replay every researcher across stored history and save the rows. */
export async function runResearcherLedger(options: { fullReplay?: boolean } = {}): Promise<{ lanes: number; rows: number; sessions: number }> {
  const laneNames = [...LANES.map(lane => lane.lane), "lead"];
  const savedRows: { lane: string; session_date: string; engine_version: string; equity: number; daily_return_pct: number }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabaseAdmin.from("researcher_daily_ledger").select("lane, session_date, engine_version, equity, daily_return_pct").order("lane").order("session_date").range(offset, offset + 999);
    if (error) throw new Error(error.message);
    savedRows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  // Fail before price loading or any writes when the recorded history itself
  // cannot establish a trustworthy starting state.
  for (const lane of laneNames) {
    const saved = savedRows.filter(row => row.lane === lane);
    for (let i = 1; i < saved.length; i++) {
      const prior = saved[i - 1], row = saved[i];
      if (prior && row && !ledgerReturnMatches(Number(prior.equity), Number(row.equity), Number(row.daily_return_pct))) throw new Error(`Existing ${lane} book continuity needs review at ${row.session_date}; no unverified append permitted`);
    }
  }
  const latestByLane = new Map<string, string | null>();
  for (const lane of laneNames) {
    latestByLane.set(lane, savedRows.filter(row => row.lane === lane).at(-1)?.session_date ?? null);
  }
  const s = await loadSettings();
  const { data: latestBar, error: latestError } = await supabaseAdmin.from("daily_bars").select("bar_date").eq("ticker", s.market_proxy.toUpperCase()).order("bar_date", { ascending: false }).limit(1).maybeSingle();
  if (latestError) throw new Error(latestError.message);
  if (!options.fullReplay && latestBar && laneNames.every(lane => (latestByLane.get(lane) ?? "") >= latestBar.bar_date)) return { lanes: laneNames.length, rows: 0, sessions: 0 };
  // Resume only when a complete, validated checkpoint matches the saved row
  // and the current formula. Otherwise bootstrap through the explicit replay path.
  const checkpoints = new Map<string, { state: z.infer<typeof checkpointSchema>; fingerprint: string; cutover?: string | undefined }>();
  for (const lane of laneNames) {
    const { data, error } = await supabaseAdmin.from("research_runs").select("summary").eq("kind", `ledger_checkpoint:${lane}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    const parsed = z.object({ state: checkpointSchema, fingerprint: z.string(), cutover: z.string().optional() }).safeParse(data?.summary);
    if (parsed.success && parsed.data.state.date === latestByLane.get(lane)) checkpoints.set(lane, parsed.data);
  }
  const share = await volumeShare(s);
  // Same 300-ticker universe as before, fetched in pages so the long history
  // read stays under the database statement timeout.
  const raw: { ticker: string; bars: unknown }[] = [];
  // Sequential heavy reads avoid saturating the database statement budget.
  for (let offset = 0; offset < LEDGER_UNIVERSE; offset += LEDGER_PAGE) {
    const res = await supabaseAdmin.rpc("scan_input", { p_days: LEDGER_HISTORY_DAYS, p_limit: LEDGER_PAGE, p_offset: offset });
    if (res.error) throw new Error(res.error.message);
    raw.push(...((res.data ?? []) as typeof raw));
  }
  const panel = await buildPanel(LEDGER_UNIVERSE, s.market_proxy, LEDGER_HISTORY_DAYS, raw as never);

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
    const fingerprint = JSON.stringify({ params: l.params, bands: l.bands, hold, base: LEDGER_BASE_EQUITY, engine: LEDGER_ENGINE_VERSION });
    const checkpoint = checkpoints.get(l.lane);
    const resume = !options.fullReplay && checkpoint?.fingerprint === fingerprint ? checkpoint : undefined;
    const days = sessions.filter(date => !resume?.state.date || date > resume.state.date).map((date) => {
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
    // Append only: never overwrite historical research records with new cash rules.
    const saved = savedRows.filter(row => row.lane === l.lane);
    const legacyEnd = saved.filter(r => r.engine_version !== LEDGER_ENGINE_VERSION).at(-1)?.session_date;
    const cutover = resume?.cutover ?? (legacyEnd ? sessions.find(date => date > legacyEnd) ?? "9999-12-31" : undefined);
    const lastSaved = saved.at(-1)?.session_date;
    const simulation = simulateLaneRun(days, hold, LEDGER_BASE_EQUITY, cutover, resume?.state);
    const points = simulation.points;
    const out = points.filter(p => !lastSaved || p.date > lastSaved).map((p) => ({
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
    const prior = saved.at(-1), firstNew = out[0];
    if (prior && firstNew && !ledgerReturnMatches(Number(prior.equity), firstNew.equity, firstNew.daily_return_pct)) throw new Error(`Unverified ${l.lane} resume state; no ledger rows appended`);
    for (let i = 0; i < out.length; i += 500) {
      const { error } = await supabaseAdmin
        .from("researcher_daily_ledger")
        .upsert(out.slice(i, i + 500), { onConflict: "lane,session_date", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    }
    total += out.length;
    // Save resume state only after the final inserted ledger value reads back.
    // A conflicting concurrent writer must never leave a mismatched checkpoint.
    const final = points.at(-1);
    if (final) {
      const { data: readback, error } = await supabaseAdmin.from("researcher_daily_ledger").select("equity,pnl,held_ticker,action").eq("lane", l.lane).eq("session_date", final.date).maybeSingle();
      if (error) throw new Error(error.message);
      if (!readback || Number(readback.equity) !== final.equity || Number(readback.pnl) !== final.pnl || readback.held_ticker !== final.held || readback.action !== final.action) throw new Error(`Ledger checkpoint readback mismatch: ${l.lane}`);
      const { error: checkpointError } = await supabaseAdmin.from("research_runs").insert({ kind: `ledger_checkpoint:${l.lane}`, config: { engine: LEDGER_ENGINE_VERSION }, summary: { state: simulation.checkpoint, fingerprint, ...(cutover ? { cutover } : {}) } as unknown as Json });
      if (checkpointError) throw new Error(checkpointError.message);
    }
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
export async function readLedgerCurves(): Promise<(ResearcherEquityCurve & { lane: string; source: "ledger"; basis: number; coverage_note: string })[]> {
  const rows: { lane: string; strategy_id: string | null; session_date: string; pnl: number; equity: number; daily_return_pct: number; action: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("researcher_daily_ledger")
      .select("lane, strategy_id, session_date, pnl, equity, daily_return_pct, action")
      .order("session_date", { ascending: true })
      .order("lane", { ascending: true })
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
    has_gaps: list.some((r, i) => r.action?.includes("pending mark") || (i > 0 && !ledgerReturnMatches(Number(list[i - 1]?.equity), Number(r.equity), Number(r.daily_return_pct)))),
    coverage_note: list.some((r, i) => i > 0 && !ledgerReturnMatches(Number(list[i - 1]?.equity), Number(r.equity), Number(r.daily_return_pct)))
      ? "Saved book contains an unreconciled continuity transition. Historical membership and corporate-action coverage are also unverified."
      : "Cached 300-stock research cohort; historical membership and corporate-action coverage are unverified.",
    source: "ledger" as const,
    basis: LEDGER_BASE_EQUITY,
  }));
}
