/**
 * Passcode-gated server functions for the paper strategy race (Research Lab and
 * Research Log). All heavy work lives in race.server.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireGate } from "./gate-middleware";

export const fetchRace = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { raceStandings } = await import("./race.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const standings = await raceStandings();
    const { data: strategies } = await supabaseAdmin
      .from("strategies")
      .select("id, name, description")
      .order("name", { ascending: true });
    return { ...standings, strategies: strategies ?? [] };
  });

/** Realised paper trades grouped per strategy, for the Research Log. */
export const fetchRaceLog = createServerFn({ method: "GET" })
  .middleware([requireGate])
  .handler(async () => {
    const { raceStandings, loadSlots } = await import("./race.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [standings, slots] = await Promise.all([raceStandings(), loadSlots()]);
    const ids = slots.map((s) => s.strategy_id);
    const { data: trades } = ids.length
      ? await supabaseAdmin
          .from("trades")
          .select(
            "id, strategy_id, ticker, status, dollars, entry_date, entry_at, entry_price, exit_date, exit_at, exit_price, profit, kept, status_note",
          )
          .in("strategy_id", ids)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(600)
      : { data: [] as never[] };
    return {
      groups: standings.entrants
        .filter((e) => !e.live)
        .map((e) => ({
          strategy_id: e.strategy_id,
          name: e.name,
          rank: e.rank,
          total_pnl: e.total_pnl,
          win_rate: e.win_rate,
          trades: e.trades,
          stake: e.stake,
          enabled: e.enabled,
          rows: (trades ?? []).filter((t) => String(t.strategy_id) === e.strategy_id),
        })),
      live: standings.entrants.find((e) => e.live) ?? null,
    };
  });

export const updateRaceSlot = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        id: z.number().int().min(1).max(3),
        strategy_id: z.string().uuid().optional(),
        enabled: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { setSlot } = await import("./race.server");
    return setSlot(data);
  });

/** Deposit or withdraw a slot's simulated cash. */
export const adjustRaceCash = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        strategy_id: z.string().uuid(),
        amount: z.number(),
        note: z.string().max(200).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { adjustSlotCash } = await import("./race.server");
    return adjustSlotCash(data.strategy_id, data.amount, data.note);
  });

/** Manually open a simulated position inside one slot. */
export const openRaceTrade = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z
      .object({
        strategy_id: z.string().uuid(),
        ticker: z.string().min(1).max(10),
        entry_price: z.number().positive(),
        dollars: z.number().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { openSlotTradeManual } = await import("./race.server");
    return openSlotTradeManual(data);
  });

/** Run the simulated race now (used by the "Run test pass" button). */
export const runRaceNow = createServerFn({ method: "POST" })
  .middleware([requireGate])
  .inputValidator((input) =>
    z.object({ phase: z.enum(["entry", "exit", "both"]).default("both") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { runRacePass } = await import("./race.server");
    return runRacePass({ phase: data.phase });
  });
