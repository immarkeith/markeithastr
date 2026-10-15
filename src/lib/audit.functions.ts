import { createServerFn } from "@tanstack/react-start";
import { requireGate } from "./gate-middleware";

export const getLeadAudit = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { runLeadSelfAudit } = await import("./audit.server");
    return runLeadSelfAudit();
  });

export const runLeadAuditNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .handler(async () => {
    const { runLeadSelfAudit } = await import("./audit.server");
    return runLeadSelfAudit();
  });

export const getRepairLogs = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { recentRepairs } = await import("./repair-log.server");
    return recentRepairs(20);
  });

export const getIntegrityHistory = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { recentIntegrityResults } = await import("./integrity.server");
    return recentIntegrityResults(10);
  });
