import { createFileRoute } from "@tanstack/react-router";

/** Pre-close pass: sell the simulated day positions before the bell. */
export const Route = createFileRoute("/api/public/hooks/preclose")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { runPreCloseExits, loadSettings } = await import("@/lib/scan.server");
          // Paper strategy testing runs first and always: it is isolated from
          // the live book, so it keeps scoring and simulating even when live
          // automation is switched off.
          const { runPaperTesting } = await import("@/lib/race.server");
          const paper = await runPaperTesting("exit");
          const settings = await loadSettings();
          if (!settings.auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off", paper });
          }
          return Response.json({ ...(await runPreCloseExits()), paper });
        } catch (error) {
          const message = error instanceof Error ? error.message : "pre-close pass failed";
          console.error("preclose failed:", message);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
