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
import { HOLD_HORIZONS, horizonLabel, reviewDateFor, type HoldHorizon } from "@/lib/horizons";
import { setLongTermHorizon } from "@/lib/long-term.functions";

/**
 * The owner's answer when a long-term holding reaches its planned period.
 * Selling stays in the sell dialog — this only changes the holding period.
 */
export function LongTermReviewDialog({
  tradeId,
  ticker,
  holdHorizon,
  reviewDate,
}: {
  tradeId: string;
  ticker: string;
  holdHorizon: string | null;
  reviewDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [horizon, setHorizon] = useState<HoldHorizon>("3M");
  const qc = useQueryClient();
  const save = useServerFn(setLongTermHorizon);
  const mutation = useMutation({
    mutationFn: () => save({ data: { trade_id: tradeId, hold_horizon: horizon } }),
    onSuccess: async () => {
      toast.success(`${ticker} now runs for ${horizonLabel(horizon)}.`);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Change period
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>How long should {ticker} run?</DialogTitle>
            <DialogDescription>
              {holdHorizon
                ? `Currently ${horizonLabel(holdHorizon)}${reviewDate ? `, review ${reviewDate}` : ""}.`
                : "No holding period is set yet."}{" "}
              Changing this never buys or sells anything.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {HOLD_HORIZONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name={`review-${tradeId}`}
                  value={option.value}
                  checked={horizon === option.value}
                  onChange={() => setHorizon(option.value)}
                />
                <span>{option.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {reviewDateFor(option.value, new Date().toISOString().slice(0, 10)) ?? "no end date"}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
