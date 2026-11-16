/** Phase E: independent read-only paper audits. Only integrity history is written elsewhere. */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { nyParts } from "./market-calendar";
import { validateBarFill, validateSameDayHold, recalculateMetrics, reconcileBalance, validateTemporalBoundary, verdictFor, cents } from "./audit-rules";

export type AuditVerdict = "PASS" | "WARNING" | "FAIL";
export interface Discrepancy {
  category: "fill_reconstruction" | "scoreboard_drift" | "balance_leak" | "lookahead_bias";
  severity: "error" | "warning";
  identifier: string;
  expected: string | number;
  actual: string | number;
  reason: string;
}
export interface PillarResult { name: string; verdict: AuditVerdict; auditedCount: number; violationCount: number; summary: string }
export interface LeadAuditReport {
  timestamp: string;
  overallVerdict: AuditVerdict;
  pillars: { reconstruction: PillarResult; statsRecalculation: PillarResult; balanceReconciliation: PillarResult; lookaheadValidation: PillarResult };
  discrepancies: Discrepancy[];
}
type Row = Record<string, unknown>;
type Result = { pillar: PillarResult; discrepancies: Discrepancy[] };

async function pages(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await read(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Row[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
function result(name: string, count: number, discrepancies: Discrepancy[], detail: string): Result {
  const errors = discrepancies.filter(d => d.severity === "error").length;
  const warnings = discrepancies.length - errors;
  return { pillar: { name, verdict: verdictFor(discrepancies, count), auditedCount: count, violationCount: errors,
    summary: `${detail} ${errors} violations; ${warnings} warnings.` }, discrepancies };
}
function warning(category: Discrepancy["category"], identifier: string, reason: string): Discrepancy {
  return { category, severity: "warning", identifier, expected: "Verifiable evidence", actual: "Unavailable", reason };
}
function paperTrades() {
  return pages((from, to) => supabaseAdmin.from("trades").select("id,ticker,strategy_id,entry_date,entry_price,exit_date,exit_price,profit,dollars,status,position_type,hold_days,hold_target_date,created_at")
    .not("strategy_id", "is", null).eq("mode", "paper").order("id").range(from, to));
}
async function reconstruction(trades: Row[], lookback: number): Promise<Result> {
  const ds: Discrepancy[] = [];
  const cutoff = new Date(Date.now() - lookback * 86400000).toISOString().slice(0, 10);
  const recent = trades.filter(t => String(t['entry_date']) >= cutoff || String(t['exit_date'] ?? '') >= cutoff);
  const tickers = [...new Set(recent.map(t => String(t['ticker'])))];
  const dates = [...new Set(recent.flatMap(t => [t['entry_date'], t['exit_date']].filter((d): d is string => typeof d === "string")))];
  const bars: Row[] = [];
  // Batch symbols and page the cross-product; no PostgREST row-cap truncation.
  for (let i = 0; i < tickers.length; i += 40) {
    bars.push(...await pages((from, to) => supabaseAdmin.from("daily_bars").select("ticker,bar_date,low,high")
      .in("ticker", tickers.slice(i, i + 40)).in("bar_date", dates).order("ticker").order("bar_date").range(from, to)));
  }
  const byBar = new Map(bars.map(b => [`${b['ticker']}:${b['bar_date']}`, { low: Number(b['low']), high: Number(b['high']) }]));
  for (const t of recent) {
    for (const side of ["entry", "exit"] as const) {
      if (side === "exit" && t['status'] !== "closed") continue;
      const date = t[`${side}_date`];
      const bar = byBar.get(`${t['ticker']}:${date}`);
      const price = t[`${side}_price`] == null ? null : Number(t[`${side}_price`]);
      const check = validateBarFill(price, bar);
      if (check === "valid") continue;
      ds.push({ category: "fill_reconstruction", severity: check === "missing" ? "warning" : "error", identifier: `${t['ticker']} ${t['id']} (${side})`,
        expected: bar ? `[${bar.low * .995}, ${bar.high * 1.005}]` : `Session bar ${date ?? 'missing date'}`,
        actual: price ?? "Missing fill", reason: check === "missing" ? `${side} session has no usable bar; fill not verified.` : `${side} fill is missing, invalid, or outside the session's 0.5% tolerance.` });
    }
    if (!validateSameDayHold(String(t['entry_date']), t['exit_date'] as string | null, t['hold_target_date'] as string | null, Number(t['hold_days']), String(t['position_type']))) {
      ds.push({ category: "fill_reconstruction", severity: "error", identifier: String(t['id']), expected: String(t['entry_date']), actual: String(t['exit_date']), reason: "Explicit intraday position exited on a different session." });
    }
  }
  if (!recent.length) ds.push(warning("fill_reconstruction", "Paper trades", `No paper trades in the ${lookback}-day window.`));
  return result("Raw-Bar Reconstruction", recent.length, ds, `${recent.length} paper trades, entry and closed exit checks.`);
}
async function scoreboard(trades: Row[]): Promise<Result> {
  const ds: Discrepancy[] = [];
  const { data: snapshot, error } = await supabaseAdmin.from("research_runs").select("summary,created_at").eq("kind", "lab_graph").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const summary = (snapshot?.summary ?? {}) as Row;
  const payload = (summary['payload'] ?? {}) as Row;
  const entrants = (Array.isArray(payload['entrants']) ? payload['entrants'] : []) as Row[];
  const ids = [...new Set(trades.map(t => String(t['strategy_id'])))];
  for (const id of ids) {
    const closed = trades.filter(t => t['strategy_id'] === id && t['status'] === "closed");
    if (closed.some(t => t['profit'] == null || !Number.isFinite(Number(t['profit'])))) {
      ds.push(warning("scoreboard_drift", id, "Closed rows lack booked profit; cannot verify totals."));
      continue;
    }
    const metrics = recalculateMetrics(closed.map(t => Number(t['profit'])));
    const cached = entrants.find(e => e['strategy_id'] === id && e['live'] !== true);
    if (!cached) { ds.push(warning("scoreboard_drift", id, "No matching saved paper scoreboard. Researcher best_evidence uses different backtests and cannot be compared to trade P&L.")); continue; }
    // Different row counts indicate stale cache, not demonstrated mathematical corruption.
    if (Number(cached['trades']) !== metrics.total_trades) {
      ds.push({ category: "scoreboard_drift", severity: "warning", identifier: id, expected: metrics.total_trades, actual: Number(cached['trades']), reason: `Saved scoreboard (${snapshot?.created_at}) covers a different trade count; refresh needed before like-for-like verification.` });
      continue;
    }
    for (const [key, expected, tolerance] of [["total_pnl", metrics.total_profit, .01], ["wins", metrics.wins, 0], ["win_rate", Math.round(metrics.win_rate), .1]] as const) {
      const actual = cached[key];
      if (actual == null && metrics.total_trades === 0 && key === "win_rate") continue;
      if (actual == null || !Number.isFinite(Number(actual))) { ds.push(warning("scoreboard_drift", id, `Saved ${key} is absent.`)); continue; }
      const drift = key === "total_pnl" ? Math.abs(cents(Number(actual)) - cents(expected)) / 100 : Math.abs(Number(actual) - expected);
      if (drift > tolerance + 1e-9) ds.push({ category: "scoreboard_drift", severity: "error", identifier: id, expected, actual: Number(actual), reason: `${key} differs from closed paper rows beyond ${tolerance} tolerance.` });
    }
    if (cached['profit_factor'] != null && metrics.profit_factor != null && Math.abs(Number(cached['profit_factor']) - metrics.profit_factor) > .001) {
      ds.push({ category: "scoreboard_drift", severity: "error", identifier: id, expected: metrics.profit_factor, actual: Number(cached['profit_factor']), reason: "Profit factor differs from gross win/loss recomputation." });
    }
  }
  // Graphs remain saved-ledger based: verify saved accounting identities, never reconstruct trades into curves.
  const ledger = await pages((from, to) => supabaseAdmin.from("researcher_daily_ledger").select("lane,session_date,equity,pnl,pnl_pct").order("lane").order("session_date").range(from, to));
  for (const row of ledger) {
    if (cents(Number(row['equity'])) !== cents(100 + Number(row['pnl'])) || cents(Number(row['pnl_pct'])) !== cents(Number(row['pnl'])))
      ds.push({ category: "scoreboard_drift", severity: "error", identifier: `${row['lane']} ${row['session_date']}`, expected: 100 + Number(row['pnl']), actual: Number(row['equity']), reason: "Saved researcher equity/P&L identity on the $100 base does not reconcile." });
  }
  if (!ids.length || !ledger.length) ds.push(warning("scoreboard_drift", "Coverage", "Paper trade books or saved researcher results are absent."));
  return result("Immutable Scoreboard Recalculation", ids.length + ledger.length, ds, `${ids.length} books and ${ledger.length} saved researcher rows checked.`);
}
async function balances(trades: Row[]): Promise<Result> {
  const ds: Discrepancy[] = [];
  const ledger = await pages((from, to) => supabaseAdmin.from("ledger_entries").select("id,strategy_id,kind,amount,available_on,note").not("strategy_id", "is", null).order("id").range(from, to));
  const ids = [...new Set([...ledger, ...trades].map(t => String(t['strategy_id'])))];
  const today = nyParts().date;
  let count = 0;
  for (const id of ids) {
    const rows = ledger.filter(r => r['strategy_id'] === id);
    const book = trades.filter(t => t['strategy_id'] === id);
    if (!rows.length) { ds.push(warning("balance_leak", id, "No independent cash ledger for this paper book.")); continue; }
    if (rows.some(r => !['deposit', 'withdrawal', 'deploy', 'settle', 'reserve'].includes(String(r['kind']))) || book.some(t => !['open', 'closed', 'pending_mark'].includes(String(t['status'])))) {
      ds.push(warning("balance_leak", id, "Unrecognized cash/position state prevents complete reconciliation.")); continue;
    }
    if (book.some(t => t['status'] === 'closed' && t['profit'] == null)) { ds.push(warning("balance_leak", id, "Closed profits are missing.")); continue; }
    let capital = 0, settled = 0, pending = 0;
    for (const row of rows) {
      const amount = Number(row['amount']);
      // Withdrawals already have a signed negative amount. Reserve-to-deposit transfers are not new capital.
      if (row['kind'] === 'deposit' && row['note'] !== 'Released saved paper profit back into the test') capital += amount;
      if (row['kind'] === 'withdrawal') capital += amount > 0 ? -amount : amount;
      const cashAmount = row['kind'] === 'withdrawal' && amount > 0 ? -amount : amount;
      if (String(row['available_on']) <= today) settled += cashAmount; else pending += cashAmount;
    }
    const realized = book.filter(t => t['status'] === 'closed').reduce((sum, t) => sum + Number(t['profit']), 0);
    // Pending marks are still invested, not settled and not zero-profit closes.
    const cost = book.filter(t => t['status'] === 'open' || t['status'] === 'pending_mark').reduce((sum, t) => sum + Number(t['dollars']), 0);
    const check = reconcileBalance(capital, realized, settled, pending, cost);
    count++;
    if (!check.valid) ds.push({ category: "balance_leak", severity: "error", identifier: id, expected: check.expected, actual: check.actual,
      reason: `Capital + realized P&L differs from settled cash + unsettled/reserved cash + invested cost by $${check.difference.toFixed(2)}.` });
  }
  if (!ids.length) ds.push(warning("balance_leak", "Paper books", "No paper capital records to reconcile."));
  return result("Closed-Loop Balance Reconciliation", count, ds, `${count} paper books reconciled to the penny; live cash excluded.`);
}
async function lookahead(sampleCount: number): Promise<Result> {
  const ds: Discrepancy[] = [];
  const sample = <T,>(rows: T[]) => {
    const shuffled = [...rows];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
      const j = random % (i + 1);
      const left = shuffled[i];
      const right = shuffled[j];
      if (left === undefined || right === undefined) continue;
      shuffled[i] = right;
      shuffled[j] = left;
    }
    return shuffled.slice(0, sampleCount);
  };
  const [runs, predictions, reports] = await Promise.all([
    supabaseAdmin.from("research_runs").select("id,kind,config,summary").in("kind", ['department', 'strategy_research', 'learning']).order("created_at", { ascending: false }).limit(sampleCount * 4),
    supabaseAdmin.from("research_horizon_predictions").select("id,prediction_date,factors").order("predicted_at", { ascending: false }).limit(sampleCount * 4),
    supabaseAdmin.from("verification_reports").select("id,signal_date,history_end").order("created_at", { ascending: false }).limit(sampleCount * 4),
  ]);
  for (const response of [runs, predictions, reports]) if (response.error) throw new Error(response.error.message);
  let count = 0;
  const check = (id: string, signal: unknown, end: unknown) => {
    const state = validateTemporalBoundary(signal, end);
    if (state === 'missing') ds.push(warning("lookahead_bias", id, "No explicit signal/data cutoff provenance; outcome/evaluate dates are not input boundaries."));
    else { count++; if (state === 'invalid') ds.push({ category: "lookahead_bias", severity: "error", identifier: id, expected: String(signal), actual: String(end), reason: "Recorded input history extends beyond the signal boundary." }); }
  };
  for (const r of sample(runs.data ?? [])) {
    const config = (r.config ?? {}) as Row;
    const summary = (r.summary ?? {}) as Row;
    check(`${r.kind} ${r.id}`, config['signal_date'] ?? summary['signal_date'], config['history_end'] ?? config['max_bar_date'] ?? summary['history_end']);
  }
  for (const p of sample(predictions.data ?? [])) { const factors = (p.factors ?? {}) as Row; check(`Prediction ${p.id}`, p.prediction_date, factors['history_end'] ?? factors['max_bar_date']); }
  for (const r of sample(reports.data ?? [])) check(`Verification ${r.id}`, r.signal_date, r.history_end);
  if (count < 5) ds.push(warning("lookahead_bias", "Sample coverage", `Only ${count} verifiable records; at least 5 required. Legacy evidence cannot prove absence of lookahead.`));
  return result("Look-Ahead Bias Validation", count, ds, `${count} recorded input boundaries verified.`);
}

export async function runLeadSelfAudit(options: { lookbackDays?: number; sampleCount?: number } = {}): Promise<LeadAuditReport> {
  let trades: Row[] = [];
  let tradeError: unknown;
  try { trades = await paperTrades(); } catch (error) { tradeError = error; }
  const safe = async (name: string, category: Discrepancy['category'], run: () => Promise<Result>, needsTrades = false): Promise<Result> => {
    try { if (needsTrades && tradeError) throw tradeError; return await run(); }
    catch (error) { console.error(`[audit] ${name}:`, error instanceof Error ? error.message : 'read failed'); return result(name, 0, [warning(category, name, 'Audit data could not be read; this pillar is not verified.')], 'Check unavailable.'); }
  };
  const [reconstructionResult, stats, balance, temporal] = await Promise.all([
    safe('Raw-Bar Reconstruction', 'fill_reconstruction', () => reconstruction(trades, options.lookbackDays ?? 60), true),
    safe('Immutable Scoreboard Recalculation', 'scoreboard_drift', () => scoreboard(trades), true),
    safe('Closed-Loop Balance Reconciliation', 'balance_leak', () => balances(trades), true),
    safe('Look-Ahead Bias Validation', 'lookahead_bias', () => lookahead(options.sampleCount ?? 15)),
  ]);
  const pillars = { reconstruction: reconstructionResult.pillar, statsRecalculation: stats.pillar, balanceReconciliation: balance.pillar, lookaheadValidation: temporal.pillar };
  const discrepancies = [reconstructionResult, stats, balance, temporal].flatMap(r => r.discrepancies);
  return { timestamp: new Date().toISOString(), overallVerdict: Object.values(pillars).some(p => p.verdict === 'FAIL') ? 'FAIL' : Object.values(pillars).some(p => p.verdict === 'WARNING') ? 'WARNING' : 'PASS', pillars, discrepancies };
}
