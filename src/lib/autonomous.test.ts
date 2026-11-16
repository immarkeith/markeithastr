import { describe, expect, test } from "bun:test";
import { AUTO_MAX_STAKE, entryBlockers, holdUntil, isExitDue, selectCandidate } from "./autonomous";

const gate = {
  enabled: true, paper_mode: false, trades_today: 0, max_daily_trades: 1,
  realized_today: 0, unrealized_open: 0, daily_loss_limit: 50, stake: 25,
  max_stake: AUTO_MAX_STAKE, cash: 100, account_active: true,
  kill_switch: true, spy_move_pct: 0.4, spy_limit_pct: 1.8,
};

describe("Phase L autonomous rules", () => {
  test("allowed when every gate passes", () => expect(entryBlockers(gate)).toEqual([]));
  test("off by default blocks", () => expect(entryBlockers({ ...gate, enabled: false }).length).toBe(1));
  test("simulation mode blocks live buys", () => expect(entryBlockers({ ...gate, paper_mode: true }).length).toBe(1));
  test("one trade per day cap", () => expect(entryBlockers({ ...gate, trades_today: 1 }).length).toBe(1));
  test("$50 daily loss limit", () => expect(entryBlockers({ ...gate, realized_today: -30, unrealized_open: -20 }).length).toBe(1));
  test("stake above $50 ceiling blocks", () => expect(entryBlockers({ ...gate, stake: 60, cash: 100 }).length).toBe(1));
  test("SPY swing over 1.8% blocks", () => expect(entryBlockers({ ...gate, spy_move_pct: -2.1 }).length).toBe(1));
  test("missing SPY check blocks", () => expect(entryBlockers({ ...gate, spy_move_pct: null }).length).toBe(1));
  test("hold counts trading days over a weekend", () => expect(holdUntil("2026-11-13", 1)).toBe("2026-11-16"));
  test("same-day hold exits today", () => expect(holdUntil("2026-11-16", 0)).toBe("2026-11-16"));
  test("strict time exit", () => {
    expect(isExitDue("2026-11-18", "2026-11-17")).toBe(false);
    expect(isExitDue("2026-11-18", "2026-11-18")).toBe(true);
  });
  test("owner is most confident agreeing researcher and its hold time is used", () => {
    const s = selectCandidate(
      [{ ticker: "A", score: 80, tradeable: true }, { ticker: "B", score: 78, tradeable: true }],
      [
        { lane: "momentum", track_pct: 12, pick: "B", hold_days: 5 },
        { lane: "value", track_pct: 3, pick: "A", hold_days: 17 },
        { lane: "loser", track_pct: -9, pick: "A", hold_days: 1 },
      ],
    );
    expect(s?.ticker).toBe("B");
    expect(s?.owning_researcher).toBe("momentum");
    expect(s?.hold_days).toBe(5);
  });
  test("no trusted researcher means no pick", () =>
    expect(selectCandidate([{ ticker: "A", score: 1, tradeable: true }], [{ lane: "x", track_pct: -1, pick: "A", hold_days: 3 }])).toBeNull());
});
