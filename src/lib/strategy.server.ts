/**
 * Strategy lab: replays alternative factor-weight formulas against the bars we
 * already have cached, so it costs compute instead of data calls. Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadSettings, HISTORY_DAYS } from "./scan.server";
import { scoreSecurity, type Bar, type Weights } from "./scoring";

type RawBars = [string, number, number, number, number, number][];

export interface PresetResult {
  id: string;
  label: string;
  weights: Weights;
  picks: number;
  win_rate: number;
  avg_return_pct: number;
  total_return_pct: number;
  best: { ticker: string; date: string; ret: number } | null;
  worst: { ticker: string; date: string; ret: number } | null;
}

export interface BacktestResult {
  sessions: number;
  tickers: number;
  as_of: string | null;
  picks_per_day: number;
  min_score: number;
  results: PresetResult[];
}

function presets(current: Weights): { id: string; label: string; weights: Weights }[] {
  return [
    { id: "current", label: "Your current weights", weights: current },
    {
      id: "trend",
      label: "Trend-heavy",
      weights: { trend: 40, momentum: 20, volume: 15, relative_strength: 15, volatility_quality: 10 },
    },
    {
      id: "momentum",
      label: "Momentum-heavy",
      weights: { trend: 20, momentum: 40, volume: 15, relative_strength: 15, volatility_quality: 10 },
    },
    {
      id: "relative",
      label: "Relative-strength tilt",
      weights: { trend: 25, momentum: 20, volume: 15, relative_strength: 30, volatility_quality: 10 },
    },
    {
      id: "quality",
      label: "Volatility-quality tilt",
      weights: { trend: 25, momentum: 20, volume: 15, relative_strength: 10, volatility_quality: 30 },
    },
    {
      id: "even",
      label: "Equal weight",
      weights: { trend: 20, momentum: 20, volume: 20, relative_strength: 20, volatility_quality: 20 },
    },
  ];
}

function toBars(raw: RawBars): Bar[] {
  return raw.map(([date, open, high, low, close, volume]) => ({
    date,
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}

function roc5(bars: Bar[]): number {
  const last = bars[bars.length - 1]?.close;
  const prior = bars[bars.length - 6]?.close;
  if (last === undefined || !prior) return 0;
  return ((last - prior) / prior) * 100;
}

export async function backtestStrategies(sessions = 12, universe = 500): Promise<BacktestResult> {
  const s = await loadSettings();
  const { data, error } = await supabaseAdmin.rpc("scan_input", {
    p_days: HISTORY_DAYS,
    p_limit: universe,
    p_offset: 0,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { ticker: string; bars: RawBars }[];

  const series = rows.map((r) => ({ ticker: r.ticker, bars: toBars(r.bars) }));
  const proxy = series.find((r) => r.ticker === s.market_proxy.toUpperCase());
  const calendar = series.reduce<string[]>(
    (best, r) => (r.bars.length > best.length ? r.bars.map((b) => b.date) : best),
    [],
  );
  const asOf = calendar[calendar.length - 1] ?? null;
  const minScore = Number(s.min_score_to_trade);
  const perDay = Math.max(1, Number(s.num_day_trades));

  const testDays = calendar.slice(Math.max(0, calendar.length - 1 - sessions), calendar.length - 1);
  const config = {
    minPrice: Number(s.min_price),
    minAvgDollarVolume: Number(s.min_avg_dollar_volume),
    weights: {
      trend: 0,
      momentum: 0,
      volume: 0,
      relative_strength: 0,
      volatility_quality: 0,
    } as Weights,
  };

  const currentWeights: Weights = {
    trend: Number(s.weight_trend),
    momentum: Number(s.weight_momentum),
    volume: Number(s.weight_volume),
    relative_strength: Number(s.weight_relative_strength),
    volatility_quality: Number(s.weight_volatility_quality),
  };

  const results: PresetResult[] = [];

  for (const preset of presets(currentWeights)) {
    const returns: { ticker: string; date: string; ret: number }[] = [];

    for (const day of testDays) {
      const marketWindow = proxy ? proxy.bars.filter((b) => b.date <= day) : [];
      const marketRoc5 = roc5(marketWindow);
      const scored: { ticker: string; score: number; next: number | null }[] = [];

      for (const item of series) {
        const window = item.bars.filter((b) => b.date <= day);
        if (window.length < 55) continue;
        const result = scoreSecurity(window, marketRoc5, {
          ...config,
          weights: preset.weights,
        });
        if (!result || result.score < minScore) continue;
        const nextIndex = item.bars.findIndex((b) => b.date === day) + 1;
        const nextBar = item.bars[nextIndex];
        const lastClose = window[window.length - 1]!.close;
        scored.push({
          ticker: item.ticker,
          score: result.score,
          next: nextBar ? ((nextBar.close - lastClose) / lastClose) * 100 : null,
        });
      }

      scored.sort((a, b) => b.score - a.score);
      for (const pick of scored.slice(0, perDay)) {
        if (pick.next === null) continue;
        returns.push({ ticker: pick.ticker, date: day, ret: Number(pick.next.toFixed(2)) });
      }
    }

    const wins = returns.filter((r) => r.ret > 0).length;
    const total = returns.reduce((a, b) => a + b.ret, 0);
    const sorted = [...returns].sort((a, b) => b.ret - a.ret);
    results.push({
      id: preset.id,
      label: preset.label,
      weights: preset.weights,
      picks: returns.length,
      win_rate: returns.length ? Number(((wins / returns.length) * 100).toFixed(1)) : 0,
      avg_return_pct: returns.length ? Number((total / returns.length).toFixed(2)) : 0,
      total_return_pct: Number(total.toFixed(2)),
      best: sorted[0] ?? null,
      worst: sorted[sorted.length - 1] ?? null,
    });
  }

  results.sort((a, b) => b.avg_return_pct - a.avg_return_pct);
  return {
    sessions: testDays.length,
    tickers: series.length,
    as_of: asOf,
    picks_per_day: perDay,
    min_score: minScore,
    results,
  };
}
