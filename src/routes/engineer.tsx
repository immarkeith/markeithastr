import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { Bot, History } from "lucide-react";

export const Route = createFileRoute("/engineer")({
  head: () => ({
    meta: [
      { title: "AI Engineer — ASTR" },
      {
        name: "description",
        content:
          "Mobile mission control for ASTR's self-development engineer: queue a task, watch it plan, patch and verify, then approve the verified commit.",
      },
      { property: "og:title", content: "AI Engineer — ASTR" },
      {
        property: "og:description",
        content: "Self-development engineer with a live trading firewall and human approval.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EngineerLayout,
});

function EngineerLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onRecovery = pathname.startsWith("/engineer/recovery");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">AI Engineer</h1>
        </div>
        <nav className="ml-auto flex gap-1 rounded-full border border-border bg-card p-0.5 text-xs">
          <Link
            to="/engineer"
            activeOptions={{ exact: true }}
            className={`rounded-full px-3 py-1 transition-colors ${
              onRecovery ? "text-muted-foreground" : "bg-secondary text-foreground"
            }`}
          >
            Mission control
          </Link>
          <Link
            to="/engineer/recovery"
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
              onRecovery ? "bg-secondary text-foreground" : "text-muted-foreground"
            }`}
          >
            <History className="h-3 w-3" /> Recovery
          </Link>
        </nav>
      </div>
      <Outlet />
    </div>
  );
}
