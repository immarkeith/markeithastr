/**
 * Phase K live-trading firewall (5 layers) + scope lock.
 *
 * Pure logic, shared by the trusted server (approval gate) and the GitHub
 * Actions runner (`scripts/engineer-runner.ts`). No secrets, no database.
 *
 * Layers
 *   1. path      — protected files and credential stores
 *   2. token     — live broker endpoints, live credential names, order routing
 *   3. isolation — the runner only ever receives ENGINEER_* / deploy credentials
 *                  (enforced by the workflow, reported here)
 *   4. sql       — destructive or dynamically disguised schema operations
 *   5. sha       — exact-commit verification before merge (github.server.ts)
 */
import type { FirewallReport, ScopeViolation, TaskScope } from "./types";

/** Files the engineer may never modify, whatever the task asks for. */
export const PROTECTED_PATH_RULES: { rule: RegExp; reason: string }[] = [
  {
    rule: /^src\/lib\/broker\.server\.ts$/,
    reason: "Live Alpaca order execution — never agent-modifiable.",
  },
  {
    rule: /^src\/lib\/engineer\//,
    reason: "The engineer's own firewall, gate, approval and queue code is protected.",
  },
  {
    rule: /^\.github\//,
    reason: "Workflows and security gates are not available to the agent.",
  },
  {
    rule: /^scripts\/engineer-runner\.ts$/,
    reason: "The runner's own security logic is protected.",
  },
  {
    rule: /(^|\/)\.env($|\.)/,
    reason: "Credential stores are never agent-modifiable.",
  },
  {
    rule: /(^|\/)(secrets?|credentials?)(\/|$|\.)/i,
    reason: "Credential stores are never agent-modifiable.",
  },
  { rule: /\.(pem|key|p12|pfx)$/i, reason: "Private key material is protected." },
  {
    rule: /^supabase\/config\.toml$/,
    reason: "Supabase project configuration is not agent-modifiable.",
  },
];

/** Tokens that mean the diff reaches live trading or live credentials. */
export const TOKEN_RULES: { rule: RegExp; reason: string }[] = [
  { rule: /api\.alpaca\.markets/i, reason: "Live Alpaca trading endpoint." },
  { rule: /alpaca\.markets\/v2\/orders/i, reason: "Live order submission route." },
  { rule: /\bALPACA_LIVE_KEY_ID\b/, reason: "Live Alpaca credential referenced." },
  { rule: /\bALPACA_LIVE_SECRET_KEY\b/, reason: "Live Alpaca credential referenced." },
  {
    rule: /\b(liveBroker|executeLiveTrade|placeLiveOrder|submitLiveOrder)\b/,
    reason: "Live trade routing symbol.",
  },
  {
    rule: /\b(SUPABASE_SERVICE_ROLE_KEY|GITHUB_ENGINEER_TOKEN|ENGINEER_LLM_API_KEY)\b/,
    reason: "Trusted credential name inside agent output.",
  },
];

/**
 * Destructive SQL. Rejection is unconditional on *any* schema change that could
 * destroy records; additive DDL is still allowed but gated by the separate
 * migration approval card.
 */
export const DESTRUCTIVE_SQL_RULES: { rule: RegExp; reason: string }[] = [
  {
    rule: /\bdrop\s+(table|schema|column|constraint|index|function|policy|trigger)\b/i,
    reason: "DROP statement.",
  },
  { rule: /\btruncate\b/i, reason: "TRUNCATE statement." },
  { rule: /\balter\s+table\b[\s\S]{0,200}?\bdrop\b/i, reason: "ALTER TABLE … DROP." },
  {
    rule: /\bdelete\s+from\b(?![\s\S]{0,200}?\bwhere\b)/i,
    reason: "DELETE without a WHERE clause.",
  },
  {
    rule: /\bupdate\b[\s\S]{0,120}?\bset\b(?![\s\S]{0,200}?\bwhere\b)/i,
    reason: "UPDATE without a WHERE clause.",
  },
  {
    rule: /\bexecute\s+(format\s*\(|immediate\b)/i,
    reason: "Dynamically constructed SQL (disguised destructive operations).",
  },
  {
    rule: /\bpg_terminate_backend\b|\bpg_drop_replication_slot\b/i,
    reason: "Server-level destructive function.",
  },
  { rule: /\bdrop\s+database\b/i, reason: "DROP DATABASE." },
];

export interface PatchFile {
  path: string;
  /** Unified diff body for this file, or the full new content when adding. */
  patch: string;
  operation?: "add" | "modify" | "delete";
}

export interface FirewallInput {
  files: PatchFile[];
  /** Full unified diff, scanned as well as the per-file patches. */
  diff?: string;
  /** The operator's instruction — used only for scope-lock comparisons. */
  requestText?: string;
  scope?: TaskScope | null;
}

function addedLines(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1));
}

