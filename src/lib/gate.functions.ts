import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const gateStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { isUnlocked, gateConfigured, GATE_DAYS } = await import("./gate.server");
  return {
    unlocked: await isUnlocked(),
    configured: gateConfigured(),
    days: GATE_DAYS,
  };
});

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ passcode: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { gateSession, gateConfigured, passcodeMatches, sessionSecretConfigured } = await import(
      "./gate.server"
    );
    if (!gateConfigured()) return { ok: true as const };
    if (!sessionSecretConfigured()) {
      throw new Error("Sign-in is unavailable until the session secret is configured.");
    }
    const expected = process.env["SITE_PASSWORD"]!.trim();
    if (!passcodeMatches(data.passcode, expected)) return { ok: false as const };

    const session = await gateSession();
    await session.update({ unlocked: true, since: new Date().toISOString() });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const { gateSession } = await import("./gate.server");
  const session = await gateSession();
  await session.clear();
  return { ok: true as const };
});
