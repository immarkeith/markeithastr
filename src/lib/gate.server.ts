/**
 * Shared-passcode gate. One passcode for the owner's devices; unlocking sets an
 * encrypted cookie that keeps that device signed in for 90 days. Server-only.
 */
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export const GATE_DAYS = 90;

type GateSession = { unlocked?: boolean; since?: string };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"] ?? "astr-dev-only-session-secret-000000",
    name: "astr-gate",
    maxAge: 60 * 60 * 24 * GATE_DAYS,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

/** No passcode configured yet → the app stays open so nobody gets locked out. */
export function gateConfigured(): boolean {
  return Boolean(process.env["SITE_PASSWORD"]?.trim());
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function passcodeMatches(input: string, expected: string): boolean {
  return timingSafeEqual(digest(input), digest(expected));
}

export async function gateSession() {
  return useSession<GateSession>(sessionConfig());
}

export async function isUnlocked(): Promise<boolean> {
  if (!gateConfigured()) return true;
  const session = await gateSession();
  return session.data.unlocked === true;
}

/** Guard for server functions that spend API calls or change records. */
export async function requireUnlocked(): Promise<void> {
  if (await isUnlocked()) return;
  throw new Response("Locked", { status: 401 });
}
