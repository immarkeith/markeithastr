// Read-only check: reports which migration/fresh files appear to be missing in the
// database pointed at by SUPABASE_URL. It only runs zero-row selects and never writes.
import { supabaseAdmin } from '../src/integrations/supabase/client.server';

const checks: Array<{ file: string; table: string; columns?: string }> = [
  { file: '11-long-term-research.sql', table: 'research_horizon_predictions' },
  { file: '11-long-term-research.sql', table: 'trades', columns: 'hold_horizon,review_date,horizon_history' },
  { file: '12-researcher-learning.sql', table: 'researcher_examples' },
  { file: '12-researcher-learning.sql', table: 'researcher_beliefs' },
  { file: '13-event-intelligence.sql', table: 'market_events' },
  { file: '16-autonomous-audit.sql', table: 'audit_repair_log' },
  { file: '16-autonomous-audit.sql', table: 'audit_integrity_results' },
  ...['engineer_settings', 'engineer_checkpoints', 'engineer_change_log', 'engineer_tasks', 'engineer_logs', 'engineer_health_events']
    .map((table) => ({ file: '17-engineer-phase-k.sql', table })),
  { file: '18-phase-l-autonomous-live.sql', table: 'app_settings', columns: 'auto_live_trading,auto_max_trade_dollars,auto_max_daily_trades,auto_daily_loss_limit,auto_volatility_kill_switch,auto_spy_move_limit_pct' },
  { file: '18-phase-l-autonomous-live.sql', table: 'trades', columns: 'auto_managed,owning_researcher' },
  { file: '19-phase-e-integrity-history.sql', table: 'audit_integrity_results', columns: 'cadence,overall_verdict,pillars,discrepancies' },
  { file: '20-byob-specialist.sql', table: 'byob_models' },
  ...['byob_registry', 'byob_activation_events', 'byob_research_runs', 'byob_research_events']
    .map((table) => ({ file: '21-byob-corrected-research.sql', table })),
  { file: '21-byob-corrected-research.sql', table: 'byob_models', columns: 'methodology,provenance,evidence_state' },
  { file: '22-research-selection-layers.sql', table: 'research_daily_selections' },
  { file: '22-research-selection-layers.sql', table: 'research_selection_evaluations' },
];

const missing = new Map<string, string[]>();
for (const c of checks) {
  const { error } = await supabaseAdmin.from(c.table as never).select(c.columns ?? '*').limit(0);
  const status = error ? `MISSING (${error.message})` : 'ok';
  console.log(`${c.file.padEnd(36)} ${c.table}${c.columns ? ` [${c.columns}]` : ''}: ${status}`);
  if (error) missing.set(c.file, [...(missing.get(c.file) ?? []), c.table]);
}
if (missing.size) {
  console.log('\nRun these files from migration/fresh/ in this order:');
  for (const f of [...missing.keys()].sort()) console.log(`  - ${f}`);
  // The replay only needs the selection layers; other gaps are reported, not fatal.
  if (process.argv.includes('--strict') && missing.has('22-research-selection-layers.sql')) {
    console.error('::error::Run migration/fresh/22-research-selection-layers.sql in the production database first.');
    process.exit(1);
  }
} else console.log('\nAll checked migrations are present.');
