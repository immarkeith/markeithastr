import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export interface ScanScoreRow {
  id: string;
  run_id: string;
  ticker: string;
  rank: number;
  score: number;
  close: number;
  sma20: number | null;
  tradeable: boolean;
  factors: Record<string, { weighted_points: number; reasons: string[] }>;
  invalidation: string | null;
}

export interface ScanRunRow {
  id: string;
  run_date: string;
  status: string;
  universe_size: number;
  scored_count: number;
  bars_as_of: string | null;
  note: string | null;
  created_at: string;
}

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
    if (error) throw new Error(error.message);
    return data;
  },
});

export const latestRunQuery = queryOptions({
  queryKey: ["latest-run"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("scan_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const run = (data?.[0] ?? null) as ScanRunRow | null;
    if (!run) return { run: null, scores: [] as ScanScoreRow[] };
    const { data: scores, error: scoreErr } = await supabase
      .from("scan_scores")
      .select("*")
      .eq("run_id", run.id)
      .order("rank", { ascending: true })
      .limit(50);
    if (scoreErr) throw new Error(scoreErr.message);
    return { run, scores: (scores ?? []) as unknown as ScanScoreRow[] };
  },
});

export const runHistoryQuery = queryOptions({
  queryKey: ["run-history"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("scan_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const runs = (data ?? []) as ScanRunRow[];
    if (runs.length === 0) return { runs, scores: [] as ScanScoreRow[] };
    const { data: scores, error: scoreErr } = await supabase
      .from("scan_scores")
      .select("*")
      .in(
        "run_id",
        runs.map((r) => r.id),
      )
      .lte("rank", 10)
      .order("rank", { ascending: true });
    if (scoreErr) throw new Error(scoreErr.message);
    return { runs, scores: (scores ?? []) as unknown as ScanScoreRow[] };
  },
});

export const watchlistQuery = queryOptions({
  queryKey: ["watchlist"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("watchlist_candidates")
      .select("*")
      .order("streak_days", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export const tradesQuery = queryOptions({
  queryKey: ["trades"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export const ledgerQuery = queryOptions({
  queryKey: ["ledger"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
});

export function cashSummary(entries: { amount: number; available_on: string }[]) {
  const today = new Date().toISOString().slice(0, 10);
  let available = 0;
  let pending = 0;
  for (const e of entries) {
    const amount = Number(e.amount);
    if (e.available_on <= today) available += amount;
    else pending += amount;
  }
  return { available, pending, total: available + pending };
}

export const money = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  ticker: string | null;
  severity: string;
  action: string | null;
  read_at: string | null;
  created_at: string;
}

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as NotificationRow[];
  },
  refetchInterval: 60_000,
});

export interface ThemeSignalRow {
  id: string;
  label: string;
  change5d: number;
  members: number;
  weakest: string | null;
  strongest: string | null;
}

export const themeSignalsQuery = queryOptions({
  queryKey: ["theme-signals"],
  queryFn: async (): Promise<ThemeSignalRow[]> => {
    const { getThemeSignals } = await import("@/lib/scan.functions");
    return getThemeSignals();
  },
});
