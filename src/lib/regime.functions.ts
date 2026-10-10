import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

export const getRegime = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { latestRegime } = await import("./regime.server");
    return latestRegime();
  });

export const runRegimeNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .handler(async () => {
    const { runRegimeAnalysis } = await import("./regime.server");
    return runRegimeAnalysis();
  });
