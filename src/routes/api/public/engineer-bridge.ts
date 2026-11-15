import { createFileRoute } from "@tanstack/react-router";
import type { BridgeRequest } from "@/lib/engineer/bridge-rules";

/**
 * Engineer bridge: lets the GitHub runner report progress without holding a
 * database key. Every call must carry ENGINEER_BRIDGE_SECRET and pass the
 * allowlist in bridge-rules.ts (engineer tables only, no approvals, no trades).
 */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/engineer-bridge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { timingSafeEqual, createHash } = await import("node:crypto");
        const expected = process.env["ENGINEER_BRIDGE_SECRET"] ?? "";
        const provided = request.headers.get("x-engineer-secret") ?? "";
        const d = (v: string) => createHash("sha256").update(v).digest();
        if (!expected || expected.length < 32 || !provided || !timingSafeEqual(d(provided), d(expected)))
          return json({ error: "Unauthorized" }, 401);

        let req: BridgeRequest;
        try {
          req = (await request.json()) as BridgeRequest;
        } catch {
          return json({ error: "invalid JSON" }, 400);
        }
        const { checkBridgeRequest } = await import("@/lib/engineer/bridge-rules");
        const denied = checkBridgeRequest(req);
        if (denied) return json({ error: denied }, 403);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyFilters = (q: any, filters: [string, string, unknown][] = []) => {
          for (const [c, op, v] of filters) q = op === "gte" ? q.gte(c, v) : q.eq(c, v);
          return q;
        };
        let res;
        if (req.op === "rpc") res = await db.rpc(req.fn, req.args ?? {});
        else if (req.op === "insert") res = await db.from(req.table).insert(req.values);
        else if (req.op === "update") res = await applyFilters(db.from(req.table).update(req.values), req.filters);
        else {
          let q = applyFilters(db.from(req.table).select(req.columns ?? "*"), req.filters);
          if (req.order) q = q.order(req.order.column, { ascending: req.order.ascending });
          q = q.limit(Math.min(Math.max(req.limit ?? 500, 1), 1000));
          res = req.single ? await q.maybeSingle() : await q;
        }
        return json({ data: res.data ?? null, error: res.error ? { message: res.error.message } : null });
      },
    },
  },
});
