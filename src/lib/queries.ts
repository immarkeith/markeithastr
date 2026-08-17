import { queryOptions } from "@tanstack/react-query";

import {
  fetchCapitalLadder,
  fetchHealthChecks,
  fetchLatestRun,
  fetchLedger,
  fetchNotifications,
  fetchRunHistory,
  fetchSettings,
  fetchTradeHistory,
  fetchTrades,
  fetchWatchlist,
} from "@/lib/data.functions";


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
  queryFn: () => fetchSettings(),
});

export const latestRunQuery = queryOptions({
  queryKey: ["latest-run"],
  queryFn: async () => {
    const result = await fetchLatestRun();
    return {
      run: (result.run ?? null) as ScanRunRow | null,
      scores: (result.scores ?? []) as unknown as ScanScoreRow[],
    };
  },
});

export const runHistoryQuery = queryOptions({
  queryKey: ["run-history"],
  queryFn: async () => {
    const result = await fetchRunHistory();
    return {
      runs: (result.runs ?? []) as unknown as ScanRunRow[],
      scores: (result.scores ?? []) as unknown as ScanScoreRow[],
    };
  },
});

export const watchlistQuery = queryOptions({
  queryKey: ["watchlist"],
  queryFn: () => fetchWatchlist(),
});

export const tradesQuery = queryOptions({
  queryKey: ["trades"],
  queryFn: () => fetchTrades(),
});

export const ledgerQuery = queryOptions({
  queryKey: ["ledger"],
  queryFn: () => fetchLedger(),
});


export function cashSummary(entries: { amount: number; available_on: string; kind?: string }[]) {
  const today = new Date().toISOString().slice(0, 10);
  let available = 0;
  let pending = 0;
  let saved = 0;
  for (const e of entries) {
    const amount = Number(e.amount);
    // Banked profit is set aside, never part of the tradeable stake.
    if (e.kind === "reserve") {
      saved += amount;
      continue;
    }
    if (e.available_on <= today) available += amount;
    else pending += amount;
  }
  return { available, pending, saved, total: available + pending + saved };
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
    const rows = await fetchNotifications();
    return (rows ?? []) as unknown as NotificationRow[];
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

export const strategiesQuery = queryOptions({
  queryKey: ["strategies"],
  queryFn: async () => {
    const { getStrategies } = await import("@/lib/scan.functions");
    return getStrategies();
  },
});

export interface HealthCheckRow {
  id: string;
  checked_at: string;
  ok: boolean;
  issues: string[];
  repairs: string[];
  note: string | null;
}

export const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const rows = await fetchHealthChecks();
    return (rows ?? []) as unknown as HealthCheckRow[];
  },
  refetchInterval: 120_000,
});


export const capitalLadderQuery = queryOptions({
  queryKey: ["capital-ladder"],
  queryFn: () => fetchCapitalLadder(),
});

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const { fetchDashboard } = await import("@/lib/data.functions");
    return fetchDashboard();
  },
  refetchInterval: 60_000,
});

export const tradeHistoryQuery = queryOptions({
  queryKey: ["trade-history"],
  queryFn: () => fetchTradeHistory(),
});
