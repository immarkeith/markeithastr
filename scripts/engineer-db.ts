/**
 * Database access for the Engineer runner/verifier. Uses a direct database key
 * when one is provided (self-hosted Postgres/Supabase); otherwise reports
 * through ASTR's /api/public/engineer-bridge with ENGINEER_BRIDGE_SECRET, so the
 * runner never needs a database credential.
 */
import { createClient } from "@supabase/supabase-js";

type Result = { data: any; error: { message: string } | null };

class BridgeQuery implements PromiseLike<Result> {
  private body: Record<string, unknown>;
  private filters: [string, string, unknown][] = [];
  constructor(private send: (b: unknown) => Promise<Result>, table: string) {
    this.body = { op: "select", table };
  }
  select(columns = "*") { if (this.body.op === "select") this.body.columns = columns; return this; }
  insert(values: Record<string, unknown>) { this.body = { ...this.body, op: "insert", values }; return this; }
  update(values: Record<string, unknown>) { this.body = { ...this.body, op: "update", values }; return this; }
  eq(c: string, v: unknown) { this.filters.push([c, "eq", v]); return this; }
  gte(c: string, v: unknown) { this.filters.push([c, "gte", v]); return this; }
  order(column: string, o?: { ascending?: boolean }) { this.body.order = { column, ascending: o?.ascending ?? true }; return this; }
  limit(n: number) { this.body.limit = n; return this; }
  maybeSingle() { this.body.single = true; return this; }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return this.send({ ...this.body, filters: this.filters }).then(ok, bad);
  }
}

export function createEngineerDb(): any {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (url && key) return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const bridge = process.env["ENGINEER_BRIDGE_URL"];
  const secret = process.env["ENGINEER_BRIDGE_SECRET"]?.trim();
  if (!bridge || !secret)
    throw new Error("Set ENGINEER_BRIDGE_URL + ENGINEER_BRIDGE_SECRET (or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");

  const send = async (b: unknown): Promise<Result> => {
    try {
      const r = await fetch(bridge, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-engineer-secret": secret },
        body: JSON.stringify(b),
      });
      const j = (await r.json().catch(() => ({}))) as Partial<Result> & { error?: any };
      if (!r.ok) return { data: null, error: { message: `bridge ${r.status}: ${j.error?.message ?? j.error ?? ""}` } };
      return { data: j.data ?? null, error: j.error ?? null };
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  };
  return {
    from: (table: string) => new BridgeQuery(send, table),
    rpc: (fn: string, args?: Record<string, unknown>) => send({ op: "rpc", fn, args }),
  };
}
