import { Check, Circle, MinusCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { STEPPER_STEPS, statusRank, type EngineerTaskStatus } from "@/lib/engineer/types";

interface Props {
  status: EngineerTaskStatus;
  className?: string;
}

/** Queued → Planning → Inspecting → Patching → Compiling → Review. */
export function ExecutionStepper({ status, className }: Props) {
  const rank = statusRank(status);
  const failed = status === "failed" || status === "rejected";

  return (
    <ol className={cn("flex items-start gap-1 overflow-x-auto no-scrollbar", className)}>
      {STEPPER_STEPS.map((step, index) => {
        const done = !failed && rank > index;
        const current = !failed && rank === index;
        return (
          <li
            key={step.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[10px]",
                done && "border-success/60 bg-success/15 text-success",
                current && "border-primary bg-primary/15 text-primary",
                !done && !current && "border-border text-muted-foreground",
                failed &&
                  index === rank &&
                  "border-destructive/60 bg-destructive/15 text-destructive",
              )}
              aria-hidden
            >
              {done ? (
                <Check className="h-3.5 w-3.5" />
              ) : failed && index === rank ? (
                <MinusCircle className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-2 w-2" />
              )}
            </span>
            <span
              className={cn(
                "text-[10px] leading-tight",
                current ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
