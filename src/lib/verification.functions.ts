/**
 * Gate-protected entry points for the Research Verification layer.
 * Thin wrappers only — all logic lives in verification.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const getVerification = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { verificationOverview } = await import("./verification.server");
    return verificationOverview();
  });

export const runVerificationNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ universe: z.number().int().min(50).max(800).default(250) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { runVerification } = await import("./verification.server");
    return runVerification({ universe: data.universe });
  });
