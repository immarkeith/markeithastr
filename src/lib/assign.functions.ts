import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const RESEARCHERS = [
  "Lead Researcher",
  "Trend Researcher",
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
