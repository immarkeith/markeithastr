import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { gateStatus, lockSite } from "@/lib/gate.functions";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ASTR — Daily Rotation Scanner" },
      {
        name: "description",
        content:
          "Wide-universe daily stock rotation scanner: factor scores, swing watchlist streaks and a settled-cash trade ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/unlock") || location.pathname.startsWith("/api/")) return;
    const gate = await gateStatus();
    if (!gate.unlocked) throw redirect({ to: "/unlock" });
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/lab", label: "Research Lab" },
  { to: "/lab", label: "Research Lab" },
  { to: "/analyze", label: "Analyze" },
  { to: "/trade-history", label: "Trade log" },
  { to: "/research-log", label: "Research log" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/strategy", label: "Strategy" },
  { to: "/notifications", label: "Alerts" },
  { to: "/settings", label: "Settings" },
] as const;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const lock = useServerFn(lockSite);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen grid-backdrop">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 pt-3">
            <div className="flex items-center justify-between gap-3">
              <Link to="/" className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold tracking-[0.18em] text-primary">ASTR</span>
                <span className="hidden text-[11px] uppercase tracking-widest text-muted-foreground sm:inline">
                  rotation desk
                </span>
              </Link>
              <button
                onClick={async () => {
                  await lock();
                  await router.navigate({ to: "/unlock" });
                }}
                className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                Lock
              </button>
            </div>
            <nav className="no-scrollbar -mx-1 mt-2 flex items-center gap-1 overflow-x-auto pb-2">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

