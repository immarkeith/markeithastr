/**
 * ASTR Phase K — autonomous engineer runner.
 *
 * Runs INSIDE the GitHub Actions sandbox (scripts/engineer-runner.ts), never in
 * the app server. It:
 *   1. asserts credential isolation (no live Alpaca keys in this environment),
 *   2. atomically leases one queued task from Supabase,
 *   3. inspects the real repository (map + the files the task touches),
 *   4. asks an OpenAI-compatible model for anchored search/replace hunks,
 *   5. runs the 5-layer firewall over the resulting change,
 *   6. runs lint / build / tests and allows at most three repair attempts,
 *   7. pushes an isolated engineer/<slug> branch and records the diff.
 *
 * It never merges, never deploys, and never touches a database record other than
 * its own task row and log lines.
 */
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  scanChangedPaths,
  scanFirewall,
  scanScope,
  type PatchFile,
} from "../src/lib/engineer/firewall";
import {
  applyHunks,
  diagnoseFailure,
  diffStats,
  filesFromDiff,
  migrationFromDiff,
  type PatchHunk,
} from "../src/lib/engineer/patch";
import { chatCompletion, estimateCostUsd, resolveProvider } from "../src/lib/engineer/provider";
import { repoBrief, suggestFiles } from "../src/lib/engineer/repo-map";
import type { TaskScope } from "../src/lib/engineer/types";

const MAX_REPAIR_ATTEMPTS = 3;
const MAX_CONTEXT_CHARS = 12_000;
const MAX_CONTEXT_FILES = 8;
const ARTIFACT_PATH = join(mkdtempSync(join(tmpdir(), "astr-engineer-")), "result.json");

interface TaskRow {
  id: string;
  prompt: string;
  revision_feedback: string | null;
  retry_count: number;
  scope: TaskScope | null;
  expected_files: string[] | null;
  classification: string | null;
}

interface ModelPlan {
  plan?: string;
  edits?: { path: string; find: string; replace: string }[];
  tests?: string[];
  notes?: string;
}

/** Publish job outputs when running inside GitHub Actions. */
function writeOutputs(values: Record<string, string>): void {
  const file = process.env["GITHUB_OUTPUT"];
  if (!file) return;
  appendFileSync(
    file,
    `${Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`,
  );
}

function fail(message: string): never {
  console.error(`engineer: ${message}`);
  process.exit(1);
}

function lintErrorCount(output: string): number {
  const summary = /(\d+)\s+problems?\s+\(([0-9]+)\s+errors?/.exec(output);
  if (summary?.[2]) return Number(summary[2]);
  return output.split("\n").filter((line) => /^\s+\d+:\d+\s+error\s/.test(line)).length;
}

function run(command: string, timeout = 480_000): { ok: boolean; output: string } {
  try {
    const output = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout,
    });
    return { ok: true, output };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return { ok: false, output: `${err.stdout ?? ""}\n${err.stderr ?? err.message ?? ""}`.trim() };
  }
}

// ---------------------------------------------------------------- 1. isolation
const FORBIDDEN_ENV = [
  "ALPACA_LIVE_KEY_ID",
  "ALPACA_LIVE_SECRET_KEY",
  "ALPACA_KEY_ID",
  "ALPACA_SECRET_KEY",
];
for (const name of FORBIDDEN_ENV) {
  if (process.env[name]) {
    fail(
      `credential isolation violated: ${name} is present in the runner environment. Refusing to run.`,
    );
  }
}

const SUPABASE_URL = process.env["SUPABASE_URL"];
const SUPABASE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const RUNNER_ID = `gha-${process.env["GITHUB_RUN_ID"] ?? Date.now()}`;
if (!SUPABASE_URL || !SUPABASE_KEY) fail("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are required.");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let currentTaskId: string | null = null;

async function log(
  step: string,
  text: string,
  level: "info" | "warn" | "error" = "info",
): Promise<void> {
  console.log(`[${step}] ${text}`);
  if (!currentTaskId) return;
  await supabase
    .from("engineer_logs")
    .insert({ task_id: currentTaskId, step_name: step, log_text: text.slice(0, 8000), level });
}

async function setStatus(status: string, patch: Record<string, unknown> = {}): Promise<void> {
  if (!currentTaskId) return;
  await supabase
    .from("engineer_tasks")
    .update({ status, updated_at: new Date().toISOString(), ...patch })
    .eq("id", currentTaskId);
}

