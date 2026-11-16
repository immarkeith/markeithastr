import { describe, expect, test } from "bun:test";
import { capitalEfficiency, paperBuyCapacity, paperCash, paperSettlementDate, requirePaperCash } from "./settlement-rules";

describe("paper settlement", () => {
  test("Friday settles Monday", () => expect(paperSettlementDate("2026-11-13")).toBe("2026-11-16"));
  test("weekend resolves to next open session", () => expect(paperSettlementDate("2026-11-14")).toBe("2026-11-16"));
  test("Monday market holiday delays settlement", () => expect(paperSettlementDate("2026-01-16")).toBe("2026-01-20"));
  test("historical holidays are respected", () => expect(paperSettlementDate("2024-03-28")).toBe("2024-04-01"));
  test("national mourning closure is respected", () => expect(paperSettlementDate("2025-01-08")).toBe("2025-01-10"));
  test("leap year session", () => expect(paperSettlementDate("2024-02-28")).toBe("2024-02-29"));
  test("NYSE Saturday New Year does not close Friday", () => expect(paperSettlementDate("2021-12-30")).toBe("2021-12-31"));
  test("unsettled proceeds cannot fund buys", () => {
    const rows = [{ kind: "settle", amount: 50, available_on: "2026-11-16" }];
    expect(paperCash(rows, "2026-11-13").inFlight).toBe(50);
    expect(() => requirePaperCash(paperBuyCapacity(rows, "2026-11-13", false).available, 25)).toThrow();
  });
  test("cash shortages do not create deposits", () => {
    const rows = [{ kind: "deposit", amount: 10, available_on: "2026-11-13" }];
    expect(() => requirePaperCash(paperBuyCapacity(rows, "2026-11-13", false).available, 25)).toThrow();
    expect(rows).toEqual([{ kind: "deposit", amount: 10, available_on: "2026-11-13" }]);
  });
  test("A then B, then A only after A clears", () => {
    const rows = [
      { kind: "deposit", amount: 50, available_on: "2026-11-12" },
      { kind: "deploy", amount: -25, available_on: "2026-11-12", note: "[Tranche A]" },
      { kind: "settle", amount: 25, available_on: "2026-11-16", note: "[Tranche A]" },
    ];
    expect(paperBuyCapacity(rows, "2026-11-13", true)).toMatchObject({ tranche: "B", available: 25 });
    rows.push({ kind: "deploy", amount: -25, available_on: "2026-11-13", note: "[Tranche B]" });
    expect(paperBuyCapacity(rows, "2026-11-13", true)).toMatchObject({ tranche: "A", available: 0 });
    expect(paperBuyCapacity(rows, "2026-11-16", true)).toMatchObject({ tranche: "A", available: 25 });
  });
  test("reserved gains are not spendable even before settlement", () => {
    expect(paperBuyCapacity([{ kind: "reserve", amount: 5, available_on: "2026-11-16" }], "2026-11-13", false).available).toBe(0);
  });
  test("efficiency separates hold sessions and one settlement session", () => {
    expect(capitalEfficiency(6, 2)).toBe(2);
    expect(capitalEfficiency(6, 0)).toBe(6);
    expect(capitalEfficiency(6, 1)).toBe(3);
  });
});