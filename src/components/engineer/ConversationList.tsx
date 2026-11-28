import { cn } from "@/lib/utils";
import { LocalTimestamp } from '@/components/LocalTimestamp';
import { ACTIVE_STATUSES, type EngineerTask, type EngineerTaskStatus } from "@/lib/engineer/types";

export const STATUS_TONE: Record<string, string> = {
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

/** Statuses where the ball is in the operator's court — shown as "unread". */
const NEEDS_YOU: EngineerTaskStatus[] = ["review_ready", "scope_review", "budget_paused"];

function previewLine(task: EngineerTask): string {
  switch (task.status) {
    case "review_ready":
      return "Ready for your review";
    case "scope_review":
      return "Needs your scope authorization";
    case "budget_paused":
      return "Paused at its spend limit";
    case "merged":
      return "Merged into the target branch";
    case "deployed":
      return "Deployed";
    case "rejected":
      return "Rejected and archived";
    case "failed":
      return "Failed — tap to see why";
    default:
      return ACTIVE_STATUSES.includes(task.status) ? "Working on it…" : task.prompt;
  }
}

interface ConversationListProps {
  tasks: EngineerTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

/**
 * iMessage-style conversation list: one row per engineering task, newest
 * first. Tasks waiting on the operator get an unread-style dot and bolder text.
 */
export function ConversationList({ tasks, selectedId, onSelect, loading }: ConversationListProps) {
  if (loading) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</p>;
  }
  if (tasks.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-muted-foreground">
        No conversations yet. Send your first instruction below — ASTR will reply here as it works.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/60">
      {tasks.map((task) => {
        const needsYou = NEEDS_YOU.includes(task.status);
        const selected = task.id === selectedId;
        return (
          <li key={task.id}>
            <button
              type="button"
              onClick={() => onSelect(task.id)}
              className={cn(
                "flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors",
                selected ? "bg-primary/10" : "hover:bg-secondary/40",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  needsYou ? "bg-primary" : "bg-transparent",
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      needsYou ? "font-semibold text-foreground" : "font-medium text-foreground",
                    )}
                  >
                    {task.prompt}
                  </span>
                  <span className="min-w-0 max-w-[45%] text-right text-[10px] text-muted-foreground">
                    <LocalTimestamp value={task.updated_at} />
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
                      STATUS_TONE[task.status] ?? "bg-secondary text-foreground",
                    )}
                  >
                    {task.status.replace(/_/g, " ")}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {previewLine(task)}
                  </span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
