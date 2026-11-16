import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChatBubble, ChatDayDivider } from "@/components/engineer/ChatBubble";
import { DiffViewer } from "@/components/engineer/DiffViewer";
import { ExecutionStepper } from "@/components/engineer/ExecutionStepper";
import { LogTerminal } from "@/components/engineer/LogTerminal";
import { MigrationCard } from "@/components/engineer/MigrationCard";
import { TaskActions } from "@/components/engineer/TaskActions";
import { STATUS_TONE } from "@/components/engineer/ConversationList";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, type EngineerLogRow, type EngineerTask } from "@/lib/engineer/types";

interface TaskThreadProps {
  task: EngineerTask;
  logs: EngineerLogRow[];
  deploymentAvailable: boolean;
  deploymentReason: string;
  busy: boolean;
  onAuthorize: () => Promise<void>;
  onApprove: () => Promise<void>;
  onRevise: (feedback: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onApproveMigration: () => Promise<void>;
  onResumeBudget: () => Promise<void>;
  onRefreshDeployment: () => Promise<void>;
}

/** Small tappable card inside an incoming bubble (logs, diff, plan details). */
function BubbleDetails({ label, meta, children }: { label: string; meta?: string | undefined; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs font-medium text-foreground">
        {label}
        {meta && <span className="text-[10px] text-muted-foreground">{meta}</span>}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded-lg border border-border/40 bg-background/30 p-2.5">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function statusMessage(task: EngineerTask): string | null {
  switch (task.status) {
    case "review_ready":
      return "Done and verified — ready for your review.";
    case "merged":
      return "Merged into the target branch. A checkpoint was recorded first.";
    case "deployed":
      return "Merged and deployed.";
    case "rejected":
      return "Rejected and archived. Nothing was merged.";
    case "failed":
      return "I couldn't complete this one safely. The attempted diff is kept above for inspection.";
    case "budget_paused":
      return "Paused at the configured spend limit.";
    case "scope_review":
      return "This is a higher-risk change, so I'm holding until you authorize the scope.";
    default:
      return null;
  }
}

/**
 * Renders a task as a chat thread: the operator's instruction as an outgoing
 * bubble, then the Engineer's plan, progress, safety report, diff and final
 * status as incoming bubbles. Action buttons hang below the latest bubble.
 */
export function TaskThread(props: TaskThreadProps) {
  const {
    task,
    logs,
    deploymentAvailable,
    deploymentReason,
    busy,
    onAuthorize,
    onApprove,
    onRevise,
    onReject,
    onApproveMigration,
    onResumeBudget,
    onRefreshDeployment,
  } = props;

  const live = ACTIVE_STATUSES.includes(task.status);
  const checks = task.verification?.checks ?? [];
  const finalMessage = statusMessage(task);
  const diffMeta = task.diff_stats?.files
    ? `${task.diff_stats.files} file${task.diff_stats.files === 1 ? "" : "s"}`
    : undefined;

  return (
    <div className="space-y-3 px-3 py-4">
      <ChatDayDivider
        label={new Date(task.created_at).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      />

      {/* Your instruction */}
      <ChatBubble direction="out" sender="You" timestamp={task.created_at}>
        <p className="whitespace-pre-wrap">{task.prompt}</p>
      </ChatBubble>

      {/* Classification + plan */}
      <ChatBubble direction="in" sender="ASTR Engineer">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                STATUS_TONE[task.status] ?? "bg-secondary text-foreground",
              )}
            >
              {task.status.replace(/_/g, " ")}
            </span>
            {task.classification_label && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {task.classification_label}
              </span>
            )}
            {task.retry_count > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                retry {task.retry_count}
              </span>
            )}
          </div>
          {task.plan_summary ? (
            <BubbleDetails label="Plan &amp; scope" meta="locked">
              <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90">
                {task.plan_summary}
              </pre>
              {task.scope && (
                <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <p>
                    Allowed areas:{" "}
                    {task.scope.allowed_areas.length > 0
                      ? task.scope.allowed_areas.join(", ")
                      : "not constrained"}
                  </p>
                  <p>Protected: {task.scope.protected_systems.join(" · ")}</p>
                  {task.expected_files.length > 0 && (
                    <p className="font-mono text-[10px]">expected: {task.expected_files.join(", ")}</p>
                  )}
                </div>
              )}
            </BubbleDetails>
          ) : (
            <p className="text-xs text-muted-foreground">
              Got it — I'm{classificationPhrase(task.status)}.
            </p>
          )}
          {task.risk_notes && (
            <p
              className={cn(
                "rounded border px-2 py-1.5 text-xs",
                task.classification === "level_5"
                  ? "border-destructive/40 bg-destructive/10 text-rose-200"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-200",
              )}
            >
              {task.risk_notes}
            </p>
          )}
          <ExecutionStepper status={task.status} />
        </div>
      </ChatBubble>

