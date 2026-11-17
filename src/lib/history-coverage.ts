/** Coverage is a data-completeness gate, not permission to trade. */
export const MIN_HISTORY_COVERAGE = 0.8;

export function historyCoverage(available: number, todayUniverse: number, verifiedNotYetListed = 0) {
  if (![available, todayUniverse, verifiedNotYetListed].every(Number.isInteger)
    || todayUniverse <= 0 || available < 0 || verifiedNotYetListed < 0
    || verifiedNotYetListed >= todayUniverse || available > todayUniverse - verifiedNotYetListed) {
    throw new Error('Invalid comparable-universe counts');
  }
  const comparable = todayUniverse - verifiedNotYetListed;
  const required = Math.ceil(comparable * MIN_HISTORY_COVERAGE);
  return { comparable, required, available, fraction: available / comparable, passes: available >= required };
}