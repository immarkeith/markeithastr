import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled daily cycle: cache bars, re-score the universe, run the simulated
 * (paper) trade rules. Called by the database scheduler after the close.
 */
export const Route = createFileRoute("/api/public/hooks/daily-cycle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { rejectUnauthorizedHook } = await import("@/lib/hooks.server");
        const denied = await rejectUnauthorizedHook(request);
        if (denied) return denied;
        try {
          const { runDailyCycle, loadSettings } = await import("@/lib/scan.server");
          // Paper testing is independent of the live switch (see preopen hook).
          const { runPaperTesting } = await import("@/lib/race.server");
          const paper = await runPaperTesting("exit");
          // One research-department generation per market day. Pure replay of
          // cached bars, so it never costs data calls — and it runs whether or
          // not the live bot is switched on.
          const { runDepartment } = await import("@/lib/department.server");
          let department: unknown = null;
          try {
            department = await runDepartment({ universe: 250 });
          } catch (depError) {
            console.error(
              "research department pass failed:",
              depError instanceof Error ? depError.message : depError,
            );
          }
          // Long-horizon paper predictions whose date has arrived get their real
          // outcome appended. Paper bookkeeping only.
          let horizons: unknown = null;
          try {
            const { evaluateDueHorizons } = await import("@/lib/long-term-research.server");
            horizons = await evaluateDueHorizons();
          } catch (horizonError) {
            console.error("horizon evaluation failed:", horizonError);
          }
          // Research-only Event Intelligence + deeper shared history. Fail-safe.
          let events: unknown = null;
          try {
            const ev = await import("@/lib/events.server");
            const { deepenHistory } = await import("@/lib/historical-data.server");
            events = { scan: await ev.scanEvents(), lead: await ev.evaluateEvents(), history: await deepenHistory() };
          } catch (evError) {
            console.error("event intelligence failed:", evError instanceof Error ? evError.message : evError);
          }
          void events;
          // Paper-only history rebuild continues a little each day until caught up.
          try {
            const { runHistoryRebuild } = await import("@/lib/replay.server");
            await runHistoryRebuild(4000);
          } catch (rbError) {
            console.error("history rebuild step failed:", rbError instanceof Error ? rbError.message : rbError);
          }
          // End of day: the full graph rebuild lands here, after the replay
          // step, so backfilled price history is folded in the same night —
          // realized P&L and new bars are computed once, not per visit.
          try {
            const { rebuildLabGraph } = await import("@/lib/lab-graph.server");
            await rebuildLabGraph();
          } catch (graphError) {
            console.error(
              "end-of-day lab graph rebuild failed:",
              graphError instanceof Error ? graphError.message : graphError,
            );
          }
          // Phase E: Lead Researcher Quantitative Self-Audit post-market run
          try {
            const { runLeadSelfAudit } = await import("@/lib/audit.server");
            const auditReport = await runLeadSelfAudit();
            if (auditReport.overallVerdict === "FAIL") {
              console.error("[LEAD SELF-AUDIT] Quantitative Audit FAILED:", auditReport.discrepancies);
            }
          } catch (auditErr) {
            console.error("lead self-audit failed:", auditErr instanceof Error ? auditErr.message : auditErr);
          }

          const settings = await loadSettings();
          if (!(settings as unknown as { auto_run: boolean }).auto_run) {
            return Response.json({ ran: false, reason: "auto_run is off", paper, department, horizons });
          }
          const result = await runDailyCycle();
          return Response.json({ ...result, paper, department, horizons });
        } catch (error) {
          const message = error instanceof Error ? error.message : "cycle failed";
          console.error("daily-cycle failed:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
