/**
 * Narrowly scoped GitHub access for the Phase K engineer.
 *
 * Two credentials, never one: the runner gets GITHUB_ENGINEER_TOKEN (branch
 * writes, no admin), deployment is dispatched only through a repository-defined
 * workflow. Everything fails closed — a missing token, an unreachable repo, a
 * missing workflow or an unverified commit is reported, never assumed.
 *
 * Server-only.
 */

const API = "https://api.github.com";

export interface GithubConfig {
  token: string;
  repo: string;
}

export function githubConfig(): GithubConfig | null {
  const token = process.env["GITHUB_ENGINEER_TOKEN"]?.trim();
  const repo = process.env["GITHUB_ENGINEER_REPO"]?.trim();
  if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  return { token, repo };
}

export function githubConfigured(): boolean {
  return githubConfig() !== null;
}

export interface GhResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

async function gh<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<GhResult<T>> {
  const config = githubConfig();
  if (!config) {
    return {
      ok: false,
      error: "GitHub access is not configured (GITHUB_ENGINEER_TOKEN / GITHUB_ENGINEER_REPO).",
    };
  }

  try {
    const response = await fetch(`${API}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${config.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });

    const text = await response.text();
    let data: T | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        data = undefined;
      }
    }

    if (!response.ok) {
      const apiMessage =
        (data as { message?: string } | undefined)?.message ??
        text.slice(0, 300) ??
        "request failed";
      return {
        ok: false,
        error: `GitHub ${response.status}: ${apiMessage}`,
        status: response.status,
      };
    }
    return { ok: true, ...(data !== undefined ? { data } : {}), status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub request failed";
    return { ok: false, error: message };
  }
}

export interface RepoInfo {
  default_branch: string;
  private: boolean;
  full_name: string;
}

export async function getRepoInfo(): Promise<GhResult<RepoInfo>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  return gh<RepoInfo>(`/repos/${config.repo}`);
}

export async function getBranchSha(branch: string): Promise<GhResult<string>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{ object?: { sha?: string } }>(
    `/repos/${config.repo}/git/ref/heads/${branch}`,
  );
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) };
  const sha = result.data?.object?.sha;
  if (!sha) return { ok: false, error: `Branch ${branch} has no head commit.` };
  return { ok: true, data: sha };
}

export interface CheckSummary {
  total: number;
  passing: number;
  failing: number;
  pending: number;
  failing_names: string[];
}

/**
 * Layer 5 — commit status for one exact SHA. An unverified, stale or unknown
 * SHA never passes: callers must treat `ok: false` and any failing/pending as
 * "not verified".
 */
export async function getCheckSummary(sha: string): Promise<GhResult<CheckSummary>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{
    check_runs?: { name?: string; status?: string; conclusion?: string | null }[];
    total_count?: number;
  }>(`/repos/${config.repo}/commits/${sha}/check-runs?per_page=100`);
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) };

  const runs = result.data?.check_runs ?? [];
  let passing = 0;
  let failing = 0;
  let pending = 0;
  const failingNames: string[] = [];
  for (const run of runs) {
    if (run.status !== "completed") {
      pending += 1;
      continue;
    }
    if (
      run.conclusion === "success" ||
      run.conclusion === "neutral" ||
      run.conclusion === "skipped"
    ) {
      passing += 1;
    } else {
      failing += 1;
      failingNames.push(run.name ?? "unnamed check");
    }
  }

  return {
    ok: true,
    data: { total: runs.length, passing, failing, pending, failing_names: failingNames },
  };
}

export interface MergeResult {
  ok: boolean;
  sha?: string;
  error?: string;
}

/**
 * Merge exactly one verified commit. The branch tip must still equal the
 * verified SHA — if anything changed after verification the merge is refused.
 */
export async function mergeVerifiedSha(input: {
  branch: string;
  sha: string;
  target: string;
  message?: string;
}): Promise<MergeResult> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  if (!/^[0-9a-f]{7,40}$/i.test(input.sha)) return { ok: false, error: "Invalid commit SHA." };

  const tip = await getBranchSha(input.branch);
  if (!tip.ok || !tip.data) return { ok: false, error: tip.error ?? "Branch not found." };
  if (tip.data !== input.sha) {
    return {
      ok: false,
      error: `Branch ${input.branch} moved to ${tip.data.slice(0, 8)} after verification (expected ${input.sha.slice(0, 8)}). Verification must run again.`,
    };
  }

  const merged = await gh<{ sha?: string }>(`/repos/${config.repo}/merges`, {
    method: "POST",
    body: {
      base: input.target,
      head: input.sha,
      commit_message:
        input.message ??
        `engineer: merge verified commit ${input.sha.slice(0, 8)} into ${input.target}`,
    },
  });

  if (!merged.ok) return { ok: false, error: merged.error ?? "Merge failed." };
  return { ok: true, sha: merged.data?.sha ?? input.sha };
}

export interface WorkflowRunInfo {
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
}

/**
 * Most recent run of one workflow. The runner only reports through this
 * workflow, so a run that never started (missing Actions secrets, for example)
 * otherwise leaves tasks queued with no explanation anywhere in the app.
 */
export async function getLatestWorkflowRun(
  workflow: string,
): Promise<GhResult<WorkflowRunInfo | null>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{
    workflow_runs?: {
      status?: string;
      conclusion?: string | null;
      html_url?: string;
      created_at?: string;
    }[];
  }>(`/repos/${config.repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=1`);
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) };
  const run = result.data?.workflow_runs?.[0];
  if (!run) return { ok: true, data: null };
  return {
    ok: true,
    data: {
      status: run.status ?? "unknown",
      conclusion: run.conclusion ?? null,
      html_url: run.html_url ?? "",
      created_at: run.created_at ?? "",
    },
  };
}

export async function getWorkflowFile(workflow: string): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{ type?: string }>(
    `/repos/${config.repo}/contents/.github/workflows/${encodeURIComponent(workflow)}`,
  );
  if (!result.ok) {
    if (result.status === 404) return { ok: true, data: false };
    return { ok: false, ...(result.error ? { error: result.error } : {}) };
  }
  return { ok: true, data: result.data?.type === "file" };
}

/** Deployment is only ever a repository workflow dispatch — never a provider API. */
export async function dispatchDeployment(input: {
  workflow: string;
  ref: string;
}): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const exists = await getWorkflowFile(input.workflow);
  if (!exists.ok) return { ok: false, ...(exists.error ? { error: exists.error } : {}) };
  if (!exists.data) {
    return {
      ok: false,
      error: `Deployment workflow ${input.workflow} does not exist in the repository.`,
    };
  }
  const dispatched = await gh<unknown>(
    `/repos/${config.repo}/actions/workflows/${encodeURIComponent(input.workflow)}/dispatches`,
    { method: "POST", body: { ref: input.ref } },
  );
  if (!dispatched.ok)
    return { ok: false, ...(dispatched.error ? { error: dispatched.error } : {}) };
  return { ok: true, data: true };
}

/** Ask the queue's runner workflow to pick up the next task. */
export async function dispatchEngineerTask(): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const dispatched = await gh<unknown>(`/repos/${config.repo}/dispatches`, {
    method: "POST",
    body: { event_type: "engineer-task-queued", client_payload: { source: "astr-engineer-ui" } },
  });
  if (!dispatched.ok)
    return { ok: false, ...(dispatched.error ? { error: dispatched.error } : {}) };
  return { ok: true, data: true };
}

export async function createTag(tag: string, sha: string): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const created = await gh<unknown>(`/repos/${config.repo}/git/refs`, {
    method: "POST",
    body: { ref: `refs/tags/${tag}`, sha },
  });
  if (!created.ok) return { ok: false, ...(created.error ? { error: created.error } : {}) };
  return { ok: true, data: true };
}

export async function deleteBranch(branch: string): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  if (!branch.startsWith("engineer/")) {
    return { ok: false, error: "Only engineer/* branches can be discarded." };
  }
  const deleted = await gh<unknown>(`/repos/${config.repo}/git/refs/heads/${branch}`, {
    method: "DELETE",
  });
  if (!deleted.ok && deleted.status !== 422) {
    return { ok: false, ...(deleted.error ? { error: deleted.error } : {}) };
  }
  return { ok: true, data: true };
}

export interface FileAtRef {
  content: string;
  sha: string;
}

export async function getFileAtRef(path: string, ref: string): Promise<GhResult<FileAtRef>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{ content?: string; sha?: string; encoding?: string }>(
    `/repos/${config.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
  );
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) };
  const encoded = result.data?.content ?? "";
  const content = Buffer.from(encoded.replace(/\n/g, ""), "base64").toString("utf8");
  return { ok: true, data: { content, sha: result.data?.sha ?? "" } };
}

/**
 * Forward-only file write used by code recovery: it restores a file's content
 * at a checkpoint as a NEW commit. Repository files only — never data.
 */
export async function putFile(input: {
  path: string;
  content: string;
  message: string;
  branch: string;
  sha?: string;
}): Promise<GhResult<boolean>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const written = await gh<unknown>(`/repos/${config.repo}/contents/${input.path}`, {
    method: "PUT",
    body: {
      message: input.message,
      content: Buffer.from(input.content, "utf8").toString("base64"),
      branch: input.branch,
      ...(input.sha ? { sha: input.sha } : {}),
    },
  });
  if (!written.ok) return { ok: false, ...(written.error ? { error: written.error } : {}) };
  return { ok: true, data: true };
}

export interface WorkflowRunSummary {
  conclusion: string | null;
  status: string;
  html_url: string;
}

/** Recent runs for a SHA — used to confirm (never assume) a deployment outcome. */
export async function getWorkflowRunsForSha(sha: string): Promise<GhResult<WorkflowRunSummary[]>> {
  const config = githubConfig();
  if (!config) return { ok: false, error: "GitHub access is not configured." };
  const result = await gh<{
    workflow_runs?: { conclusion?: string | null; status?: string; html_url?: string }[];
  }>(`/repos/${config.repo}/actions/runs?head_sha=${sha}&per_page=10`);
  if (!result.ok) return { ok: false, ...(result.error ? { error: result.error } : {}) };
  return {
    ok: true,
    data: (result.data?.workflow_runs ?? []).map((run) => ({
      conclusion: run.conclusion ?? null,
      status: run.status ?? "unknown",
      html_url: run.html_url ?? "",
    })),
  };
}
