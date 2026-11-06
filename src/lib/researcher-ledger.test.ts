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
    expect(pts[1]!.equity).toBe(110); // open mark counted every session
    expect(pts[2]!.action).toBe("sell A, buy B"); // exits after exactly 2 sessions
    expect(pts[2]!.equity).toBe(120);
    expect(pts[3]!.equity).toBe(144);
  });

  test("a missing bar keeps the last real mark instead of inventing movement", () => {
    const pts = simulateLane([day("d1", { A: 10 }, "A"), day("d2", {}, null)], 5, 100);
    expect(pts[1]!.equity).toBe(100);
  });
});
