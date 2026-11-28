/** Historical then incremental researcher selection replay. Paper research only.
 * bun scripts/replay-research-selections.ts — safe to rerun; existing rows are never rewritten. */
import { runSelectionReplay } from '../src/lib/selection-replay.server';
console.log(JSON.stringify(await runSelectionReplay({
  fullReplay: process.argv.includes('--full-history'),
  evaluationsOnly: process.argv.includes('--evaluations-only'),
})));
