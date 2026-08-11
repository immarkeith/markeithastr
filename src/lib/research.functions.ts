/**
 * Gate-protected entry points for the research engine and the predictive
 * (Random Forest) layer. Thin wrappers only — all logic lives in the
 * *.server.ts modules they import.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const runResearchNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ universe: z.number().int().min(50).max(1000).default(300) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { runResearch } = await import("./research.server");
    return runResearch({ universe: data.universe });
  });

export const getResearchCandidates = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { listCandidates, listResearchRuns } = await import("./research.server");
    const [candidates, runs] = await Promise.all([listCandidates(), listResearchRuns()]);
    return { candidates, runs };
  });

export const decideCandidate = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approve", "approve_activate", "dismiss"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { approveCandidate, dismissCandidate } = await import("./research.server");
    if (data.decision === "dismiss") return dismissCandidate(data.id);
    return approveCandidate(data.id, data.decision === "approve_activate");
  });

export const runWalkForwardNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        universe: z.number().int().min(50).max(1000).default(300),
        folds: z.number().int().min(1).max(8).default(4),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { runWalkForward } = await import("./ml.server");
    return runWalkForward({ universe: data.universe, folds: data.folds });
  });

export const runPredictLatest = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ universe: z.number().int().min(50).max(1000).default(300) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { gradePredictions, predictLatest } = await import("./ml.server");
    await gradePredictions();
    return predictLatest({ universe: data.universe });
  });

export const getModelHistory = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { predictionAccuracy, recentModels } = await import("./ml.server");
    const [models, accuracy] = await Promise.all([recentModels(), predictionAccuracy()]);
    return { models, accuracy };
  });
