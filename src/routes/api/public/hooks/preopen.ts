import { createFileRoute } from "@tanstack/react-router";

/** Just-after-open re-check: refresh data, re-rank, buy only if still best. */
export const Route = createFileRoute("/api/public/hooks/preopen")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("apikey")) {
          return new Response(JSON.stringify({ error: "Missing apikey header" }), { status: 401 });
        }
        try {
          const { runPreOpenEntries, loadSettings } = await import("@/lib/scan.server");
          const settings = await loadSettings();
          if (!settings.auto_run) return Response.json({ ran: false, reason: "auto_run is off" });
          return Response.json(await runPreOpenEntries());
        } catch (error) {
          const message = error instanceof Error ? error.message : "pre-open pass failed";
          console.error("preopen failed:", message);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
