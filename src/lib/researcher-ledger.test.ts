import { describe, expect, test } from "bun:test";

import { simulateLane } from "./researcher-ledger";

const day = (date: string, closes: Record<string, number>, pick: string | null) => ({
  date,
  closes: new Map(Object.entries(closes)),
  pick,
});

describe("researcher ledger simulator", () => {
  test("records one point per session, marked to close, and sells after hold days", () => {
    const pts = simulateLane(
      [
        day("2026-01-02", { A: 10 }, "A"),
        day("2026-01-05", { A: 11 }, "A"),
        day("2026-01-06", { A: 12, B: 5 }, "B"),
        day("2026-01-07", { A: 12, B: 6 }, "B"),
      ],
      2,
      100,
    );
    expect(pts.map((p) => p.date)).toEqual(["2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"]);
    expect(pts[1]?.equity).toBe(110);
    expect(pts[2]?.action).toBe("sell A, waiting for settled cash");
    expect(pts[2]?.equity).toBe(120);
    expect(pts[3]?.equity).toBe(120);
    expect(pts[3]?.held).toBe("B");
  });

  test("a missing bar keeps the last real mark instead of inventing movement", () => {
    const pts = simulateLane([day("2026-11-12", { A: 10 }, "A"), day("2026-11-13", {}, null)], 5, 100);
    expect(pts[1]?.equity).toBe(100);
    expect(pts[1]?.action).toBe("pending mark A");
  });

  test("same-day pools rotate without reusing Friday proceeds", () => {
    const pts = simulateLane([
      day("2026-11-12", { A: 10 }, "A"),
      day("2026-11-13", { A: 10 }, "A"),
      day("2026-11-16", { A: 10 }, "A"),
    ], 0, 100);
    expect(pts.map(p => p.action)).toEqual(["buy A, sell A", "buy A, sell A", "buy A, sell A"]);
    expect(pts.map(p => p.equity)).toEqual([100, 100, 100]);
  });

  test("one-day rotation keeps unused half available while proceeds settle", () => {
    const pts = simulateLane([
      day("2026-11-12", { A: 10 }, "A"),
      day("2026-11-13", { A: 12, B: 10 }, "B"),
      day("2026-11-16", { A: 12, B: 11 }, "A"),
    ], 1, 100);
    expect(pts[1]?.action).toBe("sell A, buy B");
    expect(pts[1]?.equity).toBe(110);
    expect(pts[2]?.equity).toBe(115);
  });

  test("legacy history remains identical before the explicit cutover", () => {
    const days = [day("2026-11-12", { A: 10 }, "A"), day("2026-11-13", { A: 11 }, "A")];
    const legacy = simulateLane(days, 1, 100, "2026-11-16");
    expect(legacy[1]?.equity).toBe(110);
    expect(legacy[1]?.action).toBe("sell A, buy A");
    expect(simulateLane(days, 1, 100)[1]?.equity).toBe(105);
  });
});
