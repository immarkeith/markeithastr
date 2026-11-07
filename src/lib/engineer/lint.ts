/**
 * Error counting shared by the runner (`scripts/engineer-runner.ts`) and the
 * independent verification job (`scripts/engineer-lint-count.ts`).
 *
 * `prettier/prettier` findings are style-only and the repository already carries
 * thousands of them, so they never count: an engineer task is judged on real
 * lint errors and type errors, not on how a line happens to be wrapped.
 */

/** Number of ESLint error findings, ignoring `prettier/prettier`. */
export function lintErrorCount(output: string): number {
  const details = output.split("\n").filter((line) => /^\s+\d+:\d+\s+error\s/.test(line));
  if (details.length > 0) {
    return details.filter((line) => !/prettier\/prettier\s*$/.test(line)).length;
  }
  const summary = /(\d+)\s+problems?\s+\(([0-9]+)\s+errors?/.exec(output);
  return summary?.[2] ? Number(summary[2]) : 0;
}

/** Number of TypeScript compiler errors. */
export function typeErrorCount(output: string): number {
  return output.split("\n").filter((line) => /\berror TS\d+/.test(line)).length;
}
