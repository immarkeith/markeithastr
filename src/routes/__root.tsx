import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import { ScrollToTop } from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { gateStatus, lockSite } from "@/lib/gate.functions";

import { ASTR_IMAGE } from "@/lib/brand";
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

function ErrorComponent({ error, reset }: ErrorComponentProps) {
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
      { rel: "icon", href: "/favicon.png", type: "image/png" },
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
  { to: "/analyze", label: "Analyze Strategy" },
  { to: "/audit", label: "Audit Desk" },
  { to: "/scoreboard", label: "Scoreboard" },
  { to: "/trade-history", label: "Trade Log" },
  { to: "/notifications", label: "Alerts" },
  { to: "/settings", label: "Settings" },
] as const;


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const lock = useServerFn(lockSite);
  // The passcode screen uses the ASTR picture as its own full-page background,
  // so it does not get the banner header on top of it.
  const onUnlock = useRouterState({
    select: (s) => s.location.pathname.startsWith("/unlock"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen grid-backdrop">
        {/* Full-width brand banner at the top of the PAGE: it scrolls away with
            the content instead of being pinned to the screen. */}
        {!onUnlock && (
        <header className="relative z-30 -mt-px w-full border-b border-border/70">
          <div className="relative h-32 w-full overflow-hidden sm:h-44">
            <img
              src={ASTR_IMAGE}
              alt="ASTR"
              className="absolute inset-0 h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open navigation"
                  className="absolute left-2 top-2 z-10 text-foreground hover:bg-background/40"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader><SheetTitle>ASTR</SheetTitle></SheetHeader>
                <nav className="mt-8 grid gap-1">
                  {NAV.map((item) => (
                    <SheetClose asChild key={item.to}>
                      <Link to={item.to} activeOptions={{ exact: item.to === "/" }} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground">
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                  <Button variant="outline" className="mt-6 w-full" onClick={async () => { await lock(); await router.navigate({ to: "/unlock" }); }}>Lock</Button>
                </nav>
              </SheetContent>
            </Sheet>
            {/* The whole stretched picture is the home link. */}
            <Link to="/" aria-label="Home" className="absolute inset-0 block" />
          </div>
        </header>
        )}
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <main className={onUnlock ? "" : "mx-auto max-w-6xl px-4 pb-16 pt-6"}>
          <Outlet />
        </main>
        {!onUnlock && <ScrollToTop />}
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

