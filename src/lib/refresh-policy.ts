/** Read-only graph refresh. Never call a trading/replay/repair job from polling. */
export const GRAPH_REFRESH_MS = 5 * 60 * 1000;
export const graphRefreshPolicy = {
  refetchInterval: GRAPH_REFRESH_MS,
  refetchIntervalInBackground: true,
} as const;
