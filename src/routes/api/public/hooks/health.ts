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
        const token = request.headers.get("apikey") ?? "";
        if (!token) {
          return new Response(JSON.stringify({ error: "Missing apikey header" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const { runHealthCheck } = await import("@/lib/health.server");
          return Response.json(await runHealthCheck());
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
