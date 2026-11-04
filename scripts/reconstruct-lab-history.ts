/**
 * One-time historical reconstruction runner. Resumable: re-run to continue.
 *   bun scripts/reconstruct-lab-history.ts [--restart]
 */
import { reconstructStep } from "../src/lib/history-reconstruction.server";

let restart = process.argv.includes("--restart");
for (;;) {
  try {
    const r = await reconstructStep({ restart });
    restart = false;
    console.log(new Date().toISOString(), JSON.stringify(r));
    if (r.done) break;
  } catch (e) {
    console.error("step failed, retrying in 10s:", e instanceof Error ? e.message : e);
    await new Promise((res) => setTimeout(res, 10_000));
  }
}
