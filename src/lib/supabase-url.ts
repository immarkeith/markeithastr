/**
 * Guards against the most common hosting misconfiguration: pasting the
 * database's REST endpoint (".../rest/v1") instead of the plain project
 * address into the environment variables.
 *
 * The Supabase client appends "/rest/v1/..." itself, so a doubled path makes
 * every single read fail with PostgREST error PGRST125 ("Invalid path
 * specified in request URL"). When that happens the app silently falls back to
 * simulated balances and empty pages, which looks like missing data rather
 * than a bad setting.
 *
 * Normalising the value to the project origin makes both forms work.
 */
export function normalizeSupabaseUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  let url = value.trim();
  if (!url) return undefined;
  // Strip wrapping quotes some dashboards copy along with the value.
  url = url.replace(/^['"]|['"]$/g, "");
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    // Not parseable as a URL — at least drop any REST/auth suffix and slashes.
    return url.replace(/\/(rest|auth|storage|realtime)\/v\d.*$/i, "").replace(/\/+$/, "");
  }
}

/** Rewrites the server-side Supabase addresses in place, once per request. */
export function normalizeSupabaseEnv(): void {
  for (const key of ["SUPABASE_URL", "VITE_SUPABASE_URL"]) {
    const current = process.env[key];
    const fixed = normalizeSupabaseUrl(current);
    if (fixed && fixed !== current) process.env[key] = fixed;
  }
}
