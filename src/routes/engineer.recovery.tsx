import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, History, RotateCcw, ShieldCheck, Tag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { EngineerCheckpointRow } from "@/lib/engineer/types";
import {
  engineerCreateCheckpoint,
  engineerRecoverCode,
  engineerRecoveryData,
} from "@/lib/engineer/engineer.functions";

export const Route = createFileRoute("/engineer/recovery")({
  component: EngineerRecoveryPage,
});

function EngineerRecoveryPage() {
  const queryClient = useQueryClient();
  const load = useServerFn(engineerRecoveryData);
  const createCheckpoint = useServerFn(engineerCreateCheckpoint);
  const recover = useServerFn(engineerRecoverCode);

  const { data, isLoading } = useQuery({
    queryKey: ["engineer-recovery"],
    queryFn: () => load(),
  });

  const [summary, setSummary] = useState("");
  const [target, setTarget] = useState<EngineerCheckpointRow | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["engineer-recovery"] });

  const create = useMutation({
    mutationFn: async () => createCheckpoint({ data: { summary, files: [] } }),
    onSuccess: async (result) => {
      if (!result.ok) toast.error(result.error ?? "Checkpoint failed");
      else toast.success(result.note ?? "Checkpoint recorded");
      setSummary("");
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Checkpoint failed"),
  });

  const restore = useMutation({
    mutationFn: async (checkpoint: EngineerCheckpointRow) =>
      recover({
        data: { checkpoint_id: checkpoint.id, files: checkpoint.files_affected, confirmation },
      }),
    onSuccess: async (result) => {
      if (result.ok) toast.success(result.note ?? "Code recovered");
      else toast.error(result.error ?? "Recovery stopped");
      if (result.restored?.length) {
        for (const entry of result.restored) {
          toast.message(`${entry.path}: ${entry.detail}`);
        }
      }
      setTarget(null);
      setConfirmation("");
      await invalidate();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Recovery failed"),
  });

  const checkpoints = data?.checkpoints ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> Code-only recovery
        </p>
        <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
          <li>
            • Recovery restores repository code as a new forward commit — history is never
            rewritten.
          </li>
          <li>
            • It never runs SQL. Migrations, schema changes and any database state are out of scope.
          </li>
          <li>• Historical market data, trades and research records are never touched.</li>
          <li>
            • Live trading code, workflows and the engineer&apos;s own security gates require human
            intervention.
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-sm font-medium text-foreground">Record a checkpoint</p>
        <p className="mb-2 text-[11px] text-muted-foreground">
          Tags the current head of the target branch so you can return to it later. Do this before
          any risky work.
        </p>
        <Label htmlFor="cp-summary" className="text-xs">
          Summary
        </Label>
        <Input
          id="cp-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="e.g. Before the research-lab layout change"
        />
        <Button
          className="mt-2 w-full"
          size="sm"
          disabled={pending || summary.trim().length < 4 || create.isPending}
          onClick={() => {
            setPending(true);
            create.mutate(undefined, { onSettled: () => setPending(false) });
          }}
        >
          <Tag className="mr-1.5 h-4 w-4" /> Create checkpoint
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Checkpoints</p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading checkpoints…</p>
        ) : checkpoints.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            No checkpoints yet. A checkpoint is recorded automatically after every approved merge.
          </p>
        ) : (
          <ul className="space-y-2">
            {checkpoints.map((checkpoint) => (
              <li key={checkpoint.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-foreground">
                    {checkpoint.git_tag}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {checkpoint.git_sha.slice(0, 10)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px]",
                      checkpoint.verified
                        ? "bg-success/15 text-success"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {checkpoint.verified ? "verified" : checkpoint.trigger}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(checkpoint.created_at).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-foreground">{checkpoint.summary}</p>
                <p className="text-[10px] text-muted-foreground">
                  {checkpoint.files_affected.length} file(s) recorded
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={checkpoint.files_affected.length === 0}
                  onClick={() => {
                    setTarget(checkpoint);
                    setConfirmation("");
                  }}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore these files
                </Button>
                {checkpoint.files_affected.length === 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Nothing to restore: this checkpoint lists no files.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Change history</p>
        {(data?.changes ?? []).length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
            No recorded changes yet.
          </p>
        ) : (
          <ul className="space-y-1 rounded-xl border border-border bg-card p-3 text-[11px]">
            {(data?.changes ?? []).map((change) => (
              <li key={change.id} className="flex gap-2 text-muted-foreground">
                <History className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="min-w-0">
                  <span className="font-mono text-foreground/80">{change.file_path}</span> —{" "}
                  {change.operation}
                  {change.note ? ` · ${change.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 text-amber-300" /> Restore{" "}
              {target.files_affected.length} file(s)
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Each file is written back as a new commit on the target branch using its content at{" "}
              <span className="font-mono">{target.git_tag}</span>. No SQL, no data, no history
              rewrite.
            </p>
            <ul className="mt-2 max-h-32 overflow-auto rounded border border-border bg-black/40 p-2 font-mono text-[10px] text-muted-foreground">
              {target.files_affected.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
            <Label htmlFor="recover-confirm" className="mt-3 block text-xs">
              Type {data?.confirmation_phrase ?? "RESTORE CODE"} to confirm
            </Label>
            <Input
              id="recover-confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={data?.confirmation_phrase ?? "RESTORE CODE"}
              className="font-mono"
            />
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={
                  restore.isPending ||
                  confirmation.trim().toUpperCase() !==
                    (data?.confirmation_phrase ?? "RESTORE CODE")
                }
                onClick={() => restore.mutate(target)}
              >
                Recover code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
