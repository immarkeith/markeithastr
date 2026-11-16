import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ChevronLeft, FlaskConical, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HealthPanel } from "@/components/engineer/HealthPanel";
import { ProviderSettings, type ProviderFormValues } from "@/components/engineer/ProviderSettings";
import { TaskComposer } from "@/components/engineer/TaskComposer";
import { ConversationList } from "@/components/engineer/ConversationList";
import { TaskThread } from "@/components/engineer/TaskThread";
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
  head: () => ({ meta: [
    { title: "Engineer Conversations — ASTR" },
    { name: "description", content: "ASTR code-work conversations, verified changes and approval queue." },
    { property: "og:title", content: "Engineer Conversations — ASTR" },
    { property: "og:description", content: "Review ASTR engineer conversations and verified change approvals." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EngineerMissionControl,
});

const PILOT_PROMPT =
  "Add a small build timestamp line under the Settings page heading that shows when the app bundle was built. Keep the existing layout and styling.";

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

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

  // On wider screens, keep the newest conversation open by default.
  useEffect(() => {
    if (selectedId || tasks.length === 0) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      setSelectedId(tasks[0]?.id ?? null);
    }
  }, [selectedId, tasks]);

  // Keep the thread pinned to the newest reply while it updates.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail.data?.task?.updated_at, detail.data?.logs?.length, selectedId]);

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

  const runnerDot =
    health?.runner_state === "active"
      ? "bg-primary"
      : health?.runner_state === "stalled"
        ? "bg-amber-400"
        : health?.runner_state === "idle"
          ? "bg-success"
          : "bg-muted-foreground";

  const submitPrompt = async (prompt: string) => {
    await run("Task queued", async () => {
      const result = await createTask({ data: { prompt } });
      if (result.ok && result.task) setSelectedId(result.task.id);
      return result;
    });
  };

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      {/* ---------------------------------------------------------- header */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {selectedId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setSelectedId(null)}
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            ASTR Engineer
            <span className={cn("h-2 w-2 rounded-full", runnerDot)} aria-hidden />
          </p>
          <p className="text-[11px] text-muted-foreground">
            {health
              ? `${health.runner_state} · ${health.queued} queued · ${health.review_ready} to review · $${health.spend_this_month_usd.toFixed(2)} this month`
              : "Checking status…"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSettingsOpen(true)}
          aria-label="Engineer settings and health"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {capabilities && !capabilities.schema_installed && (
        <div className="mt-2 flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-200">
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

      {/* ------------------------------------------- conversations + thread */}
      <div className="min-h-0 flex-1 md:grid md:grid-cols-[320px_1fr] md:gap-3">
        <div
          className={cn(
            "overflow-y-auto rounded-xl border border-border bg-card/40",
            selectedId ? "hidden md:block" : "block",
          )}
        >
          <ConversationList
            tasks={tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            loading={overview.isLoading}
          />
        </div>

        <div
          className={cn(
            "overflow-y-auto rounded-xl border border-border bg-card/20",
            selectedId ? "block" : "hidden md:block",
          )}
        >
          {selectedTask ? (
            <>
              {detail.isLoading && (
                <p className="px-3 pt-3 text-xs text-muted-foreground">Loading conversation…</p>
              )}
              <TaskThread
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
                  run("Revision requested", () =>
                    revise({ data: { id: selectedTask.id, feedback } }),
                  )
                }
                onReject={(reason) =>
                  run("Task rejected", () => reject({ data: { id: selectedTask.id, reason } }))
                }
                onApproveMigration={() =>
                  run("Migration approved", () =>
                    approveMigration({ data: { id: selectedTask.id } }),
                  )
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
              <div ref={threadEndRef} />
            </>
          ) : (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              Pick a conversation, or send a new instruction below.
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------- pinned composer */}
      <div className="sticky bottom-0 z-10 -mx-1 bg-background/95 px-1 pb-1 pt-2 backdrop-blur">
        <TaskComposer
          pending={pending}
          disabled={!capabilities?.schema_installed}
          onSubmit={submitPrompt}
        />
      </div>

      {/* -------------------------------------------------- settings sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Engineer settings &amp; health</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            <Button
              variant="secondary"
              size="sm"
              disabled={pending || !capabilities?.schema_installed}
              onClick={async () => {
                setSettingsOpen(false);
                await run("Pilot task queued", () => createTask({ data: { prompt: PILOT_PROMPT } }));
              }}
            >
              <FlaskConical className="mr-1.5 h-3.5 w-3.5" /> Queue the safe pilot task
            </Button>
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
