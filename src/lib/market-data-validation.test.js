import { describe, test, expect } from "bun:test";
import { exactDailyPrice, validDailyBar, retryCoverage } from "./market-data-validation";
import { yahooDailyBars } from "./market-data.server";

const bar = { ticker: "DIS", bar_date: "2026-10-30", open: 110, high: 112, low: 109, close: 111, volume: 2000 };

describe("research price integrity", () => {
  test("a missing target-session mark is pending, not the entry or a later price", () => {
    expect(exactDailyPrice([bar], "DIS", "2026-10-29")).toBeNull();
    expect(exactDailyPrice([bar], "DIS", "2026-10-30")).toBe(111);
  });
  test("invalid and incomplete OHLC cannot create P&L", () => {
    expect(validDailyBar({ ...bar, close: 0 })).toBe(false);
    expect(validDailyBar({ ...bar, high: 100 })).toBe(false);
    expect(validDailyBar({ ...bar, volume: NaN })).toBe(false);
  });
  test("transient coverage failure retries once and records recovery", async () => {
    let attempts = 0;
    let recovered = 0;
    const result = await retryCoverage(async () => {
      attempts++;
      if (attempts === 1) throw new Error("statement timeout 57014");
      return 55;
    }, () => recovered++);
    expect(result).toBe(55);
    expect(attempts).toBe(2);
    expect(recovered).toBe(1);
  });
  test("persistent timeout stops after the single retry", async () => {
    let attempts = 0;
    await expect(retryCoverage(async () => { attempts++; throw new Error("statement timeout"); })).rejects.toThrow("timeout");
    expect(attempts).toBe(2);
  });
  test("permission failures are not retried", async () => {
    let attempts = 0;
    await expect(retryCoverage(async () => { attempts++; throw new Error("permission denied"); })).rejects.toThrow("permission");
    expect(attempts).toBe(1);
  });
  test("Yahoo parser rejects null rows and uses exact dates without broker headers", async () => {
    const original = globalThis.fetch;
    let requestedHeaders;
    globalThis.fetch = async (_url, options) => {
      requestedHeaders = options.headers;
      return Response.json({ chart: { result: [{ timestamp: [1793367000, 1793280600], indicators: { quote: [{ open: [110, null], high: [112, null], low: [109, null], close: [111, null], volume: [2000, null] }] } }] } });
    };
    try {
      const rows = await yahooDailyBars("DIS", "2026-10-29", "2026-10-30");
      expect(rows).toHaveLength(1);
      expect(rows[0].close).toBe(111);
      expect(requestedHeaders["APCA-API-KEY-ID"]).toBeUndefined();
    } finally { globalThis.fetch = original; }
  });
});