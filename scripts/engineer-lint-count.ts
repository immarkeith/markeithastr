/**
 * Prints the ESLint error count of the current working tree as a single integer
 * (style-only `prettier/prettier` findings excluded).
 *
 * Used by the `independent-verify` job so the repository's large pile of
 * pre-existing style errors never fails an engineer task. The job counts errors
 * at the task's base commit and at the verified commit and fails only when the
 * number grew — the same rule the runner applies, measured independently.
 */
import { execSync } from "node:child_process";

import { lintErrorCount } from "../src/lib/engineer/lint";

try {
  const output = execSync("bun run lint", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600_000,
  });
  console.log(lintErrorCount(output));
} catch (error) {
  const failure = error as { stdout?: string };
  console.log(lintErrorCount(failure.stdout ?? ""));
}
