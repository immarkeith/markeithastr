import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled integrity audit: runs the four-pillar Lead Self-Audit engine on a
 * daily or weekly cadence, stores the result, and alerts only on FAIL. Called
 * by the database scheduler (pg_cron).
 */
export const Route = createFileRoute("/api/public/hooks/integrity")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const body = await request.json().catch(() => ({}));
          const cadence = body?.cadence === "weekly" ? "weekly" : "daily";
          const { runIntegrityCheck } = await import("@/lib/integrity.server");
          return Response.json(await runIntegrityCheck(cadence));
        } catch (error) {
          const message = error instanceof Error ? error.message : "integrity check failed";
          console.error("integrity check failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
