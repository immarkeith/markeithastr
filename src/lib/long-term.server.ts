import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { horizonLabel, reviewDateFor } from "./horizons";
import { executionAlert } from "./execution-alerts.server";

const EPS = 0.000001;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Extends (or makes indefinite) the intended holding period of a live
 * LONG_TERM position after the owner answers a review notification.
 *
 * Shares are never touched here, and the previous horizon is appended to the
 * position's history rather than overwritten.
 */
export async function updateLongTermHorizon(tradeId: string, horizon: string) {
  const { data: trade, error } = await supabaseAdmin
    .from("trades")
    .select("id, status, position_type, hold_horizon, review_date, horizon_history, ticker")
    .eq("id", tradeId)
    .single();
  if (error) throw new Error(error.message);
  if (trade!.position_type !== "LONG_TERM") {
    throw new Error("Only long-term holdings have a holding period.");
  }
  if (trade!.status !== "open") throw new Error("That holding is already closed.");

  const day = today();
  const history = Array.isArray(trade!.horizon_history) ? trade!.horizon_history : [];
  const nextReview = reviewDateFor(horizon, day);
  const { error: upErr } = await supabaseAdmin
    .from("trades")
    .update({
      hold_horizon: horizon,
      review_date: nextReview,
      horizon_history: [
        ...history,
        {
          changed_on: day,
          from: trade!.hold_horizon ?? null,
          to: horizon,
          previous_review_date: trade!.review_date ?? null,
          new_review_date: nextReview,
          decided_by: "owner",
        },
      ],
    })
    .eq("id", tradeId);
  if (upErr) throw new Error(upErr.message);

  return {
    ticker: String(trade!.ticker),
    hold_horizon: horizon,
    hold_horizon_label: horizonLabel(horizon),
    review_date: nextReview,
  };
}

/**
 * Manual, user-driven sale of part (or all) of a protected LONG_TERM live
 * holding. The automated same-day strategy never calls this — it can only ever
 * touch SAME_DAY allocations.
 *
 * Selling is share-based: the requested dollar amount is converted into shares
 * at the current price, so a position that grew or shrank is still handled by
 * its real share count.
 */
