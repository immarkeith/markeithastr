import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockSite } from "@/lib/gate.functions";

import { ASTR_IMAGE } from "@/lib/brand";

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
    <div className="relative min-h-screen">
      {/* Full-bleed ASTR picture as the sign-in background. */}
      <div
        className="fixed inset-0 -z-10 bg-background bg-cover bg-center"
        style={{ backgroundImage: `url(${ASTR_IMAGE})` }}
        aria-hidden
      />
      <div className="fixed inset-0 -z-10 bg-background/70" aria-hidden />
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-end px-4 pb-16">
        <h1 className="sr-only">ASTR</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter your passcode. This device stays unlocked for 90 days.
        </p>
        <form onSubmit={submit} className="space-y-3">
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
