import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

/** The long-term research Top 10. Paper evidence only — no live money. */
export const getLongTermBoard = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { longTermTopTen } = await import("./long-term-research.server");
    return longTermTopTen();
  });
