import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";
import {
  createLiveOrderApproval,
  type LiveOrderApproval,
} from "./broker.server";

export const requestLiveOrderApproval = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        ticker: z.string().trim().min(1).max(10).regex(/^[A-Za-z.\-]+$/),
        researcher: z.string().trim().min(1).max(80).optional(),
        hold_days: z.number().int().min(0).max(252).optional(),
        dollars: z.number().min(1).max(1_000_000),
        source: z.string().trim().min(1).max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const approval: LiveOrderApproval = createLiveOrderApproval({
      ticker: data.ticker,
      side: "buy",
      dollars: data.dollars,
      source: data.source ?? "manual-live-order",
      researcher: data.researcher,
      hold_days: data.hold_days,
    });
    return approval;
  });

export const RESEARCHERS = [
  "Lead Researcher",
  "Trend Researcher",
  "Momentum Researcher",
  "Contrarian Researcher",
  "Consistency Researcher",
  "Growth Researcher",
  "Risk Researcher",
  "Influence Researcher",
] as const;

export const assignToResearcher = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({
      ticker: z.string().trim().min(1).max(10).regex(/^[A-Za-z.\-]+$/),
      researcher: z.enum(RESEARCHERS),
      tip_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      horizon: z.enum(["1M", "3M", "9M", "1Y+"]).optional(),
      source: z.string().max(120).optional(),
      notes: z.string().max(1000).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { createAssignment } = await import("./assign.server");
    return createAssignment(data);
  });

export const getAssignments = createServerFn({ method: "GET" }).handler(async () => {
  const { listAssignments } = await import("./assign.server");
  return listAssignments();
});

export const researcherLiveBuy = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({
      ticker: z.string().trim().min(1).max(10).regex(/^[A-Za-z.\-]+$/),
      researcher: z.enum(RESEARCHERS).refine((r) => r !== "Influence Researcher"),
      hold_days: z.number().int().min(0).max(252),
      dollars: z.number().min(1).max(1_000_000),
      estimated_price: z.number().positive(),
      approval_token: z.string().trim().min(1).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { brokerAccount } = await import("./broker.server");
    const account = await brokerAccount("live");
    if (account.trading_blocked) throw new Error("The live brokerage account is not accepting trades.");
    if (account.buying_power + 0.001 < data.dollars) {
      throw new Error(`Only $${account.buying_power.toFixed(2)} is currently available to buy.`);
    }
    const d = data.hold_days;
    const horizon = d >= 189 ? "9M" : d >= 63 ? "3M" : d >= 21 ? "1M" : "INDEFINITE";
    const { openTrade } = await import("./scan.server");
    const r = await openTrade({
      ticker: data.ticker,
      kind: d === 0 ? "day" : "long_term",
      entry_price: data.estimated_price,
      dollars: data.dollars,
      mode: "live",
      approval_token: data.approval_token,
      approved_by_owner: Boolean(data.approval_token),
      position_type: d === 0 ? "SAME_DAY" : "LONG_TERM",
      hold_horizon: d === 0 ? null : horizon,
      hold_days: d,
      status_note: `Chosen researcher: ${data.researcher} (${d === 0 ? "same day" : `${d} trading-day`} recommended hold)`,
    });
    return { ...r, ticker: data.ticker.toUpperCase(), researcher: data.researcher, hold_days: d };
  });
