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
          // One research-department generation per market day. Pure replay of
          // cached bars, so it never costs data calls — and it runs whether or
          // not the live bot is switched on.
          const { runDepartment } = await import("@/lib/department.server");
          let department: unknown = null;
          try {
            department = await runDepartment({ universe: 250 });
          } catch (depError) {
            console.error(
              "research department pass failed:",
              depError instanceof Error ? depError.message : depError,
            );
          }
          // Long-horizon paper predictions whose date has arrived get their real
          // outcome appended. Paper bookkeeping only.
          let horizons: unknown = null;
          try {
            const { evaluateDueHorizons } = await import("@/lib/long-term-research.server");
            horizons = await evaluateDueHorizons();
          } catch (horizonError) {
            console.error("horizon evaluation failed:", horizonError);
          }
          const settings = await loadSettings();
          if (!(settings as unknown as { auto_run: boolean }).auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off", paper, department });
          }
          const result = await runDailyCycle();
          return Response.json({ ...result, paper, department });
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
