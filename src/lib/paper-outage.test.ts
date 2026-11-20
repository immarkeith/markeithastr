import { expect, test } from "bun:test";
import { canEvaluatePaperEntry, shouldQuarantineOutage } from "./paper-outage";

const trade = { mode: "paper", strategy_id: "research", broker_order_id: null, status: "open", hold_target_date: "2026-11-04", entry_price: 72.52 };
const bar = { low: 119.10, high: 121.40 };
test("stale detection starts more than five trading sessions after the target", () => {
  expect(shouldQuarantineOutage(trade, "2026-11-11", bar)).toBe(false);
  expect(shouldQuarantineOutage(trade, "2026-11-12", bar)).toBe(true);
  expect(shouldQuarantineOutage({ ...trade, hold_target_date: "2026-11-25" }, "2026-12-03", bar)).toBe(false);
  expect(shouldQuarantineOutage({ ...trade, hold_target_date: "2026-11-25" }, "2026-12-04", bar)).toBe(true);
});
test("live and broker-owned positions are never outage repair candidates", () => {
  expect(shouldQuarantineOutage({ ...trade, mode: "live" }, "2026-11-20", bar)).toBe(false);
  expect(shouldQuarantineOutage({ ...trade, strategy_id: null }, "2026-11-20", bar)).toBe(false);
  expect(shouldQuarantineOutage({ ...trade, broker_order_id: "order" }, "2026-11-20", bar)).toBe(false);
});
test("missing bars and valid entries are not evidence of contaminated fills", () => {
  expect(shouldQuarantineOutage(trade, "2026-11-20")).toBe(false);
  expect(shouldQuarantineOutage({ ...trade, entry_price: 120 }, "2026-11-20", bar)).toBe(false);
  expect(shouldQuarantineOutage({ ...trade, status: "closed" }, "2026-11-20", bar)).toBe(false);
});
test("exit-feed recovery remains possible for valid entries, never for entry quarantine", () => {
  expect(canEvaluatePaperEntry({ status: "open", entry_price: 120, status_note: "Pending Market Mark — exact-session exit unavailable" }, bar)).toBe(true);
  expect(canEvaluatePaperEntry({ status: "open", entry_price: 72.52 }, bar)).toBe(false);
  expect(canEvaluatePaperEntry({ status: "open", entry_price: 120, status_note: "Needs review — entry fill unverified" }, bar)).toBe(false);
  expect(canEvaluatePaperEntry({ status: "pending_mark", entry_price: 120 }, bar)).toBe(false);
});