/**
 * Shared Phase K types. Client-safe: no server imports, no secrets.
 */

export type EngineerTaskStatus =
  | "queued"
  | "planning"
  | "scope_review"
  | "inspecting"
  | "coding"
  | "testing"
  | "review_ready"
  | "budget_paused"
  | "merged"
  | "deploying"
  | "deployed"
  | "rejected"
  | "failed";

export type EngineerLevel = "level_1" | "level_2" | "level_3" | "level_4" | "level_5";

export const LEVEL_LABELS: Record<EngineerLevel, string> = {
  level_1: "Level 1 · Minor",
  level_2: "Level 2 · Standard",
  level_3: "Level 3 · Feature",
  level_4: "Level 4 · Structural",
  level_5: "Level 5 · Critical",
};

/** Statuses in which the step indicator shows real forward progress. */
export const ACTIVE_STATUSES: EngineerTaskStatus[] = [
  "queued",
  "planning",
  "scope_review",
  "inspecting",
  "coding",
  "testing",
];

export interface ScopeViolation {
  layer: string;
  file?: string;
  detail: string;
}

export interface FirewallReport {
  passed: boolean;
  scanned_files: string[];
  violations: ScopeViolation[];
}

export interface VerificationCheck {
  name: string;
  status: "pass" | "fail" | "skipped" | "not_run";
  detail?: string;
}

export interface VerificationReport {
  checks: VerificationCheck[];
  build_passed: boolean;
  exact_sha?: string | null;
}

export interface DiagnosisRecord {
  category: string;
  message: string;
  file?: string | null;
  attempts: { attempt: number; summary: string; outcome: string }[];
}

export interface EngineerTask {
  id: string;
  prompt: string;
  status: EngineerTaskStatus;
  classification: EngineerLevel | null;
  classification_label: string | null;
  complexity: number | null;
  scope: TaskScope | null;
  plan_summary: string | null;
  risk_notes: string | null;
  expected_files: string[];
  tests_planned: string[];
  scope_violations: ScopeViolation[] | null;
  branch_name: string | null;
  base_sha: string | null;
  commit_sha: string | null;
  verified_sha: string | null;
  diff_content: string | null;
  diff_stats: { files?: number; additions?: number; deletions?: number } | null;
  files_modified: string[];
  has_migration: boolean;
  migration_sql: string | null;
  migration_approved: boolean;
  build_passed: boolean;
  verification: VerificationReport | null;
  firewall: FirewallReport | null;
  diagnosis: DiagnosisRecord | null;
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
  deployment_status: "not_started" | "unavailable" | "dispatched" | "failed" | "verified";
  deployment_note: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskScope {
  objective: string;
  allowed_areas: string[];
  acceptance_criteria: string[];
  exclusions: string[];
  protected_systems: string[];
}

export interface EngineerLogRow {
  id: string;
  task_id: string;
  step_name: string;
  log_text: string;
  level: "info" | "warn" | "error";
  created_at: string;
}

export interface EngineerTaskDetail {
  task: EngineerTask;
  logs: EngineerLogRow[];
}

export interface EngineerSettings {
  llm_base_url: string | null;
  llm_model: string | null;
  llm_price_per_million_tokens: number;
  llm_monthly_budget_usd: number;
  target_branch: string;
  deploy_workflow: string | null;
  deployment_enabled: boolean;
  updated_at: string | null;
}

export interface EngineerCapabilities {
  schema_installed: boolean;
  github_configured: boolean;
  github_repo: string | null;
  llm_configured: boolean;
  deployment_available: boolean;
  deployment_reason: string;
  notes: string[];
}

export interface EngineerCheckpointRow {
  id: string;
  git_tag: string;
  git_sha: string;
  summary: string;
  verified: boolean;
  trigger: string;
  task_id: string | null;
  files_affected: string[];
  created_at: string;
}

export interface EngineerChangeRow {
  id: string;
  checkpoint_id: string | null;
  task_id: string | null;
  file_path: string;
  operation: "add" | "modify" | "delete";
  note: string | null;
  created_at: string;
}

export interface EngineerHealthEvent {
  id: string;
  checked_at: string;
  component: string;
  state: "ok" | "warn" | "fail" | "escalated";
  detail: string | null;
  repaired: boolean;
  repair_note: string | null;
}

export interface EngineerHealthSnapshot {
  runner_state: "idle" | "active" | "stalled" | "unknown";
  queued: number;
  active: number;
  review_ready: number;
  stalled_leases: number;
  last_heartbeat_at: string | null;
  minutes_this_month: number;
  spend_this_month_usd: number;
  components: { component: string; state: "ok" | "warn" | "fail" | "escalated"; detail: string }[];
  events: EngineerHealthEvent[];
  schema_installed: boolean;
}

/** Steps shown by the mobile stepper, in order. */
export const STEPPER_STEPS = [
  { key: "queued", label: "Queued" },
  { key: "planning", label: "Planning" },
  { key: "inspecting", label: "Inspecting" },
  { key: "coding", label: "Patching" },
  { key: "testing", label: "Compiling" },
  { key: "review_ready", label: "Review" },
] as const;

export function statusRank(status: EngineerTaskStatus): number {
  switch (status) {
    case "queued":
      return 0;
    case "planning":
      return 1;
    case "scope_review":
      return 2;
    case "inspecting":
      return 2;
    case "coding":
      return 3;
    case "testing":
      return 4;
    case "review_ready":
    case "budget_paused":
      return 5;
    case "merged":
    case "deploying":
    case "deployed":
      return 6;
    default:
      return 5;
  }
}
