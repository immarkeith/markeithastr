import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled health check: verifies the data key, tops up missing price history,
 * re-runs a missed scan and settles stuck simulated trades. Runs frequently
 * during market hours. Called by the database scheduler.
 */
export const Route = createFileRoute("/api/public/hooks/health")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { runHealthCheck } = await import("@/lib/health.server");
          // Research testers trade intraday only: sweep up any simulated
          // position still open after its own session (weekends and holidays
          // included). Idempotent — an already-sold position is left alone.
          const { safetyCloseStalePaper } = await import("@/lib/race.server");
          let paper_safety: unknown = null;
          try {
            paper_safety = await safetyCloseStalePaper();
          } catch (safetyError) {
            console.error(
              "paper safety close failed:",
              safetyError instanceof Error ? safetyError.message : safetyError,
            );
          }
          return Response.json({ ...(await runHealthCheck()), paper_safety });
        } catch (error) {
          const message = error instanceof Error ? error.message : "health check failed";
          console.error("health check failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
