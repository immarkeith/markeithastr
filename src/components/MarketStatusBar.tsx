import { useEffect, useState } from "react";

import { marketStatus, type MarketStatus } from "@/lib/market-calendar";

const toneFor = (status: MarketStatus) => {
  switch (status.state) {
    case "open":
      return "border-success/50 bg-success/10 text-success";
    case "closing":
      return "border-primary/50 bg-primary/10 text-primary";
    case "pre-open":
      return "border-primary/40 bg-primary/5 text-primary";
    default:
      return "border-border bg-secondary/40 text-muted-foreground";
  }
};

export function MarketStatusBar({ paperMode }: { paperMode?: boolean }) {
  const [status, setStatus] = useState<MarketStatus>(() => marketStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(marketStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-xs ${toneFor(status)}`}
    >
      <span className="flex items-center gap-2 font-semibold uppercase tracking-widest">
        <span
          className={`h-2 w-2 rounded-full ${
            status.state === "open" || status.state === "closing"
              ? "animate-pulse bg-current"
              : "bg-current opacity-50"
          }`}
        />
        Market {status.label}
      </span>
      <span className="text-muted-foreground">
        {status.nyDate} · {status.nyTime}
      </span>
      <span className="text-muted-foreground">{status.detail}</span>
      {paperMode ? (
        <span className="ml-auto rounded-sm border border-current/40 px-2 py-0.5 font-semibold uppercase tracking-widest">
          Simulation only — no orders sent
        </span>
      ) : null}
    </div>
  );
}
