/**
 * Prints the ESLint error count of the current working tree as a single integer
 * (style-only `prettier/prettier` findings excluded).
 *
 * Used by the `independent-verify` job so the repository's large pile of
 * pre-existing style errors never fails an engineer task. The job counts errors
 * at the task's base commit and at the verified commit and fails only when the
 * number grew — the same rule the runner applies, measured independently.
 *
 * The counting lives here rather than in `src/lib/engineer/lint.ts` because this
 * script also runs at the task's BASE commit, where that shared module may not
 * exist yet.
 */
import { execSync } from "node:child_process";

function lintErrorCount(output: string): number {
  const details = output.split("\n").filter((line) => /^\s+\d+:\d+\s+error\s/.test(line));
  if (details.length > 0) {
    return details.filter((line) => !/prettier\/prettier\s*$/.test(line)).length;
  }
  const summary = /(\d+)\s+problems?\s+\(([0-9]+)\s+errors?/.exec(output);
  return summary?.[2] ? Number(summary[2]) : 0;
}

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
