/**
 * Approval gate: merge only a verified, unchanged commit; deploy only through a
 * configured repository workflow, and never claim success without seeing it.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  dispatchDeployment,
  getBranchSha,
  getCheckSummary,
  getRepoInfo,
  getWorkflowFile,
  getWorkflowRunsForSha,
  githubConfigured,
  mergeVerifiedSha,
} from "./github.server";
import { createCheckpoint } from "./checkpoints.server";
import {
  appendEngineerLog,
  approveEngineerMigration,
  getEngineerSettings,
  getEngineerTask,
} from "./tasks.server";
import type { EngineerTask } from "./types";

export interface GateCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ApprovalResult {
  ok: boolean;
  error?: string;
  checks: GateCheck[];
  merged_sha?: string;
  deployment?: { status: string; note: string };
}

function gate(checks: GateCheck[]): boolean {
  return checks.every((check) => check.ok);
}

/** Every precondition, evaluated server-side — never trusted from the client. */
export async function evaluateApprovalGates(task: EngineerTask): Promise<GateCheck[]> {
  const settings = await getEngineerSettings();
  const target = settings?.target_branch ?? "main";
  const checks: GateCheck[] = [];

  checks.push({
    name: "Task is awaiting review",
    ok: task.status === "review_ready",
    detail: `Status is ${task.status}.`,
  });
  checks.push({
    name: "Build passed",
    ok: task.build_passed,
    detail: task.build_passed ? "Verified build succeeded." : "The build has not passed.",
  });
  checks.push({
    name: "Firewall clear",
    ok: task.firewall?.passed === true,
    detail: task.firewall?.passed
      ? `${task.firewall.scanned_files.length} file(s) scanned, no violations.`
      : "Firewall has not cleared this diff.",
  });
  checks.push({
    name: "Scope lock respected",
    ok: (task.scope_violations ?? []).length === 0,
    detail:
      (task.scope_violations ?? []).length === 0
        ? "No unrequested changes detected."
        : `${(task.scope_violations ?? []).length} out-of-scope change(s).`,
  });
  checks.push({
    name: "Exact commit verified",
    ok: Boolean(task.commit_sha && task.verified_sha && task.commit_sha === task.verified_sha),
    detail:
      task.commit_sha && task.verified_sha
        ? task.commit_sha === task.verified_sha
          ? `Verified ${task.commit_sha.slice(0, 8)}.`
          : `Branch is at ${task.commit_sha.slice(0, 8)} but ${task.verified_sha.slice(0, 8)} was verified.`
        : "No verified commit recorded.",
  });
  checks.push({
    name: "Engineer branch",
    ok: Boolean(task.branch_name?.startsWith("engineer/")),
    detail: task.branch_name ? `Branch ${task.branch_name}.` : "No task branch recorded.",
  });
  checks.push({
    name: "Migration gate",
    ok: !task.has_migration || task.migration_approved,
    detail: task.has_migration
      ? task.migration_approved
        ? "Migration separately approved."
        : "This task proposes a migration that has not been approved."
      : "No migration proposed.",
  });
  checks.push({
    name: "GitHub access",
    ok: githubConfigured(),
    detail: githubConfigured()
      ? "Narrowly scoped token configured."
      : "GITHUB_ENGINEER_TOKEN / GITHUB_ENGINEER_REPO not configured.",
  });

  if (githubConfigured() && task.verified_sha) {
    const status = await getCheckSummary(task.verified_sha);
    if (!status.ok || !status.data) {
      checks.push({
        name: "Independent checks",
        ok: false,
        detail: status.error ?? "Check status unavailable.",
      });
    } else {
      const summary = status.data;
      checks.push({
        name: "Independent checks",
        ok: summary.failing === 0 && summary.pending === 0 && summary.total > 0,
        detail:
          summary.total === 0
            ? "No checks reported for this commit — a commit with no verification cannot be merged."
            : `${summary.passing} passing · ${summary.failing} failing · ${summary.pending} pending.`,
      });
    }

    const tip = await getBranchSha(task.branch_name ?? "");
    checks.push({
      name: "Branch unchanged since verification",
      ok: tip.ok && tip.data === task.verified_sha,
      detail: tip.ok
        ? tip.data === task.verified_sha
          ? `Branch still at ${String(tip.data).slice(0, 8)}.`
          : `Branch moved to ${String(tip.data).slice(0, 8)} after verification.`
        : (tip.error ?? "Branch not found."),
    });

    const repo = await getRepoInfo();
    checks.push({
      name: "Target branch reachable",
      ok: repo.ok,
      detail: repo.ok ? `Target ${target}.` : (repo.error ?? "Repository unreachable."),
    });
  }

  return checks;
}

/**
 * Merge the verified commit, record the checkpoint, then dispatch deployment if
 * (and only if) a validated repository workflow is configured.
 */
