import { describe, expect, test } from "bun:test";
import { niceCeil } from "@/components/PnlChart";

describe("chart scale", () => {
  test("small move keeps the 2% minimum bracket", () => expect(niceCeil(Math.max(2, 0.03))).toBe(2));
  test("rounds 3.4 up to 5", () => expect(niceCeil(3.4)).toBe(5));
  test("rounds 12 up to 20", () => expect(niceCeil(12)).toBe(20));
});
