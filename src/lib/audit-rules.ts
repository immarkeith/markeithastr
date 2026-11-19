/** Deterministic audit math. Never mutates research or trading state. */
export const FILL_TOLERANCE = 0.005;
export const cents = (value: number) => Math.round(value * 100);

// Only explicit quarantine evidence permits skipping price reconstruction.
export function isQuarantinedTrade(trade: { status: unknown; status_note?: unknown }) {
  return trade.status === "pending_mark" ||
    (typeof trade.status_note === "string" && /Pending Market Mark|Needs review.*entry|entry.*Needs review|entry and exit marks unverified/i.test(trade.status_note));
}

export function validateLedgerIdentity(equity: number, pnl: number, pnlPct: number) {
  return [equity, pnl, pnlPct].every(Number.isFinite) &&
    Math.abs(equity - (100 + pnl)) <= 0.01 + 1e-9 &&
    Math.abs(pnlPct - pnl) <= 0.01 + 1e-9;
}

type CashTrade = { id: string; status: string; profit: number | null; dollars: number; quarantined: boolean };
type CashEntry = { trade_id: string | null; kind: string; amount: number };
export function paperCashLifecycle(trades: CashTrade[], entries: CashEntry[]) {
  let cost = 0, realized = 0;
  const issues: { severity: "error" | "warning"; identifier: string; reason: string }[] = [];
  const groups = new Map<string, CashEntry[]>();
  for (const row of entries) {
    if (!Number.isFinite(row.amount)) issues.push({ severity: "error", identifier: row.trade_id ?? "Cash ledger", reason: "Cash ledger contains an invalid amount." });
    if (!["deploy", "settle", "reserve"].includes(row.kind)) continue;
    if (!row.trade_id) {
      // Legacy reserve transfers have no position identity; they remain in cash.
      if (row.kind !== "reserve") issues.push({ severity: "warning", identifier: "Cash ledger", reason: "Unlinked deployment or settlement prevents lifecycle verification." });
      continue;
    }
    const rows = groups.get(row.trade_id) ?? [];
    rows.push(row); groups.set(row.trade_id, rows);
  }
  for (const [id, rows] of groups) {
    const trade = trades.find(t => t.id === id);
    const deploys = rows.filter(r => r.kind === "deploy");
    const settled = rows.some(r => r.kind === "settle");
    const deployed = -deploys.reduce((sum, r) => sum + r.amount, 0);
    if (!trade || deploys.length !== 1) {
      issues.push({ severity: "warning", identifier: id, reason: "Missing trade or unique deployment; cash lifecycle cannot be verified." });
      continue;
    }
    if (deploys.some(r => r.amount >= 0) || !Number.isFinite(trade.dollars) || cents(deployed) !== cents(trade.dollars))
      issues.push({ severity: "error", identifier: id, reason: "Deployed cash differs from the recorded paper stake." });
    if (!settled) {
      cost += deployed;
      if (trade.status === "closed" || rows.some(r => r.kind === "reserve")) issues.push({ severity: "error", identifier: id, reason: "Closed position or profit reserve has no settlement entry." });
      continue;
    }
    if (trade.quarantined) {
      const proceeds = rows.filter(r => r.kind !== "deploy").reduce((sum, r) => sum + r.amount, 0);
      // A previously returned stake is not still invested. Never infer P&L from an unverified mark.
      if (cents(proceeds) !== cents(deployed)) issues.push({ severity: "error", identifier: id, reason: "Quarantined settlement is not a principal-only return; cash needs review." });
      else issues.push({ severity: "warning", identifier: id, reason: "Quarantined principal was already returned; no verified P&L recognized." });
    } else if (trade.status !== "closed" || trade.profit === null || !Number.isFinite(trade.profit)) {
      issues.push({ severity: "error", identifier: id, reason: "Settled position lacks a verified closed profit." });
    } else {
      realized += trade.profit;
      const proceeds = rows.filter(r => r.kind !== "deploy").reduce((sum, r) => sum + r.amount, 0);
      if (cents(proceeds) !== cents(deployed + trade.profit)) issues.push({ severity: "error", identifier: id, reason: "Settlement proceeds differ from stake plus booked profit." });
    }
  }
  for (const trade of trades) if (!groups.has(trade.id))
    issues.push({ severity: "warning", identifier: trade.id, reason: "Research trade has no linked cash lifecycle; excluded from cash-book P&L reconciliation." });
  return { cost, realized, issues, complete: !issues.some(i => i.reason.includes("cannot be verified") || i.reason.includes("prevents lifecycle")) };
}

export function validateBarFill(price: number | null, bar?: { low: number; high: number }) {
  if (!bar || !Number.isFinite(bar.low) || !Number.isFinite(bar.high) || bar.low <= 0 || bar.high < bar.low) return "missing";
  if (price === null || !Number.isFinite(price) || price <= 0) return "invalid";
  const epsilon = Number.EPSILON * Math.max(price, bar.high) * 4;
  return price + epsilon >= bar.low * (1 - FILL_TOLERANCE) && price - epsilon <= bar.high * (1 + FILL_TOLERANCE) ? "valid" : "invalid";
}

export function validateSameDayHold(entry: string, exit: string | null, target: string | null, holdDays: number, positionType: string) {
  // Historical swings inherited the SAME_DAY database default. Require positive intent.
  const intraday = positionType === "SAME_DAY" && holdDays === 0 && target === entry;
  return !intraday || !exit || exit === entry;
}

export function recalculateMetrics(profits: number[]) {
  const wins = profits.filter(p => p > 0);
  const losses = profits.filter(p => p < 0);
  const grossWins = wins.reduce((a, b) => a + b, 0);
  const grossLosses = -losses.reduce((a, b) => a + b, 0);
  return { total_trades: profits.length, wins: wins.length, losses: losses.length,
    win_rate: profits.length ? wins.length / profits.length * 100 : 0,
    total_profit: cents(profits.reduce((a, b) => a + b, 0)) / 100,
    profit_factor: grossLosses ? grossWins / grossLosses : null };
}

export function reconcileBalance(capital: number, realized: number, settled: number, unsettled: number, openCost: number) {
  const expected = cents(capital) + cents(realized);
  const actual = cents(settled) + cents(unsettled) + cents(openCost);
  return { expected: expected / 100, actual: actual / 100, difference: (actual - expected) / 100, valid: expected === actual };
}

export function validateTemporalBoundary(signal: unknown, historyEnd: unknown) {
  if (typeof signal !== "string" || typeof historyEnd !== "string") return "missing";
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) && Number.isFinite(Date.parse(v));
  if (!validDate(signal) || !validDate(historyEnd)) return "missing";
  return Date.parse(historyEnd) <= Date.parse(signal) ? "valid" : "invalid";
}

export function verdictFor(discrepancies: { severity: string }[], count: number) {
  return discrepancies.some(d => d.severity === "error") ? "FAIL" : !count || discrepancies.length ? "WARNING" : "PASS";
}