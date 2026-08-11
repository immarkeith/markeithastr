/**
 * On-demand single-ticker analysis. Server-only.
 *
 * Deliberately reuses the SAME engine the daily scanner uses: settings ->
 * scoreConfig() -> scoreSecurity(). There is no second scoring model here, so
 * any future change to the strategy's formula shows up in the analyzer for
 * free. Analysis is read-only: it never places a trade, never touches the
 * capital ladder and never writes to the trading universe.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { HISTORY_DAYS, loadSettings, scoreConfig, volumeShare } from "./scan.server";
import { scoreSecurity, snapshot, type Bar } from "./scoring";

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

function bandFor(score: number, minScore: number): AnalyzeResult["band"] {
  if (score >= minScore + 15) return "Strong";
  if (score >= minScore) return "Good";
  if (score >= minScore - 10) return "Neutral";
  if (score >= minScore - 25) return "Weak";
  return "Avoid";
}

async function cachedBars(ticker: string): Promise<Bar[]> {
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, open, high, low, close, volume")
    .eq("ticker", ticker)
    .order("bar_date", { ascending: true })
    .limit(400);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    date: r.bar_date as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
}

/** One symbol, one ranged request. Not persisted — analysis never widens the universe. */
async function liveBars(ticker: string): Promise<Bar[]> {
  const s = await loadSettings();
  const { recentWeekdays, alpacaBars, polygonSymbolBars } = await import("./market-data.server");
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const window = recentWeekdays(HISTORY_DAYS, end);
  const from = window[0];
  const to = window[window.length - 1];
  if (!from || !to) return [];
  const rows =
    s.provider === "alpaca"
      ? await alpacaBars([ticker], from, to)
      : await polygonSymbolBars(ticker, from, to);
  return rows
    .filter((r) => r.ticker.toUpperCase() === ticker)
    .map((r) => ({
      date: r.bar_date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

async function marketRoc5(proxy: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("daily_bars")
    .select("bar_date, close")
    .eq("ticker", proxy.toUpperCase())
    .order("bar_date", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  const closes = (data ?? []).map((r) => Number(r.close)).reverse();
  const last = closes[closes.length - 1];
  const prior = closes[closes.length - 6];
  if (last === undefined || !prior) return 0;
  return ((last - prior) / prior) * 100;
}

export async function analyzeTicker(rawTicker: string): Promise<AnalyzeResult> {
  const ticker = rawTicker.trim().toUpperCase();
  const s = await loadSettings();
  const share = await volumeShare(s);
  const config = scoreConfig(s, share);
  const minScore = Number(s.min_score_to_trade);

  let bars = await cachedBars(ticker);
  let source: "cache" | "live" = "cache";
  const monitored = bars.length > 0;
  if (bars.length < 55) {
    const live = await liveBars(ticker);
    if (live.length > bars.length) {
      bars = live;
      source = "live";
    }
  }

  const { data: wl } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("status")
    .eq("ticker", ticker)
    .maybeSingle();

  const proxyRoc = await marketRoc5(s.market_proxy);
  const snap = snapshot(bars);
  const result = bars.length ? scoreSecurity(bars, proxyRoc, config) : null;

  const failed: string[] = [];
  if (bars.length === 0) {
    failed.push(`No daily price history available for ${ticker}.`);
  } else if (bars.length < 55) {
    failed.push(`Only ${bars.length} clean sessions available — scoring needs 55.`);
  } else if (!snap) {
    failed.push("Indicators could not be computed from the available history.");
  } else {
    if (snap.close < config.minPrice) {
      failed.push(
        `Price $${snap.close.toFixed(2)} is below the $${config.minPrice.toFixed(2)} minimum.`,
      );
    }
    if (snap.avgDollarVolume20 < config.minAvgDollarVolume) {
      failed.push(
        `20-day average dollar volume $${Math.round(snap.avgDollarVolume20).toLocaleString()} is below the $${Math.round(config.minAvgDollarVolume).toLocaleString()} liquidity floor.`,
      );
    }
  }

  const weights = config.weights as unknown as Record<string, number>;
  const factors: AnalyzeFactor[] = [];
  const helped: string[] = [];
  const hurt: string[] = [];
  if (result) {
    for (const [key, factor] of Object.entries(result.factors)) {
      const weight = Number(weights[key] ?? 0);
      const pct = weight > 0 ? (factor.weighted_points / weight) * 100 : 0;
      const verdict = pct >= 60 ? "helped" : pct <= 40 ? "hurt" : "neutral";
      factors.push({
        key,
        weighted_points: factor.weighted_points,
        weight,
        pct: Math.round(pct),
        reasons: factor.reasons,
        verdict,
      });
      if (verdict === "helped") helped.push(...factor.reasons);
      if (verdict === "hurt") {
        hurt.push(
          ...(factor.reasons.length ? factor.reasons : [`${key.replace(/_/g, " ")} scored 0`]),
        );
      }
    }
    factors.sort((a, b) => b.weighted_points - a.weighted_points);
  }

  // Peer comparison from the latest completed scan — no extra scoring pass.
  const { data: run } = await supabaseAdmin
    .from("scan_runs")
    .select("id, run_date")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let peers: AnalyzeResult["peers"] = [];
  let wouldRank: number | null = null;
  if (run?.id) {
    const { data: top } = await supabaseAdmin
      .from("scan_scores")
      .select("ticker, rank, score")
      .eq("run_id", run.id as string)
      .eq("tradeable", true)
      .order("rank", { ascending: true })
      .limit(5);
    peers = (top ?? []).map((r) => ({
      ticker: r.ticker as string,
      rank: Number(r.rank),
      score: Number(r.score),
    }));
    if (result) {
      const { count } = await supabaseAdmin
        .from("scan_scores")
        .select("ticker", { count: "exact", head: true })
        .eq("run_id", run.id as string)
        .gt("score", result.score);
      wouldRank = Number(count ?? 0) + 1;
    }
  }

  const barsAsOf = bars.length ? (bars[bars.length - 1]!.date ?? null) : null;
  const score = result ? result.score : null;

  return {
    ticker,
    sessions: bars.length,
    score,
    band: score === null ? "Ineligible" : bandFor(score, minScore),
    min_score: minScore,
    meets_min: score !== null && score >= minScore,
    close: result ? result.close : (snap?.close ?? null),
    sma20: result ? result.sma20 : (snap?.sma20 ?? null),
    factors,
    helped,
    hurt,
    failed,
    invalidation: result ? result.invalidation : null,
    monitored,
    watchlist_status: (wl?.status as string | undefined) ?? null,
    market_roc5: Number(proxyRoc.toFixed(2)),
    bars_as_of: barsAsOf,
    source,
    peers,
    peer_run_date: (run?.run_date as string | undefined) ?? null,
    would_rank: wouldRank,
  };
}

/**
 * Files a pending request. It does NOT add the ticker to the traded universe —
 * a human still has to approve it on the watchlist page.
 */
export async function requestMonitoredTicker(rawTicker: string) {
  const ticker = rawTicker.trim().toUpperCase();
  const analysis = await analyzeTicker(ticker);
  if (analysis.score === null) {
    throw new Error(`${ticker} could not be scored, so it cannot be requested.`);
  }
  if (!analysis.meets_min) {
    throw new Error(
      `${ticker} scored ${analysis.score} — below the ${analysis.min_score} minimum required for a monitored-stock request.`,
    );
  }
  if (analysis.monitored) {
    return { ok: true, status: "already_monitored" as const, ticker };
  }

  const { data: existing } = await supabaseAdmin
    .from("watchlist_candidates")
    .select("ticker, status")
    .eq("ticker", ticker)
    .maybeSingle();
  const payload = {
    ticker,
    streak_days: 0,
    status: "requested",
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    if (existing.status === "approved" || existing.status === "rejected") {
      return { ok: true, status: existing.status as string, ticker };
    }
    const { error } = await supabaseAdmin
      .from("watchlist_candidates")
      .update(payload)
      .eq("ticker", ticker);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabaseAdmin.from("watchlist_candidates").insert(payload);
    if (error) throw new Error(error.message);
  }
  return { ok: true, status: "requested" as const, ticker };
}
