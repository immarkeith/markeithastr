import { ChevronDown, FileDiff } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props {
  diff: string | null;
  stats?: { files?: number; additions?: number; deletions?: number } | null;
  files?: string[];
}

interface Row {
  kind: "add" | "del" | "meta" | "context";
  text: string;
}

function parse(diff: string): Row[] {
  return diff.split("\n").map((line) => {
    if (line.startsWith("+++") || line.startsWith("---")) return { kind: "meta", text: line };
    if (line.startsWith("@@") || line.startsWith("diff --git") || line.startsWith("index "))
      return { kind: "meta", text: line };
    if (line.startsWith("+")) return { kind: "add", text: line };
    if (line.startsWith("-")) return { kind: "del", text: line };
    return { kind: "context", text: line };
  });
}

/** Mobile-readable red/green diff. Line counts are always visible. */
export function DiffViewer({ diff, stats, files }: Props) {
  const rows = diff ? parse(diff) : [];
  const additions = stats?.additions ?? rows.filter((row) => row.kind === "add").length;
  const deletions = stats?.deletions ?? rows.filter((row) => row.kind === "del").length;

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <FileDiff className="h-4 w-4" />
          Proposed diff
        </span>
        <span className="flex items-center gap-2 text-xs">
          <span className="font-mono text-emerald-400">+{additions}</span>
          <span className="font-mono text-rose-400">−{deletions}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          {(files ?? []).length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {(files ?? []).map((file) => (
                <li
                  key={file}
                  className="rounded border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {file}
                </li>
              ))}
            </ul>
          )}
          <div className="max-h-96 overflow-auto rounded-md border border-border bg-black/50 font-mono text-[11px]">
            {rows.length === 0 ? (
              <p className="p-3 text-muted-foreground">No diff recorded for this task.</p>
            ) : (
              rows.map((row, index) => (
                <div
                  key={index}
                  className={cn(
                    "whitespace-pre-wrap break-all border-l-2 px-2 py-0.5",
                    row.kind === "add" &&
                      "border-emerald-500/60 bg-emerald-950/40 text-emerald-300",
                    row.kind === "del" && "border-rose-500/60 bg-rose-950/40 text-rose-300",
                    row.kind === "meta" &&
                      "border-transparent bg-secondary/40 text-muted-foreground",
                    row.kind === "context" && "border-transparent text-foreground/70",
                  )}
                >
                  {row.text || " "}
                </div>
              ))
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
