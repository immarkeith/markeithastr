/**
 * Passcode-gated server functions for the Phase K engineer.
 *
 * Every action — queueing, reviewing, approving, rejecting, recovery, provider
 * settings, health — is a server call behind `requireGate`, so no engineering
 * decision happens in client code and no trusted credential reaches the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "../gate-middleware";

const promptSchema = z.object({
  prompt: z.string().min(4).max(4000),
});

export const engineerOverview = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const [
      { runEngineerHealth },
      { getEngineerSettings, listEngineerTasks, engineerSchemaInstalled },
      { githubConfigured },
      { providerReadiness },
      { repoBrief },
    ] = await Promise.all([
      import("./health.server"),
      import("./tasks.server"),
      import("./github.server"),
      import("./provider"),
      import("./repo-map"),
    ]);

    const [health, settings, tasks, installed] = await Promise.all([
      runEngineerHealth(),
      getEngineerSettings(),
      listEngineerTasks(30),
      engineerSchemaInstalled(),
    ]);

    const readiness = providerReadiness(
      settings?.llm_base_url ?? null,
      settings?.llm_model ?? null,
    );
    const deployment = health.components.find((component) => component.component === "deployment");
    const deploymentAvailable = Boolean(
      settings?.deployment_enabled && settings.deploy_workflow && deployment?.state === "ok",
    );

    return {
      health,
      settings,
      tasks,
      capabilities: {
        schema_installed: installed,
        github_configured: githubConfigured(),
        github_repo: process.env["GITHUB_ENGINEER_REPO"]?.trim() ?? null,
        llm_configured: readiness.configured,
        deployment_available: deploymentAvailable,
        deployment_reason: deployment?.detail ?? "Deployment is not configured.",
        notes: [
          readiness.configured
            ? `Provider ready (${settings?.llm_model}).`
            : `Provider missing: ${readiness.missing.join(", ")}.`,
          installed
            ? "Engineering schema installed."
            : "Run supabase/migrations/20261103010000_engineer_phase_k.sql in Supabase to enable the queue.",
        ],
      },
      repo_brief: repoBrief(),
    };
  });

export const engineerCreateTask = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => promptSchema.parse(input))
  .handler(async ({ data }) => {
    const { createEngineerTask } = await import("./tasks.server");
    return createEngineerTask({ prompt: data.prompt, createdBy: "operator" });
  });

export const engineerTaskDetail = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { getEngineerTask } = await import("./tasks.server");
    return getEngineerTask(data.id);
  });

export const engineerAuthorizeScope = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { authorizeEngineerScope } = await import("./tasks.server");
    return authorizeEngineerScope(data.id);
  });

export const engineerRequestRevision = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), feedback: z.string().min(4).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { requestEngineerRevision } = await import("./tasks.server");
    return requestEngineerRevision(data.id, data.feedback);
  });

export const engineerRejectTask = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(1000).default("") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { rejectEngineerTask } = await import("./tasks.server");
    return rejectEngineerTask(data.id, data.reason);
  });

export const engineerApproveTask = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { approveAndMergeTask } = await import("./approval.server");
    return approveAndMergeTask(data.id);
  });

export const engineerRefreshDeployment = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { refreshDeploymentStatus } = await import("./approval.server");
    return refreshDeploymentStatus(data.id);
  });

export const engineerApproveMigration = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { approveEngineerMigration } = await import("./tasks.server");
    return approveEngineerMigration(data.id);
  });

export const engineerResumeBudget = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { resumeEngineerBudget } = await import("./tasks.server");
    return resumeEngineerBudget(data.id);
  });

export const engineerSaveProvider = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        base_url: z.string().max(500).default(""),
        model: z.string().max(200).default(""),
        price_per_million_tokens: z.number().min(0).max(10000).default(0),
        monthly_budget_usd: z.number().min(0).max(100000).default(5),
        target_branch: z.string().max(200).default("main"),
        deploy_workflow: z.string().max(200).default(""),
        deployment_enabled: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { saveEngineerSettings } = await import("./tasks.server");
    return saveEngineerSettings({
      baseUrl: data.base_url,
      model: data.model,
      pricePerMillionTokens: data.price_per_million_tokens,
      monthlyBudgetUsd: data.monthly_budget_usd,
      targetBranch: data.target_branch,
      deployWorkflow: data.deploy_workflow,
      deploymentEnabled: data.deployment_enabled,
    });
  });

export const engineerTestProvider = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .handler(async () => {
    const { probeProvider } = await import("./health.server");
    return probeProvider();
  });

export const engineerRunHealth = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .handler(async () => {
    const { runEngineerHealth } = await import("./health.server");
    return runEngineerHealth(true);
  });

export const engineerRecoveryData = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { listCheckpoints, listChanges, recoverableFiles, RECOVERY_CONFIRMATION } =
      await import("./checkpoints.server");
    const [checkpoints, changes] = await Promise.all([listCheckpoints(30), listChanges(100)]);
    return {
      checkpoints,
      changes,
      recoverable_files: recoverableFiles().slice(0, 400),
      confirmation_phrase: RECOVERY_CONFIRMATION,
    };
  });

export const engineerCreateCheckpoint = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        summary: z.string().min(4).max(400),
        files: z.array(z.string()).max(200).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { createCheckpoint } = await import("./checkpoints.server");
    return createCheckpoint({ summary: data.summary, files: data.files, trigger: "manual" });
  });

export const engineerRecoverCode = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        checkpoint_id: z.string().uuid(),
        files: z.array(z.string()).max(200).default([]),
        confirmation: z.string().max(40),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requestCodeRecovery } = await import("./checkpoints.server");
    return requestCodeRecovery({
      checkpointId: data.checkpoint_id,
      files: data.files,
      confirmation: data.confirmation,
    });
  });
