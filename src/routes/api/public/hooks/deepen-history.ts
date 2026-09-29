import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase B: pulls up to 5 years of free daily bars into the shared history,
 * a few tickers per load. Auto-refreshes until nothing is left to deepen.
 * Only adds missing rows; never touches live trading.
 */
export const Route = createFileRoute("/api/public/hooks/deepen-history")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { deepenHistory } = await import("@/lib/historical-data.server");
          const r = await deepenHistory({ tickers: 8, years: 5 });
          const done = r.deepened === 0;
          const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
${done ? "" : '<meta http-equiv="refresh" content="2">'}
<title>ASTR History Download</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0d14;color:#f1f5f9;padding:24px}.card{background:#151b28;border:1px solid #1e293b;border-radius:12px;padding:20px;max-width:480px;margin:0 auto}h2{color:#38bdf8;margin-top:0}.stat{margin:12px 0;color:#94a3b8}a{color:#4ade80}</style>
</head><body><div class="card"><h2>${done ? "Multi-year history downloaded" : "Downloading multi-year history…"}</h2>
<div class="stat">Stocks extended this pass: ${r.deepened}</div>
<div class="stat">Daily bars added this pass: ${r.rows}</div>
${done ? '<div class="stat">Done. Now open <a href="/api/public/hooks/replay">the history rebuild</a>.</div>' : '<div class="stat">Keep this page open — it continues on its own.</div>'}
</div></body></html>`;
          return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(`<meta http-equiv="refresh" content="5"><pre>Paused: ${msg}\nRetrying in 5 seconds…</pre>`, { status: 500, headers: { "Content-Type": "text/html" } });
        }
      },
    },
  },
});
