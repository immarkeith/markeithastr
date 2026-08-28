import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled daily cycle: cache bars, re-score the universe, run the simulated
 * (paper) trade rules. Called by the database scheduler after the close.
 */
export const Route = createFileRoute("/api/public/hooks/daily-cycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { runDailyCycle, loadSettings } = await import("@/lib/scan.server");
          // Paper testing is independent of the live switch (see preopen hook).
          const { runPaperTesting } = await import("@/lib/race.server");
          const paper = await runPaperTesting("both");
          const settings = await loadSettings();
          if (!(settings as unknown as { auto_run: boolean }).auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off", paper });
          }
          const result = await runDailyCycle();
          return Response.json({ ...result, paper });
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
