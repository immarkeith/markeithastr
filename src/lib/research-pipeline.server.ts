import { executeResearchPipeline } from './research-pipeline';
import { researchWatermark } from './research-watermark.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import type { Json } from '@/integrations/supabase/types';
/** No orders, trade mutation, provider ingestion or settings changes. */
export async function runSelectionGraphPipeline(options: { force?: boolean; fullReplay?: boolean } = {}) {
  const started = Date.now();
  const watermark = await researchWatermark();
  const { data: receipt, error } = await supabaseAdmin.from('research_runs').select('config').eq('kind', 'research_pipeline_verified').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const config = receipt?.config as { watermark?: string } | null;
  if (!options.force && config?.watermark === watermark) return { ok: true, stages: [], unchanged: true, duration_ms: Date.now() - started };
  const result = await executeResearchPipeline([
    { name: 'researcher_ledger', run: async () => {
      const { runResearcherLedger } = await import('./researcher-ledger.server');
      return runResearcherLedger();
    } },
    { name: 'selection_replay', run: async () => {
      const { runSelectionReplay } = await import('./selection-replay.server');
      return runSelectionReplay(options.fullReplay ? { fullReplay: true } : {});
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
  const duration_ms = Date.now() - started;
  const finalWatermark = result.ok ? await researchWatermark() : watermark;
  const { error: saveError } = await supabaseAdmin.from('research_runs').insert({
    kind: result.ok ? 'research_pipeline_verified' : 'research_pipeline_failed',
    config: { watermark: finalWatermark },
    summary: { ...result, duration_ms } as unknown as Json,
  });
  if (saveError) throw new Error(`Research run receipt failed: ${saveError.message}`);
  return { ...result, unchanged: false, duration_ms };
}