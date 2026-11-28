# Formula evolution — Phase 1

## Delivered

- Private formula definitions for seven independent paper lanes, permanent V0 benchmarks, candidate records, archived experiments and seasonal observations.
- Separate champion pointers initially reference V0. V0 never changes status; it is not duplicated to impersonate an active version. This needs four tables rather than the three originally sketched.
- Database locks serialize registration, archiving and promotion per lane. A stale champion comparison is rejected, version numbers increase independently, and champion consistency is checked at transaction completion.
- Runtime contracts validate weights, gates, holding horizons, evidence and chronological validation windows. The database independently rejects invalid transitions and protects retained definitions/evidence.
- Thirty **evaluated market sessions** is a review point, not 30 elapsed calendar days or automatic failure. No-opportunity or immature 180-session evidence remains insufficient; an operator/Phase 2 policy must consider seasonality before archiving. The archive stores why testing stopped and whether the formula can be reconsidered.

## Authentic baseline corrections

Inspection of `department.server.ts` showed the earlier plan's RSI/ATR/volume gates are optional experiment variants, not `laneSeedParams` defaults. V0 uses the real seed weights, neutral nullable gates and the configured minimum score/pick count at installation. The real holding fallback is three sessions for all lanes, not the illustrative per-lane holds in the plan.

Lead V0 captures its **configured core seed**, not the dynamic master-rule assembly and not a claim that this formula existed in 2021. Specialist V0 captures the original `LANES.seed` definitions, not currently evolved researcher parameters. The new registry is disconnected from operational formulas: its initial champion is a benchmark reference, not a declaration that it is the current live/paper strategy. Original scoring implementation is referenced by source revision; variable lookback invention and execution are Phase 2 work.

All performance fields are empty/unmeasured. No historical results are fabricated or backdated. Existing picks, ledger rows, bars, Lab snapshots, broker orders and settings are unchanged.

## Validation boundary

Promotion infrastructure requires a predeclared immutable comparison policy, matching candidate/champion identities, identical friction, adequate samples, separate chronological validation folds, positive Sharpe and return improvement, and no deterioration in Sortino, annualized return, drawdown, profit factor or alpha. No universal numerical improvement threshold is invented: the caller must freeze positive thresholds before testing.

Win rate and trading frequency are retained in the evidence, not individually forced upward (a stronger strategy can trade less often). The evidence contract also requires point-in-time, protected-validation and stress-test attestations. **These checks validate the evidence contract, not the truth of historical price research.** The protected data splitter, embargo/purge logic, chronological evaluator, holding-duration maturity checks, regime/seasonal tests and actual evidence producer still belong to Phase 2. No AI claim, browser toggle or user-supplied JSON is exposed as a promotion endpoint.

Seasonal hypotheses need observations from at least two distinct years. This is a storage prerequisite, not statistical proof of a repeatable pattern. Phase 1's helper only records hypotheses; it does not certify seasonal patterns or change scores.

## Production installation

The connected project's database has the new registry installed. This does **not** prove the separate Vercel production database has it.

For the existing independent production database:

1. Deploy this commit through the existing GitHub → Vercel process.
2. If Phase 1 tables are absent, run `migration/fresh/23-researcher-formula-evolution.sql` once in the production SQL editor. It contains all three applied additive migrations and transaction wrappers; it reads existing settings but does not modify them. Run the whole file. It requires the existing `app_settings` row and database roles. Do not rerun the full file after installation: its policy/trigger creation is intentionally one-time. If a partial installation already exists, check which of the three migrations is missing rather than rerunning the combined file.
3. Run the read-only `bun scripts/verify-formula-evolution.ts` using production server environment variables. It must return seven benchmarks and seven eligible champions. It does not seed or change any data.
4. Optional database verification: `psql -X -v ON_ERROR_STOP=1 -f scripts/test-formula-evolution.sql`. Every test write rolls back. Never remove the transaction/rollback wrappers.

No new secret, AI call, paid service or scheduled job is needed. Formula discovery and operational activation are **not enabled** by installing Phase 1.

## Verification

- Domain rule/regression tests are in `src/lib/formula-evolution.test.ts`.
- The full existing `src/lib` test suite passed: **230 tests**, including 18 new formula contract tests.
- Real database lifecycle assertions passed through the migration tool's privileged transaction, including promotion/readback, succession, archival, stale comparisons, benchmark immutability and browser-access denial. Every test candidate/promotion was rolled back. `scripts/test-formula-evolution.sql` retains the equivalent reusable test flow; it requires a database administrator able to assume `service_role` (the sandbox shell account cannot do so).
- Read-only server helper verification returned seven V0 benchmarks and seven champion pointers referencing those benchmarks. The preview's latest automatic build reports `build OK`.
- Production schema/deployment and any future discovery behavior remain unverified until executed there. This phase does not claim a production formula improvement.