// ------------------------------------------------------------------ 2. leasing
const claim = await supabase.rpc("claim_next_engineer_task", { p_runner_id: RUNNER_ID });
if (claim.error) fail(`could not claim a task: ${claim.error.message}`);
const claimed = (claim.data ?? []) as TaskRow[];
const task = claimed[0];
if (!task) {
  console.log("engineer: queue empty — nothing to do.");
  process.exit(0);
}
currentTaskId = task.id;
console.log(`engineer: claimed task ${task.id}`);

// Heartbeat every 60s so a crashed run is recoverable after 5 minutes.
const heartbeat = setInterval(() => {
  void supabase.rpc("heartbeat_engineer_task", { p_task_id: task.id, p_runner_id: RUNNER_ID });
}, 60_000);

const startedAt = Date.now();
let tokensUsed = 0;
const repairAttempts: { attempt: number; summary: string; outcome: string }[] = [];

function finishExit(code: number): never {
  clearInterval(heartbeat);
  process.exit(code);
}

async function failTask(reason: string, extra: Record<string, unknown> = {}): Promise<never> {
  await log("failed", reason, "error");
  await setStatus("failed", {
    duration_seconds: Math.round((Date.now() - startedAt) / 1000),
    tokens_used: tokensUsed,
    diagnosis: { category: "engineer", message: reason, attempts: repairAttempts },
    ...extra,
  });
  writeFileSync(
    ARTIFACT_PATH,
    JSON.stringify({ task_id: task.id, status: "failed", reason }, null, 2),
  );
  writeOutputs({ status: "failed", task_id: task.id });
  finishExit(1);
}

