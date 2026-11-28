/** Add missing/pending outcomes and refresh the saved view. No selections or book replay. */
import { runSelectionReplay } from '../src/lib/selection-replay.server';
import { refreshLabGraphIntraday } from '../src/lib/lab-graph.server';
const result = await runSelectionReplay({ fullReplay: true, evaluationsOnly: true });
console.log(JSON.stringify({ outcomes: result }));
const graph = await refreshLabGraphIntraday();
console.log(JSON.stringify({ graph: graph.mode, generated_at: graph.guards.generated_at }));