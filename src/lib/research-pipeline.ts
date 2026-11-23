/** Ordered research-only stages; failed dependencies must never appear successful. */
export interface ResearchStage { name: string; run: () => Promise<unknown> }
export interface ResearchStageResult { name: string; status: 'completed' | 'failed' | 'skipped'; result?: unknown }
export async function executeResearchPipeline(stages: readonly ResearchStage[]) {
  const results: ResearchStageResult[] = [];
  let failed = false;
  for (const stage of stages) {
    if (failed) { results.push({ name: stage.name, status: 'skipped' }); continue; }
    try { results.push({ name: stage.name, status: 'completed', result: await stage.run() }); }
    catch (error) {
      console.error(`Research stage ${stage.name} failed:`, error instanceof Error ? error.message : 'unknown failure');
      results.push({ name: stage.name, status: 'failed' }); failed = true;
    }
  }
  return { ok: !failed, stages: results };
}