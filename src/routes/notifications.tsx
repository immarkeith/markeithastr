import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { notificationsQuery, themeSignalsQuery } from "@/lib/queries";
import {
  getPushKey,
  markNotificationsRead,
  refreshInsights,
  removePushDevice,
  savePushDevice,
  sendTestPush,
} from "@/lib/scan.functions";
import { isStandalone, pushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push-client";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts & suggestions — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content:
          "Push alerts and suggestions: 1-day buy candidates, longer-term hold ideas and group rotations to avoid or chase.",
      },
      { property: "og:title", content: "Alerts & suggestions — ASTR" },
      {
        property: "og:description",
        content: "1-day buys, hold ideas and sector rotations, pushed to your phone.",
      },
    ],
  }),
  component: NotificationsPage,
});

const SEVERITY: Record<string, string> = {
  good: "border-success/40 bg-success/5",
  bad: "border-destructive/40 bg-destructive/5",
  warn: "border-primary/40 bg-primary/5",
  info: "border-border bg-card",
};

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: feed } = useQuery(notificationsQuery);
  const { data: themes } = useQuery(themeSignalsQuery);
  const keyFn = useServerFn(getPushKey);
  const saveDevice = useServerFn(savePushDevice);
  const dropDevice = useServerFn(removePushDevice);
  const testPush = useServerFn(sendTestPush);
  const markRead = useServerFn(markNotificationsRead);
  const refresh = useServerFn(refreshInsights);

  const [permission, setPermission] = useState<string>("default");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(pushSupported());
    if (pushSupported()) setPermission(Notification.permission);
  }, []);

  const enable = useMutation({
    mutationFn: async () => {
      const { public_key } = await keyFn();
      if (!public_key) throw new Error("Notification keys are not configured on the server.");
      const sub = await subscribeToPush(public_key);
      await saveDevice({ data: sub });
    },
    onSuccess: () => {
      setPermission("granted");
      toast.success("This device will now get ASTR alerts.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disable = useMutation({
    mutationFn: async () => {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await dropDevice({ data: { endpoint } });
    },
    onSuccess: () => toast.success("Alerts turned off for this device."),
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testPush(),
    onSuccess: (res) =>
      res.devices === 0
        ? toast.error("No devices registered yet — turn alerts on first.")
        : toast.success(`Sent to ${res.sent} of ${res.devices} device(s).`),
    onError: (e: Error) => toast.error(e.message),
  });

  const rebuild = useMutation({
    mutationFn: () => refresh(),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["theme-signals"] });
      toast.success(res.created ? `${res.created} new alert(s).` : "Nothing new to flag right now.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: () => markRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = feed ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts & suggestions</h1>
          <p className="text-sm text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "All caught up"} — buy candidates, hold ideas and
            group rotations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => rebuild.mutate()} disabled={rebuild.isPending}>
            {rebuild.isPending ? "Checking…" : "Check for new"}
          </Button>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={() => clear.mutate()}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <section className="space-y-3 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Phone notifications
        </h2>
        {!supported ? (
          <p className="text-sm text-muted-foreground">
            This browser can't receive push alerts. On iPhone, open the app from your Home Screen
            (Share → Add to Home Screen) and try again — iOS only allows notifications for installed
            apps.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Status: <span className="text-foreground">{permission}</span>
              {isStandalone() ? " · installed app" : " · browser tab"}
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Open this page on your phone and add it to the Home Screen.</li>
              <li>Open it from the Home Screen icon.</li>
              <li>Tap "Turn on alerts" and allow notifications.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => enable.mutate()} disabled={enable.isPending}>
                {enable.isPending ? "Enabling…" : "Turn on alerts"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
                Send test alert
              </Button>
              <Button variant="ghost" size="sm" onClick={() => disable.mutate()}>
                Turn off on this device
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Feed</h2>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No alerts yet. Run today's cycle on the Scan page, or tap "Check for new".
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-md border p-3 ${SEVERITY[n.severity] ?? SEVERITY['info']} ${
                  n.read_at ? "opacity-70" : ""
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{n.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                {n.action && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-primary">{n.action}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
          Group rotation (5-session move)
        </h2>
        {!themes || themes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Load market data first — group trends are built from cached price history.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((t) => (
              <div key={t.id} className="rounded-md border border-border bg-card p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{t.label}</span>
                  <span className={t.change5d >= 0 ? "text-success" : "text-destructive"}>
                    {t.change5d >= 0 ? "+" : ""}
                    {t.change5d}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Best {t.strongest} · Worst {t.weakest} · {t.members} names
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
