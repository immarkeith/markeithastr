/** Research output is data, not an executed-trade notification event. */
export function shouldNotify(input: {
  kind: string;
  action?: string | null;
  meta?: Record<string, unknown>;
}): boolean {
  if (/^paper[-_]|^research[-_]/.test(input.kind)) return false;
  if (input.meta?.["source"] === "research" || input.meta?.["mode"] === "paper") return false;
  if (/simulated|paper/i.test(input.action ?? "")) return false;
  if (input.kind === "entry" || input.kind === "exit") {
    return (
      input.meta?.["mode"] === "live" &&
      input.meta?.["executed"] === true &&
      typeof input.meta?.["trade_id"] === "string"
    );
  }
  return true;
}
