import { describe, expect, test } from "bun:test";

import { buildHistoryCurve, mergePick, tradeProfit, type BestPicks } from "./history-reconstruction";

describe("historical reconstruction", () => {
  test("a $20 same-day trade from 100 open to 110 close makes $2", () => {
    expect(tradeProfit({ ticker: "A", score: 1, open: 100, close: 110 })).toBeCloseTo(2, 6);
  });

  test("keeps the highest-scoring pick for a lane and day", () => {
    const best: BestPicks = {};
    mergePick(best, "trend", "2021-01-04", { ticker: "A", score: 50, open: 1, close: 1 });
    mergePick(best, "trend", "2021-01-04", { ticker: "B", score: 70, open: 1, close: 1 });
    mergePick(best, "trend", "2021-01-04", { ticker: "C", score: 60, open: 1, close: 1 });
    expect(best.trend!["2021-01-04"]!.ticker).toBe("B");
  });

  test("curve is a cumulative level, not a running pile-up", () => {
    const curve = buildHistoryCurve(
      "trend",
      {
        d1: { ticker: "A", score: 1, open: 100, close: 110 },
        d3: { ticker: "B", score: 1, open: 100, close: 95 },
      },
      ["d1", "d2", "d3"],
    );
    expect(curve.points.map((p) => p.equity)).toEqual([2, 2, 1]);
    expect(curve.trades).toBe(2);
    expect(curve.wins).toBe(1);
  });
});
