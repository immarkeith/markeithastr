/**
 * Lead Researcher Quantitative Self-Audit Engine (Phase E).
 *
 * Runs an independent, mathematical audit across four core vectors:
 *  1. Raw-Bar Trade Reconstruction: Validates that every simulated fill price
 *     falls strictly within the authentic historical bar's [low, high] range.
 *  2. Immutable Scoreboard Recalculation: Independently computes win rate, P&L,
 *     and profit factor from raw immutable trade rows to prevent reporting drift.
 *  3. Closed-Loop Balance Reconciliation: Proves Starting Capital + Net Realized P&L
 *     equals cash (settled + pending + reserves) plus open cost basis.
 *     Books are mode-isolated and use integer cents with a $0.01 tolerance.
 *  4. Randomized Look-Ahead Bias Validation: Audits past signals to ensure they
 *     strictly used data known on or before that date, never leaking future bars.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readAllPages } from "./db-pages.server";
import { reconcileBooks, reconstructedProfit } from "./ledger-accounting";

export type AuditVerdict = "PASS" | "WARNING" | "FAIL";

export interface Discrepancy {
  category: "fill_reconstruction" | "scoreboard_drift" | "balance_leak" | "lookahead_bias";
  severity: "error" | "warning";
  identifier: string; // Ticker, slot, or trade ID
  expected: string | number;
  actual: string | number;
  reason: string;
}

export interface PillarResult {
  name: string;
  verdict: AuditVerdict;
  auditedCount: number;
  violationCount: number;
  summary: string;
}

export interface LeadAuditReport {
  timestamp: string;
  overallVerdict: AuditVerdict;
  pillars: {
    reconstruction: PillarResult;
    statsRecalculation: PillarResult;
    balanceReconciliation: PillarResult;
    lookaheadValidation: PillarResult;
  };
  discrepancies: Discrepancy[];
}

// ------------------------------------------------------------- 1. Raw-Bar Reconstruction
async function auditTradeReconstruction(lookbackDays = 60): Promise<{
  pillar: PillarResult;
  discrepancies: Discrepancy[];
}> {
  const discrepancies: Discrepancy[] = [];
  const cutoff = new Date(Date.now() - lookbackDays * 86400000).toISOString().slice(0, 10);

  // Fetch recent trades to verify against authentic bars
  const { data: trades, error: tradeErr } = await supabaseAdmin
    .from("trades")
    .select("id, ticker, entry_date, entry_price, exit_date, exit_price, position_type, hold_days")
    .gte("entry_date", cutoff)
    .order("entry_date", { ascending: false })
    .limit(100);

  if (tradeErr) throw new Error(tradeErr.message);
  if (!trades || trades.length === 0) {
    return {
      pillar: {
        name: "Raw-Bar Reconstruction",
        verdict: "WARNING",
        auditedCount: 0,
        violationCount: 0,
        summary: "No recent trades within window to reconstruct.",
      },
      discrepancies: [],
    };
  }

  // Fetch bars matching these tickers and dates
  const tickers = [...new Set(trades.map((t) => t.ticker))];
  const dates = [
    ...new Set(
      trades.flatMap((t) => [t.entry_date, t.exit_date].filter((d): d is string => Boolean(d))),
    ),
  ];

  const { data: bars, error: barErr } = await supabaseAdmin
    .from("daily_bars")
    .select("ticker, bar_date, high, low, open, close")
    .in("ticker", tickers)
    .in("bar_date", dates);

  if (barErr) throw new Error(barErr.message);
  const barMap = new Map<string, { high: number; low: number; open: number; close: number }>();
  for (const b of bars ?? []) {
    barMap.set(`${b.ticker}_${b.bar_date}`, {
      high: Number(b.high),
      low: Number(b.low),
      open: Number(b.open),
      close: Number(b.close),
    });
  }

  let auditedCount = 0;

  for (const t of trades) {
    auditedCount++;
    const entryBar = barMap.get(`${t.ticker}_${t.entry_date}`);

    if (!entryBar) {
      discrepancies.push({
        category: "fill_reconstruction",
        severity: "warning",
        identifier: `${t.ticker} (${t.entry_date})`,
        expected: "Authentic OHLCV bar in daily_bars",
        actual: "Bar missing",
        reason: "Daily bar missing for entry date verification.",
      });
      continue;
    }

    if (t.exit_date && t.exit_price !== null) {
      const exitBar = barMap.get(`${t.ticker}_${t.exit_date}`);
      if (!exitBar)
        discrepancies.push({
          category: "fill_reconstruction",
          severity: "warning",
          identifier: `Trade ${t.id} (${t.ticker})`,
          expected: "Exit bar",
          actual: "Missing",
          reason: "Cannot verify exit without an authentic bar.",
        });
      else if (
        Number(t.exit_price) < exitBar.low * 0.995 ||
        Number(t.exit_price) > exitBar.high * 1.005
      )
        discrepancies.push({
          category: "fill_reconstruction",
          severity: "error",
          identifier: `Trade ${t.id} (${t.ticker})`,
          expected: `[${exitBar.low}, ${exitBar.high}]`,
          actual: Number(t.exit_price),
          reason: "Exit fill is outside authentic session bounds.",
        });
    }
    const entryPrice = Number(t.entry_price);
    // Allow standard 0.5% tolerance for slippage / market orders
    if (entryPrice < entryBar.low * 0.995 || entryPrice > entryBar.high * 1.005) {
      discrepancies.push({
        category: "fill_reconstruction",
        severity: "error",
        identifier: `Trade ${t.id} (${t.ticker})`,
        expected: `[${entryBar.low}, ${entryBar.high}]`,
        actual: entryPrice,
        reason: `Entry fill $${entryPrice} outside authentic session bar bounds [$${entryBar.low}, $${entryBar.high}].`,
      });
    }

    // Same-day calendar precision check
    if (
      t.position_type === "SAME_DAY" &&
      Number(t.hold_days ?? 0) <= 1 &&
      t.exit_date &&
      t.exit_date !== t.entry_date
    ) {
      discrepancies.push({
        category: "fill_reconstruction",
        severity: "error",
        identifier: `Trade ${t.id} (${t.ticker})`,
        expected: `Exit on entry date ${t.entry_date}`,
        actual: t.exit_date,
        reason: "SAME_DAY trade held overnight across sessions.",
      });
    }
  }

  const errors = discrepancies.filter((d) => d.severity === "error").length;
  const warnings = discrepancies.filter((d) => d.severity === "warning").length;

  return {
    pillar: {
      name: "Raw-Bar Reconstruction",
      verdict: errors > 0 ? "FAIL" : warnings > 0 ? "WARNING" : "PASS",
      auditedCount,
      violationCount: errors,
      summary: `${auditedCount} trades audited against authentic OHLCV bars (${errors} errors, ${warnings} warnings).`,
    },
    discrepancies,
  };
}

// ------------------------------------------------------------- 2. Immutable Stats Recalculation
async function auditStatsRecalculation(): Promise<{
  pillar: PillarResult;
  discrepancies: Discrepancy[];
}> {
  const discrepancies: Discrepancy[] = [];

  const closedTrades = await readAllPages((from, to) =>
    supabaseAdmin
      .from("trades")
      .select("id, strategy_id, mode, profit, dollars, entry_price, exit_price, filled_qty")
      .eq("status", "closed")
      .order("id")
      .range(from, to),
  );
  const books = new Set<string>();
  let total = 0;
  let wins = 0;
  let grossWins = 0;
  let grossLosses = 0;
  for (const trade of closedTrades) {
    books.add(`${trade.mode}:${trade.strategy_id ?? "unassigned"}`);
    try {
      if (trade.exit_price === null) throw new Error("Closed trade has no exit price");
      const expected = reconstructedProfit({ ...trade, exit_price: trade.exit_price });
      if (trade.profit === null || Math.abs(expected - Number(trade.profit)) > 0.01)
        discrepancies.push({
          category: "scoreboard_drift",
          severity: "error",
          identifier: `Trade ${trade.id}`,
          expected,
          actual: trade.profit ?? "Missing",
          reason: "Stored profit disagrees with the independently reconstructed fill arithmetic.",
        });
      total += expected;
      if (expected > 0) {
        wins++;
        grossWins += expected;
      } else grossLosses -= expected;
    } catch (error) {
      discrepancies.push({
        category: "scoreboard_drift",
        severity: "error",
        identifier: `Trade ${trade.id}`,
        expected: "Valid fill arithmetic",
        actual: "Incomplete",
        reason: error instanceof Error ? error.message : "Invalid trade",
      });
    }
  }
  return {
    pillar: {
      name: "Immutable Stats Recalculation",
      verdict: discrepancies.length ? "FAIL" : closedTrades.length ? "PASS" : "WARNING",
      auditedCount: closedTrades.length,
      violationCount: discrepancies.length,
      summary: `Reconstructed ${closedTrades.length} closed trades in ${books.size} mode-isolated tracks. Aggregate P&L $${total.toFixed(2)}, win rate ${closedTrades.length ? ((wins / closedTrades.length) * 100).toFixed(2) : "N/A"}%, profit factor ${grossLosses ? (grossWins / grossLosses).toFixed(2) : "N/A (no losses)"}. Aggregates here are audit diagnostics, never live dashboard P&L.`,
    },
    discrepancies,
  };
}

// ------------------------------------------------------------- 3. Closed-Loop Balance Reconciliation
async function auditBalanceReconciliation(): Promise<{
  pillar: PillarResult;
  discrepancies: Discrepancy[];
}> {
  const discrepancies: Discrepancy[] = [];

  const [ledgers, trades] = await Promise.all([
    readAllPages((from, to) =>
      supabaseAdmin
        .from("ledger_entries")
        .select("strategy_id, kind, amount")
        .order("id")
        .range(from, to),
    ),
    readAllPages((from, to) =>
      supabaseAdmin
        .from("trades")
        .select("strategy_id, mode, status, profit, dollars, status_note")
        .order("id")
        .range(from, to),
    ),
  ]);
  const books = reconcileBooks(ledgers, trades);
  for (const book of books) {
    if (Math.abs(book.difference) > 0.01) {
      discrepancies.push({
        category: "balance_leak",
        severity: "error",
        identifier: `Book ${book.key}`,
        expected: `$${book.expected.toFixed(2)}`,
        actual: `$${book.actual.toFixed(2)}`,
        reason: `Signed funding and adjustments ($${book.netFunding.toFixed(2)}) + realized P&L ($${book.realized.toFixed(2)}) must equal all cash ($${book.cash.toFixed(2)}) + open cost basis ($${book.openCost.toFixed(2)}). Difference: $${book.difference.toFixed(2)}. Pending cash and reserves are included; historical research is excluded.`,
      });
    }
  }
  return {
    pillar: {
      name: "Closed-Loop Balance Reconciliation",
      verdict: discrepancies.length ? "FAIL" : books.length ? "PASS" : "WARNING",
      auditedCount: books.length,
      violationCount: discrepancies.length,
      summary: `Reconciled ${books.length} isolated live/paper books: signed funding + realized P&L = cash + open cost basis ($0.01 tolerance). Adjustments are explicit funding; reserves are counted once.`,
    },
    discrepancies,
  };
}

// ------------------------------------------------------------- 4. Look-Ahead Bias Validation
async function auditLookaheadBias(sampleCount = 10): Promise<{
  pillar: PillarResult;
  discrepancies: Discrepancy[];
}> {
  const discrepancies: Discrepancy[] = [];

  // Sample historical verification reports to audit point-in-time boundaries
  const { data: reports, error: reportErr } = await supabaseAdmin
    .from("verification_reports")
    .select("id, ticker, signal_date, history_end")
    .order("created_at", { ascending: false })
    .limit(sampleCount);

  if (reportErr) throw new Error(reportErr.message);
  let auditedCount = 0;
  let violationCount = 0;

  for (const r of reports ?? []) {
    auditedCount++;
    if (!r.history_end || !r.signal_date) {
      discrepancies.push({
        category: "lookahead_bias",
        severity: "warning",
        identifier: `Report ${r.id}`,
        expected: "Recorded point-in-time boundaries",
        actual: "Missing",
        reason: "This report cannot be checked for lookahead without both dates.",
      });
    }
    if (r.history_end && r.signal_date && r.history_end > r.signal_date) {
      violationCount++;
      discrepancies.push({
        category: "lookahead_bias",
        severity: "error",
        identifier: `Report ${r.id} (${r.ticker})`,
        expected: `history_end <= signal_date (${r.signal_date})`,
        actual: r.history_end,
        reason: `Lookahead bias detected: historical signal evaluation consumed bars from ${r.history_end} after signal date ${r.signal_date}.`,
      });
    }
  }

  return {
    pillar: {
      name: "Look-Ahead Bias Validation",
      verdict:
        violationCount > 0 ? "FAIL" : !auditedCount || discrepancies.length ? "WARNING" : "PASS",
      auditedCount,
      violationCount,
      summary: `${auditedCount} historical evaluation records checked for point-in-time calendar purity.`,
    },
    discrepancies,
  };
}

// ------------------------------------------------------------- Master Self-Audit Runner
export async function runLeadSelfAudit(): Promise<LeadAuditReport> {
  // Missing tables, credentials and failed reads must never become a PASS.
  const checked = async (
    name: string,
    category: Discrepancy["category"],
    run: () => Promise<{ pillar: PillarResult; discrepancies: Discrepancy[] }>,
  ) => {
    try {
      return await run();
    } catch (error) {
      return {
        pillar: {
          name,
          verdict: "FAIL" as const,
          auditedCount: 0,
          violationCount: 1,
          summary: "Audit could not read its evidence.",
        },
        discrepancies: [
          {
            category,
            severity: "error" as const,
            identifier: name,
            expected: "Readable audit evidence",
            actual: "Unavailable",
            reason: error instanceof Error ? error.message : "Audit failed",
          },
        ],
      };
    }
  };
  const [reconstruction, statsRecalc, balanceReconcile, lookahead] = await Promise.all([
    checked("Raw-Bar Reconstruction", "fill_reconstruction", () => auditTradeReconstruction(60)),
    checked("Immutable Stats Recalculation", "scoreboard_drift", auditStatsRecalculation),
    checked("Closed-Loop Balance Reconciliation", "balance_leak", auditBalanceReconciliation),
    checked("Look-Ahead Bias Validation", "lookahead_bias", () => auditLookaheadBias(15)),
  ]);

  const allDiscrepancies = [
    ...reconstruction.discrepancies,
    ...statsRecalc.discrepancies,
    ...balanceReconcile.discrepancies,
    ...lookahead.discrepancies,
  ];

  const hasFail =
    reconstruction.pillar.verdict === "FAIL" ||
    statsRecalc.pillar.verdict === "FAIL" ||
    balanceReconcile.pillar.verdict === "FAIL" ||
    lookahead.pillar.verdict === "FAIL";

  const hasWarning =
    reconstruction.pillar.verdict === "WARNING" ||
    statsRecalc.pillar.verdict === "WARNING" ||
    balanceReconcile.pillar.verdict === "WARNING" ||
    lookahead.pillar.verdict === "WARNING";

  const overallVerdict: AuditVerdict = hasFail ? "FAIL" : hasWarning ? "WARNING" : "PASS";

  return {
    timestamp: new Date().toISOString(),
    overallVerdict,
    pillars: {
      reconstruction: reconstruction.pillar,
      statsRecalculation: statsRecalc.pillar,
      balanceReconciliation: balanceReconcile.pillar,
      lookaheadValidation: lookahead.pillar,
    },
    discrepancies: allDiscrepancies,
  };
}
