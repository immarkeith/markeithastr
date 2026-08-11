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
  ["preopen_recheck_minutes", "Post-open score delay (minutes after 09:30)"],
  ["exit_buffer_minutes", "Sell buffer before the close (minutes)"],
  ["ml_train_days", "Model: training sessions"],
  ["ml_test_days", "Model: test sessions per fold"],
  ["ml_trees", "Model: number of trees"],
  ["ml_holding_days", "Model: holding days predicted"],
  ["ml_min_return_pct", "Model: target move (%)"],
  ["ml_combine_weight", "Model share of blended rank (0-1)"],
] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery(settingsQuery);
  const save = useServerFn(saveSettings);
  const [form, setForm] = useState<Record<string, string>>({});
  const [toggles, setToggles] = useState({
    paper_mode: true,
    auto_run: true,
    ml_enabled: true,
    research_auto: true,
    hold_qualifying_positions: true,
  });


  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {
      market_proxy: String(data.market_proxy),
      provider: String(data.provider),
      ml_target: String((data as Record<string, unknown>)['ml_target'] ?? "return"),
    };
    for (const [key] of NUMERIC_FIELDS) next[key] = String((data as Record<string, unknown>)[key]);
    setForm(next);
    const row = data as Record<string, unknown>;
    setToggles({
      paper_mode: row['paper_mode'] !== false,
      auto_run: row['auto_run'] !== false,
      ml_enabled: row['ml_enabled'] !== false,
      research_auto: row['research_auto'] !== false,
    });
  }, [data]);

  const mutate = useMutation({
    mutationFn: () => {
      const patch: Record<string, unknown> = {
        market_proxy: form['market_proxy'],
        provider: form['provider'] === "alpaca" ? "alpaca" : "polygon",
        ml_target: form['ml_target'] ?? "return",
      };
      for (const [key] of NUMERIC_FIELDS) patch[key] = Number(form[key]);
      patch['paper_mode'] = toggles.paper_mode;
      patch['auto_run'] = toggles.auto_run;
      patch['ml_enabled'] = toggles.ml_enabled;
      patch['research_auto'] = toggles.research_auto;
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
      <div className="space-y-3 rounded-md border border-border bg-card p-4">
        <h2 className="text-sm uppercase tracking-[0.15em] text-muted-foreground">Operating mode</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={toggles.paper_mode}
            onChange={(e) => setToggles({ ...toggles, paper_mode: e.target.checked })}
          />
          <span>
            <span className="font-semibold">Simulation (paper) mode</span>
            <span className="block text-xs text-muted-foreground">
              ON: scoring, entries and exits run on paper — no broker orders, no real cash. OFF:
              the same rules place real market orders in your funded Alpaca account, sized by your
              settled cash, buying after the open re-check and selling before the close.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={toggles.auto_run}
            onChange={(e) => setToggles({ ...toggles, auto_run: e.target.checked })}
          />
          <span>
            <span className="font-semibold">Automatic daily cycle</span>
            <span className="block text-xs text-muted-foreground">
              Runs itself after each trading session's close — skipped on weekends and market
              holidays.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={toggles.research_auto}
            onChange={(e) => setToggles({ ...toggles, research_auto: e.target.checked })}
          />
          <span>
            <span className="font-semibold">Automatic strategy research</span>
            <span className="block text-xs text-muted-foreground">
              Tests alternative rules on cached history each cycle and files candidates on the
              Research page. It can never change your live strategy on its own.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={toggles.ml_enabled}
            onChange={(e) => setToggles({ ...toggles, ml_enabled: e.target.checked })}
          />
          <span>
            <span className="font-semibold">Predictive model layer</span>
            <span className="block text-xs text-muted-foreground">
              Trains the pattern-learning model each cycle and records its view of every name, so
              you can compare it with your ASTR score on the Lab page. Advisory only.
            </span>
          </span>
        </label>
        <div className="space-y-1">
          <Label htmlFor="ml_target">What the model predicts</Label>
          <select
            id="ml_target"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={form['ml_target'] ?? "return"}
            onChange={(e) => setForm({ ...form, ml_target: e.target.value })}
          >
            <option value="return">Size of the next move</option>
            <option value="prob_positive">Chance the move is positive</option>
            <option value="prob_target">Chance it reaches the target move</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="provider">Data provider</Label>
          <select
            id="provider"
            value={form['provider'] ?? "polygon"}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="polygon">Polygon (whole-market, cheapest)</option>
            <option value="alpaca">Alpaca (live/paper keys)</option>
          </select>
        </div>
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
