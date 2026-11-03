import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, FlaskConical, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { HealthPanel } from "@/components/engineer/HealthPanel";
import { ProviderSettings, type ProviderFormValues } from "@/components/engineer/ProviderSettings";
import { TaskComposer } from "@/components/engineer/TaskComposer";
import { TaskDetail } from "@/components/engineer/TaskDetail";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES, type EngineerTask } from "@/lib/engineer/types";
import {
  engineerApproveMigration,
  engineerApproveTask,
  engineerAuthorizeScope,
  engineerCreateTask,
  engineerOverview,
  engineerRefreshDeployment,
  engineerRejectTask,
  engineerRequestRevision,
  engineerResumeBudget,
  engineerRunHealth,
  engineerSaveProvider,
  engineerTaskDetail,
  engineerTestProvider,
} from "@/lib/engineer/engineer.functions";

export const Route = createFileRoute("/engineer/")({
  component: EngineerMissionControl,
});

const PILOT_PROMPT =
  "Add a small build timestamp line under the Settings page heading that shows when the app bundle was built. Keep the existing layout and styling.";

const STATUS_TONE: Record<string, string> = {
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

function EngineerMissionControl() {
  const queryClient = useQueryClient();
  const loadOverview = useServerFn(engineerOverview);
  const loadDetail = useServerFn(engineerTaskDetail);
  const createTask = useServerFn(engineerCreateTask);
  const authorize = useServerFn(engineerAuthorizeScope);
  const revise = useServerFn(engineerRequestRevision);
  const reject = useServerFn(engineerRejectTask);
  const approve = useServerFn(engineerApproveTask);
  const approveMigration = useServerFn(engineerApproveMigration);
  const resumeBudget = useServerFn(engineerResumeBudget);
  const refreshDeployment = useServerFn(engineerRefreshDeployment);
  const saveProvider = useServerFn(engineerSaveProvider);
  const testProvider = useServerFn(engineerTestProvider);
  const runHealth = useServerFn(engineerRunHealth);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const overview = useQuery({
    queryKey: ["engineer-overview"],
    queryFn: () => loadOverview(),
    refetchInterval: 10_000,
  });

  const tasks: EngineerTask[] = useMemo(() => overview.data?.tasks ?? [], [overview.data?.tasks]);
  const hasActive = tasks.some((task) => ACTIVE_STATUSES.includes(task.status));

  const detail = useQuery({
    queryKey: ["engineer-task", selectedId],
    queryFn: () => loadDetail({ data: { id: selectedId as string } }),
    enabled: Boolean(selectedId),
    refetchInterval: hasActive ? 3_000 : 15_000,
  });

  useEffect(() => {
    if (!selectedId && tasks.length > 0) setSelectedId(tasks[0]?.id ?? null);
  }, [selectedId, tasks]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["engineer-overview"] });
    if (selectedId)
      await queryClient.invalidateQueries({ queryKey: ["engineer-task", selectedId] });
  };

  const [pending, setPending] = useState(false);

  const run = async (
    label: string,
    action: () => Promise<{ ok?: boolean; error?: string; note?: string } | void>,
  ) => {
    setPending(true);
    try {
      const result = await action();
      if (result && result.ok === false) toast.error(result.error ?? `${label} failed`);
      else toast.success((result && "note" in result && result.note) || `${label} done`);
      await invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} failed`);
    } finally {
      setPending(false);
    }
  };

  const health = overview.data?.health;
  const capabilities = overview.data?.capabilities;
  const selectedTask = detail.data?.task ?? tasks.find((task) => task.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------- status bar */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Runner</p>
          <p
            className={cn(
              "font-semibold capitalize",
              health?.runner_state === "active" && "text-primary",
              health?.runner_state === "stalled" && "text-amber-300",
              health?.runner_state === "idle" && "text-success",
            )}
          >
            {health?.runner_state ?? "unknown"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Queue</p>
          <p className="font-semibold text-foreground">
            {health?.queued ?? 0} queued · {health?.review_ready ?? 0} review
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Actions minutes</p>
          <p className="font-semibold text-foreground">
            {(health?.minutes_this_month ?? 0).toFixed(0)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Spend (month)</p>
          <p className="font-semibold text-foreground">
            ${(health?.spend_this_month_usd ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {capabilities && !capabilities.schema_installed && (
        <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            The Phase K schema is not installed, so the queue is disabled. Run{" "}
            <span className="font-mono text-[11px]">
              supabase/migrations/20261103010000_engineer_phase_k.sql
            </span>{" "}
            in the Supabase SQL editor once, then reload this page.
          </p>
        </div>
      )}

      {/* ----------------------------------------------------------- composer */}
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium text-foreground">New engineering task</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Type or speak the change. ASTR inspects this repository, classifies the work and drafts it
          on its own branch — nothing reaches the target branch without your approval.
        </p>
        <TaskComposer
          pending={pending}
          disabled={!capabilities?.schema_installed}
          onSubmit={async (prompt) => {
            await run("Task queued", async () => {
              const result = await createTask({ data: { prompt } });
              if (result.ok && result.task) setSelectedId(result.task.id);
              return result;
            });
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 px-0 text-[11px] text-muted-foreground"
          disabled={pending || !capabilities?.schema_installed}
          onClick={async () => {
            await run("Pilot task queued", async () => {
              const result = await createTask({ data: { prompt: PILOT_PROMPT } });
              if (result.ok && result.task) setSelectedId(result.task.id);
              return result;
            });
          }}
        >
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" /> Queue the safe pilot task instead
        </Button>
      </div>

      {/* ------------------------------------------------------------- panels */}
      {health && (
        <HealthPanel
          health={health}
          busy={pending}
          onRun={async () => {
            await run("Health check", async () => {
              await runHealth();
              await invalidate();
              return { ok: true, note: "Health check complete" };
            });
          }}
        />
      )}

      <ProviderSettings
        settings={overview.data?.settings ?? null}
        busy={pending}
        onSave={async (values: ProviderFormValues) => {
          await run("Settings saved", async () => {
            const result = await saveProvider({ data: values });
            return result;
          });
        }}
        onTest={async () => {
          await run("Provider test", async () => {
            const result = await testProvider();
            return {
              ok: result.ok,
              note: result.detail,
              ...(result.ok ? {} : { error: result.detail }),
            };
          });
        }}
      />

      {/* -------------------------------------------------------- task history */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Tasks</p>
        {overview.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            No engineering tasks yet. Queue one above — or start with the pilot task to prove the
            whole loop.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(task.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    task.id === selectedId
                      ? "border-primary/50 bg-primary/5"
                      : "border-border bg-card hover:bg-secondary/40",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      STATUS_TONE[task.status] ?? "bg-secondary text-foreground",
                    )}
                  >
                    {task.status.replace(/_/g, " ")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs text-foreground">{task.prompt}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {task.classification_label ?? "unclassified"} ·{" "}
                      {new Date(task.created_at).toLocaleString("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTask && (
        <div>
          {detail.isLoading && (
            <p className="mb-2 text-xs text-muted-foreground">Loading task detail…</p>
          )}
          <TaskDetail
            task={detail.data?.task ?? selectedTask}
            logs={detail.data?.logs ?? []}
            deploymentAvailable={capabilities?.deployment_available ?? false}
            deploymentReason={capabilities?.deployment_reason ?? "Deployment is not configured."}
            busy={pending}
            onAuthorize={() =>
              run("Scope authorized", () => authorize({ data: { id: selectedTask.id } }))
            }
            onApprove={() => run("Approved", () => approve({ data: { id: selectedTask.id } }))}
            onRevise={(feedback) =>
              run("Revision requested", () => revise({ data: { id: selectedTask.id, feedback } }))
            }
            onReject={(reason) =>
              run("Task rejected", () => reject({ data: { id: selectedTask.id, reason } }))
            }
            onApproveMigration={() =>
              run("Migration approved", () => approveMigration({ data: { id: selectedTask.id } }))
            }
            onResumeBudget={() =>
              run("Budget approved", () => resumeBudget({ data: { id: selectedTask.id } }))
            }
            onRefreshDeployment={() =>
              run("Deployment re-checked", async () => {
                const result = await refreshDeployment({ data: { id: selectedTask.id } });
                return { ok: true, note: `${result.status}: ${result.note}` };
              })
            }
          />
        </div>
      )}
    </div>
  );
}
