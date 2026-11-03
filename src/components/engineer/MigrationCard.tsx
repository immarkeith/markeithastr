import { useState } from "react";
import { Check, Copy, Database, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  sql: string;
  approved: boolean;
  busy: boolean;
  onApprove: () => Promise<void>;
}

/**
 * Migration gate — independent of code approval, and never executed by ASTR.
 * The operator copies the SQL into the Supabase editor themselves.
 */
export function MigrationCard({ sql, approved, busy, onApprove }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
        <Database className="h-4 w-4" />
        Proposed migration
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            approved ? "bg-success/15 text-success" : "bg-amber-500/15 text-amber-300",
          )}
        >
          {approved ? "Approved" : "Not approved"}
        </span>
      </div>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-amber-200/80">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ASTR never runs schema changes. Approval only unlocks the merge; run the SQL yourself in the
        Supabase SQL editor. Destructive statements are rejected outright.
      </p>
      <pre className="mt-2 max-h-40 overflow-auto rounded border border-border bg-black/50 p-2 font-mono text-[10px] leading-relaxed text-foreground/80">
        {sql}
      </pre>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => void copy()} disabled={busy}>
          {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
          {copied ? "Copied" : "Copy SQL"}
        </Button>
        {!approved && (
          <Button size="sm" variant="outline" onClick={() => void onApprove()} disabled={busy}>
            Approve &amp; apply SQL
          </Button>
        )}
      </div>
    </div>
  );
}
