import { describe, expect, test } from "bun:test";
import { validateBarFill, validateSameDayHold, recalculateMetrics, reconcileBalance, validateTemporalBoundary, verdictFor } from "./audit-rules";

describe("Phase E quantitative rules", () => {
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