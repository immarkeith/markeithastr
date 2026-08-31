/**
 * Extra research factors for the Research Department.
 *
 * The five live factors (trend, momentum, volume, relative strength,
 * volatility quality) live in scoring.ts and are shared with the live scanner.
 * The specialists below need characteristics the live scanner never measured —
 * pullback depth, consistency, growth acceleration, risk-adjusted reward — so
 * they get their own weight-independent percentages here.
 *
 * Every function returns a 0-100 percentage. A researcher then multiplies those
 * percentages by its own weights, which means thousands of weight combinations
 * cost nothing extra to test.
 *
 * Pure math only — safe to import anywhere.
 */
import { atrLast, type Bar } from "./scoring";

export const EXTRA_FACTOR_KEYS = [
  // contrarian
  "pullback",
  "oversold_reversal",
  "down_streak",
  "volume_dryup",
  // consistency
  "return_stability",
  "positive_days",
  "low_drawdown",
  "atr_stability",
  // growth proxies
  "growth_acceleration",
  "long_relative_strength",
  "sustained_advance",
  // risk
  "reward_per_risk",
  "downside_protection",
  "worst_day",
  "liquidity_depth",
] as const;

export type ExtraFactorKey = (typeof EXTRA_FACTOR_KEYS)[number];

export const FACTOR_KEYS = [
  "trend",
  "momentum",
  "volume",
  "relative_strength",
  "volatility_quality",
  ...EXTRA_FACTOR_KEYS,
] as const;

export type FactorKey = (typeof FACTOR_KEYS)[number];

export const FACTOR_LABELS_ALL: Record<FactorKey, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volume: "Volume",
  relative_strength: "Relative strength",
  volatility_quality: "Volatility quality",
  pullback: "Pullback from high",
  oversold_reversal: "Oversold turning up",
  down_streak: "Down-day streak",
  volume_dryup: "Volume dried up",
  return_stability: "Steady day-to-day returns",
  positive_days: "Share of up days",
  low_drawdown: "Shallow drawdown",
  atr_stability: "Stable daily range",
  growth_acceleration: "Accelerating advance",
  long_relative_strength: "Long-horizon relative strength",
  sustained_advance: "Sustained 3-month advance",
  reward_per_risk: "Reward per unit of risk",
  downside_protection: "Small downside swings",
  worst_day: "Mild worst day",
  liquidity_depth: "Liquidity depth",
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

function returns(closes: number[], lookback: number): number[] {
  const out: number[] = [];
  const start = Math.max(1, closes.length - lookback);
  for (let i = start; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    if (prev) out.push(((closes[i]! - prev) / prev) * 100);
  }
  return out;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function roc(closes: number[], back: number): number {
  const now = closes[closes.length - 1];
  const then = closes[closes.length - 1 - back];
  if (now === undefined || then === undefined || !then) return 0;
  return ((now - then) / then) * 100;
}

export interface MarketContext {
  /** Proxy 20-session return, in percent. */
  roc20: number;
  /** Proxy 60-session return, in percent. */
  roc60: number;
}

/**
 * Compute every extra factor percentage for the last bar of `bars`.
 * Expects at least 55 bars (same floor as the live snapshot).
 */
export function extraFactors(bars: Bar[], market: MarketContext): Record<ExtraFactorKey, number> {
  const closes = bars.map((b) => b.close);
  const last = bars[bars.length - 1]!;
  const close = last.close;

  const high20 = Math.max(...bars.slice(-20).map((b) => b.high));
  const drop = high20 > 0 ? ((high20 - close) / high20) * 100 : 0;
  // A 6-12% pullback inside a longer uptrend is the contrarian sweet spot;
  // anything deeper starts to look like a broken chart.
  const pullback = drop <= 1 ? 0 : drop <= 12 ? clamp((drop / 12) * 100) : clamp(100 - (drop - 12) * 6);

  const rets = returns(closes, 21);
  const dailySd = stdev(rets);
  const upDays = rets.filter((r) => r > 0).length;

  // RSI-style oversold turn: cheap re-implementation over the recent window so
  // the contrarian lane can see "low, but bouncing".
  const gains = rets.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const losses = rets.filter((r) => r < 0).reduce((a, b) => a - b, 0);
  const strength = gains + losses > 0 ? (gains / (gains + losses)) * 100 : 50;
  const lastRet = rets[rets.length - 1] ?? 0;
  const oversold_reversal = clamp((100 - strength) * (lastRet > 0 ? 1.4 : 0.5));

  let streak = 0;
  for (let i = closes.length - 1; i > 0; i--) {
    if (closes[i]! < closes[i - 1]!) streak++;
    else break;
  }
  const down_streak = streak === 0 ? 0 : streak <= 3 ? clamp(streak * 33) : clamp(100 - (streak - 3) * 30);

  const vols = bars.slice(-21, -1).map((b) => b.volume);
  const avgVol = vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 0;
  const relVol = avgVol ? last.volume / avgVol : 1;
  const volume_dryup = clamp((1.2 - relVol) * 125);

  const return_stability = clamp(100 - dailySd * 22);
  const positive_days = rets.length ? clamp((upDays / rets.length) * 100 * 1.4) : 0;

  let peak = 0;
  let maxDd = 0;
  for (const c of closes.slice(-40)) {
    peak = Math.max(peak, c);
    if (peak > 0) maxDd = Math.max(maxDd, ((peak - c) / peak) * 100);
  }
  const low_drawdown = clamp(100 - maxDd * 5);

  const atrNow = atrLast(bars, 14) ?? 0;
  const atrPrev = atrLast(bars.slice(0, Math.max(16, bars.length - 14)), 14) ?? atrNow;
  const atrRatio = atrPrev > 0 ? atrNow / atrPrev : 1;
  const atr_stability = clamp(100 - Math.abs(atrRatio - 1) * 160);
  const atrPct = close > 0 ? (atrNow / close) * 100 : 0;

  const roc20 = roc(closes, 20);
  const roc60 = roc(closes, 60);
  const roc10 = roc(closes, 10);
  const growth_acceleration = clamp((roc10 * 2 - roc20) * 8);
  const long_relative_strength = clamp((roc60 - market.roc60) * 3);
  const sustained_advance = clamp(roc60 * 2.5) * (roc20 > 0 ? 1 : 0.4);

  const reward_per_risk = atrPct > 0 ? clamp((roc20 / atrPct) * 22) : 0;
  const downside = stdev(rets.filter((r) => r < 0));
  const downside_protection = clamp(100 - downside * 28);
  const worstDay = rets.length ? Math.min(...rets) : 0;
  const worst_day = clamp(100 - Math.abs(worstDay) * 12);
  const dollarVol = close * avgVol;
  const liquidity_depth = dollarVol > 0 ? clamp(((Math.log10(dollarVol) - 6) / 2.5) * 100) : 0;

  return {
    pullback,
    oversold_reversal,
    down_streak,
    volume_dryup,
    return_stability,
    positive_days,
    low_drawdown,
    atr_stability,
    growth_acceleration,
    long_relative_strength,
    sustained_advance,
    reward_per_risk,
    downside_protection,
    worst_day,
    liquidity_depth,
  };
}

/** Proxy context from the market proxy's own bar history, up to `index`. */
export function marketContext(proxyBars: Bar[], index: number): MarketContext {
  const closes = proxyBars.slice(0, index + 1).map((b) => b.close);
  return { roc20: roc(closes, 20), roc60: roc(closes, 60) };
}
