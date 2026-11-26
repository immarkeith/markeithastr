/** Read-only. Run on the trusted host whose configured database is being certified. */
import { supabaseAdmin } from '../src/integrations/supabase/client.server';
import { certifyResearchRecords, type RecordedResearchRow, type RecordedResearchCurve } from '../src/lib/research-certification';

const option = (name: string, fallback = '') => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const requireReplay = process.argv.includes('--require-replay');
const lanes = ['trend', 'contrarian', 'consistency', 'growth', 'risk', 'skeptic', 'lead'];
const rows: RecordedResearchRow[] = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabaseAdmin.from('researcher_daily_ledger').select('lane,session_date,equity,pnl,pnl_pct,daily_return_pct').order('lane').order('session_date').range(offset, offset + 999);
  if (error) throw new Error(error.message);
  rows.push(...(data ?? []).map(row => ({ ...row, equity: Number(row.equity), pnl: Number(row.pnl), pnl_pct: Number(row.pnl_pct), daily_return_pct: Number(row.daily_return_pct) })));
  if ((data ?? []).length < 1000) break;
}
const { data: saved, error } = await supabaseAdmin.from('research_runs').select('summary').eq('kind', 'lab_graph').order('created_at', { ascending: false }).limit(1).maybeSingle();
if (error) throw new Error(error.message);
const summary = saved?.summary as { payload?: { equity_curves?: RecordedResearchCurve[] } } | null;
const sessions: string[] = [];
for (let offset = 0; ; offset += 1000) {
  const { data, error: pricesError } = await supabaseAdmin.from('daily_bars').select('bar_date').eq('ticker', 'SPY').order('bar_date').range(offset, offset + 999);
  if (pricesError) throw new Error(pricesError.message);
  sessions.push(...(data ?? []).map(row => row.bar_date));
  if ((data ?? []).length < 1000) break;
}

const certification = certifyResearchRecords(rows, summary?.payload?.equity_curves ?? [], sessions, lanes);
let replayGate: Record<string, unknown> | undefined;
if (requireReplay) {
  const expectedStart = option('expect-start', '2021-06-01');
  const allowedMissing = new Set(option('allow-missing').split(',').filter(Boolean));
  const failures: string[] = [];
  const ends = new Set<string>();
  for (const report of certification.reports) {
    if (report.rows === 0) failures.push(`${report.lane}: no saved rows`);
    if (report.first !== expectedStart) failures.push(`${report.lane}: expected start ${expectedStart}, found ${report.first ?? 'none'}`);
    for (const key of ['identity_errors', 'continuity_errors', 'date_errors', 'snapshot_errors'] as const) {
      if (report[key] !== 0) failures.push(`${report.lane}: ${key}=${report[key]}`);
    }
    const dates = new Set(rows.filter(row => row.lane === report.lane).map(row => row.session_date));
    const missing = report.first && report.last ? sessions.filter(date => date >= report.first! && date <= report.last! && !dates.has(date)) : [];
    const unexpected = missing.filter(date => !allowedMissing.has(date));
    if (unexpected.length) failures.push(`${report.lane}: unexpected missing sessions ${unexpected.join(',')}`);
    if (report.last) ends.add(report.last);
  }
  if (ends.size > 1) failures.push(`lanes end on different sessions: ${[...ends].sort().join(',')}`);
  replayGate = {
    verified: failures.length === 0,
    expected_start: expectedStart,
    allowed_missing_sessions: [...allowedMissing].sort(),
    failures,
    note: 'Arithmetic/source gate only; historical market qualification remains unverified.',
  };
}
const output = { checked_at: new Date().toISOString(), scope: 'configured database only; not a deployment certification', ...certification, ...(replayGate ? { replay_gate: replayGate } : {}) };
const serialized = JSON.stringify(output, null, 2);
const outputFile = option('output');
if (outputFile) await Bun.write(outputFile, `${serialized}\n`);
console.log(serialized);
if (requireReplay && replayGate?.['verified'] !== true) throw new Error('Research replay certification failed; inspect replay_gate.failures');
