/**
 * Engineering intelligence: task classification, scope lock and plan.
 *
 * Classification is deterministic and cheap (no model call for the decision),
 * so a trivial copy change never pays for a planning round trip and a critical
 * request is stopped before anything expensive happens.
 */
import { repoBrief, suggestFiles, suggestRoutes } from "./repo-map";
import type { EngineerLevel, TaskScope } from "./types";
import { LEVEL_LABELS } from "./types";

export interface Classification {
  level: EngineerLevel;
  label: string;
  complexity: number;
  reasons: string[];
  /** Level 4/5 must not proceed until the operator approves the plan. */
  requiresPlanApproval: boolean;
  /** Level 5 is blocked outright until explicitly authorized. */
  critical: boolean;
}

const CRITICAL_SIGNALS: { rule: RegExp; reason: string }[] = [
  {
    rule: /\b(live trading|live trade|real money|live order|order execution|alpaca)\b/i,
    reason: "Touches live trading or live order routing.",
  },
  { rule: /\b(broker|brokerage)\b/i, reason: "Touches the broker integration." },
  {
    rule: /\b(credential|credentials|api key|api keys|secret|secrets|password)\b/i,
    reason: "Touches credentials or secrets.",
  },
  {
    rule: /\b(drop table|truncate|delete from|wipe|reset the database|erase)\b/i,
    reason: "Requests a destructive data operation.",
  },
  {
    rule: /\b(firewall|deployment authorization|approval gate|bypass auth|disable auth|security gate)\b/i,
    reason: "Touches the security firewall or its authorization.",
  },
  {
    rule: /\b(portfolio balance|live portfolio|settled balance)\b/i,
    reason: "Touches live portfolio balances.",
  },
];

const STRUCTURAL_SIGNALS: { rule: RegExp; reason: string }[] = [
  {
    rule: /\b(database|schema|migration|table|column|index|rls|row level security)\b/i,
    reason: "Database architecture change.",
  },
  {
    rule: /\b(auth|authentication|authorization|permission|role)\b/i,
    reason: "Authentication or authorization change.",
  },
  { rule: /\b(router|routing|route tree|navigation structure)\b/i, reason: "Routing change." },
  {
    rule: /\b(refactor|restructure|architecture|rewrite|overhaul)\b/i,
    reason: "Structural refactor.",
  },
  {
    rule: /\b(upgrade|dependency|dependencies|bump|package version)\b/i,
    reason: "Infrastructure or dependency change.",
  },
  {
    rule: /\b(engineer|runner|github actions|workflow)\b/i,
    reason: "Touches build or engineering infrastructure.",
  },
];

const FEATURE_SIGNALS: { rule: RegExp; reason: string }[] = [
  {
    rule: /\b(new (page|screen|tab|section|feature|module|engine))\b/i,
    reason: "New feature area.",
  },
  { rule: /\b(integrate|integration|end-to-end|pipeline)\b/i, reason: "Multi-system integration." },
  { rule: /\b(chart|dashboard|panel|workflow)\b/i, reason: "Feature-sized UI or flow." },
];

const MINOR_SIGNALS: { rule: RegExp; reason: string }[] = [
  {
    rule: /\b(typo|copy|wording|label|text|rename|caption|tooltip|heading|timestamp)\b/i,
    reason: "Copy or label change.",
  },
  {
    rule: /\b(color|colour|spacing|padding|margin|font|style|alignment)\b/i,
    reason: "Styling adjustment.",
  },
];

