/**
 * Engineer health monitor (K.7 §12) — operational independence with bounded,
 * authorized repairs only.
 *
 * Safe repairs: requeue tasks whose runner stopped heartbeating.
 * Escalations: anything touching credentials, live trading, data integrity,
 * the firewall or deployment permissions is reported for human intervention and
 * never "repaired" automatically.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { githubConfigured, getRepoInfo, getWorkflowFile } from "./github.server";
import { providerReadiness, resolveProvider, testProviderConnection } from "./provider";
import { engineerSchemaInstalled, getEngineerSettings, getQueueStats } from "./tasks.server";
import type { EngineerHealthEvent, EngineerHealthSnapshot } from "./types";

let cache: { at: number; snapshot: EngineerHealthSnapshot } | null = null;

interface ComponentState {
  component: string;
  state: "ok" | "warn" | "fail" | "escalated";
  detail: string;
}

async function recordEvents(
  components: ComponentState[],
  repairNotes: Map<string, string>,
): Promise<void> {
  try {
    const rows = components
      .filter((component) => component.state !== "ok" || repairNotes.has(component.component))
      .map((component) => ({
        component: component.component,
        state: component.state,
        detail: component.detail,
        repaired: repairNotes.has(component.component),
        repair_note: repairNotes.get(component.component) ?? null,
      }));
    if (rows.length > 0) await supabaseAdmin.from("engineer_health_events").insert(rows);
  } catch {
    // Health logging must never break the check.
  }
}

async function recentEvents(): Promise<EngineerHealthEvent[]> {
  try {
    const { data } = await supabaseAdmin
      .from("engineer_health_events")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(12);
    return (data ?? []) as EngineerHealthEvent[];
  } catch {
    return [];
  }
}

export async function runEngineerHealth(force = false): Promise<EngineerHealthSnapshot> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.snapshot;

  const installed = await engineerSchemaInstalled();
  const stats = await getQueueStats();
  const settings = await getEngineerSettings();
  const components: ComponentState[] = [];
  const repairs = new Map<string, string>();

  // --- Supabase / schema
  components.push(
    installed
      ? { component: "database", state: "ok", detail: "Engineering tables reachable." }
      : {
          component: "database",
          state: "warn",
          detail: "Phase K migration not applied — the queue is disabled until it is run.",
        },
  );

  // --- Queue & leases (the only automatic repair)
  if (stats) {
    let stalled = stats.stalled;
    if (stalled > 0) {
      try {
        const { data, error } = await supabaseAdmin.rpc("sweep_stalled_engineer_tasks");
        if (error) throw new Error(error.message);
        const recovered = typeof data === "number" ? data : stalled;
        repairs.set("queue", `Requeued ${recovered} stalled lease(s) past the 5-minute heartbeat.`);
        stalled = Math.max(0, stalled - recovered);
      } catch (error) {
        const message = error instanceof Error ? error.message : "sweep failed";
        repairs.set("queue", `Stalled-lease sweep failed: ${message}`);
      }
    }
    components.push({
      component: "queue",
      state: stalled > 0 ? "warn" : "ok",
      detail:
        stalled > 0
          ? `${stalled} task(s) hold a lease with no recent heartbeat.`
          : `${stats.queued} queued · ${stats.active} running · ${stats.review_ready} awaiting review.`,
    });
    components.push({
      component: "heartbeat",
      state: stats.active > 0 && !stats.last_heartbeat_at ? "warn" : "ok",
      detail: stats.last_heartbeat_at
        ? `Last runner heartbeat ${new Date(stats.last_heartbeat_at).toISOString()}.`
        : "No runner heartbeat recorded yet.",
    });
  }

  // --- LLM provider (no paid probe on a plain health pass)
  const readiness = providerReadiness(settings?.llm_base_url ?? null, settings?.llm_model ?? null);
  components.push({
    component: "llm",
    state: readiness.configured ? "ok" : "warn",
    detail: readiness.configured
      ? `Provider configured (${settings?.llm_model}). Run “Test connection” to confirm reachability.`
      : `Provider not configured — missing ${readiness.missing.join(", ")}.`,
  });

  // --- GitHub runner, repository sync, deployment readiness
  let deploymentAvailable = false;
  let deploymentReason = "Deployment is not configured.";

  if (!githubConfigured()) {
    components.push({
      component: "runner",
      state: "warn",
      detail:
        "GITHUB_ENGINEER_TOKEN / GITHUB_ENGINEER_REPO not set — tasks queue but cannot run or merge.",
    });
    components.push({
      component: "deployment",
      state: "warn",
      detail: "Deployment unavailable: GitHub access is not configured.",
    });
    deploymentReason =
      "GitHub access is not configured (GITHUB_ENGINEER_TOKEN / GITHUB_ENGINEER_REPO).";
  } else {
    const repo = await getRepoInfo();
    components.push(
      repo.ok
        ? {
            component: "repository",
            state: "ok",
            detail: `Connected to ${repo.data?.full_name ?? "repository"} (default ${repo.data?.default_branch ?? "main"}).`,
          }
        : {
            component: "repository",
            state: "fail",
            detail: repo.error ?? "Repository unreachable.",
          },
    );

    const verifyWorkflow = await getWorkflowFile("astr-engineer.yml");
    components.push(
      verifyWorkflow.ok && verifyWorkflow.data
        ? { component: "verification_workflow", state: "ok", detail: "astr-engineer.yml present." }
        : {
            component: "verification_workflow",
            state: "fail",
            detail:
              verifyWorkflow.error ?? "astr-engineer.yml missing — the runner cannot verify work.",
          },
    );

    if (!settings?.deploy_workflow || !settings.deployment_enabled) {
      deploymentReason = settings?.deploy_workflow
        ? `Deployment workflow ${settings.deploy_workflow} is configured but deployment is switched off.`
        : "No deployment workflow is configured in engineer settings.";
      components.push({ component: "deployment", state: "warn", detail: deploymentReason });
    } else {
      const deployWorkflow = await getWorkflowFile(settings.deploy_workflow);
      if (!deployWorkflow.ok) {
        deploymentReason = deployWorkflow.error ?? "Deployment workflow could not be read.";
        components.push({ component: "deployment", state: "fail", detail: deploymentReason });
      } else if (!deployWorkflow.data) {
        deploymentReason = `Deployment workflow ${settings.deploy_workflow} does not exist in the repository.`;
        components.push({ component: "deployment", state: "fail", detail: deploymentReason });
      } else {
        deploymentAvailable = true;
        deploymentReason = `Deployment workflow ${settings.deploy_workflow} is present and will be dispatched after an approved merge.`;
        components.push({ component: "deployment", state: "ok", detail: deploymentReason });
      }
    }
  }

  // --- Checkpoint integrity
  try {
    const { data } = await supabaseAdmin
      .from("engineer_checkpoints")
      .select("git_tag, git_sha, created_at")
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = data?.[0] as { git_tag: string; git_sha: string } | undefined;
    components.push(
      latest
        ? {
            component: "checkpoints",
            state: "ok",
            detail: `Latest ${latest.git_tag} at ${latest.git_sha.slice(0, 8)}.`,
          }
        : {
            component: "checkpoints",
            state: "warn",
            detail: "No checkpoint has been recorded yet.",
          },
    );
  } catch {
    components.push({ component: "checkpoints", state: "warn", detail: "Checkpoints unreadable." });
  }

  await recordEvents(components, repairs);
  const events = await recentEvents();

  const runnerState: EngineerHealthSnapshot["runner_state"] = !stats
    ? "unknown"
    : stats.active === 0
      ? "idle"
      : stats.stalled > 0
        ? "stalled"
        : "active";

  const snapshot: EngineerHealthSnapshot = {
    runner_state: runnerState,
    queued: stats?.queued ?? 0,
    active: stats?.active ?? 0,
    review_ready: stats?.review_ready ?? 0,
    stalled_leases: stats?.stalled ?? 0,
    last_heartbeat_at: stats?.last_heartbeat_at ?? null,
    minutes_this_month: stats?.minutes_this_month ?? 0,
    spend_this_month_usd: stats?.spend_this_month_usd ?? 0,
    components,
    events,
    schema_installed: installed,
  };

  cache = { at: Date.now(), snapshot };
  return snapshot;
}

/** Explicit, user-triggered provider probe. Costs one tiny completion. */
export async function probeProvider(): Promise<{ ok: boolean; detail: string }> {
  const settings = await getEngineerSettings();
  const config = resolveProvider(
    settings?.llm_base_url ?? null,
    settings?.llm_model ?? null,
    settings?.llm_price_per_million_tokens ?? 0,
  );
  if (!config) {
    return {
      ok: false,
      detail: "Provider is not fully configured (base URL, model and ENGINEER_LLM_API_KEY).",
    };
  }
  const result = await testProviderConnection(config);
  return { ok: result.ok, detail: result.detail };
}
