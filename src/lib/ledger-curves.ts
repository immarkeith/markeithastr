interface CurveLike {
  strategy_id: string;
  points: { date: string; equity: number }[];
}

/** Ledger curves replace fallback curves per strategy; unmatched ledger lanes are appended. */
export function mergeLedgerCurves<T extends CurveLike, L extends T>(fallback: T[], ledger: L[]): T[] {
  const byId = new Map(ledger.filter((c) => c.points.length > 0).map((c) => [c.strategy_id, c]));
  const merged: T[] = fallback.map((c) => byId.get(c.strategy_id) ?? c);
  const used = new Set(fallback.map((c) => c.strategy_id));
  for (const c of byId.values()) if (!used.has(c.strategy_id)) merged.push(c);
  return merged;
}
