import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/replay")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const batch = parseInt(url.searchParams.get("batch") ?? "1", 10);

          const { runHistoricalReplayBatch } = await import("@/lib/replay.server");
          const res = await runHistoricalReplayBatch(batch, 20);

          const nextUrl = res.nextBatch ? `/api/public/hooks/replay?batch=${res.nextBatch}` : null;

          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>ASTR Historical Replay</title>
              <style>
                body { font-family: -apple-system, sans-serif; background: #0a0d14; color: #f1f5f9; padding: 24px; }
                .card { background: #151b28; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; max-width: 480px; margin: 0 auto; }
                h2 { color: #38bdf8; margin-top: 0; }
                .stat { margin: 12px 0; font-size: 15px; color: #94a3b8; }
                .stat span { color: #f8fafc; font-weight: 600; }
                .btn { display: block; text-align: center; background: #2563eb; color: #fff; padding: 14px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 24px; font-size: 16px; }
                .done { color: #4ade80; font-weight: bold; font-size: 18px; text-align: center; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>Batch ${res.batch} of ${res.totalBatches} Complete</h2>
                <div class="stat">Date Range: <span>${res.datesProcessed}</span></div>
                <div class="stat">Trades Logged: <span>${res.tradesLogged}</span></div>
                <div class="stat">Horizon Predictions: <span>${res.predictionsLogged}</span></div>
                <div class="stat">Learned Examples: <span>${res.examplesLogged}</span></div>
                ${
                  nextUrl
                    ? `<a class="btn" href="${nextUrl}">Run Batch ${res.nextBatch} of ${res.totalBatches} ➔</a>`
                    : `<div class="done">✓ Full 7.5-Month Replay Complete! Refresh ASTR.</div>`
                }
              </div>
            </body>
            </html>
          `;

          return new Response(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        } catch (err: any) {
          return new Response(`Replay Error: ${err.message}`, { status: 500 });
        }
      },
    },
  },
});
