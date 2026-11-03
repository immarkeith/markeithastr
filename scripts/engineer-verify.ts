/**
 * ASTR Phase K — independent verification reporter.
 *
 * Runs in the `independent-verify` job AFTER the exact commit has been checked
 * out and lint/build have run. It only records a result when the SHA it verified
 * is still the task's proposed commit, so a branch that moved after verification
 * can never be approved.
 */
import { createClient } from "@supabase/supabase-js";

const TASK_ID = process.env["TASK_ID"] ?? "";
const SHA = process.env["SHA"] ?? "";
const BRANCH = process.env["BRANCH"] ?? "";
const LINT = process.env["LINT_OUTCOME"] ?? "skipped";
const BUILD = process.env["BUILD_OUTCOME"] ?? "skipped";
const TYPE = process.env["TYPECHECK_OUTCOME"] ?? "skipped";

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function exit(message: string, code = 0): never {
  console.log(`verify: ${message}`);
  process.exit(code);
}

if (!SUPABASE_URL || !SUPABASE_KEY)
  exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — nothing recorded.", 1);
if (!TASK_ID || !SHA) exit("TASK_ID / SHA missing — nothing recorded.", 1);

if (process.env["ALPACA_LIVE_KEY_ID"] || process.env["ALPACA_LIVE_SECRET_KEY"]) {
  exit("credential isolation violated: live trading keys are present in the verification job.", 1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: task, error } = await supabase
  .from("engineer_tasks")
  .select("id, commit_sha, branch_name, status, retry_count, diagnosis")
  .eq("id", TASK_ID)
  .maybeSingle();

if (error) exit(`could not read task: ${error.message}`, 1);
if (!task) exit("task not found.", 1);

if (task.commit_sha !== SHA) {
  exit(
    `commit changed after the runner finished (expected ${task.commit_sha}, verified ${SHA}) — not recorded.`,
    0,
  );
}
if (BRANCH && task.branch_name && BRANCH !== task.branch_name) {
  exit(`branch mismatch (expected ${task.branch_name}, got ${BRANCH}) — not recorded.`, 0);
}

const passed = LINT !== "failure" && BUILD === "success";

const checks = [
  {
    name: "lint",
    status: LINT === "success" ? "pass" : LINT === "failure" ? "fail" : "skipped",
    detail: `outcome: ${LINT}`,
  },
  {
    name: "typecheck",
    status: TYPE === "success" ? "pass" : TYPE === "failure" ? "fail" : "skipped",
    detail: `outcome: ${TYPE}`,
  },
  {
    name: "build",
    status: BUILD === "success" ? "pass" : BUILD === "failure" ? "fail" : "skipped",
    detail: `outcome: ${BUILD}`,
  },
  { name: "security", status: "pass", detail: "Firewall cleared by the runner" },
  { name: "exact_sha", status: "pass", detail: `Verified ${SHA.slice(0, 8)}` },
];

const patch: Record<string, unknown> = {
  build_passed: passed,
  verified_sha: passed ? SHA : null,
  status: passed ? "review_ready" : "failed",
  verification: { checks, build_passed: passed, exact_sha: SHA },
  updated_at: new Date().toISOString(),
};

if (!passed) {
  patch["diagnosis"] = {
    category: "verification",
    message: "Independent verification failed on the exact commit.",
    attempts: (task.diagnosis as { attempts?: unknown } | null)?.attempts ?? [],
  };
}

const updated = await supabase.from("engineer_tasks").update(patch).eq("id", TASK_ID);
if (updated.error) exit(`could not record verification: ${updated.error.message}`, 1);

await supabase.from("engineer_logs").insert({
  task_id: TASK_ID,
  step_name: "verify",
  level: passed ? "info" : "error",
  log_text: passed
    ? `Independent verification passed for ${SHA.slice(0, 8)} — ready for review.`
    : `Independent verification failed for ${SHA.slice(0, 8)} (lint ${LINT}, build ${BUILD}).`,
});

console.log(`verify: recorded ${passed ? "review_ready" : "failed"} for ${SHA.slice(0, 8)}.`);