export async function approveAndMergeTask(id: string): Promise<ApprovalResult> {
  const { task } = await getEngineerTask(id);
  if (!task) return { ok: false, error: "Task not found.", checks: [] };

  const checks = await evaluateApprovalGates(task);
  if (!gate(checks)) {
    const blocking = checks.filter((check) => !check.ok).map((check) => check.name);
    await appendEngineerLog({
      taskId: id,
      step: "approve",
      text: `Approval blocked: ${blocking.join(", ")}.`,
      level: "error",
    });
    return { ok: false, error: `Approval blocked — ${blocking.join(", ")}.`, checks };
  }

  const settings = await getEngineerSettings();
  const target = settings?.target_branch ?? "main";

  // Independent re-check of the exact SHA immediately before merging.
  const recheck = await getCheckSummary(task.verified_sha as string);
  if (!recheck.ok || !recheck.data || recheck.data.failing > 0 || recheck.data.total === 0) {
    return {
      ok: false,
      error: "The exact commit is no longer verified — nothing was merged.",
      checks,
    };
  }

  const merged = await mergeVerifiedSha({
    branch: task.branch_name as string,
    sha: task.verified_sha as string,
    target,
    message: `engineer: merge verified task ${task.id.slice(0, 8)} — ${task.prompt.slice(0, 60)}`,
  });
  if (!merged.ok) {
    await appendEngineerLog({
      taskId: id,
      step: "merge",
      text: `Merge failed: ${merged.error}`,
      level: "error",
    });
    return { ok: false, error: merged.error ?? "Merge failed.", checks };
  }

  // Post-merge checkpoint (durable, code-only).
  const checkpoint = await createCheckpoint({
    summary: `Post-merge: ${task.prompt.slice(0, 120)}`,
    trigger: "post_deploy",
    taskId: task.id,
    files: task.files_modified,
    verified: true,
  });

  // Deployment: dispatched only through a repository workflow, never assumed.
  let deploymentStatus: EngineerTask["deployment_status"] = "not_started";
  let deploymentNote = "Deployment was not requested.";

  if (!settings?.deployment_enabled || !settings.deploy_workflow) {
    deploymentStatus = "unavailable";
    deploymentNote = settings?.deploy_workflow
      ? `Deployment workflow ${settings.deploy_workflow} is configured but deployment is switched off.`
      : "No deployment workflow is configured, so deployment is unavailable. The merge is complete.";
  } else {
    const exists = await getWorkflowFile(settings.deploy_workflow);
    if (!exists.ok || !exists.data) {
      deploymentStatus = "unavailable";
      deploymentNote = exists.ok
        ? `Deployment workflow ${settings.deploy_workflow} does not exist — deployment unavailable.`
        : (exists.error ?? "Deployment workflow could not be read.");
    } else {
      const dispatched = await dispatchDeployment({
        workflow: settings.deploy_workflow,
        ref: target,
      });
      if (dispatched.ok) {
        deploymentStatus = "dispatched";
        deploymentNote = `Dispatched ${settings.deploy_workflow} on ${target}. Awaiting the workflow result — not yet verified deployed.`;
      } else {
        deploymentStatus = "failed";
        deploymentNote = dispatched.error ?? "Deployment dispatch failed.";
      }
    }
  }

  const finalStatus =
    deploymentStatus === "dispatched" || deploymentStatus === "failed" ? "deploying" : "merged";

  await supabaseAdmin
    .from("engineer_tasks")
    .update({
      status: finalStatus,
      approved_at: new Date().toISOString(),
      approved_by: "operator",
      deployment_status: deploymentStatus,
      deployment_note: deploymentNote,
      checkpoint_id: checkpoint.checkpoint?.id ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await appendEngineerLog({
    taskId: id,
    step: "merge",
    text: `Merged ${String(merged.sha).slice(0, 8)} into ${target}. ${deploymentNote}`,
  });

  return {
    ok: true,
    checks,
    ...(merged.sha ? { merged_sha: merged.sha } : {}),
    deployment: { status: deploymentStatus, note: deploymentNote },
  };
}

/** Re-read the deployment workflow outcome for a merged task. */
export async function refreshDeploymentStatus(
  id: string,
): Promise<{ status: string; note: string }> {
  const { task } = await getEngineerTask(id);
  if (!task) return { status: "unknown", note: "Task not found." };
  if (task.deployment_status === "not_started" || task.deployment_status === "unavailable") {
    return { status: task.deployment_status, note: task.deployment_note ?? "" };
  }
  if (!githubConfigured() || !task.verified_sha) {
    return {
      status: task.deployment_status,
      note: task.deployment_note ?? "GitHub access unavailable.",
    };
  }

  const runs = await getWorkflowRunsForSha(task.verified_sha);
  if (!runs.ok || !runs.data) {
    return { status: task.deployment_status, note: runs.error ?? "Could not read workflow runs." };
  }
  const finished = runs.data.find((run) => run.status === "completed");
  if (!finished) {
    return {
      status: "dispatched",
      note: "Workflow dispatched — still running. Not verified deployed.",
    };
  }

  const succeeded = finished.conclusion === "success";
  const status = succeeded ? "verified" : "failed";
  const note = succeeded
    ? `Deployment workflow succeeded (${finished.html_url}).`
    : `Deployment workflow concluded ${finished.conclusion ?? "unknown"} (${finished.html_url}).`;

  await supabaseAdmin
    .from("engineer_tasks")
    .update({
      deployment_status: status,
      deployment_note: note,
      status: succeeded ? "deployed" : "deploying",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return { status, note };
}

export { approveEngineerMigration };
