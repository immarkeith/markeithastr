import { notify } from "./notify.server";

/** Alert failures never turn an already-executed trade into a failed order. */
export async function executionAlert(input: {
  event: "entry" | "exit";
  tradeId: string;
  ticker: string;
  price: number;
  orderId?: string | null;
  profit?: number;
}) {
  try {
    await notify({
      kind: input.event,
      title: `${input.event === "entry" ? "Bought" : "Sold"} ${input.ticker} @ $${input.price.toFixed(2)}`,
      body:
        input.event === "entry"
          ? "Confirmed live fill recorded in the trade book and cash ledger."
          : `Confirmed live exit recorded. P&L $${(input.profit ?? 0).toFixed(2)}.`,
      ticker: input.ticker,
      severity: input.event === "entry" || (input.profit ?? 0) >= 0 ? "good" : "bad",
      action: `Live ${input.event}`,
      meta: {
        mode: "live",
        executed: true,
        trade_id: input.tradeId,
        broker_order_id: input.orderId ?? null,
      },
      dedupe_key: `execution:${input.event}:${input.orderId ?? input.tradeId}`,
    });
  } catch (error) {
    console.error("Execution notification failed:", error instanceof Error ? error.message : error);
  }
}
