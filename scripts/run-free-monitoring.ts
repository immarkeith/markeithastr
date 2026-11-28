/** Optional existing-server runner. Not enabled by importing, deploying or visiting ASTR.
 * Requires explicit free-budget confirmation and the existing backend's hook credential.
 * One process only; requests are sequential and never queue overlapping cycles.
 */
import { createClient } from '@supabase/supabase-js';
import { MAINTENANCE_INTERVAL_MS, maintenanceDue } from '../src/lib/maintenance-rules';

if (process.env['ASTR_FREE_MONITORING_CONFIRMED'] !== 'yes') throw new Error('Confirm an existing always-on server and free hosting/request budget before enabling monitoring');
const origin = process.env['ASTR_APP_ORIGIN'];
const dbUrl = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!origin || !dbUrl || !key) throw new Error('App origin and server-side database configuration are required');
const target = new URL(origin);
if (target.protocol !== 'https:' || /lovable|replit|base44|bolt/i.test(target.hostname) || target.username || target.password || target.pathname !== '/') throw new Error('Use the independent production HTTPS app origin');
const db = createClient(dbUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
let stopped = false;
process.on('SIGINT', () => { stopped = true; });
process.on('SIGTERM', () => { stopped = true; });
const last = new Map<string, number>();

async function call(path: string, body: Record<string, string> = {}) {
  const { data, error } = await db.from('hook_tokens').select('token').eq('id', 1).maybeSingle();
  if (error || !data?.token) throw new Error('Existing callback credential is unavailable');
  const response = await fetch(new URL(path, target), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-hook-secret': String(data.token) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60_000),
  });
  // Never print response bodies: older repair callbacks can contain account evidence.
  const result = await response.json().catch(() => null) as { ok?: boolean } | null;
  console.log(JSON.stringify({ path, status: response.status, ok: response.ok && result?.ok !== false, checked_at: new Date().toISOString() }));
  if (!response.ok || result?.ok === false) throw new Error('A scheduled check reported a failure; review ASTR logs');
}

while (!stopped) {
  const started = Date.now();
  for (const [path, interval, body] of [
    ['/api/public/hooks/monitor', MAINTENANCE_INTERVAL_MS, {}],
    ['/api/public/hooks/lab-refresh', MAINTENANCE_INTERVAL_MS, {}],
    ['/api/public/hooks/health', 60 * 60_000, {}],
    ['/api/public/hooks/integrity', 24 * 60 * 60_000, { cadence: 'daily' }],
  ] as const) {
    if (stopped || !maintenanceDue(last.get(path) ?? null, started, interval)) continue;
    // Attempt receipts throttle failures too; do not hammer an unavailable provider.
    last.set(path, started);
    try { await call(path, body); } catch { console.error(`${path}: check failed; retry at its next bounded interval`); }
  }
  if (process.argv.includes('--once')) break;
  await new Promise(resolve => setTimeout(resolve, MAINTENANCE_INTERVAL_MS));
}