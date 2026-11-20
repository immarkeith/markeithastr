import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canEvaluatePaperEntry, shouldQuarantineOutage } from "./paper-outage";
import { logRepair } from "./repair-log.server";

/** Never derive simulated returns from an invalid or unverifiable entry. */
export async function verifiedPaperEntry(trade: Record<string, unknown>): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("daily_bars").select("low,high")
    .eq("ticker", String(trade['ticker'])).eq("bar_date", String(trade['entry_date'])).maybeSingle();
  if (error) throw new Error(error.message);
  return canEvaluatePaperEntry({ status: trade['status'], status_note: trade['status_note'], entry_price: Number(trade['entry_price']) }, data ? { low: Number(data.low), high: Number(data.high) } : undefined);
}

/** Quarantine evidence only. Missing marks remain pending: no sale, cash, or P&L. */
export async function quarantineStalePaperOutages(day: string) {
  const repaired: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data: rows, error } = await supabaseAdmin.from("trades")
      .select("id,ticker,mode,strategy_id,broker_order_id,status,status_note,entry_date,entry_price,hold_target_date")
      .eq("mode", "paper").eq("status", "open").not("strategy_id", "is", null)
      .is("broker_order_id", null).lt("hold_target_date", day).order("id").range(offset, offset + 499);
    if (error) throw new Error(error.message);
    for (const trade of rows ?? []) {
      // Explicit entry quarantine is durable; don't confuse a missing-exit note with invalid-entry evidence.
      if (/Needs review.*entry/i.test(trade.status_note ?? "")) continue;
      const { data: bar, error: barError } = await supabaseAdmin.from("daily_bars").select("low,high")
        .eq("ticker", trade.ticker).eq("bar_date", trade.entry_date).maybeSingle();
      if (barError) throw new Error(barError.message);
      if (!shouldQuarantineOutage({ ...trade, entry_price: Number(trade.entry_price) }, day, bar ? { low: Number(bar.low), high: Number(bar.high) } : undefined)) continue;
      const note = `Needs review — market-data outage; entry fill ${trade.entry_price} outside exact-session range ${bar?.low}–${bar?.high}. Marks pending; no P&L or settlement recorded. Original note: ${trade.status_note ?? "none"}`;
      const { data: changed, error: writeError } = await supabaseAdmin.from("trades").update({ status_note: note })
        .eq("id", trade.id).eq("mode", "paper").eq("status", "open").is("broker_order_id", null)
        .eq("entry_price", trade.entry_price).select("id");
      if (writeError) throw new Error(writeError.message);
      if (!changed?.length) continue;
      const { data: after, error: readError } = await supabaseAdmin.from("trades").select("status,status_note,profit,exit_price").eq("id", trade.id).single();
      const verified = !readError && after?.status === "open" && after.status_note === note && after.profit === null && after.exit_price === null;
      await logRepair({ repair_type: "settle_stale_paper", target: trade.id, before_status: { ...trade, entry_bar: bar }, after_status: { ...after, action: "quarantine_only" }, verified, verification_note: "Invalid entry quarantined; no settlement or P&L invented." });
      if (!verified) throw new Error(`Paper quarantine readback failed for ${trade.id}`);
      repaired.push(trade.id);
    }
    if ((rows ?? []).length < 500) break;
  }
  return repaired;
}