export async function sellLongTermShares(input: {
  trade_id: string;
  dollars: number | null;
  all: boolean;
}) {
  const { data: trade, error } = await supabaseAdmin
    .from("trades")
    .select("*")
    .eq("id", input.trade_id)
    .single();
  if (error) throw new Error(error.message);
  if (trade!.status !== "open") throw new Error("That holding is already closed.");
  if (trade!.position_type !== "LONG_TERM") {
    throw new Error("Only long-term holdings can be sold here.");
  }
  if (trade!.mode !== "live") throw new Error("Only live long-term holdings can be sold.");

  const ticker = String(trade!.ticker).toUpperCase();
  const entry = Number(trade!.entry_price);
  const costBasis = Number(trade!.dollars);
  const heldQty = Number(trade!.filled_qty ?? costBasis / entry);
  if (!(heldQty > 0)) throw new Error("This holding has no shares recorded.");

  const { listPositions, positionQty, sellQty } = await import("./broker.server");
  const positions = await listPositions("live");
  const pos = positions.find((p) => p.ticker === ticker);
  const price = Number(pos?.current_price ?? entry);
  const marketValue = heldQty * price;

  // Other protected long-term lots of the same ticker must never be touched.
  const { data: otherLots } = await supabaseAdmin
    .from("trades")
    .select("filled_qty, dollars, entry_price")
    .eq("ticker", ticker)
    .eq("mode", "live")
    .eq("status", "open")
    .eq("position_type", "LONG_TERM")
    .neq("id", input.trade_id);
  const otherQty = (otherLots ?? []).reduce(
    (sum, row) => sum + Number(row.filled_qty ?? Number(row.dollars) / Number(row.entry_price)),
    0,
  );

  let sellShares = heldQty;
  if (!input.all) {
    const wanted = Number(input.dollars ?? 0);
    if (!(wanted > 0)) throw new Error("Enter how much you want to sell.");
    if (wanted >= marketValue - 0.01) sellShares = heldQty;
    else sellShares = wanted / price;
  }
  sellShares = Math.min(heldQty, Number(sellShares.toFixed(6)));
  if (!(sellShares > 0)) throw new Error("That amount is too small to sell.");

  const brokerQty = await positionQty("live", ticker);
  if (brokerQty + EPS < otherQty + sellShares) {
    throw new Error(
      `The broker only shows ${brokerQty} share(s) of ${ticker}. ASTR stopped the sale to protect the rest.`,
    );
  }

  const fill = await sellQty("live", ticker, sellShares);
  if (!fill || !fill.filled_price) {
    throw new Error(`The broker did not fill the ${ticker} sale. Nothing was changed.`);
  }
  const exitPrice = Number(fill.filled_price);
  const soldQty = Number(fill.filled_qty || sellShares);
  const soldCost = Number((soldQty * entry).toFixed(2));
  const proceeds = Number((soldQty * exitPrice).toFixed(2));
  const profit = Number((proceeds - soldCost).toFixed(2));
  const full = soldQty + EPS >= heldQty;

  if (full) {
    const { error: upErr } = await supabaseAdmin
      .from("trades")
      .update({
        status: "closed",
        exit_date: today(),
        exit_at: new Date().toISOString(),
        exit_price: exitPrice,
        profit,
        kept: profit,
        filled_qty: soldQty,
        dollars: soldCost,
        status_note: `Long-term holding sold manually (order ${fill.order_id}).`,
      })
      .eq("id", input.trade_id);
    if (upErr) throw new Error(upErr.message);
  } else {
    // Reduce the remaining protected lot, and book the sold slice as its own
    // closed long-term record so the history stays complete.
    const { error: upErr } = await supabaseAdmin
      .from("trades")
      .update({
        filled_qty: Number((heldQty - soldQty).toFixed(6)),
        dollars: Number((costBasis - soldCost).toFixed(2)),
        status_note: `Partially sold ${soldQty.toFixed(4)} share(s) manually.`,
      })
      .eq("id", input.trade_id);
    if (upErr) throw new Error(upErr.message);
    const { error: insErr } = await supabaseAdmin.from("trades").insert({
      ticker,
      kind: String(trade!.kind),
      position_type: "LONG_TERM",
      mode: "live",
      status: "closed",
      entry_date: String(trade!.entry_date),
      entry_price: entry,
      dollars: soldCost,
      filled_qty: soldQty,
      exit_date: today(),
      exit_at: new Date().toISOString(),
      exit_price: exitPrice,
      profit,
      kept: profit,
      status_note: `Partial long-term sale (order ${fill.order_id}).`,
    });
    if (insErr) throw new Error(insErr.message);
  }

  // Proceeds settle under the normal T+1 rule.
  const settle = new Date();
  settle.setUTCDate(settle.getUTCDate() + 1);
  const { error: ledgerError } = await supabaseAdmin.from("ledger_entries").insert({
    kind: "settle",
    amount: proceeds,
    available_on: settle.toISOString().slice(0, 10),
    trade_id: input.trade_id,
    note: `Sold ${soldQty.toFixed(4)} share(s) of long-term ${ticker} @ ${exitPrice} (P&L ${profit.toFixed(2)})`,
  });

  if (ledgerError) throw new Error(ledgerError.message);
  await executionAlert({ event: "exit", tradeId: input.trade_id, ticker, price: exitPrice, orderId: fill.order_id, profit });
  return {
    ticker,
    shares_sold: Number(soldQty.toFixed(6)),
    proceeds,
    profit,
    fully_closed: full,
    remaining_shares: Number(Math.max(0, heldQty - soldQty).toFixed(6)),
  };
}
