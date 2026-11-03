/**
 * Checkpoints & code recovery (Phase K.1 + K.7 §10).
 *
 * A checkpoint is a durable git tag + SHA plus the files it covers. Recovery is
 * a FORWARD git reversal: the file content at the checkpoint is committed again
 * on top of the target branch. It never rewinds history, never touches a
 * database, and refuses anything that is not repository code.
 *
 * Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { REPO_DATA } from "./repo-map.data";
import { getEngineerSettings, engineerSchemaInstalled } from "./tasks.server";
import {
  createTag,
  getBranchSha,
  getFileAtRef,
  getRepoInfo,
  githubConfigured,
  putFile,
} from "./github.server";
import type { EngineerChangeRow, EngineerCheckpointRow } from "./types";

const CONFIRMATION_PHRASE = "RESTORE CODE";

/** Paths recovery refuses: data, schema, security gates and live execution. */
const RECOVERY_BLOCKLIST: { rule: RegExp; reason: string }[] = [
  {
    rule: /\.sql$/i,
    reason: "SQL files are never reverted by code recovery — migrations are handled separately.",
  },
  {
    rule: /^supabase\//,
    reason: "Supabase configuration/migrations are out of scope for code recovery.",
  },
  { rule: /^migration\//, reason: "Migration runbooks are out of scope for code recovery." },
  {
    rule: /^src\/lib\/broker\.server\.ts$/,
    reason: "Live Alpaca execution requires human intervention.",
  },
  {
    rule: /^src\/lib\/engineer\//,
    reason: "The engineer's own security gates require human intervention.",
  },
  {
    rule: /^\.github\//,
    reason: "Workflows and deployment authorization require human intervention.",
  },
  { rule: /(^|\/)\.env($|\.)/, reason: "Credential stores are never reverted automatically." },
];

export async function listCheckpoints(limit = 30): Promise<EngineerCheckpointRow[]> {
  if (!(await engineerSchemaInstalled())) return [];
  const { data, error } = await supabaseAdmin
    .from("engineer_checkpoints")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as EngineerCheckpointRow[];
}

export async function listChanges(limit = 100): Promise<EngineerChangeRow[]> {
  if (!(await engineerSchemaInstalled())) return [];
  const { data, error } = await supabaseAdmin
    .from("engineer_change_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as EngineerChangeRow[];
}

function tagSlug(trigger: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `astr-cp-${trigger}-${stamp}`.slice(0, 90);
}

export interface CreateCheckpointResult {
  ok: boolean;
  checkpoint?: EngineerCheckpointRow;
  error?: string;
  note?: string;
}

export async function createCheckpoint(input: {
  summary: string;
  trigger?: string;
  taskId?: string | null;
  files?: string[];
  verified?: boolean;
}): Promise<CreateCheckpointResult> {
  if (!(await engineerSchemaInstalled())) {
    return { ok: false, error: "Phase K schema is not installed yet." };
  }
  if (!githubConfigured()) {
    return {
      ok: false,
      error: "GitHub access is not configured, so no checkpoint SHA can be read.",
    };
  }

  const settings = await getEngineerSettings();
  const target = settings?.target_branch ?? "main";
  const repo = await getRepoInfo();
  if (!repo.ok) return { ok: false, error: repo.error ?? "Repository not reachable." };

  const head = await getBranchSha(target);
  if (!head.ok || !head.data)
    return { ok: false, error: head.error ?? `Branch ${target} not found.` };

  const tag = tagSlug(input.trigger ?? "manual");
  const tagged = await createTag(tag, head.data);

  const { data, error } = await supabaseAdmin
    .from("engineer_checkpoints")
    .insert({
      git_tag: tag,
      git_sha: head.data,
      summary: input.summary.slice(0, 400),
      verified: input.verified ?? false,
      trigger: input.trigger ?? "manual",
      task_id: input.taskId ?? null,
      files_affected: input.files ?? [],
    })
    .select("*")
    .single();

  if (error || !data)
    return { ok: false, error: error?.message ?? "Could not record the checkpoint." };
  const checkpoint = data as EngineerCheckpointRow;

  if ((input.files ?? []).length > 0) {
    await supabaseAdmin.from("engineer_change_log").insert(
      (input.files ?? []).map((file) => ({
        checkpoint_id: checkpoint.id,
        task_id: input.taskId ?? null,
        file_path: file,
        operation: "modify",
        after_sha: head.data ?? null,
      })),
    );
  }

  return {
    ok: true,
    checkpoint,
    note: tagged.ok
      ? `Checkpoint ${tag} recorded at ${head.data.slice(0, 8)}.`
      : `Checkpoint recorded at ${head.data.slice(0, 8)}, but the git tag could not be created: ${tagged.error ?? "unknown"}`,
  };
}

export interface RecoveryResult {
  ok: boolean;
  restored: { path: string; ok: boolean; detail: string }[];
  error?: string;
  note?: string;
}

/**
 * Recover code to a checkpoint as a forward commit. Requires the operator to
 * type the confirmation phrase; structural/critical paths are refused.
 */
export async function requestCodeRecovery(input: {
  checkpointId: string;
  files?: string[];
  confirmation: string;
}): Promise<RecoveryResult> {
  if (input.confirmation.trim().toUpperCase() !== CONFIRMATION_PHRASE) {
    return {
      ok: false,
      restored: [],
      error: `Type ${CONFIRMATION_PHRASE} to confirm a code-only reversal.`,
    };
  }
  if (!(await engineerSchemaInstalled())) {
    return { ok: false, restored: [], error: "Phase K schema is not installed yet." };
  }
  if (!githubConfigured()) {
    return { ok: false, restored: [], error: "GitHub access is not configured." };
  }

  const { data, error } = await supabaseAdmin
    .from("engineer_checkpoints")
    .select("*")
    .eq("id", input.checkpointId)
    .maybeSingle();
  if (error || !data) return { ok: false, restored: [], error: "Checkpoint not found." };
  const checkpoint = data as EngineerCheckpointRow;

  const files =
    (input.files && input.files.length > 0 ? input.files : checkpoint.files_affected) ?? [];
  if (files.length === 0) {
    return {
      ok: false,
      restored: [],
      error: "This checkpoint lists no files, so there is nothing safe to restore.",
    };
  }

  const refused = files
    .map((file) => ({
      file,
      rule: RECOVERY_BLOCKLIST.find((entry) => entry.rule.test(file.replace(/^\.\//, ""))),
    }))
    .filter((entry) => entry.rule !== undefined);
  if (refused.length > 0) {
    return {
      ok: false,
      restored: refused.map((entry) => ({
        path: entry.file,
        ok: false,
        detail: entry.rule?.reason ?? "Protected path.",
      })),
      error: "Recovery stopped: some files require human intervention.",
    };
  }

  const settings = await getEngineerSettings();
  const target = settings?.target_branch ?? "main";
  const restored: { path: string; ok: boolean; detail: string }[] = [];

  for (const file of files) {
    const at = await getFileAtRef(file, checkpoint.git_sha);
    if (!at.ok || !at.data) {
      restored.push({ path: file, ok: false, detail: at.error ?? "File missing at checkpoint." });
      continue;
    }
    const current = await getFileAtRef(file, target);
    const written = await putFile({
      path: file,
      content: at.data.content,
      branch: target,
      message: `revert(engineer): restore ${file} to ${checkpoint.git_tag}`,
      ...(current.ok && current.data?.sha ? { sha: current.data.sha } : {}),
    });
    restored.push({
      path: file,
      ok: written.ok,
      detail: written.ok
        ? `Restored from ${checkpoint.git_tag} as a forward commit.`
        : (written.error ?? "Write failed."),
    });
  }

  const succeeded = restored.filter((entry) => entry.ok).map((entry) => entry.path);
  if (succeeded.length > 0) {
    await supabaseAdmin.from("engineer_change_log").insert(
      succeeded.map((file) => ({
        checkpoint_id: checkpoint.id,
        file_path: file,
        operation: "modify" as const,
        before_sha: checkpoint.git_sha,
        note: `Recovered from ${checkpoint.git_tag} (code only)`,
      })),
    );
    await supabaseAdmin.from("engineer_checkpoints").insert({
      git_tag: tagSlug("recovery"),
      git_sha: checkpoint.git_sha,
      summary: `Code recovery to ${checkpoint.git_tag} — ${succeeded.length} file(s)`,
      verified: false,
      trigger: "recovery",
      files_affected: succeeded,
    });
  }

  return {
    ok: restored.every((entry) => entry.ok),
    restored,
    note: `${succeeded.length}/${restored.length} file(s) restored by forward commit. No database operation was performed.`,
  };
}

/** Source files the checkpoint could cover (used to populate the file picker). */
export function recoverableFiles(): string[] {
  return REPO_DATA.files.filter((file) => !RECOVERY_BLOCKLIST.some((rule) => rule.rule.test(file)));
}

export const RECOVERY_CONFIRMATION = CONFIRMATION_PHRASE;
