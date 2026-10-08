import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

export const getStability = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { latestStability } = await import("./stability.server");
    return latestStability();
  });

export const runStabilityNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .handler(async () => {
    const { runStabilityCheck } = await import("./stability.server");
    return runStabilityCheck();
  });
