import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily 8:00 AM ET key test (every day of the year). Read-only: checks the live
 * Alpaca account and market-data access. Never places orders. Pushes an alert
 * to the phone if either check fails.
 */
async function probe(url: string, id: string, secret: string) {
  try {
    const res = await fetch(url, {
      headers: { "APCA-API-KEY-ID": id, "APCA-API-SECRET-KEY": secret },
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export const Route = createFileRoute("/api/public/hooks/key-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;

        const id = process.env["ALPACA_LIVE_KEY_ID"]?.trim() ?? "";
        const secret = process.env["ALPACA_LIVE_SECRET_KEY"]?.trim() ?? "";
        const day = new Date().toISOString().slice(0, 10);
        const missing = !id || !secret;
        const account = missing
          ? { ok: false, status: 0 }
          : await probe("https://api.alpaca.markets/v2/account", id, secret);
        const data = missing
          ? { ok: false, status: 0 }
          : await probe(
              "https://data.alpaca.markets/v2/stocks/SPY/bars/latest?feed=iex",
              id,
              secret,
            );
        const ok = account.ok && data.ok;

        if (!ok) {
          const { notify } = await import("@/lib/notify.server");
          const reason = missing
            ? "Your Alpaca keys are missing from the app settings."
            : `Alpaca rejected the keys (account ${account.status || "no reply"}, price data ${data.status || "no reply"}).`;
          try {
            await notify({
              kind: "health",
              title: "Alpaca key check failed",
              body: `${reason} Price data and live trading will stop until the keys are fixed.`,
              severity: "bad",
              action: "Check your Alpaca keys in Vercel",
              meta: { account, data },
              dedupe_key: `key-check:${day}`,
            });
          } catch (e) {
            console.error("key-check notify failed:", e instanceof Error ? e.message : e);
          }
        }
        return Response.json({ ok, day, account, data });
      },
    },
  },
});
