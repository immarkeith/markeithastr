/**
 * Engineer task queue: creation, leasing (via RPC), status transitions, logs.
 *
 * The UI and the trusted server never run the model; they only queue work and
 * record decisions. Only the GitHub Actions runner leases a task, through the
 * atomic `claim_next_engineer_task` RPC.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { githubConfigured, dispatchEngineerTask } from "./github.server";
import { buildPlan, classifyTask } from "./plan";
import { scanFirewall } from "./firewall";
import type {
  DiagnosisRecord,
  EngineerLevel,
  EngineerLogRow,
  EngineerSettings,
  EngineerTask,
  EngineerTaskStatus,
  FirewallReport,
  ScopeViolation,
  TaskScope,
  VerificationReport,
} from "./types";

let schemaCache: { at: number; installed: boolean } | null = null;

/** True once the Phase K migration has been applied to this Supabase project. */
export async function engineerSchemaInstalled(force = false): Promise<boolean> {
  if (!force && schemaCache && Date.now() - schemaCache.at < 60_000) return schemaCache.installed;
  try {
    // A HEAD request answers 204 even for a missing table, so probe with a real
    // SELECT: PostgREST returns PGRST205 when the table is not in the schema.
    const { error } = await untypedDb().from("engineer_tasks").select("id").limit(1);
    const installed = !error;
    schemaCache = { at: Date.now(), installed };
    return installed;
  } catch {
    schemaCache = { at: Date.now(), installed: false };
    return false;
  }
}

