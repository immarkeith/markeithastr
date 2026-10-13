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
