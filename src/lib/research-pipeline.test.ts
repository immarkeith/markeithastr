import { test, expect } from 'bun:test';
import { executeResearchPipeline } from './research-pipeline';
test('replay finishes before dependent history and graph reads', async () => {
  const order: string[] = [];
  const result = await executeResearchPipeline(['selection_replay', 'selection_history', 'lab_graph'].map(name => ({ name, run: async () => { order.push(name); return name; } })));
  expect(order).toEqual(['selection_replay', 'selection_history', 'lab_graph']);
  expect(result.ok).toBe(true); expect(result.stages.map(s => s.status)).toEqual(['completed', 'completed', 'completed']);
});
test('failed replay skips dependent snapshots without reporting success', async () => {
  let writes = 0;
  const result = await executeResearchPipeline([{ name: 'selection_replay', run: async () => { throw new Error('replay unavailable'); } },
    { name: 'selection_history', run: async () => { writes++; } }]);
  expect(result.ok).toBe(false); expect(writes).toBe(0);
  expect(result.stages.map(s => s.status)).toEqual(['failed', 'skipped']);
});
test('failed saved-history verification stops graph refresh', async () => {
  let graphs = 0;
  const result = await executeResearchPipeline([{ name: 'selection_replay', run: async () => 0 },
    { name: 'selection_history', run: async () => { throw new Error('readback mismatch'); } },
    { name: 'lab_graph', run: async () => { graphs++; } }]);
  expect(result.ok).toBe(false); expect(graphs).toBe(0);
  expect(result.stages.map(s => s.status)).toEqual(['completed', 'failed', 'skipped']);
});