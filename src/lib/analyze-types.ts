/** Client-safe DTO shapes for the on-demand stock analyzer. */
export interface AnalyzeFactor {
  key: string;
  weighted_points: number;
  weight: number;
  pct: number;
  reasons: string[];
  verdict: "helped" | "hurt" | "neutral";
}

export interface AnalyzeResult {
  ticker: string;
  researchers: { researcher: string; score: number | null; min_score: number; hold_days: number }[];
  sessions: number;
  score: number | null;
  band: "Strong" | "Good" | "Neutral" | "Weak" | "Avoid" | "Ineligible";
  min_score: number;
  meets_min: boolean;
  close: number | null;
  sma20: number | null;
  factors: AnalyzeFactor[];
  helped: string[];
  hurt: string[];
  failed: string[];
  invalidation: string | null;
  monitored: boolean;
  watchlist_status: string | null;
  market_roc5: number;
  bars_as_of: string | null;
  source: "cache" | "live";
  peers: { ticker: string; rank: number; score: number }[];
  peer_run_date: string | null;
  would_rank: number | null;
}
