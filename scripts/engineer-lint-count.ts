/**
 * Prints the ESLint error count of the current working tree as a single integer.
 *
 * Used by the `independent-verify` job so the repository's large pile of
 * pre-existing style errors never fails an engineer task. The job counts errors
 * at the task's base commit and at the verified commit and fails only when the
 * number grew — the same rule the runner applies, measured independently.
 */
import { execSync } from "node:child_process";

function count(output: string): number {
  const summary = /(\d+)\s+problems?\s+\(([0-9]+)\s+errors?/.exec(output);
  if (summary?.[2]) return Number(summary[2]);
  return output.split("\n").filter((line) => /^\s+\d+:\d+\s+error\s/.test(line)).length;
}

try {
  const output = execSync("bun run lint", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 600_000,
  });
  console.log(count(output));
} catch (error) {
  const failure = error as { stdout?: string };
  console.log(count(failure.stdout ?? ""));
}
