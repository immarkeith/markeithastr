import { useEffect, useState } from "react";

import { marketStatus, type MarketStatus } from "@/lib/market-calendar";

const toneFor = (status: MarketStatus) => {
  switch (status.state) {
    case "open":
      return "text-success";
    case "closing":
    case "pre-open":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
};

export function MarketStatusBar({ paperMode }: { paperMode?: boolean }) {
  const [status, setStatus] = useState<MarketStatus>(() => marketStatus());

  useEffect(() => {
    const id = setInterval(() => setStatus(marketStatus()), 30_000);
    return () => clearInterval(id);
  }, []);

  // The same strip twice, so the crawl loops right-to-left without jumping back.
  const strip = (
    <div className="flex shrink-0 items-center gap-6 whitespace-nowrap px-3">
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
        <span className="rounded-sm border border-current/40 px-2 py-0.5 font-semibold uppercase tracking-widest">
          Simulation only — no orders sent
        </span>
      ) : null}
    </div>
  );

  return (
    <div className={`overflow-hidden py-1 text-xs ${toneFor(status)}`}>
      <div className="market-ticker flex w-max items-center">
        {strip}
        <span aria-hidden="true" className="contents">
          {strip}
        </span>
      </div>
    </div>
  );
}
