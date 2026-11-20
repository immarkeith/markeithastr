import { isTradingDay, nextTradingDay } from "./market-calendar";
import { validateBarFill } from "./audit-rules";

export function canEvaluatePaperEntry(trade: { status: unknown; status_note?: unknown; entry_price: number }, bar?: { low: number; high: number }) {
  if (trade.status === "pending_mark" || (typeof trade.status_note === "string" && /Needs review.*entry|entry.*Needs review|entry and exit marks unverified/i.test(trade.status_note))) return false;
  return validateBarFill(trade.entry_price, bar) === "valid";
}

/** Only stale internal simulations with proven-invalid entries may be quarantined. */
export function shouldQuarantineOutage(
  trade: { mode: string; strategy_id: string | null; broker_order_id: string | null; status: string; hold_target_date: string | null; entry_price: number },
  day: string,
  bar?: { low: number; high: number },
) {
  if (trade.mode !== "paper" || !trade.strategy_id || trade.broker_order_id || trade.status !== "open" || !trade.hold_target_date) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trade.hold_target_date) || !isTradingDay(trade.hold_target_date)) return false;
  let threshold = trade.hold_target_date;
  for (let n = 0; n < 5; n++) threshold = nextTradingDay(threshold);
  return day > threshold && validateBarFill(trade.entry_price, bar) === "invalid";
}