import { createFileRoute } from "@tanstack/react-router";

/** Pre-close pass: sell the simulated day positions before the bell. */
export const Route = createFileRoute("/api/public/hooks/preclose")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("apikey")) {
          return new Response(JSON.stringify({ error: "Missing apikey header" }), { status: 401 });
        }
        try {
          const { runPreCloseExits, loadSettings } = await import("@/lib/scan.server");
          const settings = await loadSettings();
          if (!settings.auto_run) return Response.json({ ran: false, reason: "auto_run is off" });
          return Response.json(await runPreCloseExits());
        } catch (error) {
          const message = error instanceof Error ? error.message : "pre-close pass failed";
          console.error("preclose failed:", message);
          return new Response(JSON.stringify({ error: message }), { status: 500 });
        }
      },
    },
  },
});
