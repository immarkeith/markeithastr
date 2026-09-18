import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sellLongTerm } from "@/lib/long-term.functions";
import { money } from "@/lib/queries";

/** Manual partial or full sale of one protected long-term holding. */
export function LongTermSellDialog({
  tradeId,
  ticker,
  marketValue,
  shares,
  price,
}: {
  tradeId: string;
  ticker: string;
  marketValue: number;
  shares: number;
  price: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(marketValue.toFixed(2));
  const [all, setAll] = useState(false);
  const qc = useQueryClient();
  const sell = useServerFn(sellLongTerm);
  const dollars = Number(amount);
  const mutation = useMutation({
    mutationFn: () =>
      sell({ data: { trade_id: tradeId, dollars: all ? null : dollars, all } }),
    onSuccess: async (res) => {
      toast.success(
        `Sold ${res.shares_sold} share(s) of ${res.ticker} for ${money(res.proceeds)}.`,
      );
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["trade-history"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const validAmount = all || (Number.isFinite(dollars) && dollars > 0);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Sell
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell {ticker}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {shares.toFixed(4)} shares · {money(marketValue)} at ${price.toFixed(2)}
            </p>
            <div className="space-y-2">
              <Label htmlFor={`sell-${tradeId}`}>How much do you want to sell?</Label>
              <Input
                id={`sell-${tradeId}`}
                inputMode="decimal"
                value={amount}
                disabled={all}
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {all
                  ? "Selling the whole holding."
                  : `About ${
                      Number.isFinite(dollars) && price > 0 ? (dollars / price).toFixed(4) : "—"
                    } shares. The final amount uses the broker fill.`}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                Sell everything
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !validAmount}
            >
              {mutation.isPending ? "Selling…" : "Confirm sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
