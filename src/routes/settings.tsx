import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsQuery } from "@/lib/queries";
import { saveSettings } from "@/lib/scan.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ASTR Daily Rotation Desk" },
      {
        name: "description",
        content: "Tune factor weights, liquidity gates, position sizing and settlement rules.",
      },
      { property: "og:title", content: "Settings — ASTR Daily Rotation Desk" },
      { property: "og:description", content: "Factor weights, liquidity gates and sizing rules." },
    ],
  }),
  component: SettingsPage,
});

const NUMERIC_FIELDS = [
  ["min_price", "Minimum price ($)"],
  ["min_avg_dollar_volume", "Min 20d avg dollar volume"],
  ["weight_trend", "Weight: trend"],
  ["weight_momentum", "Weight: momentum"],
  ["weight_volume", "Weight: volume"],
  ["weight_relative_strength", "Weight: relative strength"],
  ["weight_volatility_quality", "Weight: volatility quality"],
  ["min_score_to_trade", "Min score to trade"],
  ["num_day_trades", "Day trades per day"],
  ["dollars_per_day_trade", "Dollars per day trade"],
  ["profit_keep_pct", "Profit kept (0-1)"],
  ["settlement_days", "Settlement days"],
  ["streak_suggest_days", "Streak days to suggest"],
  ["swing_dollars", "Swing position dollars"],
  ["swing_max_hold_days", "Swing max hold days"],
  ["max_universe", "Max universe size"],
] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const save = useServerFn(saveSettings);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = { market_proxy: String(data.market_proxy) };
    for (const [key] of NUMERIC_FIELDS) next[key] = String((data as Record<string, unknown>)[key]);
    setForm(next);
  }, [data]);

  const mutate = useMutation({
    mutationFn: () => {
      const patch: Record<string, unknown> = { market_proxy: form['market_proxy'] };
      for (const [key] of NUMERIC_FIELDS) patch[key] = Number(form[key]);
      return save({ data: patch as never });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const weightTotal = [
    "weight_trend",
    "weight_momentum",
    "weight_volume",
    "weight_relative_strength",
    "weight_volatility_quality",
  ].reduce((sum, key) => sum + Number(form[key] ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Factor weights should total 100 — currently{" "}
        <span className={weightTotal === 100 ? "text-success" : "text-destructive"}>
          {weightTotal}
        </span>
        .
      </p>
      <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="market_proxy">Market proxy</Label>
          <Input
            id="market_proxy"
            value={form['market_proxy'] ?? ""}
            onChange={(e) => setForm({ ...form, market_proxy: e.target.value.toUpperCase() })}
          />
        </div>
        {NUMERIC_FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              inputMode="decimal"
              value={form[key] ?? ""}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button onClick={() => mutate.mutate()} disabled={mutate.isPending}>
        {mutate.isPending ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}
