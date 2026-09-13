import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

export const getScoreboard = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const [{ departmentOverview }, { loadSlots, rankSlots }, { verificationOverview }, { supabaseAdmin }] =
      await Promise.all([
        import("./department.server"),
        import("./race.server"),
        import("./verification.server"),
        import("@/integrations/supabase/client.server"),
      ]);

    const [department, slots, verification, latestRun, watchlist, settings] = await Promise.all([
      departmentOverview(),
      loadSlots(),
      verificationOverview(),
      supabaseAdmin.from("scan_runs").select("id, run_date").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from("watchlist_candidates").select("ticker, streak_days, status, best_pick_ever"),
      supabaseAdmin.from("app_settings").select("active_strategy_id").eq("id", 1).maybeSingle(),
    ]);

    const paperRanks = await rankSlots(slots.filter((slot) => slot.enabled));
    const run = latestRun.data;
    const { data: liveScores } = run
      ? await supabaseAdmin
          .from("scan_scores")
          .select("ticker, rank, score, close, tradeable")
          .eq("run_id", run.id)
          .order("rank", { ascending: true })
          .limit(10)
      : { data: [] };

    const strategyIds = Array.from(
      new Set([settings.data?.active_strategy_id, ...slots.map((slot) => slot.strategy_id)].filter(Boolean)),
    ) as string[];
    const { data: strategies } = strategyIds.length
      ? await supabaseAdmin.from("strategies").select("id, name, description").in("id", strategyIds)
      : { data: [] as Array<{ id: string; name: string; description: string | null }> };
    const strategyById = new Map((strategies ?? []).map((strategy) => [String(strategy.id), strategy]));
    const board = department.last_run?.summary?.board;

    const sources = [
      {
        id: "live",
        name: "Live Trading Bot",
        kind: "live" as const,
        enabled: true,
        description:
          strategyById.get(String(settings.data?.active_strategy_id ?? ""))?.description ??
          "The formula currently used by ASTR's live trading bot.",
        as_of: run?.run_date ?? null,
        rows: (liveScores ?? []).map((row) => ({
          ticker: String(row.ticker),
          rank: Number(row.rank),
          score: Number(row.score),
          close: Number(row.close),
          tradeable: Boolean(row.tradeable),
        })),
      },
      ...slots.map((slot) => ({
        id: `paper:${slot.strategy_id}`,
        name: slot.name,
        kind: "paper" as const,
        enabled: slot.enabled,
        description: slot.description,
        as_of: run?.run_date ?? null,
        rows: (paperRanks.get(slot.id) ?? []).slice(0, 10),
      })),
      ...department.researchers.map((researcher) => ({
        id: `research:${researcher.lane}`,
        name: researcher.name,
        kind: "research" as const,
        enabled: researcher.enabled,
        description: researcher.mission || researcher.focus,
        as_of: board?.date ?? null,
        rows:
          researcher.lane === "skeptic"
            ? []
            : [...(board?.stocks ?? [])]
                .filter((stock) => stock.scores[researcher.lane] !== undefined)
                .sort(
                  (a, b) =>
                    Number(b.scores[researcher.lane] ?? 0) -
                    Number(a.scores[researcher.lane] ?? 0),
                )
                .slice(0, 10)
                .map((stock, index) => ({
                  ticker: stock.ticker,
                  rank: index + 1,
                  score: Number(stock.scores[researcher.lane] ?? 0),
                  close: stock.close,
                  tradeable: stock.likes.includes(researcher.lane),
                })),
      })),
    ];

    return {
      sources,
      watchlist: watchlist.data ?? [],
      assistants: verification.latest,
      lead: department.last_run?.summary?.balanced ?? null,
      findings: department.findings.slice(0, 12),
    };
  });