/**
 * Layers 1, 2 and 4. Returns every violation found — the caller rejects the
 * task when `passed` is false. Never throws.
 */
export function scanFirewall(input: FirewallInput): FirewallReport {
  const violations: ScopeViolation[] = [];
  const scanned = new Set<string>();
  const files = input.files ?? [];

  for (const file of files) {
    const path = file.path.replace(/^\.\//, "");
    scanned.add(path);

    // Layer 1 — path blocklist
    for (const { rule, reason } of PROTECTED_PATH_RULES) {
      if (rule.test(path)) {
        violations.push({ layer: "path", file: path, detail: reason });
      }
    }

    const content = `${file.patch}\n${addedLines(file.patch).join("\n")}`;

    // Layer 2 — live trading / credential tokens
    for (const { rule, reason } of TOKEN_RULES) {
      if (rule.test(content)) {
        violations.push({ layer: "token", file: path, detail: reason });
      }
    }

    // Layer 4 — destructive SQL, only meaningful for SQL-bearing files
    if (
      /\.sql$/i.test(path) ||
      /\b(create|alter|drop)\s+(table|function|policy)\b/i.test(content)
    ) {
      for (const { rule, reason } of DESTRUCTIVE_SQL_RULES) {
        if (rule.test(content)) {
          violations.push({ layer: "sql", file: path, detail: reason });
        }
      }
    }
  }

  if (input.diff) {
    for (const { rule, reason } of TOKEN_RULES) {
      if (rule.test(input.diff)) {
        violations.push({ layer: "token", detail: `${reason} (in diff)` });
      }
    }
  }

  return { passed: violations.length === 0, scanned_files: [...scanned], violations };
}

/**
 * Layers 1–4 over a full diff, including files the runner touched on disk.
 * `changedPaths` comes from `git status --porcelain`.
 */
export function scanChangedPaths(
  changedPaths: string[],
  diff: string,
  requestText?: string,
  scope?: TaskScope | null,
): FirewallReport {
  const report = scanFirewall({
    files: changedPaths.map((path) => ({ path, patch: "" })),
    diff,
    ...(requestText ? { requestText } : {}),
    ...(scope ? { scope } : {}),
  });
  return report;
}

/**
 * Scope lock: files the engineer touched that the locked plan did not expect.
 * Advisory-but-blocking — the task cannot reach review_ready until the operator
 * approves the wider scope or rejects the task.
 */
export function scanScope(
  changedPaths: string[],
  scope: TaskScope | null,
  requestText: string,
): ScopeViolation[] {
  const violations: ScopeViolation[] = [];
  if (!scope) return violations;

  const normalized = changedPaths.map((p) => p.replace(/^\.\//, ""));

  // Dependency upgrades are never incidental.
  const dependencyChange = normalized.some(
    (p) => p === "package.json" || p === "bun.lock" || p === "package-lock.json",
  );
  if (dependencyChange && !/\b(upgrade|dependency|package|bun|version)\b/i.test(requestText)) {
    violations.push({
      layer: "scope",
      detail: "package.json/bun.lock changed although no dependency work was requested.",
    });
  }

  const areas = scope.allowed_areas.filter(Boolean);
  if (areas.length > 0) {
    for (const path of normalized) {
      const allowed = areas.some(
        (area) => path === area || path.startsWith(`${area.replace(/\/$/, "")}/`),
      );
      if (!allowed) {
        violations.push({
          layer: "scope",
          file: path,
          detail: `Outside the locked scope (${areas.join(", ")}).`,
        });
      }
    }
  }

  return violations;
}

/** Human-readable one-liner for the mission-control card. */
export function firewallSummary(report: FirewallReport | null): string {
  if (!report) return "Not scanned yet";
  if (report.passed) return `Passed · ${report.scanned_files.length} file(s) scanned`;
  return `${report.violations.length} violation(s) blocked`;
}
