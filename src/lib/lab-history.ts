/** Shared runtime contract: saved research evidence is untrusted until validated. */
import { z } from 'zod';
import { SELECTION_LANES } from './selection-curve';
export const HISTORY_VERSION = 'selection-layer2-v1';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)));
const count = z.number().finite().int().nonnegative();
const curve = z.object({
  lane: z.enum(SELECTION_LANES),
  points: z.array(z.object({ date, equity: z.number().finite() })).min(1),
  trades: count, wins: count, total_pnl: z.number().finite(),
  pending: count, excluded: count, no_pick: count, missing_evaluations: count, has_gaps: z.boolean(),
}).refine(value => value.wins <= value.trades)
  .refine(value => value.points.every((point, i) => i === 0 || point.date > (value.points[i - 1]?.date ?? '')));
const schema = z.object({
  from: date, to: date, selection_to: date,
  universe: count.positive(), universe_basis: z.string().min(1),
  selection_sessions: count.positive(), market_sessions: count.positive(),
  generated_at: z.string().datetime(), version: z.literal(HISTORY_VERSION),
  curves: z.array(curve).length(SELECTION_LANES.length),
}).refine(value => new Set(value.curves.map(c => c.lane)).size === SELECTION_LANES.length)
  .refine(value => value.from <= value.selection_to && value.selection_to <= value.to)
  .refine(value => value.selection_sessions <= value.market_sessions)
  .refine(value => value.curves.every(c => c.points.length === value.market_sessions
    && c.points[0]?.date === value.from && c.points.at(-1)?.date === value.to));
export type LabHistory = z.infer<typeof schema>;
export function parseLabHistory(value: unknown): LabHistory | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}