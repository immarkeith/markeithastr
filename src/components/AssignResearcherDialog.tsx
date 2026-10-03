import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RESEARCHERS, assignToResearcher } from "@/lib/assign.functions";

/** Paper-only: records a research assignment. Never places a trade. */
export function AssignResearcherDialog({ ticker }: { ticker: string }) {
  const [open, setOpen] = useState(false);
  const [researcher, setResearcher] = useState<(typeof RESEARCHERS)[number]>("Lead Researcher");
  const [tipDate, setTipDate] = useState(new Date().toISOString().slice(0, 10));
  const [horizon, setHorizon] = useState<"1M" | "3M" | "9M" | "1Y+">("3M");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const influence = researcher === "Influence Researcher";
  const qc = useQueryClient();
  const run = useServerFn(assignToResearcher);
  const m = useMutation({
    mutationFn: () =>
      run({ data: influence
        ? { ticker, researcher, tip_date: tipDate, horizon, source: source || undefined, notes: notes || undefined }
        : { ticker, researcher } }),
    onSuccess: async () => {
      toast.success(`${ticker} assigned to ${researcher} for research.`);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sel = "w-full rounded-md border border-border bg-card px-3 py-2 text-sm";

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Assign to Researcher</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign {ticker}</DialogTitle>
            <DialogDescription>Research only. No money is used and no trade is placed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Researcher</Label>
              <select className={sel} value={researcher} onChange={(e) => setResearcher(e.target.value as typeof researcher)}>
                {RESEARCHERS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {influence ? (
              <>
                <div className="space-y-2">
                  <Label>Date the tip was made</Label>
                  <Input type="date" value={tipDate} onChange={(e) => setTipDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Intended hold</Label>
                  <select className={sel} value={horizon} onChange={(e) => setHorizon(e.target.value as typeof horizon)}>
                    {["1M", "3M", "9M", "1Y+"].map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Source / person (optional)</Label>
                  <Input value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Saves today's date and a snapshot of the stock's current numbers.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Saving…" : "Assign"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
