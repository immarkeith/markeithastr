import { Activity, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { EngineerHealthSnapshot } from "@/lib/engineer/types";

interface Props {
  health: EngineerHealthSnapshot;
  busy: boolean;
  onRun: () => Promise<void>;
}

const STATE_STYLES: Record<string, string> = {
  ok: "text-success",
  warn: "text-amber-300",
  fail: "text-rose-300",
  escalated: "text-rose-300",
};

export function HealthPanel({ health, busy, onRun }: Props) {
  const issues = health.components.filter((component) => component.state !== "ok").length;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground">
        <span className="flex items-center gap-2">
          <Activity className="h-4 w-4" /> Engineer health
        </span>
        <span className={cn("text-[11px]", issues > 0 ? "text-amber-300" : "text-success")}>
          {issues > 0 ? `${issues} issue${issues === 1 ? "" : "s"}` : "all clear"}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-3">
          <ul className="space-y-1.5 text-xs">
            {health.components.map((component) => (
              <li key={component.component} className="flex gap-2">
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    component.state === "ok"
                      ? "bg-success"
                      : component.state === "warn"
                        ? "bg-amber-400"
                        : "bg-rose-400",
                  )}
                />
                <span className="min-w-0">
                  <span className="font-medium capitalize text-foreground">
                    {component.component.replace(/_/g, " ")}
                  </span>
                  <span
                    className={cn(
                      "block",
                      STATE_STYLES[component.state] ?? "text-muted-foreground",
                    )}
                  >
                    {component.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {health.events.length > 0 && (
            <div className="border-t border-border/60 pt-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Recent events
              </p>
              <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                {health.events.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    <span className="text-foreground/80">{event.component}</span> · {event.state}
                    {event.repaired ? " · repaired" : ""} — {event.repair_note ?? event.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onRun()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Run health check
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Safe repairs only (requeue a stalled lease). Credential, trading, data-integrity and
            deployment issues are escalated for you, never auto-fixed.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
