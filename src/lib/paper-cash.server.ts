import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadSlots, researcherHoldDays } from "./race.server";
import { nyParts } from "./market-calendar";
import { capitalEfficiency, paperBuyCapacity, paperCash } from "./settlement-rules";

export async function paperCashBooks() {
  const day = nyParts().date;
  return Promise.all((await loadSlots()).map(async slot => {
    const ledger: { amount: number; available_on: string; kind: string; note: string | null }[] = [];
    const trades: { ticker: string; dollars: number; entry_price: number; profit: number | null; status: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.from("ledger_entries")
        .select("amount, available_on, kind, note").eq("strategy_id", slot.strategy_id)
        .order("created_at").order("id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      ledger.push(...(data ?? []).map(r => ({ ...r, amount: Number(r.amount) })));
      if ((data ?? []).length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseAdmin.from("trades")
        .select("ticker, dollars, entry_price, profit, status").eq("strategy_id", slot.strategy_id)
        .eq("mode", "paper").order("id").range(offset, offset + 999);
      if (error) throw new Error(error.message);
      trades.push(...(data ?? []));
      if ((data ?? []).length < 1000) break;
    }
    let openMarks = 0;
    let missingMarks = false;
    for (const trade of trades.filter(t => t.status === "open" || t.status === "pending_mark")) {
      const { data, error } = await supabaseAdmin.from("daily_bars").select("close")
        .eq("ticker", trade.ticker).lte("bar_date", day).order("bar_date", { ascending: false }).limit(1).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || trade.entry_price <= 0) { missingMarks = true; continue; }
      openMarks += trade.dollars * Number(data.close) / trade.entry_price;
    }
    const cash = paperCash(ledger, day);
    const capacity = paperBuyCapacity(ledger, day, researcherHoldDays(slot) <= 2);
    const deposits = ledger.filter(r => r.kind === "deposit" || r.kind === "withdrawal").reduce((n, r) => n + r.amount, 0);
    const realized = trades.filter(t => t.status === "closed").reduce((n, t) => n + Number(t.profit ?? 0), 0);
    const hold = Math.max(0, researcherHoldDays(slot) - 1);
    return {
      lane: slot.lane, settled: cash.settled, inFlight: cash.inFlight, reserved: cash.reserved,
      equity: missingMarks ? null : Math.round((cash.settled + cash.inFlight + cash.reserved + openMarks) * 100) / 100,
      nextClearing: cash.nextClearing, nextTranche: capacity.tranche, trancheAvailable: capacity.available,
      holdTradingDays: hold, settlementTradingDays: 1,
      efficiency: deposits > 0 ? capitalEfficiency(realized / deposits * 100, hold) : null,
    };
  }));
}