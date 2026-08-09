/**
 * Shared secret check for the scheduled hook endpoints. The token lives in a
 * server-only table (public.hook_tokens) that the database scheduler reads when
 * it fires each job, so the value never ships to the browser or the repo.
 */
import { timingSafeEqual, createHash } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

async function expectedToken(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("hook_tokens")
    .select("token")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("hook token lookup failed:", error.message);
    return null;
  }
  return (data as { token: string } | null)?.token ?? null;
}

/** Returns a 401 Response when the caller did not present the hook secret. */
export async function rejectUnauthorizedHook(request: Request): Promise<Response | null> {
  const provided = request.headers.get("x-hook-secret") ?? "";
  const expected = await expectedToken();
  const ok =
    Boolean(provided) && Boolean(expected) && timingSafeEqual(digest(provided), digest(expected!));
  if (ok) return null;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
