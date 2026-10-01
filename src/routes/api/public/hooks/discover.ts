import { createFileRoute } from "@tanstack/react-router";

/** Phase C: metric discovery + streak backtest. Paper research only; read-only on history. */
export const Route = createFileRoute("/api/public/hooks/discover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { runDiscoveryStep } = await import("@/lib/discovery.server");
          const restart = new URL(request.url).searchParams.get("restart") === "1";
          const r = await runDiscoveryStep({ restart });
          const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
          const pct = r.total ? Math.round((r.processed / r.total) * 100) : 100;
          const sections = r.report.specialists.map((sp) => `<h3>${sp.role}</h3><div class="stat">${esc(sp.focus)}</div>${
            sp.findings.length ? sp.findings.map((f) => `<div class="row"><b>${esc(f.bucket)}</b> · ${esc(f.metric)}<br>Learn ${f.learnEdge}% (${f.learnN}) · Holdout ${f.holdoutEdge}% (${f.holdoutN})<br><i>${esc(f.verdict)}</i></div>`).join("") : '<div class="stat">Nothing yet.</div>'
          }`).join("");
          const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
${r.done ? "" : '<meta http-equiv="refresh" content="2;url=/api/public/hooks/discover">'}
<title>ASTR Discovery</title>
<style>body{font-family:-apple-system,sans-serif;background:#0a0d14;color:#f1f5f9;padding:16px}.card{background:#151b28;border:1px solid #1e293b;border-radius:12px;padding:16px;max-width:560px;margin:0 auto}h2{color:#38bdf8;margin-top:0}h3{color:#4ade80;margin-bottom:4px}.stat{color:#94a3b8;margin:6px 0}.row{border-top:1px solid #1e293b;padding:8px 0;font-size:14px}</style>
</head><body><div class="card"><h2>${r.done ? "Discovery complete" : `Discovering… ${pct}%`}</h2>
<div class="stat">Stocks analyzed: ${r.processed} / ${r.total} · Holdout starts ${r.report.cutoff}</div>
<div class="stat">Average same-day move — learn ${r.report.baseline.learn}% · holdout ${r.report.baseline.holdout}%</div>
<h3>Streak verdict</h3><div class="stat">${esc(r.report.streakConclusion)}</div>
${sections}<div class="stat">${esc(r.report.note)}</div></div></body></html>`;
          return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(`<meta http-equiv="refresh" content="5"><pre>Paused: ${msg}\nRetrying in 5 seconds…</pre>`, { status: 500, headers: { "Content-Type": "text/html" } });
        }
      },
    },
  },
});
