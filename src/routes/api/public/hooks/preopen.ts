import { createFileRoute } from "@tanstack/react-router";

/** Just-after-open re-check: refresh data, re-rank, buy only if still best. */
export const Route = createFileRoute("/api/public/hooks/preopen")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        const { scheduledPassDue } = await import('@/lib/schedule-rules');
        if (!scheduledPassDue('preopen')) return Response.json({ ran: false, reason: 'Outside the Eastern entry window.' });
        try {
          const { runPreOpenEntries, loadSettings } = await import("@/lib/scan.server");
          // Paper strategy testing runs first and always: it is isolated from
          // the live book, so it keeps scoring and simulating even when live
          // automation is switched off.
          const { runPaperTesting } = await import("@/lib/race.server");
          const paper = await runPaperTesting("entry");
          const settings = await loadSettings();
          const regular = settings.auto_run
            ? await runPreOpenEntries()
            : { ran: false, reason: "auto_run is off" };
          // Phase L: own switch (default OFF), runs after the fresh scan.
          let autonomous: unknown = null;
          if ((settings as unknown as { auto_live_trading?: boolean }).auto_live_trading && regular.ran && !regular.reason.startsWith("Stale")) {
            const { runAutonomousEntry } = await import("@/lib/autonomous.server");
            autonomous = await runAutonomousEntry().catch((e: unknown) => ({
              bought: false,
              reason: e instanceof Error ? e.message : "autonomous entry failed",
            }));
          }
          return Response.json({ ...regular, paper, autonomous });
        } catch (error) {
          const message = error instanceof Error ? error.message : "pre-open pass failed";
          console.error("preopen failed:", message);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