type TaskRow = {
  id: string;
  prompt: string;
  status: string;
  classification: string | null;
  classification_label: string | null;
  complexity: number | null;
  scope: unknown;
  plan_summary: string | null;
  risk_notes: string | null;
  expected_files: string[] | null;
  tests_planned: string[] | null;
  scope_violations: unknown;
  branch_name: string | null;
  base_sha: string | null;
  commit_sha: string | null;
  verified_sha: string | null;
  diff_content: string | null;
  diff_stats: unknown;
  files_modified: string[] | null;
  has_migration: boolean;
  migration_sql: string | null;
  migration_approved: boolean;
  build_passed: boolean;
  verification: unknown;
  firewall: unknown;
  diagnosis: unknown;
  retry_count: number;
  revision_feedback: string | null;
  tokens_used: number;
  cost_estimate_usd: number;
  cost_actual_usd: number | null;
  actions_minutes: number | null;
  duration_seconds: number | null;
  runner_id: string | null;
  locked_at: string | null;
  locked_by: string | null;
  heartbeat_at: string | null;
  checkpoint_id: string | null;
  approved_at: string | null;
  approved_by: string | null;
  deployment_status: string;
  deployment_note: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

function mapTask(row: TaskRow): EngineerTask {
  return {
    id: row.id,
    prompt: row.prompt,
    status: row.status as EngineerTaskStatus,
    classification: (row.classification ?? null) as EngineerLevel | null,
    classification_label: row.classification_label,
    complexity: row.complexity,
    scope: (row.scope ?? null) as TaskScope | null,
    plan_summary: row.plan_summary,
    risk_notes: row.risk_notes,
    expected_files: row.expected_files ?? [],
    tests_planned: row.tests_planned ?? [],
    scope_violations: (row.scope_violations ?? null) as ScopeViolation[] | null,
    branch_name: row.branch_name,
    base_sha: row.base_sha,
    commit_sha: row.commit_sha,
    verified_sha: row.verified_sha,
    diff_content: row.diff_content,
    diff_stats: (row.diff_stats ?? null) as EngineerTask["diff_stats"],
    files_modified: row.files_modified ?? [],
    has_migration: row.has_migration,
    migration_sql: row.migration_sql,
    migration_approved: row.migration_approved,
    build_passed: row.build_passed,
    verification: (row.verification ?? null) as VerificationReport | null,
    firewall: (row.firewall ?? null) as FirewallReport | null,
    diagnosis: (row.diagnosis ?? null) as DiagnosisRecord | null,
    retry_count: row.retry_count,
    revision_feedback: row.revision_feedback,
    tokens_used: row.tokens_used,
    cost_estimate_usd: Number(row.cost_estimate_usd ?? 0),
    cost_actual_usd: row.cost_actual_usd === null ? null : Number(row.cost_actual_usd),
    actions_minutes: row.actions_minutes === null ? null : Number(row.actions_minutes),
    duration_seconds: row.duration_seconds,
    runner_id: row.runner_id,
    locked_at: row.locked_at,
    locked_by: row.locked_by,
    heartbeat_at: row.heartbeat_at,
    checkpoint_id: row.checkpoint_id,
    approved_at: row.approved_at,
    approved_by: row.approved_by,
    deployment_status: row.deployment_status as EngineerTask["deployment_status"],
    deployment_note: row.deployment_note,
    archived: row.archived,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

export async function appendEngineerLog(input: {
  taskId: string;
  step: string;
  text: string;
  level?: "info" | "warn" | "error";
}): Promise<void> {
  try {
    await untypedDb().from("engineer_logs").insert({
      task_id: input.taskId,
      step_name: input.step,
      log_text: input.text.slice(0, 8000),
      level: input.level ?? "info",
    });
  } catch {
    // Logging must never block a state transition.
  }
}

export interface CreateTaskResult {
  ok: boolean;
  task?: EngineerTask;
  error?: string;
  note?: string;
}

export async function createEngineerTask(input: {
  prompt: string;
  createdBy?: string;
}): Promise<CreateTaskResult> {
  const installed = await engineerSchemaInstalled();
  if (!installed) {
    return {
      ok: false,
      error:
        "Phase K schema is not installed yet. Run supabase/migrations/20261103010000_engineer_phase_k.sql in the Supabase SQL editor.",
    };
  }

  const prompt = input.prompt.trim();
  if (prompt.length < 8) return { ok: false, error: "Describe the change in a few more words." };
  if (prompt.length > 4000)
    return { ok: false, error: "Instructions are limited to 4,000 characters." };

  const classification = classifyTask(prompt);
  const plan = buildPlan(prompt, classification);

  // Level 4 (structural) and Level 5 (critical) never start on their own.
  const status: EngineerTaskStatus =
    classification.level === "level_4" || classification.level === "level_5"
      ? "scope_review"
      : "queued";

  const { data, error } = await untypedDb()
    .from("engineer_tasks")
    .insert({
      prompt,
      status,
      classification: classification.level,
      classification_label: classification.label,
      complexity: classification.complexity,
      scope: plan.scope as never,
      plan_summary: plan.plan_summary,
      risk_notes: plan.risk_notes,
      expected_files: plan.expected_files,
      tests_planned: plan.tests_planned,
      created_by: input.createdBy ?? "operator",
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not queue the task." };
  const task = mapTask(data as TaskRow);

  await appendEngineerLog({
    taskId: task.id,
    step: "classify",
    text: `${classification.label} (complexity ${classification.complexity}/5). ${classification.reasons.join(" ")}`,
  });
  await appendEngineerLog({ taskId: task.id, step: "plan", text: plan.plan_summary });

  if (status === "scope_review") {
    await appendEngineerLog({
      taskId: task.id,
      step: "gate",
      text:
        classification.level === "level_5"
          ? "Critical classification — blocked until an operator explicitly authorizes this scope."
          : "Structural classification — plan approval required before implementation.",
      level: "warn",
    });
    return { ok: true, task, note: "Plan approval required before the runner starts." };
  }

  const dispatch = await dispatchEngineerTask();
  if (!dispatch.ok) {
    return {
      ok: true,
      task,
      note: `Queued. Runner dispatch unavailable: ${dispatch.error ?? "unknown error"}`,
    };
  }
  await appendEngineerLog({
    taskId: task.id,
    step: "queue",
    text: "Runner dispatched for this task.",
  });
  return { ok: true, task };
}

export async function listEngineerTasks(limit = 25): Promise<EngineerTask[]> {
  if (!(await engineerSchemaInstalled())) return [];
  const { data, error } = await untypedDb()
    .from("engineer_tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as TaskRow[]).map(mapTask);
}

export async function getEngineerTask(id: string): Promise<{
  task: EngineerTask | null;
  logs: EngineerLogRow[];
  error?: string;
}> {
  if (!(await engineerSchemaInstalled())) return { task: null, logs: [], error: "schema_missing" };
  const { data, error } = await untypedDb()
    .from("engineer_tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return { task: null, logs: [], error: error.message };
  if (!data) return { task: null, logs: [] };

  const { data: logRows } = await untypedDb()
    .from("engineer_logs")
    .select("id, task_id, step_name, log_text, level, created_at")
    .eq("task_id", id)
    .order("created_at", { ascending: true })
    .limit(400);

  return {
    task: mapTask(data as TaskRow),
    logs: (logRows ?? []) as EngineerLogRow[],
  };
}

export async function getEngineerSettings(): Promise<EngineerSettings | null> {
  if (!(await engineerSchemaInstalled())) return null;
  const { data, error } = await untypedDb()
    .from("engineer_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    llm_base_url: data.llm_base_url,
    llm_model: data.llm_model,
    llm_price_per_million_tokens: Number(data.llm_price_per_million_tokens),
    llm_monthly_budget_usd: Number(data.llm_monthly_budget_usd),
    target_branch: data.target_branch,
    deploy_workflow: data.deploy_workflow,
    deployment_enabled: data.deployment_enabled,
    updated_at: data.updated_at,
  };
}

export async function saveEngineerSettings(input: {
  baseUrl: string | null;
  model: string | null;
  pricePerMillionTokens: number;
  monthlyBudgetUsd: number;
  targetBranch: string;
  deployWorkflow: string | null;
  deploymentEnabled: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  if (!(await engineerSchemaInstalled())) {
    return { ok: false, error: "Phase K schema is not installed yet." };
  }
  const baseUrl = input.baseUrl?.trim() || null;
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    return { ok: false, error: "Base URL must start with http:// or https://" };
  }
  if (input.deployWorkflow && !/^[\w.-]+\.ya?ml$/.test(input.deployWorkflow)) {
    return {
      ok: false,
      error: "Deployment workflow must be a workflow file name, e.g. deploy.yml",
    };
  }

  const { error } = await untypedDb()
    .from("engineer_settings")
    .update({
      llm_base_url: baseUrl,
      llm_model: input.model?.trim() || null,
      llm_price_per_million_tokens: Math.max(0, input.pricePerMillionTokens),
      llm_monthly_budget_usd: Math.max(0, input.monthlyBudgetUsd),
      target_branch: input.targetBranch.trim() || "main",
      deploy_workflow: input.deployWorkflow?.trim() || null,
      deployment_enabled: input.deploymentEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Operator authorizes a structural/critical plan, releasing it to the queue. */
export async function authorizeEngineerScope(id: string): Promise<{ ok: boolean; error?: string }> {
  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status !== "scope_review")
    return { ok: false, error: "This task is not waiting for scope approval." };

  const { error } = await untypedDb()
    .from("engineer_tasks")
    .update({ status: "queued", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "scope_review");
  if (error) return { ok: false, error: error.message };

  await appendEngineerLog({
    taskId: id,
    step: "gate",
    text: `${task.classification_label ?? "Plan"} scope explicitly authorized by the operator.`,
  });
  const dispatch = await dispatchEngineerTask();
  if (!dispatch.ok) {
    await appendEngineerLog({
      taskId: id,
      step: "queue",
      text: `Queued, but the runner could not be dispatched: ${dispatch.error ?? "unknown error"}`,
      level: "warn",
    });
  }
  return { ok: true };
}

export async function requestEngineerRevision(
  id: string,
  feedback: string,
): Promise<{ ok: boolean; error?: string }> {
  const note = feedback.trim();
  if (note.length < 4) return { ok: false, error: "Tell the engineer what to change." };

  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "merged" || task.status === "deployed" || task.status === "deploying") {
    return { ok: false, error: "A merged task cannot be revised — queue a new task." };
  }

  const { error } = await untypedDb()
    .from("engineer_tasks")
    .update({
      status: "queued",
      revision_feedback: note,
      retry_count: task.retry_count + 1,
      build_passed: false,
      verified_sha: null,
      verification: null,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await appendEngineerLog({
    taskId: id,
    step: "revision",
    text: `Revision requested: ${note}`,
    level: "warn",
  });
  const dispatch = await dispatchEngineerTask();
  if (!dispatch.ok) {
    return {
      ok: true,
      error: `Revision queued, but the runner was not dispatched: ${dispatch.error ?? "unknown"}`,
    };
  }
  return { ok: true };
}

export async function rejectEngineerTask(
  id: string,
  reason: string,
): Promise<{ ok: boolean; error?: string; note?: string }> {
  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "merged" || task.status === "deployed") {
    return { ok: false, error: "A merged task cannot be rejected — use code recovery instead." };
  }

  const { error } = await untypedDb()
    .from("engineer_tasks")
    .update({
      status: "rejected",
      archived: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await appendEngineerLog({
    taskId: id,
    step: "reject",
    text: `Rejected and archived${reason.trim() ? `: ${reason.trim()}` : ""}. The diff is kept in history.`,
    level: "warn",
  });

  let note = "Task archived. The full diff is retained in history.";
  if (task.branch_name) {
    const { deleteBranch } = await import("./github.server");
    const deleted = await deleteBranch(task.branch_name);
    note = deleted.ok
      ? `Task archived and branch ${task.branch_name} discarded. The diff is retained in history.`
      : `Task archived. Branch ${task.branch_name} could not be discarded: ${deleted.error ?? "unknown error"}`;
  }
  return { ok: true, note };
}

/** Independent re-scan of a proposed migration — never trusted from the runner. */
export function scanMigrationSql(sql: string): ScopeViolation[] {
  return scanFirewall({ files: [{ path: "proposed-migration.sql", patch: sql }] }).violations;
}

export async function approveEngineerMigration(
  id: string,
): Promise<{ ok: boolean; error?: string; note?: string }> {
  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found." };
  if (!task.has_migration || !task.migration_sql)
    return { ok: false, error: "This task proposes no migration." };

  const violations = scanMigrationSql(task.migration_sql);
  if (violations.length > 0) {
    return {
      ok: false,
      error: `Migration rejected by the destructive SQL shield: ${violations.map((v) => v.detail).join("; ")}`,
    };
  }

  const { error } = await untypedDb()
    .from("engineer_tasks")
    .update({ migration_approved: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await appendEngineerLog({
    taskId: id,
    step: "migration",
    text: "Migration approved for manual execution. ASTR never executes schema changes automatically — paste it into the Supabase SQL editor.",
    level: "warn",
  });
  return {
    ok: true,
    note: "Migration approved. Run it yourself in the Supabase SQL editor — nothing was executed.",
  };
}

export async function resumeEngineerBudget(
  id: string,
): Promise<{ ok: boolean; error?: string; note?: string }> {
  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status !== "budget_paused")
    return { ok: false, error: "This task is not paused on budget." };

  const { error } = await untypedDb()
    .from("engineer_tasks")
    .update({ status: "queued", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await appendEngineerLog({
    taskId: id,
    step: "budget",
    text: "Operator approved additional spend; task requeued.",
  });
  const dispatch = await dispatchEngineerTask();
  return dispatch.ok
    ? { ok: true, note: "Requeued with budget approval." }
    : {
        ok: true,
        note: `Requeued, but the runner was not dispatched: ${dispatch.error ?? "unknown"}`,
      };
}

export interface QueueStats {
  queued: number;
  active: number;
  review_ready: number;
  stalled: number;
  last_heartbeat_at: string | null;
  minutes_this_month: number;
  spend_this_month_usd: number;
}

const ACTIVE = ["planning", "inspecting", "coding", "testing"];

export async function getQueueStats(): Promise<QueueStats | null> {
  if (!(await engineerSchemaInstalled())) return null;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [queued, active, review, recent, month] = await Promise.all([
    untypedDb()
      .from("engineer_tasks")
      .select("id", { head: true, count: "exact" })
      .eq("status", "queued"),
    untypedDb()
      .from("engineer_tasks")
      .select("id", { head: true, count: "exact" })
      .in("status", ACTIVE),
    untypedDb()
      .from("engineer_tasks")
      .select("id", { head: true, count: "exact" })
      .eq("status", "review_ready"),
    untypedDb()
      .from("engineer_tasks")
      .select("heartbeat_at")
      .in("status", ACTIVE)
      .order("heartbeat_at", { ascending: false })
      .limit(1),
    untypedDb()
      .from("engineer_tasks")
      .select("actions_minutes, cost_estimate_usd")
      .gte("created_at", monthStart.toISOString()),
  ]);

  const stalledCutoff = Date.now() - 5 * 60 * 1000;
  let stalled = 0;
  try {
    const { data } = await untypedDb()
      .from("engineer_tasks")
      .select("id, heartbeat_at")
      .in("status", ACTIVE);
    stalled = (data ?? []).filter((row) => {
      const beat = row.heartbeat_at ? new Date(row.heartbeat_at).getTime() : 0;
      return beat < stalledCutoff;
    }).length;
  } catch {
    stalled = 0;
  }

  const monthRows = (month.data ?? []) as {
    actions_minutes: number | null;
    cost_estimate_usd: number | null;
  }[];

  return {
    queued: queued.count ?? 0,
    active: active.count ?? 0,
    review_ready: review.count ?? 0,
    stalled,
    last_heartbeat_at:
      (recent.data?.[0] as { heartbeat_at: string | null } | undefined)?.heartbeat_at ?? null,
    minutes_this_month: monthRows.reduce((sum, row) => sum + Number(row.actions_minutes ?? 0), 0),
    spend_this_month_usd: monthRows.reduce(
      (sum, row) => sum + Number(row.cost_estimate_usd ?? 0),
      0,
    ),
  };
}

export async function updateTaskStatus(
  id: string,
  status: EngineerTaskStatus,
  patch: Record<string, unknown> = {},
): Promise<void> {
  try {
    await untypedDb()
      .from("engineer_tasks")
      .update({ status, updated_at: new Date().toISOString(), ...patch })
      .eq("id", id);
  } catch {
    // Best effort — the runner reports failures through logs as well.
  }
}

export function runnerDispatchAvailable(): boolean {
  return githubConfigured();
}

// Phase K / audit tables are not in the generated types until their migrations run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untypedDb(): any {
  return supabaseAdmin;
}