export function classifyTask(prompt: string): Classification {
  const text = (prompt ?? "").trim();
  const reasons: string[] = [];

  // Scope signals measured against the real repository, not assumptions.
  const files = suggestFiles(text, 10);
  const routes = suggestRoutes(text);

  const critical = CRITICAL_SIGNALS.filter((s) => s.rule.test(text));
  if (critical.length > 0) {
    reasons.push(...critical.map((s) => s.reason));
    return {
      level: "level_5",
      label: LEVEL_LABELS.level_5,
      complexity: 5,
      reasons,
      requiresPlanApproval: true,
      critical: true,
    };
  }

  const structural = STRUCTURAL_SIGNALS.filter((s) => s.rule.test(text));
  if (structural.length > 0) {
    reasons.push(...structural.map((s) => s.reason));
    if (files.length > 4) reasons.push(`${files.length} files look involved.`);
    return {
      level: "level_4",
      label: LEVEL_LABELS.level_4,
      complexity: Math.min(5, 3 + (files.length > 4 ? 1 : 0)),
      reasons,
      requiresPlanApproval: true,
      critical: false,
    };
  }

  const feature = FEATURE_SIGNALS.filter((s) => s.rule.test(text));
  if (feature.length > 0 || files.length > 3) {
    reasons.push(...feature.map((s) => s.reason));
    if (files.length > 3) reasons.push(`Likely spans ${files.length} files.`);
    return {
      level: "level_3",
      label: LEVEL_LABELS.level_3,
      complexity: 3,
      reasons,
      requiresPlanApproval: false,
      critical: false,
    };
  }

  const minor = MINOR_SIGNALS.filter((s) => s.rule.test(text));
  if (minor.length > 0 && text.length < 220 && files.length <= 3) {
    reasons.push(...minor.map((s) => s.reason));
    return {
      level: "level_1",
      label: LEVEL_LABELS.level_1,
      complexity: 1,
      reasons,
      requiresPlanApproval: false,
      critical: false,
    };
  }

  reasons.push(
    files.length > 0
      ? `Targeted change around ${files.slice(0, 3).join(", ")}.`
      : "Isolated change with no structural signal.",
  );
  if (routes.length > 0) reasons.push(`Related route: ${routes[0]}`);

  return {
    level: "level_2",
    label: LEVEL_LABELS.level_2,
    complexity: 2,
    reasons,
    requiresPlanApproval: false,
    critical: false,
  };
}

export interface EngineeringPlan {
  scope: TaskScope;
  plan_summary: string;
  risk_notes: string;
  expected_files: string[];
  tests_planned: string[];
}

const PROTECTED_SYSTEMS = [
  "Live Alpaca execution (src/lib/broker.server.ts) and live credentials",
  "Historical market data (daily_bars) and trade/research records",
  "Trading formulas, researcher qualification thresholds, Alpaca configuration",
  "Engineer firewall, approval gates and deployment authorization",
];

/** Build the recorded plan and the scope lock the diff is checked against. */
export function buildPlan(prompt: string, classification: Classification): EngineeringPlan {
  const files = suggestFiles(prompt, 8);
  const routes = suggestRoutes(prompt);
  const expected = [...new Set([...files, ...routes])];
  const areas = [...new Set(expected.map((file) => file.split("/").slice(0, 2).join("/")))];
  const stack = repoBrief();

  const acceptance: string[] = [
    "The requested change is present and behaves as described in the instruction.",
    "Type checking, lint and the production build succeed against the exact commit.",
    "No protected path, live-trading token or destructive SQL is introduced.",
    "Existing functionality outside the requested change is untouched.",
  ];

  const exclusions = [
    "No dependency or infrastructure upgrades unless the instruction explicitly asks for one.",
    "No UI redesign, refactor or feature beyond the requested change.",
    "No trading formula, threshold, credential or Alpaca configuration changes.",
    "No database migration is executed as part of code deployment.",
  ];

  const planLines = [
    `Objective: ${prompt.trim().slice(0, 400)}`,
    `Classified as ${classification.label} (complexity ${classification.complexity}/5).`,
    `Repository: ${stack.split("\n")[0]}`,
    expected.length > 0
      ? `Expected files: ${expected.join(", ")}`
      : "Expected files: to be identified during inspection.",
    `Verification: typecheck, lint, production build${classification.level === "level_3" ? ", plus a review of affected routes" : ""}.`,
  ];

  const risk =
    classification.level === "level_4"
      ? "Structural change: review the impact assessment before implementation begins."
      : classification.level === "level_5"
        ? "Critical classification: blocked until an operator explicitly authorizes this scope."
        : "Low risk: isolated, reversible code change with no data or trading impact.";

  return {
    scope: {
      objective: prompt.trim(),
      allowed_areas: areas,
      acceptance_criteria: acceptance,
      exclusions,
      protected_systems: PROTECTED_SYSTEMS,
    },
    plan_summary: planLines.join("\n"),
    risk_notes: risk,
    expected_files: expected,
    tests_planned: [
      "bun run lint",
      "bun run build",
      ...(classification.level === "level_3"
        ? ["Manual review of the affected route in the preview"]
        : []),
    ],
  };
}
