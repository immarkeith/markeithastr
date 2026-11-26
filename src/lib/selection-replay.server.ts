/**
 * Historical + daily researcher selection replay (paper research only).
 * Layer 1 rows (research_daily_selections) are insert-only; Layer 2 rows
 * (research_selection_evaluations) start pending and mature once their exit
 * session is stored. Never touches trades, broker, or the strategy ledger.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LANES, buildPanel, laneSeedParams, listResearchers, passesFilters, scoreWith, type LaneParams, type PanelRow } from "./department.server";
import { assemble, bandBonus, type Band, type MasterRule } from "./master-formula.server";
import { loadSettings, volumeShare } from "./scan.server";
import { historyCoverage } from "./history-coverage";
import { EVAL_HORIZONS, eligibleAt, evaluate, type Bar } from "./selection-replay";
import { loadSelectionInput } from './selection-input.server';
import { completedResearchSession, selectionTimestamp } from './research-session';

export const SELECTION_ENGINE_VERSION = "sel-v1";
const UNIVERSE_BASIS = "cached-cohort-survivors-unverified-membership";
const HISTORY_DAYS = 2000;

type Raw = { ticker: string; bars: [string, number, number, number, number, number][] };
async function loadRaw(): Promise<Raw[]> {
  // Once picks exist, nightly runs need only the 200-session eligibility window
  // before the newest pick; the first run reads the full cache.
  const { data, error } = await supabaseAdmin.from("research_daily_selections").select("session_date").order("session_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const since = data?.session_date ? new Date(Date.parse(`${data.session_date}T00:00:00Z`) - 500 * 86400000).toISOString().slice(0, 10) : undefined;
  return loadSelectionInput(since);
}

async function pagedKeys(table: "research_daily_selections" | "research_selection_evaluations", cols: string, filter?: (q: any) => any) {
  const rows: any[] = [];
  for (let f = 0; ; f += 1000) {
    let q = supabaseAdmin.from(table).select(cols).order('lane').order('session_date').range(f, f + 999);
    if (table === 'research_selection_evaluations') q = q.order('horizon_sessions');
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return rows;
}

export async function runSelectionReplay(): Promise<{ sessions: number; selections: number; matured: number; first_session: string | null }> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const minPrice = Number(s.min_price), minAdv = Number(s.min_avg_dollar_volume) * share;
  const raw = await loadRaw();
  const bars = new Map(raw.map((r) => [r.ticker, r.bars.map(([date, open, , , close, volume]) => ({ date, open: Number(open), close: Number(close), volume: Number(volume) }))]));
  const proxy = s.market_proxy.toUpperCase();
  if (!bars.has(proxy)) {
    const { data } = await supabaseAdmin.from("daily_bars").select("bar_date, open, close, volume").eq("ticker", proxy).order("bar_date").limit(HISTORY_DAYS + 5);
    bars.set(proxy, (data ?? []).map((b) => ({ date: b.bar_date, open: Number(b.open), close: Number(b.close), volume: Number(b.volume) })));
  }
  const spyBars = bars.get(proxy) ?? [];
  const sessions = spyBars.map((b) => b.date).filter(date => completedResearchSession(date));
  if (!sessions.length) return { sessions: 0, selections: 0, matured: 0, first_session: null };
  const spy = new Map(spyBars.map((b) => [b.date, b]));
  const byTicker = new Map([...bars].map(([t, list]) => [t, { list, map: new Map(list.map((b) => [b.date, b])), idx: new Map(list.map((b, i) => [b.date, i])) }]));

  // Point-in-time eligibility per session, from bars <= T only.
  const eligibleOn = new Map<string, Set<string>>();
  for (const d of sessions) eligibleOn.set(d, new Set());
  for (const [ticker, t] of byTicker) {
    if (ticker === proxy) continue;
    for (const d of sessions) {
      const i = t.idx.get(d);
      if (i !== undefined && i >= 200 && eligibleAt(t.list.slice(i - 200, i + 1), minPrice, minAdv)) eligibleOn.get(d)!.add(ticker);
    }
  }
  const today = sessions.at(-1)!;
  const todaySize = eligibleOn.get(today)!.size;
  // 80% rule: start at the earliest passing session; skip any later session below the gate.
  const replayDates = sessions.filter((d) => historyCoverage(Math.min(eligibleOn.get(d)!.size, todaySize), todaySize).passes);

  const existingRows = await pagedKeys("research_daily_selections", "lane, session_date");
  const allLanes = [...LANES.map(lane => lane.lane), 'lead'];
  const knownKeys = new Set(existingRows.map(row => `${row.lane}|${row.session_date}`));
  // Include historical holes, not just dates after the latest row in a lane.
  const firstMissing = replayDates.find(date => allLanes.some(lane => !knownKeys.has(`${lane}|${date}`)));
  const previous = firstMissing ? new Date(`${firstMissing}T00:00:00Z`) : null;
  previous?.setUTCDate(previous.getUTCDate() - 1);
  const panel = firstMissing ? await buildPanel(1000, s.market_proxy, HISTORY_DAYS, raw as never, previous?.toISOString().slice(0, 10)) : { rows: [] };
  const rowsByDate = new Map<string, PanelRow[]>();
  for (const r of panel.rows) (rowsByDate.get(r.date) ?? rowsByDate.set(r.date, []).get(r.date)!).push(r);

  const researchers = await listResearchers();
  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const master = assemble((ruleRows ?? []) as unknown as MasterRule[], {
    weights: { trend: Number(s.weight_trend), momentum: Number(s.weight_momentum), volume: Number(s.weight_volume), relative_strength: Number(s.weight_relative_strength), volatility_quality: Number(s.weight_volatility_quality) },
    min_score_to_trade: Number(s.min_score_to_trade), num_day_trades: 1, rsi_max: null, rsi_min: null, atr_pct_min: null, atr_pct_max: null, rel_volume_min: null,
  });
  const lanes: { lane: string; params: LaneParams; bands: Band[] }[] = LANES.map((lane) => {
    const row = researchers.find((r) => r.lane === lane.lane);
    return { lane: lane.lane, params: row?.params && (row.params as LaneParams).weights ? (row.params as LaneParams) : laneSeedParams(lane, s), bands: [] };
  });
  lanes.push({ lane: "lead", params: master, bands: master.bands });

  const existing = new Set(existingRows.map((r) => `${r.lane}|${r.session_date}`));
  const newSel: any[] = [];
  for (const l of lanes) {
    for (const d of replayDates) {
      if (existing.has(`${l.lane}|${d}`)) continue;
      const eligible = eligibleOn.get(d)!;
      const ranked = (rowsByDate.get(d) ?? [])
        .filter((r) => eligible.has(r.ticker) && passesFilters(r, l.params, s, share))
        .map((r) => ({ ticker: r.ticker, score: Number((scoreWith(r, l.params.weights) + bandBonus(r, l.bands)).toFixed(4)), close: r.close }))
        .filter((x) => x.score >= l.params.min_score_to_trade)
        .sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));
      newSel.push({
        lane: l.lane, session_date: d, selected_at: selectionTimestamp(d), ticker: ranked[0]?.ticker ?? null, score: ranked[0]?.score ?? null,
        selection_close: ranked[0]?.close ?? null, eligible_universe: eligible.size, comparable_universe: todaySize, ranked_count: ranked.length,
        runners_up: ranked.slice(1, 5).map(({ ticker, score }) => ({ ticker, score })), universe_basis: UNIVERSE_BASIS, engine_version: SELECTION_ENGINE_VERSION,
      });
    }
  }
  for (let i = 0; i < newSel.length; i += 500) {
    const { error } = await supabaseAdmin.from("research_daily_selections").upsert(newSel.slice(i, i + 500), { onConflict: "lane,session_date", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // Layer 2: create missing evaluations; mature pending ones whose exit session is stored.
  const sel = await pagedKeys("research_daily_selections", "lane, session_date, ticker", (q) => q.not("ticker", "is", null));
  const evals = new Map((await pagedKeys("research_selection_evaluations", "lane, session_date, horizon_sessions, status")).map((r) => [`${r.lane}|${r.session_date}|${r.horizon_sessions}`, r.status]));
  const sessionIdx = new Map(sessions.map((d, i) => [d, i]));
  const inserts: any[] = []; const updates: any[] = [];
  for (const r of sel) {
    const t = sessionIdx.get(r.session_date);
    const tb = byTicker.get(r.ticker);
    if (t === undefined || !tb) continue;
    for (const h of EVAL_HORIZONS) {
      const key = `${r.lane}|${r.session_date}|${h}`;
      const prior = evals.get(key);
      if (prior && prior !== "pending") continue;
      const e = evaluate(sessions, t, h, tb.map, spy);
      const row = { lane: r.lane, session_date: r.session_date, horizon_sessions: h, ticker: r.ticker, ...e, matured_at: e.status === "pending" ? null : new Date().toISOString() };
      if (!prior) inserts.push(row); else if (e.status !== "pending") updates.push(row);
    }
  }
  for (let i = 0; i < inserts.length; i += 500) {
    const { error } = await supabaseAdmin.from("research_selection_evaluations").upsert(inserts.slice(i, i + 500), { onConflict: "lane,session_date,horizon_sessions", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  for (const u of updates) {
    const { lane, session_date, horizon_sessions, ...rest } = u;
    const { error } = await supabaseAdmin.from("research_selection_evaluations").update(rest).eq("lane", lane).eq("session_date", session_date).eq("horizon_sessions", horizon_sessions).eq("status", "pending");
    if (error) throw new Error(error.message);
  }
  return { sessions: replayDates.length, selections: newSel.length, matured: inserts.filter((x) => x.status === "matured").length + updates.length, first_session: replayDates[0] ?? null };
}
