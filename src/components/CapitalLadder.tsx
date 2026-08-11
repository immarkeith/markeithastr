import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { capitalLadderQuery, money } from "@/lib/queries";
import { holdCapitalLevel } from "@/lib/scan.functions";

/**
 * Shows the level the desk is trading at, the cushion behind it and how close
 * it is to the next scaling step.
 */
export function CapitalLadder() {
  const qc = useQueryClient();
  const { data } = useQuery(capitalLadderQuery);
  const holdFn = useServerFn(holdCapitalLevel);

  const hold = useMutation({
    mutationFn: (next: boolean) => holdFn({ data: { hold: next } }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ["capital-ladder"] });
      toast.success(res.hold ? "Scaling frozen at the current level." : "Automatic scaling resumed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return null;

  const pct = data.next_level
    ? Math.round((data.stable_days / Math.max(1, data.stable_days_required)) * 100)
    : 0;

  return (
    <section className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">
            Capital ladder
          </h2>
          <p className="mt-1 text-lg font-bold">{data.level}</p>
        </div>
        <Button
          size="sm"
          variant={data.hold_level ? "default" : "outline"}
          onClick={() => hold.mutate(!data.hold_level)}
          disabled={hold.isPending}
        >
          {data.hold_level ? "Resume scaling" : "Hold this level"}
        </Button>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Capital counted</p>
          <p className="tabular-nums font-semibold">{money(data.capital)}</p>
          <p className="text-xs text-muted-foreground">settled cash + saved profit</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Required here</p>
          <p
            className={`tabular-nums font-semibold ${
              data.below_requirement ? "text-destructive" : "text-success"
            }`}
          >
            {money(data.required)}
          </p>
          <p className="text-xs text-muted-foreground">
            stake + {money(data.cushion_target)} cushion
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cushion left</p>
          <p
            className={`tabular-nums font-semibold ${
              data.cushion >= data.cushion_target ? "text-success" : "text-destructive"
            }`}
          >
            {money(data.cushion)}
          </p>
          <p className="text-xs text-muted-foreground">above the money at work</p>
        </div>
      </div>

      {data.next_level ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>
              {data.stable_days} of {data.stable_days_required} stable days toward{" "}
              <span className="font-semibold text-foreground">{data.next_level}</span>
            </span>
            <span className="tabular-nums">
              needs {data.next_required === null ? "—" : money(data.next_required)}
            </span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Top of the ladder — no further scaling up.</p>
      )}

      {data.hold_level ? (
        <p className="text-xs text-muted-foreground">
          Scaling is frozen: the level will not move up or down until you resume it.
        </p>
      ) : data.below_requirement ? (
        <p className="text-xs text-destructive">
          Below the requirement for {data.breach_days} day(s). It scales down after 2 consecutive
          days, and never below $10 per stock.
        </p>
      ) : null}

      {data.events.length > 0 ? (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Level changes</p>
          {data.events.slice(0, 5).map((e) => (
            <p key={e.id} className="text-xs text-muted-foreground">
              <span className="tabular-nums">{e.event_date}</span> —{" "}
              <span className={e.direction === "up" ? "text-success" : "text-destructive"}>
                {e.direction === "up" ? "scaled up" : "scaled down"}
              </span>{" "}
              to {e.to_stocks} × ${e.to_dollars}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
