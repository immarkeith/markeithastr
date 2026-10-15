/**
 * Health monitor. Runs on a schedule (more often during market hours) and
 * checks the things that actually break: the market-data key, how fresh the
 * cached price history is, whether today's scan happened, and whether any
 * simulated position is stuck open. Problems it can fix, it fixes; anything
 * else becomes a notification. Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logRepair } from "./repair-log.server";

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

  // Recent self-check history. Used to stop the same repair from being retried
  // in a loop: if a repair already ran a few minutes ago, the cause is not
  // something a second identical attempt will fix, so it is reported once
  // instead of being hammered every cycle.
  const { data: recentRows } = await supabaseAdmin
    .from("health_checks")
    .select("issues, repairs, checked_at")
    .order("checked_at", { ascending: false })
    .limit(8);
  const recent = (recentRows ?? []) as {
    issues: unknown;
    repairs: unknown;
    checked_at: string;
  }[];
  const asList = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);
  /** Did we already perform this kind of repair inside the cooldown window? */
  const repairedRecently = (needle: string, minutes: number) =>
    recent.some(
      (row) =>
        Date.now() - new Date(row.checked_at).getTime() < minutes * 60_000 &&
        asList(row.repairs).some((r) => r.toLowerCase().includes(needle)),
    );
  /** Has this exact problem been reported in the last few checks already? */
  const alreadyReported = (needle: string) =>
    recent
      .slice(0, 4)
      .some((row) => asList(row.issues).some((i) => i.toLowerCase().includes(needle)));


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
    // IEX does not print every tracked symbol every day. Judging the entire
    // cache by only the newest session caused a complete history rebuild every
    // 15 minutes, even when 150+ usable sessions were already present. Treat
    // the cache as thin only when it lacks scoring depth or has never had a
    // reasonably broad session.
    const widestSession = coverage.reduce(
      (widest, day) => Math.max(widest, Number(day.ticker_count ?? 0)),
      0,
    );
    thin = coverage.length < 55 || widestSession < 50;
    missing = await missingDates();
  } catch (error) {
    issues.push(`Could not read cached history: ${(error as Error).message}`);
  }

  if (thin && key.ok) {
    if (repairedRecently("rebuilt price history", 60)) {
      // A rebuild just ran. Doing it again cannot help and only burns data
      // requests, so report the underlying cause once instead of looping.
      if (!alreadyReported("price history is still too thin")) {
        issues.push(
          "Price history is still too thin after a recent rebuild — the data feed is not returning enough sessions.",
        );
      }
    } else {
      try {
        const back = await backfillHistory();
        if (back.days_stored > 0) {
          repairs.push(
            `Rebuilt price history: ${back.days_stored} sessions for ${back.tickers} tickers (${back.feed}).`,
          );
          const missingBeforeBackfill = missing.length;
          missing = await missingDates();
          await logRepair({
            repair_type: "backfill_history",
            target: "price-history-cache",
            before_status: { missing_days: missingBeforeBackfill, thin: true },
            after_status: { days_stored: back.days_stored, tickers: back.tickers, feed: back.feed, missing_after: missing.length },
            verified: back.days_stored > 0,
            verification_note: `${back.days_stored} sessions stored; ${missing.length} days still missing`,
          });
        } else {
          issues.push("The data feed returned no usable history for the scan window.");
        }
      } catch (error) {
        issues.push(`Could not rebuild price history: ${(error as Error).message}`);
      }
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
      if (cached > 0) {
        repairs.push(`Downloaded ${cached} missing day(s) of price history.`);
        await logRepair({
          repair_type: "cache_missing_days",
          target: "recent-missing-days",
          after_status: { cached_days: cached },
          verified: cached > 0,
          verification_note: `${cached} missing day(s) downloaded`,
        });
      }
      // Re-read coverage so a day we just downloaded no longer blocks the scan
      // repair below (that stale list is why the scan never got re-run).
      try {
        missing = await missingDates();
      } catch {
        /* keep the previous list */
      }
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
        await logRepair({
          repair_type: "rerun_scan",
          target: status.nyDate,
          after_status: { scored_count: res.scored_count },
          verified: res.scored_count > 0,
          verification_note: `Scan re-ran; ${res.scored_count} names scored`,
        });
      } catch (error) {
        issues.push(`Scan retry failed: ${(error as Error).message}`);
      }
    } else {
      issues.push("Today's scan has not run yet.");
    }
  }
  if (lastRun && Number(lastRun.scored_count ?? 0) === 0) {
    // A zero-score scan is usually stale/thin data rather than bad settings, so
    // try once more now that the history has been repaired — but only if a
    // rescore has not already been attempted in the last half hour.
    let recovered = false;
    if (key.ok && missing.length === 0 && !repairedRecently("rescored the market", 30)) {
      try {
        const res = await runScan();
        if (res.scored_count > 0) {
          repairs.push(`Rescored the market after an empty scan (${res.scored_count} names).`);
          recovered = true;
          await logRepair({
            repair_type: "rescore_empty_scan",
            target: "market-rescore",
            after_status: { scored_count: res.scored_count },
            verified: true,
            verification_note: `Recovered from zero-score scan; ${res.scored_count} names`,
          });
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
    // Paper-race rows carry a strategy_id and are managed by the Research Lab.
    .is("strategy_id", null)
    .eq("mode", "paper")
    .eq("kind", "day")
    .lt("entry_date", status.nyDate);
  if ((stale ?? []).length > 0) {
    try {
      const { managePaperTrades } = await import("./scan.server");
      // These rows are explicitly legacy simulated positions. The app may now
      // be in live mode, so do not let the current setting redirect this repair
      // toward the live book and leave the paper rows stuck forever.
      const res = await managePaperTrades({ phase: "exit", mode: "paper" });
      if (res.closed.length > 0) {
        repairs.push(`Closed ${res.closed.length} simulated day trade(s) left open.`);
        await logRepair({
          repair_type: "settle_stale_paper",
          target: "stale-day-trades",
          before_status: { stuck_count: (stale ?? []).length },
          after_status: { closed_count: res.closed.length },
          verified: res.closed.length > 0,
          verification_note: `${res.closed.length} stuck day trade(s) settled`,
        });
      } else {
        issues.push(`${(stale ?? []).length} simulated day trade(s) are stuck open.`);
      }
    } catch (error) {
      issues.push(`Could not settle stuck day trades: ${(error as Error).message}`);
    }
  }

  // 5. Broker orders the app never recorded. This is read-only: it reports the
  // mismatch (with the order ids, so the source can be traced) and never trades
  // to "fix" it. Positions themselves get adopted by the pre-close pass.
  if (settings.paper_mode === false) {
    try {
      const { listOrdersSince } = await import("./broker.server");
      const since = `${status.nyDate}T00:00:00Z`;
      const orders = (await listOrdersSince("live", since)).filter(
        (o) => o.status === "filled" && o.filled_qty > 0,
      );
      if (orders.length > 0) {
        const { data: ledgerRows } = await supabaseAdmin
          .from("ledger_entries")
          .select("note")
          .gte("entry_date", status.nyDate);
        const notes = (ledgerRows ?? []).map((r) => String(r.note ?? "")).join(" ");
        const orphans = orders.filter((o) => !notes.includes(o.order_id));
        if (orphans.length > 0) {
          issues.push(
            `${orphans.length} broker order(s) today are not in the app's records: ${orphans
              .map((o) => `${o.side} ${o.ticker} @ ${o.filled_price ?? "?"} (${o.submitted_at ?? "?"}, order ${o.order_id})`)
              .join("; ")}.`,
          );
        }
      }
    } catch (error) {
      if (!alreadyReported("could not compare broker orders")) {
        issues.push(`Could not compare broker orders: ${(error as Error).message}`);
      }
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

  // Only alert when something still needs the user. Self-repairs are logged to
  // the self-check history but never pushed as a notification.
  if (!ok) {
    await notify({
      kind: "health",
      title: issues.length === 1 ? "ASTR needs a fix" : `ASTR needs ${issues.length} fixes`,
      body:
        issues.slice(0, 3).join(" ") +
        (repairs.length > 0 ? ` Fixed automatically: ${repairs.join(" ")}` : ""),
      severity: "bad",
      action: "Open the app to review",
      dedupe_key: `health:${issues[0]?.slice(0, 60)}:${status.nyDate}`,
    });
  }


  return { ok, issues, repairs, checked_at: checkedAt };
}
