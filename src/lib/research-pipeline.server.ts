import { executeResearchPipeline } from './research-pipeline';
/** No orders, trade mutation, provider ingestion or settings changes. */
export async function runSelectionGraphPipeline() {
  return executeResearchPipeline([
    { name: 'selection_replay', run: async () => {
      const { runSelectionReplay } = await import('./selection-replay.server');
      return runSelectionReplay();
    } },
    { name: 'selection_history', run: async () => {
      const { rebuildLabHistory, readLabHistory } = await import('./history-reconstruction.server');
      const saved = await rebuildLabHistory();
      const readback = await readLabHistory();
      if (!saved || !readback || saved.generated_at !== readback.generated_at) throw new Error('Selection snapshot readback failed');
      return { generated_at: readback.generated_at, sessions: readback.selection_sessions, lanes: readback.curves.length };
    } },
    { name: 'lab_graph', run: async () => {
      const { rebuildLabGraph, readLabGraph } = await import('./lab-graph.server');
      const saved = await rebuildLabGraph();
      const readback = await readLabGraph();
      if (!readback || saved.guards.generated_at !== readback.guards.generated_at) throw new Error('Lab snapshot readback failed');
      return { generated_at: readback.guards.generated_at };
    } },
  ]);
}