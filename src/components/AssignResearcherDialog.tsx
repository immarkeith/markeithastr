import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RESEARCHERS, assignToResearcher } from "@/lib/assign.functions";

/** Paper-only: records a research assignment. Never places a trade. */
export function AssignResearcherDialog({ ticker }: { ticker: string }) {
  const [open, setOpen] = useState(false);
  const [researcher, setResearcher] = useState<(typeof RESEARCHERS)[number]>("Lead Researcher");
  const qc = useQueryClient();
  const run = useServerFn(assignToResearcher);
  const m = useMutation({
    mutationFn: () =>
      run({ data: { ticker, researcher } }),
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
