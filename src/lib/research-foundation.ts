import { completedResearchSession } from './research-session';
export const RESEARCH_START_DATE = '2021-06-01';

/** Shared authentic session foundation; density is evidence, not a percentage cutoff.
 * Individual indicator warm-up and price/liquidity eligibility remain independent.
 */
export function researchFoundationDates(benchmarkDates: readonly string[], start: string, now = new Date()): string[] {
  return [...new Set(benchmarkDates)].filter(date => date >= start && completedResearchSession(date, now)).sort();
}