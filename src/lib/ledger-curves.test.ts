import { describe, expect, it } from "vitest";
import { mergeLedgerCurves } from "./ledger-curves";

describe("mergeLedgerCurves", () => {
  it("uses the saved ledger instead of the trade reconstruction", () => {
    const out = mergeLedgerCurves(
      [{ strategy_id: "a", points: [{ date: "2026-01-01", equity: 1 }] }],
      [{ strategy_id: "a", points: [{ date: "2024-03-28", equity: 0 }, { date: "2026-01-01", equity: 5 }] }],
    );
    expect(out[0]?.points.length).toBe(2);
  });
  it("keeps the fallback when a lane has no ledger rows", () => {
    const out = mergeLedgerCurves([{ strategy_id: "b", points: [{ date: "d", equity: 3 }] }], [{ strategy_id: "b", points: [] }]);
    expect(out[0]?.points[0]?.equity).toBe(3);
  });
});
