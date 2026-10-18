import { createFileRoute } from "@tanstack/react-router";

/**
 * Five-minute background refresh of the Research Lab's saved graph snapshot.
 * Called by the database scheduler during market hours so the intraday chart
 * stays current without anyone keeping the Lab open.
 */
export const Route = createFileRoute("/api/public/hooks/lab-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { refreshLabGraphIntraday } = await import("@/lib/lab-graph.server");
          const result = await refreshLabGraphIntraday();
          return Response.json({
            mode: result.mode,
            generated_at: result.guards.generated_at,
            curves: result.payload.equity_curves.length,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "lab refresh failed";
          console.error("lab-refresh failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
