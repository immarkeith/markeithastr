import { useEffect, useRef } from "react";
import { ChevronDown, Terminal } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { EngineerLogRow } from "@/lib/engineer/types";

interface Props {
  logs: EngineerLogRow[];
  live?: boolean;
}

/** Streaming runner log, formatted as monospace terminal output. */
export function LogTerminal({ logs, live }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (live) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs.length, live]);

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Terminal className="h-4 w-4" />
          Execution log
          {live && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              live
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {logs.length}
          <ChevronDown className="h-4 w-4" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border bg-black/50 p-3 font-mono text-[11px] leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No log lines yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  log.level === "error" && "text-rose-300",
                  log.level === "warn" && "text-amber-300",
                  log.level === "info" && "text-emerald-200/90",
                )}
              >
                <span className="text-muted-foreground">
                  {new Date(log.created_at).toLocaleTimeString("en-US", { hour12: false })}{" "}
                </span>
                <span className="text-primary/80">[{log.step_name}]</span> {log.log_text}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
