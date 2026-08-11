import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { watchlistQuery } from "@/lib/queries";
import { setWatchlist } from "@/lib/scan.functions";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Swing watchlist — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content: "Names holding a top-ten streak, promoted into swing candidates for approval.",
      },
      { property: "og:title", content: "Swing watchlist — ASTR Daily Rotation Desk" },
      { property: "og:description", content: "Streak-tracked swing candidates awaiting approval." },
    ],
  }),
  component: WatchlistPage,
});

function WatchlistPage() {
  const qc = useQueryClient();
  const { data } = useQuery(watchlistQuery);
  const setStatus = useServerFn(setWatchlist);

  const mutate = useMutation({
    mutationFn: (input: { ticker: string; status: "approved" | "rejected" | "watching" }) =>
      setStatus({ data: input }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Watchlist updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Swing watchlist</h1>
        <Link to="/analyze" className="text-sm text-primary underline-offset-4 hover:underline">
          Analyze a stock →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Candidates appear here once a name holds a place in the daily top ten.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-right">Streak</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="hidden px-3 py-2 text-left sm:table-cell">Hold until</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.ticker} className="border-t border-border">
                  <td className="px-3 py-2 font-semibold">
                    {row.ticker}
                    {row.best_pick_ever ? (
                      <span className="ml-2 text-xs text-primary">★ top pick</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.streak_days}d</td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        row.status === "approved"
                          ? "default"
                          : row.status === "requested"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                    {row.hold_until ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ ticker: row.ticker, status: "approved" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={mutate.isPending}
                        onClick={() => mutate.mutate({ ticker: row.ticker, status: "rejected" })}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
