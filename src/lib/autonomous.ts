/**
 * Phase L — pure decision rules for the autonomous live selector.
 * No I/O here, so every rule is unit-tested.
 */
import { nextTradingDay } from "./market-calendar";

export interface LaneRecord {
  lane: string;
  /** Saved-ledger return over the lookback window, in percent. */
  track_pct: number;
  /** Ticker the researcher holds/picked at the latest saved session. */
  pick: string | null;
  hold_days: number;
}

export interface Candidate {
  ticker: string;
  score: number;
  tradeable: boolean;
}

export interface Selection {
  ticker: string;
  owning_researcher: string;
  hold_days: number;
  confidence: number;
  agreeing: string[];
}

/**
 * Rank today's fresh-scan candidates by researcher confidence: each researcher
 * with a positive saved track record "votes" for its own pick, weighted by
 * that record. The owner is the most confident agreeing researcher; with no
 * agreement the top candidate is owned by the best-performing researcher.
 */
export function selectCandidate(candidates: Candidate[], lanes: LaneRecord[]): Selection | null {
  const pool = candidates.filter((c) => c.tradeable).slice(0, 10);
  if (pool.length === 0) return null;
  const trusted = lanes.filter((l) => l.track_pct > 0).sort((a, b) => b.track_pct - a.track_pct);
  if (trusted.length === 0) return null;
  const maxScore = Math.max(...pool.map((c) => c.score), 1);
  let best: Selection | null = null;
  for (const c of pool) {
    const agreeing = trusted.filter((l) => l.pick === c.ticker);
    const vote = agreeing.reduce((s, l) => s + l.track_pct, 0);
    const confidence = Number((c.score / maxScore + vote / 10).toFixed(4));
    if (!best || confidence > best.confidence) {
      const owner = agreeing[0] ?? trusted[0]!;
      best = {
        ticker: c.ticker,
        owning_researcher: owner.lane,
        hold_days: owner.hold_days,
        confidence,
        agreeing: agreeing.map((l) => l.lane),
      };
    }
  }
  return best;
}

/** Exit date counted in trading days; 0 = sell the same session. */
export function holdUntil(entryDate: string, holdDays: number): string {
  let d = entryDate;
  for (let i = 0; i < Math.max(0, Math.floor(holdDays)); i++) d = nextTradingDay(d);
  return d;
}

/** Strict time exit: due on or after its exit date, never earlier. */
export function isExitDue(holdTargetDate: string | null, today: string): boolean {
  return !holdTargetDate || today >= holdTargetDate;
}

export interface GateInput {
  enabled: boolean;
  paper_mode: boolean;
  trades_today: number;
  max_daily_trades: number;
  realized_today: number;
  unrealized_open: number;
  daily_loss_limit: number;
  stake: number;
  max_stake: number;
  cash: number;
  account_active: boolean;
  kill_switch: boolean;
  spy_move_pct: number | null;
  spy_limit_pct: number;
}

/** Every reason a live autonomous buy must NOT happen. Empty = allowed. */
export function entryBlockers(g: GateInput): string[] {
  const out: string[] = [];
  if (!g.enabled) out.push("Autonomous live trading is switched off.");
  if (g.paper_mode) out.push("Simulation mode is on — live orders are disabled.");
  if (!g.account_active) out.push("The broker account is not active.");
  if (g.trades_today >= g.max_daily_trades) out.push(`Daily cap reached (${g.max_daily_trades}).`);
  if (g.realized_today + g.unrealized_open <= -Math.abs(g.daily_loss_limit))
    out.push(`Daily loss limit of $${g.daily_loss_limit} reached.`);
  if (!(g.stake > 0) || g.stake > g.max_stake) out.push(`Stake must be between $1 and $${g.max_stake}.`);
  if (g.cash < g.stake) out.push(`Only $${g.cash.toFixed(2)} cleared cash for a $${g.stake.toFixed(2)} stake.`);
  if (g.kill_switch) {
    if (g.spy_move_pct === null) out.push("Market swing check unavailable — skipping for safety.");
    else if (Math.abs(g.spy_move_pct) > g.spy_limit_pct)
      out.push(`SPY moved ${g.spy_move_pct.toFixed(2)}% (limit ±${g.spy_limit_pct}%).`);
  }
  return out;
}

/** Hard ceiling regardless of what is saved in settings. */
export const AUTO_MAX_STAKE = 50;
