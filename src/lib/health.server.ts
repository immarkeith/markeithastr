/**
 * Health monitor. Runs on a schedule (more often during market hours) and
 * checks the things that actually break: the market-data key, how fresh the
 * cached price history is, whether today's scan happened, and whether any
 * simulated position is stuck open. Problems it can fix, it fixes; anything
 * else becomes a notification. Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface HealthResult {
  ok: boolean;
  issues: string[];
  repairs: string[];
  checked_at: string;
}

export async function runHealthCheck(): Promise<HealthResult> {
  const issues: string[] = [];
  const repairs: string[] = [];

  const { loadSettings, missingDates, cacheOneDay, runScan, barCoverage, backfillHistory } =
    await import("./scan.server");
  const { verifyProviderKey } = await import("./market-data.server");
  const { marketStatus } = await import("./market-calendar");
  const { notify } = await import("./notify.server");

  const settings = await loadSettings();
  const status = marketStatus();

  // 1. Data key.
  const key = await verifyProviderKey(settings.provider as "polygon" | "alpaca");
  if (!key.ok) issues.push(`Market data key: ${key.detail}`);

  // 2. Is the cached history deep and wide enough to score at all? Scoring
  // needs 55 clean sessions per ticker, so a thin or fragmented cache is
  // rebuilt in one ranged pass rather than patched day by day.
  let missing: string[] = [];
  let thin = false;
  try {
    const coverage = await barCoverage();
    thin = coverage.length < 55 || Number(coverage[0]?.ticker_count ?? 0) < 100;
    missing = await missingDates();
  } catch (error) {
    issues.push(`Could not read cached history: ${(error as Error).message}`);
  }

  if (thin && key.ok) {
    try {
      const back = await backfillHistory();
      if (back.days_stored > 0) {
        repairs.push(
          `Rebuilt price history: ${back.days_stored} sessions for ${back.tickers} tickers (${back.feed}).`,
        );
        missing = await missingDates();
      } else {
        issues.push("The data feed returned no usable history for the scan window.");
      }
    } catch (error) {
      issues.push(`Could not rebuild price history: ${(error as Error).message}`);
    }
  }

  if (missing.length > 0) {
    if (key.ok) {
      let cached = 0;
      for (const date of missing.slice(-3)) {
        try {
          const res = await cacheOneDay(date);
          if (res.trading_day) cached += 1;
        } catch (error) {
          issues.push(`Failed to cache ${date}: ${(error as Error).message}`);
          break;
        }
      }
      if (cached > 0) repairs.push(`Downloaded ${cached} missing day(s) of price history.`);
      if (missing.length > 3) {
        issues.push(`${missing.length} days of price history are still missing.`);
      }
    } else {
      issues.push(`${missing.length} days of price history missing and the data key is failing.`);
    }
  }


  // 3. Did today's scan run? Re-score if it did not and the market is open.
  const { data: run } = await supabaseAdmin
    .from("scan_runs")
    .select("run_date, scored_count, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastRun = run as { run_date?: string; scored_count?: number } | null;
  if (status.tradingDay && lastRun?.run_date !== status.nyDate) {
    if (key.ok && missing.length === 0) {
      try {
        const res = await runScan();
        repairs.push(`Re-ran the scan (${res.scored_count} names scored).`);
      } catch (error) {
        issues.push(`Scan retry failed: ${(error as Error).message}`);
      }
    } else {
      issues.push("Today's scan has not run yet.");
    }
  }
  if (lastRun && Number(lastRun.scored_count ?? 0) === 0) {
    // A zero-score scan is usually stale/thin data rather than bad settings, so
    // try once more now that the history has been repaired.
    let recovered = false;
    if (key.ok && missing.length === 0) {
      try {
        const res = await runScan();
        if (res.scored_count > 0) {
          repairs.push(`Rescored the market after an empty scan (${res.scored_count} names).`);
          recovered = true;
        }
      } catch (error) {
        issues.push(`Rescore after an empty scan failed: ${(error as Error).message}`);
        recovered = true;
      }
    }
    if (!recovered) {
      issues.push("The last scan scored zero names — check the liquidity gates in Settings.");
    }
  }


  // 4. Simulated positions that should have been closed already.
  const { data: stale } = await supabaseAdmin
    .from("trades")
    .select("ticker, entry_date, kind")
    .eq("status", "open")
    .eq("mode", "paper")
    .eq("kind", "day")
    .lt("entry_date", status.nyDate);
  if ((stale ?? []).length > 0) {
    try {
      const { managePaperTrades } = await import("./scan.server");
      const res = await managePaperTrades({ phase: "exit" });
      if (res.closed.length > 0) {
        repairs.push(`Closed ${res.closed.length} simulated day trade(s) left open.`);
      } else {
        issues.push(`${(stale ?? []).length} simulated day trade(s) are stuck open.`);
      }
    } catch (error) {
      issues.push(`Could not settle stuck day trades: ${(error as Error).message}`);
    }
  }

  const ok = issues.length === 0;
  const checkedAt = new Date().toISOString();

  await supabaseAdmin.from("health_checks").insert({
    ok,
    issues: issues as never,
    repairs: repairs as never,
    note: `${status.label} — ${status.detail}`,
  });

  if (!ok) {
    await notify({
      kind: "health",
      title: issues.length === 1 ? "ASTR found a problem" : `ASTR found ${issues.length} problems`,
      body:
        issues.slice(0, 3).join(" ") +
        (repairs.length > 0 ? ` Fixed automatically: ${repairs.join(" ")}` : ""),
      severity: "bad",
      action: "Open the app to review",
      dedupe_key: `health:${issues[0]?.slice(0, 60)}:${status.nyDate}`,
    });
  } else if (repairs.length > 0) {
    await notify({
      kind: "health",
      title: "ASTR fixed itself",
      body: repairs.join(" "),
      severity: "good",
      dedupe_key: `health-fix:${repairs.join("|").slice(0, 60)}:${status.nyDate}`,
    });
  }

  return { ok, issues, repairs, checked_at: checkedAt };
}
