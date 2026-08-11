import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

const tickerInput = (input: unknown) =>
  z
    .object({
      ticker: z
        .string()
        .trim()
        .min(1)
        .max(10)
        .regex(/^[A-Za-z.\-]+$/, "Use letters only, e.g. AAPL"),
    })
    .parse(input);

export const analyzeStock = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator(tickerInput)
  .handler(async ({ data }) => {
    const { analyzeTicker } = await import("./analyze.server");
    return analyzeTicker(data.ticker);
  });

export const requestMonitoredStock = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator(tickerInput)
  .handler(async ({ data }) => {
    const { requestMonitoredTicker } = await import("./analyze.server");
    return requestMonitoredTicker(data.ticker);
  });
