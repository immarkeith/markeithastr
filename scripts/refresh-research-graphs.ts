/** Force the ordered, paper-research-only pipeline and fail on any stage error.
 * bun scripts/refresh-research-graphs.ts
 */
import { runSelectionGraphPipeline } from "../src/lib/research-pipeline.server";

const result = await runSelectionGraphPipeline({ force: true, fullReplay: true });
console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  const failed = result.stages.find((stage) => stage.status === "failed");
  throw new Error(
    `Research refresh failed at ${failed?.name ?? "unknown stage"}; downstream stages were not certified`,
  );
}
