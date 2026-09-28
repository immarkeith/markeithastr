import { createFileRoute } from "@tanstack/react-router";

/**
 * Paper-only historical rebuild. Open once: the page keeps itself going
 * (auto-refresh) until the whole history is caught up. Progress is saved after
 * every step, so closing it and reopening later simply resumes.
 */
export const Route = createFileRoute("/api/public/hooks/replay")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { runHistoryRebuild } = await import("@/lib/replay.server");
          const r = await runHistoryRebuild();
          const pctDone = r.total ? Math.round((Math.min(r.position, r.total) / r.total) * 100) : 100;
          const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
${r.done ? "" : '<meta http-equiv="refresh" content="1">'}
<title>ASTR History Rebuild</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0d14;color:#f1f5f9;padding:24px}.card{background:#151b28;border:1px solid #1e293b;border-radius:12px;padding:20px;max-width:480px;margin:0 auto}h2{color:#38bdf8;margin-top:0}.stat{margin:12px 0;color:#94a3b8}.stat span{color:#f8fafc;font-weight:600}.bar{height:10px;background:#1e293b;border-radius:6px;overflow:hidden}.fill{height:100%;background:#2563eb;width:${pctDone}%}.done{color:#4ade80;font-weight:bold;text-align:center;margin-top:20px}</style>
</head><body><div class="card"><h2>${r.done ? "History rebuild complete" : "Rebuilding paper history…"}</h2>
<div class="bar"><div class="fill"></div></div>
<div class="stat">Progress: <span>${pctDone}%</span></div>
<div class="stat">Caught up through: <span>${"through" in r ? r.through ?? "—" : "—"}</span></div>
<div class="stat">Paper trades added: <span>${r.trades}</span></div>
${r.done ? '<div class="done">✓ Done. Open ASTR to see the history.</div>' : '<div class="stat">Keep this page open — it continues on its own.</div>'}
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
