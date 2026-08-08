/**
 * Strategy library: named sets of scoring weights and trade rules that can be
 * switched on and off. Activating one copies its numbers into app_settings, so
 * going back to an older strategy is a single click. Server-only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const STRATEGY_KEYS = [
  "weight_trend",
  "weight_momentum",
  "weight_volume",
  "weight_relative_strength",
  "weight_volatility_quality",
  "min_score_to_trade",
  "num_day_trades",
  "dollars_per_day_trade",
  "swing_dollars",
  "swing_max_hold_days",
  "min_price",
  "min_avg_dollar_volume",
] as const;

export interface StrategyRow {
  id: string;
  name: string;
  description: string;
  params: Record<string, number>;
  builtin: boolean;
  created_at: string;
}

export async function listStrategies() {
  const { data, error } = await supabaseAdmin
    .from("strategies")
    .select("*")
    .order("builtin", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("active_strategy_id, strategy_enabled")
    .eq("id", 1)
    .maybeSingle();
  const row = settings as { active_strategy_id?: string | null; strategy_enabled?: boolean } | null;
  return {
    strategies: (data ?? []) as unknown as StrategyRow[],
    active_strategy_id: row?.active_strategy_id ?? null,
    strategy_enabled: row?.strategy_enabled !== false,
  };
}

/** Copy a strategy's numbers into the live settings and mark it active. */
export async function activateStrategy(id: string) {
  const { data, error } = await supabaseAdmin
    .from("strategies")
    .select("name, params")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  const params = (data!.params ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = { active_strategy_id: id, strategy_enabled: true };
  for (const key of STRATEGY_KEYS) {
    const value = params[key];
    if (typeof value === "number" && Number.isFinite(value)) patch[key] = value;
  }
  const { error: upErr } = await supabaseAdmin
    .from("app_settings")
    .update(patch as never)
    .eq("id", 1);

  if (upErr) throw new Error(upErr.message);
  return { ok: true, name: data!.name as string };
}

/** Master on/off switch: off keeps scoring and exits running, takes no entries. */
export async function setStrategyEnabled(enabled: boolean) {
  const { error } = await supabaseAdmin
    .from("app_settings")
    .update({ strategy_enabled: enabled })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  return { ok: true, enabled };
}

/** Snapshot the numbers currently in Settings as a reusable strategy. */
export async function saveCurrentStrategy(name: string, description: string) {
  const { data, error } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  const row = data as unknown as Record<string, unknown>;
  const params: Record<string, number> = {};
  for (const key of STRATEGY_KEYS) params[key] = Number(row[key]);

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("strategies")
    .insert({ name, description, params: params as never, builtin: false })
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  return { id: inserted!.id as string };
}

export async function deleteStrategy(id: string) {
  const { data } = await supabaseAdmin
    .from("strategies")
    .select("builtin")
    .eq("id", id)
    .maybeSingle();
  if ((data as { builtin?: boolean } | null)?.builtin) {
    throw new Error("Built-in strategies cannot be deleted.");
  }
  const { error } = await supabaseAdmin.from("strategies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
