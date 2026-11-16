import { useMemo, useState } from "react";
import { CircleSlash, Coins, Rocket, UserCheck } from "lucide-react";

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
import { ACTIVE_STATUSES, type EngineerTask } from "@/lib/engineer/types";

interface TaskActionsProps {
  task: EngineerTask;
  deploymentAvailable: boolean;
  deploymentReason: string;
  busy: boolean;
  onAuthorize: () => Promise<void>;
  onApprove: () => Promise<void>;
  onRevise: (feedback: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onResumeBudget: () => Promise<void>;
}

/**
 * Quick-reply action row that hangs under the Engineer's latest bubble:
 * authorize scope, approve & merge, ask for revisions, reject, resume budget.
 */
export function TaskActions({
  task,
  deploymentAvailable,
  deploymentReason,
  busy,
  onAuthorize,
  onApprove,
  onRevise,
  onReject,
  onResumeBudget,
}: TaskActionsProps) {
  const [feedback, setFeedback] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [confirm, setConfirm] = useState<"approve" | "reject" | null>(null);

  const active = ACTIVE_STATUSES.includes(task.status) || task.status === "budget_paused";

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

  const settled =
    task.status === "merged" || task.status === "deployed" || task.status === "rejected";

  return (
    <div className="space-y-2 pl-1">
      {task.status === "scope_review" && (
        <>
          <p className="text-xs text-muted-foreground">
            This task needs your authorization before the runner may implement it.
          </p>
          <Button size="sm" onClick={() => void onAuthorize()} disabled={busy}>
            <UserCheck className="mr-1.5 h-4 w-4" /> Authorize this scope
          </Button>
        </>
      )}

      {task.status === "budget_paused" && (
        <>
          <p className="text-xs text-amber-200">
            Paused at its configured spend limit. Approve more budget to continue.
          </p>
          <Button size="sm" onClick={() => void onResumeBudget()} disabled={busy}>
            <Coins className="mr-1.5 h-4 w-4" /> Approve spend &amp; requeue
          </Button>
        </>
      )}

      {task.status === "review_ready" && (
        <>
          <Button
            size="sm"
            onClick={() => setConfirm("approve")}
            disabled={busy || blocking.length > 0}
          >
            <Rocket className="mr-1.5 h-4 w-4" />
            Approve &amp; {deploymentAvailable ? "Deploy" : "Merge"}
          </Button>
          {blocking.length > 0 ? (
            <p className="text-[11px] text-amber-300">Blocked: {blocking.join(" · ")}</p>
          ) : (
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
          ASTR is working on this — new replies appear automatically.
        </p>
      )}

      {!settled && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Ask for a revision…"
            aria-label="Revision feedback"
            className="h-9 min-w-0 flex-1 rounded-full border border-border bg-background/60 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || feedback.trim().length < 4}
            onClick={async () => {
              await onRevise(feedback.trim());
              setFeedback("");
            }}
          >
            Send
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            disabled={busy}
            onClick={() => setConfirm("reject")}
          >
            <CircleSlash className="mr-1.5 h-4 w-4" /> Reject
          </Button>
        </div>
      )}

      {settled && (
        <p className="text-xs text-muted-foreground">
          {task.status === "rejected"
            ? "Rejected and archived. The diff stays in the thread above."
            : `Completed${task.approved_at ? ` ${new Date(task.approved_at).toLocaleString("en-US")}` : ""}.`}
        </p>
      )}

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
