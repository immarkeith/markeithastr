import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Clock,
  Coins,
  GitBranch,
  GitCommitHorizontal,
  RefreshCw,
  Rocket,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DiffViewer } from "@/components/engineer/DiffViewer";
import { ExecutionStepper } from "@/components/engineer/ExecutionStepper";
import { LogTerminal } from "@/components/engineer/LogTerminal";
import { MigrationCard } from "@/components/engineer/MigrationCard";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, type EngineerLogRow, type EngineerTask } from "@/lib/engineer/types";

interface Props {
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

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-secondary text-foreground",
  planning: "bg-primary/15 text-primary",
  scope_review: "bg-amber-500/15 text-amber-300",
  inspecting: "bg-primary/15 text-primary",
  coding: "bg-primary/15 text-primary",
  testing: "bg-primary/15 text-primary",
  review_ready: "bg-emerald-500/15 text-emerald-300",
  budget_paused: "bg-amber-500/15 text-amber-300",
  merged: "bg-emerald-500/15 text-emerald-300",
  deploying: "bg-live/15 text-live",
  deployed: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
  failed: "bg-rose-500/15 text-rose-300",
};

function Section({
  title,
  children,
  defaultOpen = false,
  meta,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
        {title}
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{meta}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 rounded-md border border-border/60 bg-card/40 p-3 text-sm">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CheckRow({ name, ok, detail }: { name: string; ok: boolean; detail: string }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <span className="min-w-0">
        <span className="font-medium text-foreground">{name}</span>
        <span className="block text-xs text-muted-foreground">{detail}</span>
      </span>
    </li>
  );
}

