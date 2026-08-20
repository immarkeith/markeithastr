/**
 * Dynamic capital & position scaling ("the capital ladder").
 *
 * The desk sizes itself to the account instead of stopping when money is tight:
 * it grows only after the next level's required capital has been held for a
 * proven number of consecutive trading days, and it shrinks one step at a time
 * when capital stays below the current level's requirement.
 *
 * Ladder order (lowest exposure first). Recovery is the exact reverse of the
 * way down: position size climbs back to the standard stake before the number
 * of daily stocks starts growing again.
 */

export const CUSHION = 10;
export const STANDARD_DOLLARS = 20;
export const MIN_DOLLARS = 10;
export const STABLE_DAYS_REQUIRED = 5;
export const BREACH_DAYS_REQUIRED = 2;
export const MAX_STOCKS = 4;

export interface LadderStep {
  stocks: number;
  dollars: number;
}

/** Ascending exposure. Size steps first, then stock-count steps. */
export const LADDER: LadderStep[] = [
  { stocks: 1, dollars: 10 },
  { stocks: 1, dollars: 15 },
  { stocks: 1, dollars: 20 },
  { stocks: 2, dollars: 20 },
  { stocks: 3, dollars: 20 },
  { stocks: 4, dollars: 20 },
];

/** ($ per stock x stocks) + the untouched safety cushion. */
export function requiredCapital(step: LadderStep): number {
  return step.stocks * step.dollars + CUSHION;
}

export function describeStep(step: LadderStep): string {
  return `${step.stocks} stock${step.stocks === 1 ? "" : "s"}/day at $${step.dollars}`;
}

