import { describe, expect, test } from "bun:test";
import { validateBarFill, validateSameDayHold, recalculateMetrics, reconcileBalance, validateTemporalBoundary, verdictFor, isQuarantinedTrade, validateLedgerIdentity, paperCashLifecycle } from "./audit-rules";

describe("Phase E quantitative rules", () => {
  test("explicit quarantines warn but ordinary invalid fills remain invalid", () => {
    expect(isQuarantinedTrade({ status: "pending_mark" })).toBe(true);
    expect(isQuarantinedTrade({ status: "closed", status_note: "Pending Market Mark — entry and exit marks unverified" })).toBe(true);
    expect(isQuarantinedTrade({ status: "closed", status_note: "paper 3-trading-day hold complete" })).toBe(false);
    expect(validateBarFill(72.52, { low: 101.41, high: 103.87 })).toBe("invalid");
  });
  test("scoreboard identities tolerate one cent but not genuine drift or missing math", () => {
    expect(validateLedgerIdentity(138.455, 38.455, 38.455)).toBe(true);
    expect(validateLedgerIdentity(80.915, -19.085, -19.085)).toBe(true);
    expect(validateLedgerIdentity(100.01, 0, 0)).toBe(true);
    expect(validateLedgerIdentity(100.011, 0, 0)).toBe(false);
    expect(validateLedgerIdentity(100, 0, 0.011)).toBe(false);
    expect(validateLedgerIdentity(NaN, 0, 0)).toBe(false);
  });
  const trade = { id: "t", status: "pending_mark", profit: null, dollars: 25, quarantined: true };
  const deploy = { trade_id: "t", kind: "deploy", amount: -25 };
  test("returned quarantined principal is not counted again as invested cash", () => {
    const r = paperCashLifecycle([trade], [deploy, { trade_id: "t", kind: "settle", amount: 25 }]);
    expect(r.cost).toBe(0); expect(r.realized).toBe(0);
    expect(r.issues.map(i => i.severity)).toEqual(["warning"]);
    expect(reconcileBalance(50, r.realized, 50, 0, r.cost).valid).toBe(true);
  });
  test("unreturned quarantined principal remains invested without fabricated P&L", () => {
    const r = paperCashLifecycle([trade], [deploy]);
    expect(r.cost).toBe(25); expect(r.realized).toBe(0);
    expect(reconcileBalance(50, r.realized, 25, 0, r.cost).valid).toBe(true);
  });
  test("unlinked historical trades do not create cash-book losses", () => {
    const r = paperCashLifecycle([{ ...trade, status: "closed", profit: -12, quarantined: false }], []);
    expect(r.realized).toBe(0); expect(r.cost).toBe(0);
    expect(r.issues.map(i => i.severity)).toEqual(["warning"]);
  });
  test("verified proceeds include unsettled principal and reserved profit", () => {
    const r = paperCashLifecycle([{ ...trade, status: "closed", profit: 5, quarantined: false }], [deploy, { trade_id: "t", kind: "settle", amount: 25 }, { trade_id: "t", kind: "reserve", amount: 5 }]);
    expect(r.realized).toBe(5); expect(r.cost).toBe(0); expect(r.issues).toEqual([]);
    expect(reconcileBalance(50, r.realized, 25, 30, r.cost).valid).toBe(true);
  });
  test("quarantined profits and verified settlement discrepancies remain errors", () => {
    expect(paperCashLifecycle([trade], [deploy, { trade_id: "t", kind: "settle", amount: 26 }]).issues.some(i => i.severity === "error")).toBe(true);
    expect(paperCashLifecycle([{ ...trade, status: "closed", profit: 5, quarantined: false }], [deploy, { trade_id: "t", kind: "settle", amount: 29 }]).issues.some(i => i.severity === "error")).toBe(true);
    expect(paperCashLifecycle([{ ...trade, status: "closed", profit: 5, quarantined: false }], [deploy]).issues.some(i => i.severity === "error")).toBe(true);
  });
  test("unlinked or duplicate cash deployments cannot certify a book", () => {
    expect(paperCashLifecycle([trade], [{ ...deploy, trade_id: null }]).complete).toBe(false);
    expect(paperCashLifecycle([trade], [deploy, deploy]).complete).toBe(false);
  });
  test("entry and exit accept exactly 0.5% bar tolerance", () => {
    expect(validateBarFill(99.5, { low: 100, high: 100 })).toBe("valid");
    expect(validateBarFill(100.5, { low: 100, high: 100 })).toBe("valid");
    expect(validateBarFill(100.51, { low: 100, high: 100 })).toBe("invalid");
    expect(validateBarFill(null, { low: 100, high: 100 })).toBe("invalid");
    expect(validateBarFill(100)).toBe("missing");
  });
  test("only proven intraday intent is flagged overnight", () => {
    expect(validateSameDayHold("2026-11-13", "2026-11-16", "2026-11-13", 0, "SAME_DAY")).toBe(false);
    expect(validateSameDayHold("2026-11-13", "2026-11-16", "2026-11-16", 3, "SAME_DAY")).toBe(true);
    expect(validateSameDayHold("2026-11-13", "2026-11-13", "2026-11-13", 0, "SAME_DAY")).toBe(true);
  });
  test("breakevens count as non-wins and profit factor uses gross losses", () => {
    expect(recalculateMetrics([10, -5, 0, 5])).toEqual({ total_trades: 4, wins: 2, losses: 1, win_rate: 50, total_profit: 10, profit_factor: 3 });
    expect(recalculateMetrics([1]).profit_factor).toBeNull();
  });
  test("zero penny leak includes unsettled proceeds and open cost", () => {
    expect(reconcileBalance(100, 5, 50, 30, 25).valid).toBe(true);
    expect(reconcileBalance(100, 5, 50.01, 30, 25).valid).toBe(false);
    expect(reconcileBalance(0.1 + 0.2, 0, 0.3, 0, 0).valid).toBe(true);
  });
  test("future inputs fail, missing evidence never passes", () => {
    expect(validateTemporalBoundary("2026-11-13", "2026-11-13")).toBe("valid");
    expect(validateTemporalBoundary("2026-11-13", "2026-11-16")).toBe("invalid");
    expect(validateTemporalBoundary("2026-11-13", null)).toBe("missing");
    expect(verdictFor([], 0)).toBe("WARNING");
  });
});