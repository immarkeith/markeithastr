import { createServerFn } from "@tanstack/react-start";

import { requireGate } from "./gate-middleware";

export const getScoreboard = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const [
      { departmentOverview },
      { researchBoards },
      { verificationOverview },
      { masterFormulaOverview },
      { supabaseAdmin },
    ] = await Promise.all([
      import("./department.server"),
      import("./research-boards.server"),
      import("./verification.server"),
      import("./master-formula.server"),
      import("@/integrations/supabase/client.server"),
    ]);


    const [department, boards, verification, master, latestRun, watchlist, settings] =
      await Promise.all([
        departmentOverview(),
        researchBoards(),
        verificationOverview(),
        masterFormulaOverview(),
        supabaseAdmin.from("scan_runs").select("id, run_date").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("watchlist_candidates").select("ticker, streak_days, status, best_pick_ever"),
        supabaseAdmin.from("app_settings").select("active_strategy_id").eq("id", 1).maybeSingle(),
      ]);


    const run = latestRun.data;
    const { data: liveScores } = run
      ? await supabaseAdmin
          .from("scan_scores")
          .select("ticker, rank, score, close, tradeable")
          .eq("run_id", run.id)
          .order("rank", { ascending: true })
          .limit(10)
      : { data: [] };

    const strategyIds = [settings.data?.active_strategy_id].filter(Boolean) as string[];
    const { data: strategies } = strategyIds.length
      ? await supabaseAdmin.from("strategies").select("id, name, description").in("id", strategyIds)
      : { data: [] as Array<{ id: string; name: string; description: string | null }> };
    const strategyById = new Map((strategies ?? []).map((strategy) => [String(strategy.id), strategy]));

    // Exactly eight scoreboards: the live bot, the Lead Researcher's Master
    // Formula, and each of the six researchers' own formulas.
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
      {
        id: "research:lead",
        name: "Lead Researcher",
        kind: "research" as const,
        enabled: true,
        description: `The Master Formula${
          master.versions[0]?.version ? ` (${master.versions[0].version})` : ""
        } — validated findings only.`,
        as_of: boards.as_of,
        rows: (boards.boards.get("lead") ?? []).map((row) => ({
          ticker: row.ticker,
          rank: row.rank,
          score: row.score,
          close: row.close,
          tradeable: row.tradeable,
        })),
      },
      ...department.researchers.map((researcher) => ({
        id: `research:${researcher.lane}`,
        name: researcher.name,
        kind: "research" as const,
        enabled: researcher.enabled,
        description: researcher.mission || researcher.focus,
        as_of: boards.as_of,
        rows: (boards.boards.get(researcher.lane) ?? []).map((row) => ({
          ticker: row.ticker,
          rank: row.rank,
          score: row.score,
          close: row.close,
          tradeable: row.tradeable,
        })),
      })),
    ];

    const latestLead = master.lead_tests[0] ?? null;
    const activeRules = master.rules.filter((rule) => rule.status === "active");
    const observationRules = master.rules.filter((rule) => rule.status === "observation");

    return {
      sources,
      watchlist: watchlist.data ?? [],
      assistants: verification.latest,
      lead: department.last_run?.summary?.balanced ?? null,
      master: {
        version: master.versions[0]?.version ?? null,
        change_summary: master.versions[0]?.change_summary ?? null,
        skeptic_note: master.versions[0]?.skeptic_note ?? null,
        active_rules: activeRules.map((rule) => ({
          label: rule.label,
          discovered_by: rule.discovered_by,
          confirmations: rule.confirmations,
        })),
        observation_rules: observationRules.map((rule) => ({
          label: rule.label,
          discovered_by: rule.discovered_by,
          confirmations: rule.confirmations,
        })),
        retired: master.rules.filter((rule) => rule.status === "retired").length,
        lead_test: latestLead
          ? {
              test_date: latestLead.test_date,
              master_version: latestLead.master_version,
              picks: latestLead.picks.map((pick) => pick.ticker),
              same_day: Number(latestLead.horizons["same_day"] ?? 0),
              edge: latestLead.edge,
              verdict: latestLead.verdict,
              note: latestLead.note,
              contributing_rules: latestLead.contributing_rules,
            }
          : null,
      },
      findings: department.findings.slice(0, 12),
    };

  });