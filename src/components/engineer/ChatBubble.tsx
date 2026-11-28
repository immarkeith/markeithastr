import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { LocalTimestamp } from '@/components/LocalTimestamp';

interface ChatBubbleProps {
  /** "out" = the operator's message (right), "in" = ASTR's reply (left). */
  direction: "in" | "out";
  children: ReactNode;
  /** Small label above the bubble, e.g. "ASTR Engineer". */
  sender?: string;
  timestamp?: string | null;
  className?: string;
}

/**
 * iMessage-style bubble shell. Outgoing messages use the primary accent,
 * incoming ones use the card surface. Colors come from semantic tokens only.
 */
export function ChatBubble({ direction, sender, timestamp, children, className }: ChatBubbleProps) {
  const outgoing = direction === "out";
  return (
    <div className={cn("flex w-full", outgoing ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] sm:max-w-[75%]", outgoing && "items-end")}>
        {sender && (
          <p
            className={cn(
              "mb-0.5 px-1 text-[10px] font-medium text-muted-foreground",
              outgoing && "text-right",
            )}
          >
            {sender}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
            outgoing
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card text-foreground",
            className,
          )}
        >
          {children}
        </div>
        {timestamp && (
          <p
            className={cn(
              "mt-0.5 px-1 text-[10px] text-muted-foreground",
              outgoing && "text-right",
            )}
          >
            <LocalTimestamp value={timestamp} />
          </p>
        )}
      </div>
    </div>
  );
}

/** Thin centered divider between days, like messaging apps show. */
export function ChatDayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