export function TaskDetail(props: Props) {
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

  const [feedback, setFeedback] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  const active = ACTIVE_STATUSES.includes(task.status) || task.status === "budget_paused";
  const live = ACTIVE_STATUSES.includes(task.status);

  const blocking = useMemo(() => {
    const reasons: string[] = [];
    if (task.status !== "review_ready") reasons.push(`Status is ${task.status.replace("_", " ")}`);
    if (!task.build_passed) reasons.push("Build has not passed");
    if (task.firewall?.passed !== true) reasons.push("Firewall has not cleared the diff");
    if ((task.scope_violations ?? []).length > 0) reasons.push("Out-of-scope changes detected");
    if (!task.commit_sha || task.commit_sha !== task.verified_sha)
      reasons.push("Exact commit not verified");
    if (task.has_migration && !task.migration_approved) reasons.push("Migration not approved");
    return reasons;
  }, [task]);

  const checks = task.verification?.checks ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              STATUS_STYLES[task.status] ?? "bg-secondary text-foreground",
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
          <span className="ml-auto text-[10px] text-muted-foreground">
            {new Date(task.created_at).toLocaleString("en-US", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{task.prompt}</p>

        {task.risk_notes && (
          <p
            className={cn(
              "mt-2 rounded border px-2 py-1.5 text-xs",
              task.classification === "level_5"
                ? "border-destructive/40 bg-destructive/10 text-rose-200"
                : "border-amber-500/30 bg-amber-500/5 text-amber-200",
            )}
          >
            {task.risk_notes}
          </p>
        )}

        <ExecutionStepper status={task.status} className="mt-3" />

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {task.branch_name && (
            <span className="inline-flex items-center gap-1">
              <GitBranch className="h-3 w-3" /> {task.branch_name}
            </span>
          )}
          {task.verified_sha && (
            <span className="inline-flex items-center gap-1">
              <GitCommitHorizontal className="h-3 w-3" /> verified {task.verified_sha.slice(0, 8)}
            </span>
          )}
          {task.locked_by && (
            <span className="inline-flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> {task.locked_by}
            </span>
          )}
          {task.heartbeat_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(task.heartbeat_at).toLocaleTimeString("en-US", { hour12: false })}
            </span>
          )}
        </div>
      </div>

      {task.plan_summary && (
        <Section title="Engineering plan &amp; scope" meta={<span>locked</span>}>
          <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90">
            {task.plan_summary}
          </pre>
          {task.scope && (
            <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs">
              <p>
                <span className="font-medium text-foreground">Allowed areas:</span>{" "}
                <span className="text-muted-foreground">
                  {task.scope.allowed_areas.length > 0
                    ? task.scope.allowed_areas.join(", ")
                    : "not constrained"}
                </span>
              </p>
              <p>
                <span className="font-medium text-foreground">Acceptance:</span>
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                {task.scope.acceptance_criteria.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                <span className="font-medium text-foreground">Exclusions:</span>
              </p>
              <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                {task.scope.exclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>
                <span className="font-medium text-foreground">Protected systems:</span>{" "}
                <span className="text-muted-foreground">
                  {task.scope.protected_systems.join(" · ")}
                </span>
              </p>
              {task.expected_files.length > 0 && (
                <p className="font-mono text-[10px] text-muted-foreground">
                  expected: {task.expected_files.join(", ")}
                </p>
              )}
            </div>
          )}
        </Section>
      )}

      <Section title="Safety &amp; firewall" meta={<ShieldCheck className="h-3.5 w-3.5" />}>
        <div className="flex items-center gap-2 text-xs">
          {task.firewall?.passed ? (
            <span className="inline-flex items-center gap-1 text-success">
              <ShieldCheck className="h-4 w-4" /> Firewall passed
            </span>
          ) : task.firewall ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <XCircle className="h-4 w-4" /> Firewall blocked
            </span>
          ) : (
            <span className="text-muted-foreground">Not scanned yet</span>
          )}
          <span className="text-muted-foreground">
            {task.firewall?.scanned_files.length ?? 0} file(s) scanned
          </span>
        </div>
        {(task.firewall?.violations.length ?? 0) > 0 && (
          <ul className="space-y-1 text-xs text-rose-200">
            {task.firewall?.violations.map((violation, index) => (
              <li key={index} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-mono text-[10px] uppercase text-rose-300">
                    {violation.layer}
                  </span>{" "}
                  {violation.file ? `${violation.file}: ` : ""}
                  {violation.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(task.scope_violations ?? []).length > 0 && (
          <div className="rounded border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-200">
            <p className="font-medium">
              Scope lock flagged {task.scope_violations?.length} change(s)
            </p>
            <ul className="mt-1 list-disc pl-4">
              {task.scope_violations?.map((violation, index) => (
                <li key={index}>
                  {violation.file ? `${violation.file}: ` : ""}
                  {violation.detail}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <p>Commit: {task.commit_sha ? task.commit_sha.slice(0, 10) : "—"}</p>
          <p>Verified: {task.verified_sha ? task.verified_sha.slice(0, 10) : "—"}</p>
          <p>
            Exact-SHA gate:{" "}
            {task.commit_sha && task.commit_sha === task.verified_sha ? "match" : "not verified"}
          </p>
          <p>Checkpoint: {task.checkpoint_id ? task.checkpoint_id.slice(0, 8) : "—"}</p>
        </div>
      </Section>

      {checks.length > 0 && (
        <Section
          title="Verification"
          meta={
            <span className={task.build_passed ? "text-success" : "text-muted-foreground"}>
              {task.build_passed ? "build passed" : "build not passed"}
            </span>
          }
        >
          <ul className="space-y-1.5">
            {checks.map((check) => (
              <CheckRow
                key={check.name}
                name={check.name}
                ok={check.status === "pass"}
                detail={check.detail ?? check.status.replace("_", " ")}
              />
            ))}
          </ul>
        </Section>
      )}

      <Section title="Resources &amp; cost" meta={<Coins className="h-3.5 w-3.5" />}>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p>Tokens: {task.tokens_used.toLocaleString()}</p>
          <p>Est. cost: ${task.cost_estimate_usd.toFixed(4)}</p>
          <p>
            Actual cost:{" "}
            {task.cost_actual_usd === null ? "not reported" : `$${task.cost_actual_usd.toFixed(4)}`}
          </p>
          <p>Actions minutes: {task.actions_minutes ?? "—"}</p>
          <p>
            Duration:{" "}
            {task.duration_seconds === null ? "—" : `${Math.round(task.duration_seconds / 60)} min`}
          </p>
          <p>Retries: {task.retry_count}</p>
        </div>
        {task.diagnosis && (
          <div className="rounded border border-border bg-secondary/40 p-2 text-xs">
            <p className="font-medium text-foreground">Diagnosis: {task.diagnosis.category}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
              {task.diagnosis.message}
            </p>
            {task.diagnosis.attempts.length > 0 && (
              <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                {task.diagnosis.attempts.map((attempt) => (
                  <li key={attempt.attempt}>
                    Attempt {attempt.attempt}: {attempt.summary} — {attempt.outcome}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Section>

      {task.has_migration && task.migration_sql && (
        <MigrationCard
          sql={task.migration_sql}
          approved={task.migration_approved}
          busy={busy}
          onApprove={onApproveMigration}
        />
      )}

      <DiffViewer diff={task.diff_content} stats={task.diff_stats} files={task.files_modified} />

      <LogTerminal logs={logs} live={live} />

      {task.deployment_status !== "not_started" && (
        <div className="rounded-md border border-border bg-card p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Rocket className="h-3.5 w-3.5" /> Deployment: {task.deployment_status}
          </p>
          <p className="mt-1 text-muted-foreground">{task.deployment_note}</p>
          {(task.deployment_status === "dispatched" || task.deployment_status === "failed") && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => void onRefreshDeployment()}
              disabled={busy}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-check workflow
            </Button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ actions */}
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        {task.status === "scope_review" && (
          <>
            <p className="text-xs text-muted-foreground">
              This task needs explicit authorization before the runner may implement it.
            </p>
            <Button className="w-full" onClick={() => void onAuthorize()} disabled={busy}>
              <UserCheck className="mr-1.5 h-4 w-4" /> Authorize this scope
            </Button>
          </>
        )}

        {task.status === "budget_paused" && (
          <>
            <p className="text-xs text-amber-200">
              The task paused at its configured spend limit. Approve more budget to continue.
            </p>
            <Button className="w-full" onClick={() => void onResumeBudget()} disabled={busy}>
              <Coins className="mr-1.5 h-4 w-4" /> Approve spend &amp; requeue
            </Button>
          </>
        )}

        {task.status === "review_ready" && (
          <>
            <Button
              className="w-full"
              onClick={() => setConfirm("approve")}
              disabled={busy || blocking.length > 0}
            >
              <Rocket className="mr-1.5 h-4 w-4" />
              Approve &amp; {deploymentAvailable ? "Deploy" : "Merge"}
            </Button>
            {blocking.length > 0 && (
              <p className="text-[11px] text-amber-300">Blocked: {blocking.join(" · ")}</p>
            )}
            {blocking.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                {deploymentAvailable
                  ? "Merges the verified commit, then dispatches the deployment workflow."
                  : `Merge only — deployment unavailable. ${deploymentReason}`}
              </p>
            )}
          </>
        )}

        {active && task.status !== "budget_paused" && (
          <p className="text-xs text-muted-foreground">
            The runner is working on this task. Logs above update automatically.
          </p>
        )}

        {task.status !== "merged" && task.status !== "deployed" && task.status !== "rejected" && (
          <div className="space-y-2 border-t border-border/60 pt-2">
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Ask for a revision — what exactly should change?"
              rows={2}
              className="bg-background/60"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                disabled={busy || feedback.trim().length < 4}
                onClick={async () => {
                  await onRevise(feedback.trim());
                  setFeedback("");
                }}
              >
                Ask for revisions
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => setConfirm("reject")}
              >
                <CircleSlash className="mr-1.5 h-4 w-4" /> Reject &amp; discard
              </Button>
            </div>
          </div>
        )}

        {(task.status === "merged" || task.status === "deployed" || task.status === "rejected") && (
          <p className="text-xs text-muted-foreground">
            {task.status === "rejected"
              ? "Rejected and archived. The full diff stays available above."
              : `Completed${task.approved_at ? ` ${new Date(task.approved_at).toLocaleString("en-US")}` : ""}.`}
          </p>
        )}
      </div>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => (!open ? setConfirm(null) : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "approve" ? "Approve this change?" : "Reject and discard this task?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "approve"
                ? `The verified commit ${task.commit_sha?.slice(0, 8)} is merged into the target branch${
                    deploymentAvailable
                      ? ", then the deployment workflow is dispatched"
                      : ". Deployment stays unavailable."
                  }. A checkpoint is recorded first.`
                : "The task branch is discarded and the task archived. The diff and logs are kept in history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirm === "reject" && (
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Why is this rejected? (optional, kept in the audit log)"
              rows={2}
            />
          )}
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            {confirm === "approve" ? (
              <Button
                disabled={busy}
                onClick={async () => {
                  setConfirm(null);
                  await onApprove();
                }}
              >
                Approve
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setConfirm(null);
                  await onReject(rejectReason);
                  setRejectReason("");
                }}
              >
                Reject &amp; discard
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
