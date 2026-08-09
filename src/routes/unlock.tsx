import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockSite } from "@/lib/gate.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content: "Enter the ASTR passcode to open the rotation desk on this device.",
      },
      { property: "og:title", content: "Unlock — ASTR Daily Rotation Desk" },
      { property: "og:description", content: "Passcode entry for the ASTR rotation desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UnlockPage,
});

function UnlockPage() {
  const router = useRouter();
  const unlock = useServerFn(unlockSite);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { passcode } });
      if (res.ok) {
        await router.navigate({ to: "/" });
        router.invalidate();
      } else {
        setError(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">ASTR</h1>
        <p className="text-sm text-muted-foreground">
          Enter your passcode. This device stays unlocked for 90 days.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="passcode">Passcode</Label>
          <Input
            id="passcode"
            name="passcode"
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
          />
        </div>
        {error && <p className="text-xs text-destructive">That passcode didn't match.</p>}
        <Button type="submit" className="w-full" disabled={busy || passcode.length === 0}>
          {busy ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