/** Closest ladder index for a stored level (tolerates hand-edited settings). */
export function ladderIndex(stocks: number, dollars: number): number {
  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  LADDER.forEach((step, i) => {
    const score = Math.abs(step.stocks - stocks) * 100 + Math.abs(step.dollars - dollars);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export interface LadderState {
  stocks_per_day: number;
  position_dollars: number;
  stable_days: number;
  breach_days: number;
  hold_level: boolean;
  last_evaluated_date: string | null;
}

export interface LadderDecision {
  index: number;
  step: LadderStep;
  required: number;
  next: LadderStep | null;
  next_required: number | null;
  stable_days: number;
  breach_days: number;
  direction: "up" | "down" | "hold";
  reason: string;
}

/**
 * Pure ladder math. `capital` is settled/available cash PLUS banked profit —
 * saved profit counts as cushion but is never invested automatically.
 */
export function evaluateLadder(state: LadderState, capital: number): LadderDecision {
  const index = ladderIndex(Number(state.stocks_per_day), Number(state.position_dollars));
  const step = LADDER[index]!;
  const required = requiredCapital(step);
  const nextStep = index + 1 < LADDER.length ? LADDER[index + 1]! : null;
  const nextRequired = nextStep ? requiredCapital(nextStep) : null;

  let stable = Number(state.stable_days) || 0;
  let breach = Number(state.breach_days) || 0;

  const base = {
    index,
    step,
    required,
    next: nextStep,
    next_required: nextRequired,
  };

  if (state.hold_level) {
    return {
      ...base,
      stable_days: stable,
      breach_days: breach,
      direction: "hold",
      reason: "Scaling is frozen — level held manually.",
    };
  }

  // --- below the current level's requirement: consider stepping down --------
  // A rounding-sized miss (a few cents of fees or a stale quote) is not a real
  // shortfall and must never shrink the stake.
  if (capital < required - BREACH_TOLERANCE) {
    breach += 1;
    stable = 0;
    if (breach >= BREACH_DAYS_REQUIRED && index > 0) {
      const downIndex = index - 1;
      const downStep = LADDER[downIndex]!;
      return {
        index: downIndex,
        step: downStep,
        required: requiredCapital(downStep),
        next: step,
        next_required: required,
        stable_days: 0,
        breach_days: 0,
        direction: "down",
        reason: `Capital $${capital.toFixed(2)} stayed under the $${required.toFixed(
          2,
        )} needed for ${describeStep(step)} — scaled down to ${describeStep(downStep)}.`,
      };
    }
    return {
      ...base,
      stable_days: 0,
      breach_days: breach,
      direction: "hold",
      reason:
        index === 0
          ? `Capital $${capital.toFixed(2)} is under the $${required.toFixed(
              2,
            )} floor — holding at the minimum $${MIN_DOLLARS} position until cash clears.`
          : `Under the $${required.toFixed(2)} requirement for ${
              BREACH_DAYS_REQUIRED - breach
            } more day(s) before scaling down.`,
    };
  }

  // --- at or above the requirement: consider stepping up -------------------
  breach = 0;
  if (!nextStep || nextRequired === null) {
    return {
      ...base,
      stable_days: 0,
      breach_days: 0,
      direction: "hold",
      reason: `Top of the ladder — ${describeStep(step)}.`,
    };
  }

  if (capital < nextRequired) {
    return {
      ...base,
      stable_days: 0,
      breach_days: 0,
      direction: "hold",
      reason: `Needs $${nextRequired.toFixed(2)} to reach ${describeStep(
        nextStep,
      )} — currently $${capital.toFixed(2)}.`,
    };
  }

  stable += 1;
  if (stable >= STABLE_DAYS_REQUIRED) {
    return {
      index: index + 1,
      step: nextStep,
      required: nextRequired,
      next: index + 2 < LADDER.length ? LADDER[index + 2]! : null,
      next_required: index + 2 < LADDER.length ? requiredCapital(LADDER[index + 2]!) : null,
      stable_days: 0,
      breach_days: 0,
      direction: "up",
      reason: `Held $${nextRequired.toFixed(
        2,
      )} for ${STABLE_DAYS_REQUIRED} straight trading days — scaled up to ${describeStep(nextStep)}.`,
    };
  }

  return {
    ...base,
    stable_days: stable,
    breach_days: 0,
    direction: "hold",
    reason: `${stable} of ${STABLE_DAYS_REQUIRED} stable days toward ${describeStep(nextStep)}.`,
  };
}

// --------------------------------------------------------------- persistence

const DEFAULT_STATE: LadderState = {
  stocks_per_day: 1,
  position_dollars: STANDARD_DOLLARS,
  stable_days: 0,
  breach_days: 0,
  hold_level: false,
  last_evaluated_date: null,
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadLadder(): Promise<LadderState> {
  const db = await admin();
  const { data } = await db
    .from("capital_ladder_state" as never)
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return { ...DEFAULT_STATE };
  const row = data as unknown as Record<string, unknown>;
  return {
    stocks_per_day: Number(row['stocks_per_day'] ?? 1),
    position_dollars: Number(row['position_dollars'] ?? STANDARD_DOLLARS),
    stable_days: Number(row['stable_days'] ?? 0),
    breach_days: Number(row['breach_days'] ?? 0),
    hold_level: row['hold_level'] === true,
    last_evaluated_date: (row['last_evaluated_date'] as string | null) ?? null,
  };
}

/**
 * Evaluate the ladder once for a trading day and persist the outcome. Called
 * after the day's exits have closed, so the day's result is included before a
 * stable day is counted.
 */
export async function applyLadder(
  capital: number,
  day: string,
): Promise<LadderDecision & { changed: boolean; applied: boolean }> {
  const db = await admin();
  const state = await loadLadder();
  const decision = evaluateLadder(state, capital);

  // Already scored today: report the stored level without double-counting.
  if (state.last_evaluated_date === day) {
    const index = ladderIndex(state.stocks_per_day, state.position_dollars);
    const step = LADDER[index]!;
    const nextStep = index + 1 < LADDER.length ? LADDER[index + 1]! : null;
    return {
      index,
      step,
      required: requiredCapital(step),
      next: nextStep,
      next_required: nextStep ? requiredCapital(nextStep) : null,
      stable_days: state.stable_days,
      breach_days: state.breach_days,
      direction: "hold",
      reason: "Already evaluated today.",
      changed: false,
      applied: false,
    };
  }

  const changed =
    decision.step.stocks !== state.stocks_per_day ||
    decision.step.dollars !== Number(state.position_dollars);

  await db
    .from("capital_ladder_state" as never)
    .upsert({
      id: 1,
      stocks_per_day: decision.step.stocks,
      position_dollars: decision.step.dollars,
      stable_days: decision.stable_days,
      breach_days: decision.breach_days,
      hold_level: state.hold_level,
      last_evaluated_date: day,
    } as never);

  if (changed) {
    await db.from("capital_ladder_events" as never).insert({
      event_date: day,
      direction: decision.direction,
      from_stocks: state.stocks_per_day,
      from_dollars: Number(state.position_dollars),
      to_stocks: decision.step.stocks,
      to_dollars: decision.step.dollars,
      capital: Number(capital.toFixed(2)),
      required: Number(decision.required.toFixed(2)),
      note: decision.reason,
    } as never);

    const { notify } = await import("./notify.server");
    await notify({
      kind: "trade",
      title: decision.direction === "up" ? "Scaled up" : "Scaled down",
      body: decision.reason,
      severity: decision.direction === "up" ? "info" : "warn",
      action: describeStep(decision.step),
      dedupe_key: `ladder-${day}-${decision.step.stocks}-${decision.step.dollars}`,
    });
  }

  return { ...decision, changed, applied: true };
}

export async function setLadderHold(hold: boolean): Promise<void> {
  const db = await admin();
  await db
    .from("capital_ladder_state" as never)
    .upsert({ id: 1, hold_level: hold } as never);
}
