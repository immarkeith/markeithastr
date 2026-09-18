import { Info, X } from "lucide-react";
import { useState } from "react";

/**
 * A small ⓘ next to a label. Only used where a term could genuinely be
 * misread — obvious labels stay bare. Opens a short pop-up with an X to close.
 */
export function InfoDot({ title, children }: { title: string; children: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`What is ${title}?`}
        onClick={() => setOpen(true)}
        className="inline-flex align-middle text-muted-foreground/70 transition-colors hover:text-primary"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-xs rounded-md border border-border bg-card p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pr-6 text-sm font-semibold">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{children}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
