import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const buyLongTerm = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({
      ticker: z.string().trim().min(1).max(10).regex(/^[A-Za-z.\-]+$/),
      dollars: z.number().min(1).max(1_000_000),
      estimated_price: z.number().positive(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { brokerAccount } = await import("./broker.server");
    const account = await brokerAccount("live");
    if (account.trading_blocked) throw new Error("The live brokerage account is not accepting trades.");
    if (account.buying_power + 0.001 < data.dollars) {
      throw new Error(`Only $${account.buying_power.toFixed(2)} is currently available to buy.`);
    }
    const { openTrade } = await import("./scan.server");
    return openTrade({
      ticker: data.ticker,
      kind: "long_term",
      entry_price: data.estimated_price,
      dollars: data.dollars,
      mode: "live",
      position_type: "LONG_TERM",
    });
  });

export const sellLongTerm = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        trade_id: z.string().uuid(),
        dollars: z.number().positive().max(1_000_000).nullable().default(null),
        all: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { sellLongTermShares } = await import("./long-term.server");
    return sellLongTermShares(data);
  });