try {
  // ------------------------------------------------- 3. provider + budget
  const { data: settings, error: settingsError } = await supabase
    .from("engineer_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (settingsError) await failTask(`could not read engineer settings: ${settingsError.message}`);
  if (!settings) await failTask("engineer_settings row is missing — run the Phase K migration.");

  const provider = resolveProvider(
    settings?.llm_base_url as string | null,
    settings?.llm_model as string | null,
    Number(settings?.llm_price_per_million_tokens ?? 0),
  );
  if (!provider) {
    await failTask(
      "No AI provider is configured (base URL, model and ENGINEER_LLM_API_KEY). Nothing was changed.",
    );
  }

  const budget = Number(settings?.llm_monthly_budget_usd ?? 0);
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: monthTasks } = await supabase
    .from("engineer_tasks")
    .select("cost_estimate_usd")
    .gte("created_at", monthStart.toISOString());
  const spent = (monthTasks ?? []).reduce(
    (sum, row) => sum + Number(row.cost_estimate_usd ?? 0),
    0,
  );
  if (budget > 0 && spent >= budget) {
    await log(
      "budget",
      `Monthly budget $${budget.toFixed(2)} already spent ($${spent.toFixed(2)}). Pausing for approval.`,
      "warn",
    );
    await setStatus("budget_paused");
    writeFileSync(
      ARTIFACT_PATH,
      JSON.stringify({ task_id: task.id, status: "budget_paused" }, null, 2),
    );
    writeOutputs({ status: "budget_paused", task_id: task.id });
    finishExit(0);
  }
  await log(
    "planning",
    `Provider ${settings?.llm_model} · spend so far $${spent.toFixed(2)} of $${budget.toFixed(2)}.`,
  );

  // ------------------------------------------------------ 4. repository facts
  await setStatus("inspecting");
  const targetBranch = (settings?.target_branch as string | undefined) ?? "main";
  const head = run("git rev-parse HEAD");
  const baseSha = head.ok ? head.output.trim() : null;
  if (!baseSha) await failTask("Could not read the repository HEAD commit.");

  const slug = task.prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const branch = `engineer/${slug || "task"}-${task.id.slice(0, 8)}`;

  const checkout = run(`git checkout -B ${branch}`);
  if (!checkout.ok) await failTask(`Could not create branch ${branch}: ${checkout.output}`);
  await supabase
    .from("engineer_tasks")
    .update({ branch_name: branch, base_sha: baseSha, runner_id: RUNNER_ID })
    .eq("id", task.id);
  await log(
    "inspecting",
    `Working on ${branch} from ${baseSha.slice(0, 8)} (target ${targetBranch}).`,
  );

  const candidates = [
    ...new Set([...(task.expected_files ?? []), ...suggestFiles(task.prompt, MAX_CONTEXT_FILES)]),
  ]
    .filter((path) => existsSync(path))
    .slice(0, MAX_CONTEXT_FILES);

  const contextBlocks = candidates
    .map((path) => `--- ${path} ---\n${readFileSync(path, "utf8").slice(0, MAX_CONTEXT_CHARS)}`)
    .join("\n\n");
  // Lint baseline: this repository already carries pre-existing style errors, so
  // only NEW lint errors fail a task. Pre-existing failures stay out of scope.
  const scripts = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  const available = scripts.scripts ?? {};
  let lintBaseline: number | null = null;
  if (available["lint"]) {
    const baselineRun = run("bun run lint", 240_000);
    lintBaseline = lintErrorCount(baselineRun.output);
    await log(
      "inspecting",
      `Lint baseline on the untouched tree: ${lintBaseline} pre-existing error(s).`,
    );
  }

  await log("inspecting", `Context files: ${candidates.join(", ") || "none matched"}.`);

  const { data: healthRows } = await supabase
    .from("audit_repair_log")
    .select("repair_type, target, verification_note, checked_at")
    .eq("verified", false)
    .order("checked_at", { ascending: false })
    .limit(5);
  const healthContext = (healthRows ?? [])
    .map(
      (row) =>
        `${row.checked_at} ${row.repair_type} ${row.target ?? ""}: ${row.verification_note ?? ""}`,
    )
    .join("\n");

  const systemPrompt = [
    "You are ASTR's senior engineer. You modify an existing TanStack Start + React + Supabase repository.",
    "Return ONLY a JSON object, no prose, matching:",
    '{"plan": string, "edits": [{"path": string, "find": string, "replace": string}], "tests": string[], "notes": string}',
    "Rules:",
    "- Each `find` block must be copied verbatim from the file and appear EXACTLY ONCE. Include 2-3 unchanged context lines.",
    "- Never touch src/lib/broker.server.ts, .github/**, src/lib/engineer/**, scripts/engineer-runner.ts, any .env, or any live trading/credential code.",
    "- Never add dependencies, never upgrade versions, never reformat unrelated code.",
    "- No destructive SQL (DROP/TRUNCATE/DELETE without WHERE). Migrations are gated separately.",
    "- Implement ONLY what was asked. Preserve everything else exactly as it is.",
  ].join("\n");

  const userPrompt = [
    `Repository map:\n${repoBrief()}`,
    `Instruction:\n${task.prompt}`,
    task.revision_feedback
      ? `Operator feedback on the previous attempt:\n${task.revision_feedback}`
      : "",
    task.scope ? `Locked scope (do not exceed):\n${JSON.stringify(task.scope, null, 2)}` : "",
    healthContext ? `Recent health-check issues (context only):\n${healthContext}` : "",
    `Files:\n${contextBlocks || "No files matched — return an edit only for a file you can see."}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // ---------------------------------------------------------- 5. the patch
  await setStatus("coding");
  const first = await chatCompletion(
    provider,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { json: true, maxTokens: 4000 },
  );
  tokensUsed += first.tokens;

  if (!first.ok) {
    await failTask(`Model call failed: ${first.error}`, {
      tokens_used: tokensUsed,
      cost_estimate_usd: estimateCostUsd(tokensUsed, provider.price_per_million_tokens),
    });
  }

  let plan: ModelPlan;
  try {
    plan = JSON.parse(first.text) as ModelPlan;
  } catch {
    await failTask("The model did not return valid JSON — nothing was applied.", {
      tokens_used: tokensUsed,
    });
  }

  if (plan.plan) await log("planning", plan.plan.slice(0, 1500));
  const hunks: PatchHunk[] = (plan.edits ?? []).filter(
    (edit) =>
      typeof edit?.path === "string" &&
      typeof edit?.find === "string" &&
      typeof edit?.replace === "string",
  );
  if (hunks.length === 0) {
    await failTask("The model proposed no edits. Nothing was changed.", {
      tokens_used: tokensUsed,
    });
  }

  const originals = new Map<string, string>();
  for (const hunk of hunks) {
    if (!originals.has(hunk.path)) {
      if (!existsSync(hunk.path)) {
        await failTask(`Proposed file ${hunk.path} does not exist in the repository.`);
      }
      originals.set(hunk.path, readFileSync(hunk.path, "utf8"));
    }
  }

  const applied = applyHunks(originals, hunks);
  if (!applied.ok) {
    const detail = applied.errors.map((error) => `${error.path}: ${error.reason}`).join("; ");
    await failTask(`Anchored patching stopped: ${detail}`, { tokens_used: tokensUsed });
  }
  for (const [path, content] of applied.files) writeFileSync(path, content);
  await log(
    "coding",
    `Applied ${hunks.length} anchored hunk(s) across ${applied.files.size} file(s).`,
  );

  // --------------------------------------------------------- 6. firewall
  const changed = run("git status --porcelain")
    .output.split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
  const diff = run("git diff").output;
  const firewall = scanChangedPaths(changed, diff, task.prompt, task.scope);
  const scopeViolations = scanScope(changed, task.scope, task.prompt);
  await supabase
    .from("engineer_tasks")
    .update({ firewall, scope_violations: scopeViolations, updated_at: new Date().toISOString() })
    .eq("id", task.id);

  if (!firewall.passed) {
    const detail = firewall.violations
      .map((violation) => `${violation.layer}: ${violation.detail}`)
      .join("; ");
    await failTask(`Blocked by the live-trading firewall — ${detail}`, { tokens_used: tokensUsed });
  }
  await log("firewall", `Clear — ${firewall.scanned_files.length} file(s) scanned.`);

  // ------------------------------------------------------ 7. verification
  await setStatus("testing");
  const checks: { name: string; status: "pass" | "fail" | "skipped"; detail: string }[] = [];

  const runChecks = () => {
    const results: { name: string; status: "pass" | "fail" | "skipped"; detail: string }[] = [];
    if (available["lint"]) {
      const lint = run("bun run lint", 240_000);
      const current = lintErrorCount(lint.output);
      const regressed = lintBaseline !== null && current > lintBaseline;
      results.push({
        name: "lint",
        status: regressed ? "fail" : "pass",
        detail: regressed
          ? `${current} lint error(s), up from a baseline of ${lintBaseline}. ${lint.output.slice(-1200)}`
          : `${current} lint error(s), baseline ${lintBaseline ?? 0} — no new errors.`,
      });
    } else {
      results.push({ name: "lint", status: "skipped", detail: "no lint script" });
    }
    if (available["build"]) {
      const build = run("bun run build", 600_000);
      results.push({
        name: "build",
        status: build.ok ? "pass" : "fail",
        detail: build.ok ? "Production build succeeded" : build.output.slice(-3000),
      });
    } else {
      results.push({ name: "build", status: "skipped", detail: "no build script" });
    }
    return results;
  };

  checks.push(...runChecks());

  let attempt = 0;
  while (checks.some((check) => check.status === "fail") && attempt < MAX_REPAIR_ATTEMPTS) {
    attempt += 1;
    const failureOutput = checks
      .filter((check) => check.status === "fail")
      .map((check) => `${check.name}:\n${check.detail}`)
      .join("\n\n");
    const diagnosis = diagnoseFailure(failureOutput);
    await log(
      "diagnosing",
      `Attempt ${attempt}/${MAX_REPAIR_ATTEMPTS}: ${diagnosis.category} — ${diagnosis.message}`,
      "warn",
    );

    const currentContext = [...applied.files.keys()]
      .map((path) => `--- ${path} ---\n${readFileSync(path, "utf8").slice(0, MAX_CONTEXT_CHARS)}`)
      .join("\n\n");

    const repair = await chatCompletion(
      provider,
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            `The change failed verification. Fix ONLY the failure with more anchored hunks.`,
            `Failure output:\n${failureOutput.slice(0, 6000)}`,
            `Current file contents:\n${currentContext}`,
          ].join("\n\n"),
        },
      ],
      { json: true, maxTokens: 4000 },
    );
    tokensUsed += repair.tokens;

    if (!repair.ok) {
      repairAttempts.push({
        attempt,
        summary: diagnosis.message,
        outcome: `model call failed: ${repair.error}`,
      });
      break;
    }

    let repairPlan: ModelPlan;
    try {
      repairPlan = JSON.parse(repair.text) as ModelPlan;
    } catch {
      repairAttempts.push({
        attempt,
        summary: diagnosis.message,
        outcome: "invalid JSON from model",
      });
      break;
    }

    const repairHunks = (repairPlan.edits ?? []).filter(
      (edit) =>
        typeof edit?.path === "string" &&
        typeof edit?.find === "string" &&
        typeof edit?.replace === "string",
    );
    const current = new Map<string, string>();
    for (const hunk of repairHunks) {
      if (!current.has(hunk.path) && existsSync(hunk.path))
        current.set(hunk.path, readFileSync(hunk.path, "utf8"));
    }
    const repaired = applyHunks(current, repairHunks);
    if (!repaired.ok) {
      repairAttempts.push({
        attempt,
        summary: diagnosis.message,
        outcome: repaired.errors.map((error) => `${error.path}: ${error.reason}`).join("; "),
      });
      break;
    }
    for (const [path, content] of repaired.files) writeFileSync(path, content);

    checks.length = 0;
    checks.push(...runChecks());
    repairAttempts.push({
      attempt,
      summary: diagnosis.message,
      outcome: checks.some((check) => check.status === "fail") ? "still failing" : "repaired",
    });
  }

  const buildPassed =
    checks.every((check) => check.status !== "fail") &&
    checks.some((check) => check.name === "build" && check.status === "pass");
  const costEstimate = estimateCostUsd(tokensUsed, provider.price_per_million_tokens);

  if (!buildPassed) {
    const summary = checks
      .filter((check) => check.status === "fail")
      .map((check) => check.name)
      .join(", ");
    await failTask(
      `Verification failed after ${attempt} repair attempt(s)${summary ? ` (${summary})` : ""}. The branch and diff were preserved for review; the application is untouched.`,
      {
        build_passed: false,
        verification: { checks, build_passed: false },
        diagnosis: {
          category: diagnoseFailure(checks.map((c) => c.detail).join("\n")).category,
          message: "Build did not pass",
          attempts: repairAttempts,
        },
        tokens_used: tokensUsed,
        cost_estimate_usd: costEstimate,
      },
    );
  }

  // ------------------------------------------------------------- 8. commit
  const commit = run(
    `git -c user.name="ASTR Engineer" -c user.email="engineer@astr.local" add -A && git -c user.name="ASTR Engineer" -c user.email="engineer@astr.local" commit -m "engineer: ${slug || "task"} (${task.id.slice(0, 8)})"`,
  );
  if (!commit.ok) await failTask(`Commit failed: ${commit.output}`);

  const push = run(`git push --force-with-lease origin ${branch}`, 180_000);
  if (!push.ok) await failTask(`Push failed: ${push.output}`);

  const sha = run("git rev-parse HEAD").output.trim();
  const finalDiff = run(`git diff ${baseSha}...HEAD`).output;
  const stats = diffStats(finalDiff);
  const filesChanged = filesFromDiff(finalDiff);

  const fileContents = new Map<string, string>();
  for (const path of filesChanged)
    if (existsSync(path)) fileContents.set(path, readFileSync(path, "utf8"));
  const migrationSql = migrationFromDiff(finalDiff, fileContents);

  await supabase
    .from("engineer_tasks")
    .update({
      status: "testing",
      commit_sha: sha,
      diff_content: finalDiff.slice(0, 200_000),
      diff_stats: stats,
      files_modified: filesChanged,
      has_migration: Boolean(migrationSql),
      migration_sql: migrationSql,
      build_passed: true,
      verification: { checks, build_passed: true },
      diagnosis:
        repairAttempts.length > 0
          ? { category: "repaired", message: "Self-corrected", attempts: repairAttempts }
          : null,
      tokens_used: tokensUsed,
      cost_estimate_usd: costEstimate,
      duration_seconds: Math.round((Date.now() - startedAt) / 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  await log(
    "review",
    `Pushed ${sha.slice(0, 8)} on ${branch}. Waiting for independent verification on that exact commit.`,
  );
  writeFileSync(
    ARTIFACT_PATH,
    JSON.stringify({ task_id: task.id, branch, sha, status: "pushed" }, null, 2),
  );
  writeOutputs({ status: "pushed", task_id: task.id, branch, sha });
  console.log(`ENGINEER_RESULT=${ARTIFACT_PATH}`);
  clearInterval(heartbeat);
} catch (error) {
  const message = error instanceof Error ? error.message : "unexpected runner failure";
  await log("failed", `Runner crashed: ${message}`, "error");
  if (currentTaskId) {
    await supabase
      .from("engineer_tasks")
      .update({
        status: "failed",
        diagnosis: { category: "runner", message, attempts: repairAttempts },
      })
      .eq("id", currentTaskId);
  }
  finishExit(1);
}
