export const CAPITAL_ANALYSIS_TARGET_YEARLY = 52_000;

export const CAPITAL_ANALYSIS_REQUIREMENTS = {
  same_day: 250,
  "1M": 30,
  "3M": 20,
  "9M": 10,
} as const;

export type CapitalRequirementKey = keyof typeof CAPITAL_ANALYSIS_REQUIREMENTS;

export interface CapitalProgressItem {
  key: CapitalRequirementKey;
  label: string;
  completed: number;
  required: number;
  met: boolean;
}

export interface CapitalStrategyEvidence {
  lane: string;
  strategy_id: string;
  name: string;
  trades: number;
  wins: number;
  losses: number;
  win_rate: number | null;
  average_return_pct: number | null;
  average_winner_pct: number | null;
  average_loser_pct: number | null;
  cumulative_return_pct: number | null;
  max_drawdown_pct: number | null;
  longest_losing_streak: number;
  trades_per_research_day: number;
  observed_annual_return_pct: number | null;
  first_result: string | null;
  last_result: string | null;
}

export interface CapitalAnalysisResult {
  status: "collecting" | "ready";
  target_yearly: number;
  target_monthly: number;
  progress: CapitalProgressItem[];
  completed: {
    same_day: number;
    "1M": number;
    "3M": number;
    "9M": number;
  };
  research_days: number;
  first_result: string | null;
  last_result: string | null;
  market_coverage: {
    sessions: number;
    up_sessions: number;
    down_sessions: number;
    volatile_sessions: number;
    varied: boolean;
    note: string;
  };
  observed_annual_return_pct: number | null;
  observed_monthly_return_pct: number | null;
  strategies: CapitalStrategyEvidence[];
  assumptions: string[];
}