import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled daily cycle: cache bars, re-score the universe, run the simulated
 * (paper) trade rules. Called by the database scheduler after the close.
 */
export const Route = createFileRoute("/api/public/hooks/daily-cycle")({
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
          const { runDailyCycle, loadSettings } = await import("@/lib/scan.server");
          const settings = await loadSettings();
          if (!(settings as unknown as { auto_run: boolean }).auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off" });
          }
          const result = await runDailyCycle();
          return Response.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "cycle failed";
          console.error("daily-cycle failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
