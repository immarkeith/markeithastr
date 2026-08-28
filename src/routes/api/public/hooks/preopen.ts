import { createFileRoute } from "@tanstack/react-router";

/** Just-after-open re-check: refresh data, re-rank, buy only if still best. */
export const Route = createFileRoute("/api/public/hooks/preopen")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { runPreOpenEntries, loadSettings } = await import("@/lib/scan.server");
          // Paper strategy testing runs first and always: it is isolated from
          // the live book, so it keeps scoring and simulating even when live
          // automation is switched off.
          const { runPaperTesting } = await import("@/lib/race.server");
          const paper = await runPaperTesting("entry");
          const settings = await loadSettings();
          if (!settings.auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off", paper });
          }
          return Response.json({ ...(await runPreOpenEntries()), paper });
        } catch (error) {
          const message = error instanceof Error ? error.message : "pre-open pass failed";
          console.error("preopen failed:", message);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
