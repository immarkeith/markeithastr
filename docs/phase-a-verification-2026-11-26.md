# Phase A verification — November 26, 2026

## Status: not complete

Phase B–E were not started. No live orders, trade changes, historical ledger rewrites, credential disclosure or schedule changes occurred.

## Confirmed baseline

- Canonical GitHub repository: `immarkeith/markeithastr`, branch `main`.
- Observed production revision before this work: `fd26a16b6560b37344daffe2d7325191c4bd4d57`, successful Vercel deployment.
- Production address: `https://astr-alpha.vercel.app`.
- The configured accessible database and the canonical repository's separate database defaults do not match. The available credential was rejected by the latter (401). Vercel environment settings cannot be inferred from repository defaults; its actual connection remains unverified.
- Eight active schedules were listed on the accessible database. Their metadata did not expose verified production targets; no successful production scheduled research run was certified.

## Graph audit results

- Seven lanes, 668 recorded sessions each, March 28, 2024–November 24, 2026; 4,676 points total.
- Every saved snapshot point matches its ledger date and P/L value: zero point mismatches, duplicate/order errors, level-identity errors or missing stored SPY sessions within the recorded range.
- **These checks do not establish that the recorded books are historically continuous.** The independent audit found one unreconciled daily-return transition per lane on November 16, 2026, at the `v1` → `v2-t1` boundary.
- Example: Contrarian's saved equity jumps from 109.3078 to 581.8126, while the saved daily return is 3.0524%; those values cannot describe a continuous unchanged book. Lead, Trend and Risk have other substantial discrepancies at the same boundary.
- Smaller apparent Growth discrepancies are explained by four-decimal rounding. The auditor uses the mathematically implied interval for rounded levels and returns, not an arbitrary enlarged tolerance. Seven genuine transition errors remain.
- No historical rows were changed to conceal these discrepancies. Source continuity warnings were saved into this project's Lab snapshot without advancing its generation timestamp.

## Implemented safeguards

- Complete resumable simulator state covers cash, shares, held-session age, real marks, settlement queue, pool balances, previous equity and activation state; fixture tests prove JSON checkpoint resume equals full replay.
- The runner validates stored continuity before loading prices or writing new rows, and validates a resumed first point against the preceding saved level. It refuses the current unreconciled books.
- The ordered pipeline records stage errors/timings and skips dependent displays after failure. A read-back-verified source receipt supports a no-change fast path; historical corrections require explicit forced revalidation.
- Selection replay computes features for missing selection dates, including historical holes, while retaining full preceding indicator history. Existing selections and final outcomes remain immutable.
- Missing or invalid research exit marks remain pending rather than becoming terminal outcomes with invented P/L.
- New selection timestamps respect Eastern daylight saving and early closes. Closed/incomplete market sessions are excluded.
- Input downloads cap outgoing concurrency at six. Heavy ledger history queries remain sequential after parallel execution reproduced a database statement timeout.
- Trade-reconstructed curves cannot impersonate a saved researcher ledger; stale empty windows no longer display backwards date ranges.
- Added a reusable read-only command: `bun scripts/certify-research-phase-a.ts`. It certifies only the host's configured database and never claims a deployment or survivorship certification.

## Ingestion and runtime observations

- November 25 prices fetched into **this project's database only**: 2,417 requested cached symbols including SPY; 2,347 valid returned rows; zero invalid prices. Existing price keys were preserved. Seventy absent symbols require source/eligibility evidence, not an assumption of delisting.
- Ledger and selections remain through November 24 because the continuity guard deliberately blocks the dependent refresh.
- Before the deeper continuity guard, the current ledger's no-change path took 3,029 ms. This is not a successful one-session or full-pipeline production benchmark.
- Parallel history loading reproduced a statement timeout. After the continuity preflight, the pipeline correctly failed in 5,627 ms, with the ledger stage rejecting unverified continuation in 1,168 ms and every dependent stage skipped.
- Under-15-second routine production completion and resumable larger catch-ups are **not certified**. Full price input still requires expensive reads; no performance claim overrides the integrity guard.

## Tests and browser evidence

- 198 tests pass, zero failures, including checkpoint equivalence, feature-prefix/future-data isolation, configured filter boundaries, rounding-aware continuity, source trust, missing-mark behavior and failure propagation.
- Latest observed preview build: OK. Content-route metadata inspection found no missing required metadata fields.
- Local iPhone-sized browser: seven cards × eight range controls, 56 finite-path checks, zero runtime crashes or horizontal overflow, seven continuity warnings.
- Production desktop and iPhone-sized browsers: seven cards × eight ranges on each viewport, zero runtime crashes or horizontal overflow. Production still displays October 28, 2025–October 19, 2026 coverage and does not have these new warnings.
- The local desktop recheck passed after waiting for page refresh to settle: seven cards × eight ranges, zero runtime errors or overflow, seven continuity warnings. Production browser success certifies rendering of the observed old deployment, not deployment of this request's changes.

## Blockers before Phase A sign-off

1. **Historical book reconciliation:** recover evidence of the state and inputs at the November 16 cutover, or obtain approval for explicitly quarantined/separate book epochs. Never rescale or rewrite historical equity merely to make a graph continuous.
2. **Production access and delivery:** confirm the actual Vercel database and obtain trusted execution access there; verify this request's exact committed revision reaches canonical GitHub and Vercel. This sandbox cannot manually push or deploy the canonical repository.
3. **History qualification:** the ledger's legacy 300-symbol shortlist and 50%-of-panel session test are not the agreed full comparable-universe 80% gate. IPO/delisting, historical formula versions and corporate-action evidence remain unqualified; no historical rewrite or false survivorship-free claim is authorized.
4. **Operational certification:** after reconciliation and production access, append the new sessions, validate one-session and catch-up runtimes within actual Vercel limits, and observe a successful scheduled run with saved-result readback.

Stop for operator review; do not start Phase B.