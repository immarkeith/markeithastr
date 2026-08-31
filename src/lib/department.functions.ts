/**
 * Gate-protected entry points for the Research Department. Thin wrappers only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const getDepartment = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { departmentOverview } = await import("./department.server");
    return departmentOverview();
  });

export const runDepartmentNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ universe: z.number().int().min(50).max(800).default(250) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { runDepartment } = await import("./department.server");
    return runDepartment({ universe: data.universe });
  });
