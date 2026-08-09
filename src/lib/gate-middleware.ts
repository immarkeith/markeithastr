import { createMiddleware } from "@tanstack/react-start";

/**
 * Blocks the expensive/mutating server functions unless this device unlocked
 * the app with the passcode. Open when no passcode is configured.
 */
export const requireGate = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { requireUnlocked } = await import("./gate.server");
  await requireUnlocked();
  return next();
});
