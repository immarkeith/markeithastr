import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { yahooDailyBars } from "./market-data.server";
import { exactDailyPrice, validDailyBar } from "./market-data-validation";

/** Research-only exact-session close. Never a broker fill or live order price. */
export async function researchMarketMark(ticker: string, date: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.from("daily_bars")
    .select("ticker, bar_date, open, high, low, close, volume")
    .eq("ticker", ticker).eq("bar_date", date).maybeSingle();
  if (error) throw new Error(error.message);
  if (data && validDailyBar(data)) return Number(data.close);
  try {
    return exactDailyPrice(await yahooDailyBars(ticker, date, date), ticker, date);
  } catch {
    return null;
  }
}

/**
 * Record that this research position is waiting on a real mark.
 *
 * The row stays `open` with no exit price and no P&L, so the daily passes keep
 * retrying it: if the exact session close is ever obtained, the normal close
 * path books it once. Nothing is invented and nothing is settled here.
 *
 * `session` names the session whose close is missing, so a later recovery can
 * resolve exactly that mark instead of guessing which date to re-price.
 */
export async function pendingResearchMark(id: string, session?: string): Promise<void> {
  const note = session
    ? `Pending Market Mark — exact-session price for ${session} unavailable; no P&L or settlement recorded.`
    : "Pending Market Mark — exact-session price unavailable; no P&L or settlement recorded.";
  const { error } = await supabaseAdmin.from("trades")
    .update({ status_note: note })
    .eq("id", id).eq("mode", "paper").eq("status", "open");
  if (error) throw new Error(error.message);
}