/**
 * One place that ranks stocks with the RESEARCHERS' own formulas.
 *
 * Each of the six backup researchers scores the universe with its own factor
 * weights and its own entry filters, and the Lead Researcher scores it with the
 * current Master Formula. Because every lane owns a different set of scoring
 * variables, every lane produces its own board — if two lanes land on the same
 * ticker it is a genuine agreement, not shared code.
 *
 * Paper research only: nothing here places an order or touches live money.
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
} from "./department.server";
import { assemble, bandBonus, type Band, type MasterRule } from "./master-formula.server";
import { loadSettings, volumeShare, type Settings } from "./scan.server";

/** The Lead Researcher's book key. Never one of the six rotating lanes. */
export const LEAD_LANE = "lead";

export interface BoardRow {
  ticker: string;
  rank: number;
  score: number;
  close: number;
  sma20: number | null;
  tradeable: boolean;
  invalidation: string;
}

/** How many stocks the whole universe is sampled down to for research boards. */
const BOARD_UNIVERSE = 300;

function baseParams(s: Settings): LaneParams {
  return {
    weights: {
      trend: Number(s.weight_trend),
      momentum: Number(s.weight_momentum),
      volume: Number(s.weight_volume),
      relative_strength: Number(s.weight_relative_strength),
      volatility_quality: Number(s.weight_volatility_quality),
    },
    min_score_to_trade: Number(s.min_score_to_trade),
    // A researcher never runs more than one stock at a time.
    num_day_trades: 1,
    rsi_max: null,
    rsi_min: null,
    atr_pct_min: null,
    atr_pct_max: null,
    rel_volume_min: null,
  };
}

export interface ResearchBoards {
  as_of: string | null;
  /** lane key -> display name, including the Lead Researcher. */
  names: Map<string, string>;
  /** lane key -> that researcher's own top 10 for the latest session. */
  boards: Map<string, BoardRow[]>;
}

/**
 * Build every researcher's current top 10 in a single pass over the cached
 * bars: one database read, N in-memory scorings.
 */
export async function researchBoards(): Promise<ResearchBoards> {
  const s = await loadSettings();
  const share = await volumeShare(s);
  const panel = await buildPanel(BOARD_UNIVERSE, s.market_proxy);
  // Use the most recent session with real coverage. The very newest bar date
  // can be a partial download covering a handful of tickers, which would rank
  // a four-stock board and make every researcher look like it agrees.
  const counts = new Map<string, number>();
  for (const r of panel.rows) counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
  const best = Math.max(0, ...counts.values());
  const asOf =
    [...panel.dates].reverse().find((d) => (counts.get(d) ?? 0) >= best * 0.5) ?? null;
  const rows = asOf ? panel.rows.filter((r) => r.date === asOf) : [];

  const build = (params: LaneParams, bands: Band[] = []): BoardRow[] =>
    rows
      .filter((r) => passesFilters(r, params, s, share))
      .map((r) => ({ row: r, score: scoreWith(r, params.weights) + bandBonus(r, bands) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((x, i) => ({
        ticker: x.row.ticker,
        rank: i + 1,
        score: Number(x.score.toFixed(2)),
        close: Number(x.row.close.toFixed(2)),
        sma20: null,
        tradeable: x.score >= params.min_score_to_trade,
        invalidation: "",
      }));

  const researchers = await listResearchers();
  const names = new Map<string, string>();
  const boards = new Map<string, BoardRow[]>();

  for (const lane of LANES) {
    const row = researchers.find((r) => r.lane === lane.lane);
    const params =
      row?.params && (row.params as LaneParams).weights
        ? (row.params as LaneParams)
        : laneSeedParams(lane, s);
    names.set(lane.lane, lane.name);
    boards.set(lane.lane, build(params));
  }

  // The Lead Researcher ranks with the Master Formula: validated rules only.
  const { data: ruleRows } = await supabaseAdmin.from("master_rules").select("*");
  const master = assemble((ruleRows ?? []) as unknown as MasterRule[], baseParams(s));
  names.set(LEAD_LANE, "Lead Researcher");
  boards.set(LEAD_LANE, build(master, master.bands));

  return { as_of: asOf, names, boards };
}
