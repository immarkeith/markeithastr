import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { exchangeSessionNow } from './exchange-calendar.server';

/** Bounded 24/7 detection, not a full backfill, scan, repair or investment audit. */
export async function runBoundedMonitor() {
  const checkedAt = new Date().toISOString();
  const [settings, history, ledger] = await Promise.all([
    supabaseAdmin.from('app_settings').select('id').limit(1),
    supabaseAdmin.from('daily_bars').select('bar_date').order('bar_date', { ascending: false }).limit(1),
    supabaseAdmin.from('researcher_daily_ledger').select('session_date').order('session_date', { ascending: false }).limit(1),
  ]);
  const issues: string[] = [];
  for (const [name, result] of [['settings', settings], ['market history', history], ['research ledger', ledger]] as const) {
    if (result.error) issues.push(`${name} read failed`);
    else if (!result.data?.length) issues.push(`${name} is empty`);
  }
  try { await exchangeSessionNow(); } catch { issues.push('Exchange calendar/key access unavailable'); }
  // No invented stale-data alarms on weekends: report the saved dates as evidence.
  // Existing health/repair and deep integrity passes remain independently paced.
  return {
    ok: issues.length === 0, checked_at: checkedAt, issues,
    latest_bar: history.data?.[0]?.bar_date ?? null,
    latest_ledger: ledger.data?.[0]?.session_date ?? null,
    repair_attempted: false,
  };
}