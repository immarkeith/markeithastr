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

export async function pendingResearchMark(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("trades")
    .update({ status_note: "Pending Market Mark — exact-session price unavailable; no P&L or settlement recorded." })
    .eq("id", id).eq("mode", "paper").eq("status", "open");
  if (error) throw new Error(error.message);
}