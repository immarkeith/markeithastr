/**
 * Expanded predictive feature set (additive — the existing ASTR score and its
 * five factors are untouched). Every feature is computed from bars at or before
 * the prediction index, so there is no look-ahead bias.
 *
 * Pure math only — safe to import anywhere.
 */
import type { Bar } from "./scoring";

export const FEATURE_SET_VERSION = "fs1";

export const FEATURE_NAMES = [
  "roc1",
  "roc5",
  "roc10",
  "roc20",
  "dist_sma20",
  "dist_sma50",
  "sma20_slope",
  "sma50_slope",
  "atr_pct",
  "vol_5d",
  "vol_20d",
  "volume_trend",
  "rel_vol_1",
  "rel_vol_5",
  "high_20_dist",
  "low_20_dist",
  "breakout_20",
  "momentum_accel",
  "rsi14",
  "rel_momentum_5",
  "rel_momentum_20",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export const FEATURE_LABELS: Record<FeatureName, string> = {
  roc1: "1-day change",
  roc5: "5-day change",
  roc10: "10-day change",
  roc20: "20-day change",
  dist_sma20: "Distance from SMA-20",
  dist_sma50: "Distance from SMA-50",
  sma20_slope: "SMA-20 slope",
  sma50_slope: "SMA-50 slope",
  atr_pct: "ATR as % of price",
  vol_5d: "Short-term volatility",
  vol_20d: "Medium-term volatility",
  volume_trend: "Volume trend (5d vs 20d)",
  rel_vol_1: "Relative volume (1 day)",
  rel_vol_5: "Relative volume (5 day)",
  high_20_dist: "Distance below 20-day high",
  low_20_dist: "Distance above 20-day low",
  breakout_20: "20-day breakout",
  momentum_accel: "Momentum acceleration",
  rsi14: "RSI-14",
  rel_momentum_5: "5-day momentum vs SPY",
  rel_momentum_20: "20-day momentum vs SPY",
};

/** Minimum bars needed before a feature row can be produced. */
export const MIN_FEATURE_BARS = 55;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) ** 2;
  return Math.sqrt(acc / (values.length - 1));
}

function pctChange(now: number, then: number): number {
  if (!then) return 0;
  return ((now - then) / then) * 100;
}

function smaAt(closes: number[], end: number, window: number): number | null {
  if (end + 1 < window) return null;
  return mean(closes.slice(end + 1 - window, end + 1));
}

function rsiAt(closes: number[], end: number, window = 14): number | null {
  if (end < window) return null;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = end - window + 1; i <= end; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const avgGain = mean(gains);
  const avgLoss = mean(losses);
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function atrAt(bars: Bar[], end: number, window = 14): number | null {
  if (end < window) return null;
  const trs: number[] = [];
  for (let i = end - window + 1; i <= end; i++) {
    const b = bars[i]!;
    const prev = bars[i - 1]!.close;
    trs.push(Math.max(b.high - b.low, Math.abs(b.high - prev), Math.abs(b.low - prev)));
  }
  return mean(trs);
}

function dailyReturns(closes: number[], end: number, window: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(1, end - window + 1); i <= end; i++) {
    out.push(pctChange(closes[i]!, closes[i - 1]!));
  }
  return out;
}

/**
 * Feature vector for `bars[index]`, using only data up to that bar.
 * `marketRoc` supplies the benchmark's 5/20-day change as of the same date.
 */
export function featuresAt(
  bars: Bar[],
  index: number,
  marketRoc: { roc5: number; roc20: number },
): number[] | null {
  if (index < MIN_FEATURE_BARS - 1 || index >= bars.length) return null;
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const close = closes[index]!;
  if (!close) return null;

  const sma20 = smaAt(closes, index, 20);
  const sma50 = smaAt(closes, index, 50);
  const sma20Prev = smaAt(closes, index - 5, 20);
  const sma50Prev = smaAt(closes, index - 5, 50);
  const rsi = rsiAt(closes, index, 14);
  const atr = atrAt(bars, index, 14);
  if (sma20 === null || sma50 === null || sma20Prev === null || sma50Prev === null) return null;
  if (rsi === null || atr === null) return null;

  const avgVol20 = mean(volumes.slice(index - 19, index + 1));
  const avgVol5 = mean(volumes.slice(index - 4, index + 1));
  if (!avgVol20) return null;

  const window20 = bars.slice(index - 19, index + 1);
  const high20 = Math.max(...window20.map((b) => b.high));
  const low20 = Math.min(...window20.map((b) => b.low));

  const roc5 = pctChange(close, closes[index - 5]!);
  const roc5Prev = pctChange(closes[index - 5]!, closes[index - 10]!);
  const roc20 = pctChange(close, closes[index - 20]!);

  const row: Record<FeatureName, number> = {
    roc1: pctChange(close, closes[index - 1]!),
    roc5,
    roc10: pctChange(close, closes[index - 10]!),
    roc20,
    dist_sma20: pctChange(close, sma20),
    dist_sma50: pctChange(close, sma50),
    sma20_slope: pctChange(sma20, sma20Prev),
    sma50_slope: pctChange(sma50, sma50Prev),
    atr_pct: (atr / close) * 100,
    vol_5d: stdev(dailyReturns(closes, index, 5)),
    vol_20d: stdev(dailyReturns(closes, index, 20)),
    volume_trend: avgVol5 / avgVol20,
    rel_vol_1: volumes[index]! / avgVol20,
    rel_vol_5: avgVol5 / avgVol20,
    high_20_dist: pctChange(close, high20),
    low_20_dist: pctChange(close, low20),
    breakout_20: close >= high20 ? 1 : 0,
    momentum_accel: roc5 - roc5Prev,
    rsi14: rsi,
    rel_momentum_5: roc5 - marketRoc.roc5,
    rel_momentum_20: roc20 - marketRoc.roc20,
  };

  const vector = FEATURE_NAMES.map((name) => row[name]);
  return vector.every((v) => Number.isFinite(v)) ? vector : null;
}

export function featureRecord(vector: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  FEATURE_NAMES.forEach((name, i) => {
    out[name] = Number((vector[i] ?? 0).toFixed(4));
  });
  return out;
}
