/** Refresh saved Layer 2 selection graphs: bun scripts/reconstruct-lab-history.ts */
import { rebuildLabHistory, readLabHistory } from '../src/lib/history-reconstruction.server';
import { isDeepStrictEqual } from 'node:util';
const h = await rebuildLabHistory();
if (!h || !isDeepStrictEqual(h, await readLabHistory())) throw new Error('Saved selection history readback failed');
console.log(JSON.stringify({ verified: true, from: h.from, to: h.to, selection_sessions: h.selection_sessions,
  market_sessions: h.market_sessions, universe: h.universe,
  curves: h.curves.map(({ points, ...metrics }) => ({ ...metrics, points: points.length })) }, null, 2));
