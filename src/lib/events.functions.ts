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

export const fetchEvents = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .inputValidator(tickerInput)
  .handler(async ({ data }) => {
    try {
      const { eventsOverview } = await import("./events.server");
      return await eventsOverview({ ticker: data.ticker });
    } catch {
      // Retrieval failure is reported as failed, not as "no events".
      return { events: [], latest: null, failed: true };
    }
  });