      {/* Safety & verification report — only once the runner has reported anything */}
      {(task.firewall || checks.length > 0 || task.branch_name) && (
        <ChatBubble direction="in" sender="ASTR Engineer">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              {task.firewall?.passed ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <ShieldCheck className="h-4 w-4" /> Safety checks passed
                </span>
              ) : task.firewall ? (
                <span className="inline-flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" /> Firewall blocked this
                </span>
              ) : (
                <span className="text-muted-foreground">Safety scan pending</span>
              )}
              {task.verified_sha && (
                <span className="text-muted-foreground">· verified {task.verified_sha.slice(0, 8)}</span>
              )}
            </div>
            {(task.firewall?.violations.length ?? 0) > 0 && (
              <ul className="space-y-1 text-xs text-rose-200">
                {task.firewall?.violations.map((violation, index) => (
                  <li key={index} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {violation.file ? `${violation.file}: ` : ""}
                      {violation.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {checks.length > 0 && (
              <ul className="space-y-1">
                {checks.map((check) => (
                  <li key={check.name} className="flex items-start gap-2 text-xs">
                    {check.status === "pass" ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="min-w-0">
                      <span className="font-medium text-foreground">{check.name}</span>
                      <span className="block text-muted-foreground">
                        {check.detail ?? check.status.replace("_", " ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {task.branch_name && (
              <p className="font-mono text-[10px] text-muted-foreground">{task.branch_name}</p>
            )}
          </div>
        </ChatBubble>
      )}

      {/* Migration, diff and logs as tappable bubble cards */}
      {(task.has_migration && task.migration_sql) || task.diff_content || logs.length > 0 ? (
        <ChatBubble direction="in" sender="ASTR Engineer">
          <div className="space-y-2">
            {task.has_migration && task.migration_sql && (
              <MigrationCard
                sql={task.migration_sql}
                approved={task.migration_approved}
                busy={busy}
                onApprove={onApproveMigration}
              />
            )}
            {(task.diff_content || task.files_modified.length > 0) && (
              <BubbleDetails label="View the change" meta={diffMeta}>
                <DiffViewer
                  diff={task.diff_content}
                  stats={task.diff_stats}
                  files={task.files_modified}
                />
              </BubbleDetails>
            )}
            {logs.length > 0 && (
              <BubbleDetails label="Activity log" meta={`${logs.length} entries`}>
                <LogTerminal logs={logs} live={live} />
              </BubbleDetails>
            )}
            {task.deployment_status !== "not_started" && (
              <p className="text-xs text-muted-foreground">
                Deployment: {task.deployment_status}
                {task.deployment_note ? ` — ${task.deployment_note}` : ""}
                {(task.deployment_status === "dispatched" || task.deployment_status === "failed") && (
                  <button
                    type="button"
                    className="ml-2 text-primary underline"
                    disabled={busy}
                    onClick={() => void onRefreshDeployment()}
                  >
                    re-check
                  </button>
                )}
              </p>
            )}
          </div>
        </ChatBubble>
      ) : null}

      {/* Final / current status message */}
      {finalMessage && (
        <ChatBubble direction="in" sender="ASTR Engineer" timestamp={task.updated_at}>
          <p>{finalMessage}</p>
        </ChatBubble>
      )}

      {/* Quick-reply actions under the latest bubble */}
      <TaskActions
        task={task}
        deploymentAvailable={deploymentAvailable}
        deploymentReason={deploymentReason}
        busy={busy}
        onAuthorize={onAuthorize}
        onApprove={onApprove}
        onRevise={onRevise}
        onReject={onReject}
        onResumeBudget={onResumeBudget}
      />
    </div>
  );
}

function classificationPhrase(status: EngineerTask["status"]): string {
  if (status === "queued") return " queued and will start shortly";
  if (ACTIVE_STATUSES.includes(status)) return " working on it now";
  return " on it";
}
