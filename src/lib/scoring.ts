/**
 * Direct TypeScript port of the ASTR Python scanner's indicator + scoring
 * engine (score_security and its five factor functions). Point values,
 * weights and thresholds match the original exactly.
 *
 * Pure math only — safe to import from client or server code.
 */

export interface Bar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FactorResult {
  weighted_points: number;
  reasons: string[];
}

export interface ScoreResult {
  score: number;
  close: number;
  sma20: number;
  factors: Record<string, FactorResult>;
  invalidation: string;
}

export interface Weights {
  trend: number;
  momentum: number;
  volume: number;
  relative_strength: number;
  volatility_quality: number;
}

export interface ScoreConfig {
  weights: Weights;
  minPrice: number;
  minAvgDollarVolume: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  trend: 25,
  momentum: 25,
  volume: 20,
  relative_strength: 15,
  volatility_quality: 15,
};

// --- indicators (rolling simple means, matching pandas .rolling().mean()) ---

function rollingMeanLast(values: number[], window: number): number | null {
  if (values.length < window) return null;
  let sum = 0;
  for (let i = values.length - window; i < values.length; i++) sum += values[i]!;
  return sum / window;
}

export function smaLast(closes: number[], window: number): number | null {
  return rollingMeanLast(closes, window);
}

export function rsiLast(closes: number[], window = 14): number | null {
  if (closes.length < window + 1) return null;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const delta = closes[i]! - closes[i - 1]!;
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const avgGain = rollingMeanLast(gains, window);
  const avgLoss = rollingMeanLast(losses, window);
  if (avgGain === null || avgLoss === null) return null;
  if (avgLoss === 0) return null; // matches replace(0, NaN)
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function atrLast(bars: Bar[], window = 14): number | null {
  if (bars.length < window + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!;
    const prevClose = bars[i - 1]!.close;
    trs.push(
      Math.max(b.high - b.low, Math.abs(b.high - prevClose), Math.abs(b.low - prevClose)),
    );
  }
  return rollingMeanLast(trs, window);
}

export interface Snapshot {
  close: number;
  sma20: number;
  sma50: number;
  rsi14: number;
  atr14: number;
  avgVol20: number;
  relVolume: number;
  roc5: number;
  avgDollarVolume20: number;
}

/** Latest-bar indicator snapshot, or null when there isn't enough clean data. */
export function snapshot(bars: Bar[]): Snapshot | null {
  if (bars.length < 55) return null;
  const closes = bars.map((b) => b.close);
  const volumes = bars.map((b) => b.volume);
  const last = bars[bars.length - 1]!;

  const sma20 = smaLast(closes, 20);
  const sma50 = smaLast(closes, 50);
  const rsi14 = rsiLast(closes, 14);
  const atr14 = atrLast(bars, 14);
  const avgVol20 = rollingMeanLast(volumes, 20);
  const dollarVols = bars.map((b) => b.close * b.volume);
  const avgDollarVolume20 = rollingMeanLast(dollarVols, 20);

  if (
    sma20 === null ||
    sma50 === null ||
    rsi14 === null ||
    atr14 === null ||
    avgVol20 === null ||
    avgDollarVolume20 === null ||
    avgVol20 === 0
  ) {
    return null;
  }

  const close5Ago = closes[closes.length - 6];
  if (close5Ago === undefined || close5Ago === 0) return null;
  const roc5 = ((last.close - close5Ago) / close5Ago) * 100;

  return {
    close: last.close,
    sma20,
    sma50,
    rsi14,
    atr14,
    avgVol20,
    relVolume: last.volume / avgVol20,
    roc5,
    avgDollarVolume20,
  };
}

// --- factor scores (0-100 each, before weighting) ---

function scoreTrend(s: Snapshot): [number, string[]] {
  let pts = 0;
  const reasons: string[] = [];
  if (s.close > s.sma20) {
    pts += 40;
    reasons.push("price above SMA20");
  }
  if (s.close > s.sma50) {
    pts += 30;
    reasons.push("price above SMA50");
  }
  if (s.sma20 > s.sma50) {
    pts += 30;
    reasons.push("SMA20 above SMA50 (short-term uptrend)");
  }
  return [pts, reasons];
}

function scoreMomentum(s: Snapshot): [number, string[]] {
  let pts = 0;
  const reasons: string[] = [];
  if (s.rsi14 >= 55 && s.rsi14 <= 75) {
    pts += 50;
    reasons.push(`RSI14 in healthy zone (${s.rsi14.toFixed(0)})`);
  } else if (s.rsi14 > 75) {
    pts += 20;
    reasons.push(`RSI14 overbought (${s.rsi14.toFixed(0)})`);
  }
  if (s.roc5 > 0) {
    pts += Math.min(50, s.roc5 * 10);
    reasons.push(`5-day ROC +${s.roc5.toFixed(1)}%`);
  }
  return [Math.min(pts, 100), reasons];
}

function scoreVolume(s: Snapshot): [number, string[]] {
  if (s.relVolume >= 1.5) {
    return [100, [`volume ${s.relVolume.toFixed(1)}x average (strong)`]];
  }
  if (s.relVolume >= 1.1) {
    return [60, [`volume ${s.relVolume.toFixed(1)}x average (mild)`]];
  }
  return [0, [`volume only ${s.relVolume.toFixed(1)}x average (weak)`]];
}

function scoreRelativeStrength(s: Snapshot, marketRoc5: number): [number, string[]] {
  const diff = s.roc5 - marketRoc5;
  if (diff > 0) {
    return [Math.min(100, diff * 15), [`outperforming the market by ${diff.toFixed(1)} pts (5d)`]];
  }
  return [0, [`underperforming the market by ${Math.abs(diff).toFixed(1)} pts (5d)`]];
}

function scoreVolatilityQuality(s: Snapshot): [number, string[]] {
  const atrPct = (s.atr14 / s.close) * 100;
  if (atrPct >= 1.0 && atrPct <= 4.0) {
    return [100, [`ATR ${atrPct.toFixed(1)}% of price - tradeable range`]];
  }
  if (atrPct < 1.0) {
    return [30, [`ATR ${atrPct.toFixed(1)}% of price - very low movement`]];
  }
  return [20, [`ATR ${atrPct.toFixed(1)}% of price - erratic`]];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Score one security against the market proxy's 5-day rate of change.
 * Returns null when the security fails the data/liquidity gates.
 */
export function scoreSecurity(
  bars: Bar[],
  marketRoc5: number,
  config: ScoreConfig,
): ScoreResult | null {
  const s = snapshot(bars);
  if (!s) return null;
  if (s.close < config.minPrice) return null;
  if (s.avgDollarVolume20 < config.minAvgDollarVolume) return null;

  const w = config.weights;
  const raw: Array<[keyof Weights, [number, string[]]]> = [
    ["trend", scoreTrend(s)],
    ["momentum", scoreMomentum(s)],
    ["volume", scoreVolume(s)],
    ["relative_strength", scoreRelativeStrength(s, marketRoc5)],
    ["volatility_quality", scoreVolatilityQuality(s)],
  ];

  const factors: Record<string, FactorResult> = {};
  let total = 0;
  for (const [name, [pct, reasons]] of raw) {
    const weighted = (pct / 100) * w[name];
    factors[name] = { weighted_points: round1(weighted), reasons };
    total += weighted;
  }

  return {
    score: round1(total),
    close: round2(s.close),
    sma20: round2(s.sma20),
    factors,
    invalidation: `price closes below SMA20 ($${s.sma20.toFixed(2)}) or RSI14 < 45`,
  };
}

export const FACTOR_LABELS: Record<string, string> = {
  trend: "Trend",
  momentum: "Momentum",
  volume: "Volume",
  relative_strength: "Relative strength",
  volatility_quality: "Volatility quality",
};
