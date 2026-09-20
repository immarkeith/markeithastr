import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HOLD_HORIZONS, reviewDateFor, type HoldHorizon } from "@/lib/horizons";
import { buyLongTerm } from "@/lib/long-term.functions";

/**
 * The one and only long-term buy dialog. Every place that can start a live
 * long-term holding — Home, Analyze Strategy, Scoreboard — uses this component,
 * so the dollar amount and the holding period are always asked the same way.
 */
export function LongTermBuyDialog({ ticker, price }: { ticker: string; price: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("20");
  const [horizon, setHorizon] = useState<HoldHorizon>("3M");
  const qc = useQueryClient();
  const buy = useServerFn(buyLongTerm);
  const dollars = Number(amount);
  const today = new Date().toISOString().slice(0, 10);
  const review = reviewDateFor(horizon, today);
  const mutation = useMutation({
    mutationFn: () =>
      buy({ data: { ticker, dollars, estimated_price: price, hold_horizon: horizon } }),
    onSuccess: async () => {
      toast.success(`${ticker} was purchased as a protected long-term holding.`);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["trade-history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Buy Long Term</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buy {ticker} long term</DialogTitle>
            <DialogDescription>This places a real live order in the protected long-term bucket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`long-term-${ticker}`}>How much do you want to buy?</Label>
              <Input id={`long-term-${ticker}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`horizon-${ticker}`}>How long do you want to hold it?</Label>
              <select
                id={`horizon-${ticker}`}
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as HoldHorizon)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                {HOLD_HORIZONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {review
                  ? `You will be asked what to do on ${review}. Nothing is ever sold automatically.`
                  : "No end date. You will still get research updates about it."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated {Number.isFinite(dollars) && price > 0 ? (dollars / price).toFixed(4) : "—"} shares at ${price.toFixed(2)}. The final quantity uses the broker fill.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !Number.isFinite(dollars) || dollars < 1}>
              {mutation.isPending ? "Buying…" : `Confirm $${Number.isFinite(dollars) ? dollars.toFixed(2) : "0.00"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
