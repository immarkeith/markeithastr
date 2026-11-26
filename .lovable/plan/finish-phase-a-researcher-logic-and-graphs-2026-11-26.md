# Finish Phase A — Researcher Logic and Graphs

## Scope and review checkpoint
Finish **Phase A only**. Preserve the current graph appearance, daily/weekly intervals and range rebasing. Do not start the Engineer work or Phases B–E. After implementation, provide the verification results and stop for your review.

Research stays paper-only. No live orders, broker-state changes, production trading-rule changes, paid services or historical-data deletion.

## Already completed — verify, do not redo blindly
- Saved Lab snapshots now use the daily researcher ledger rather than legacy trade-reconstruction curves.
- This project's saved records were extended to 668 sessions per researcher, March 28, 2024–November 24, 2026.
- These counts are prior results, **not proof that Vercel's production database has the same records or is current**.

## 1. Establish the production baseline
- Identify GitHub's canonical revision, the actual Vercel production address and the database that deployment reads, without revealing credentials.
- Read all seven researchers' ledger dates, stored snapshot dates, selection dates, evaluation coverage and latest completed market session.
- Inventory the existing scheduled jobs, their targets, authentication, execution limits and recent outcomes. Do not create competing schedules.
- Record differences between this project's records and production; make corrections only against the confirmed intended destination.

**Pass condition:** A dated baseline identifies which records and deployed code are current, stale or unavailable, with no assumption that preview equals production.

## 2. Certify graph accuracy and coverage
- Compare each saved snapshot's underlying daily points against the ledger for all seven researchers: date, value, ordering, duplicates and session gaps.
- Independently calculate displayed returns and date ranges, including daily/weekly sampling and range rebasing, and compare them with what the page shows.
- Confirm holding-book curves read the saved ledger; selection-performance curves and win rates read the separate selection evaluations. Do not present one as the other.
- Replace legacy coverage warnings with checks against the actual source. Keep real missing-price and historical-universe limitations visible.
- Investigate discrepancies before changing records. Never rewrite old results merely to make the chart agree.

**Pass condition:** Every underlying point reconciles with its saved source; displayed ranges and returns match independent calculations within declared rounding tolerance.

## 3. Verify and catch up market history safely
- Discover the complete tracked universe with paginated/distinct reads, including SPY and the configured market benchmark.
- Compare expected completed exchange sessions with stored bars. Respect holidays and incomplete sessions rather than assuming every weekday is a trading day.
- Fetch missing available bars through existing free sources and upsert returned records without deleting an existing session.
- Keep missing exact-session marks pending, without invented returns or settlement. Keep secondary research prices separate from broker execution and scanner-volume conventions.
- Reconcile historical eligibility using available free evidence for IPOs and inactive/delisted symbols. Missing cached bars do not prove a security was not listed.
- Apply the shared 80% comparable eligible-universe start gate consistently. Inspect the ledger's current 50%-of-best-panel session test: it must not substitute for the agreed historical-universe gate. Preserve existing history and disclose unqualified coverage rather than silently rewriting it.
- Append verified new ledger sessions, selections and matured outcomes to the confirmed production destination; rebuild and read back the saved displays.

**Pass condition:** The latest supported completed session appears in the saved records, or the exact missing evidence is documented. A cached shortlist is never labelled the full market or survivorship-free history.

## 4. Make nightly research incremental and recoverable
- Exit early when all stages are already current; avoid loading and recomputing full history for a no-change run.
- Process only missing completed sessions and evaluations whose horizons can now mature. Retain the preceding feature history needed for correct calculations.
- Resume each researcher's holding book from verified state, including cash, shares, entry/holding age, mark, unsettled proceeds and settlement timing. The last equity value alone is insufficient.
- Compare incremental results with the existing full replay on a fixed isolated fixture before using the new path. Keep a deliberate full-replay/recovery path for diagnostics.
- Make retries and overlapping runs safe: immutable selections, final evaluations and historical ledger rows must not be overwritten or duplicated.
- Bound larger catch-ups into resumable batches and save progress after each successful stage. Publish clear pending/failed/succeeded status without reporting partial work as complete.
- Measure no-change, one-session and multi-session runtimes on production. Target **under 15 seconds for routine updates**, but report measured results; use bounded scheduling within Vercel's actual configured limits if that target is not achievable.

**Pass condition:** Incremental and full replay agree on the fixture; retries preserve records; routine and catch-up runs finish safely within configured execution limits.

## 5. Audit researcher logic and evaluation integrity
- Inventory the actual seven researchers, configured filters, weights, holding rules and feature inputs. Verify implemented behavior rather than imposing generic researcher descriptions.
- Trace representative historical picks from available-at-the-time inputs through eligibility, filtering, scoring, ranking and recorded selection.
- Check distinct specialist behavior without requiring artificially different picks: researchers may legitimately agree.
- Confirm SMA200 has 200 preceding sessions and percentile features have 252 preceding sessions where required. Test boundaries and avoid future-data leakage.
- Verify selection timestamps against real exchange closes, including daylight-saving changes and early closes; selections must precede forward evaluation entries and exits.
- Confirm original picks are immutable; forward outcomes remain separate from strategy books. Verify 1-, 5-, 10-, 20- and 60-session results, benchmark alignment and missing-price behavior.
- Validate every card against the horizons it actually displays; absent evidence is unavailable, not a fabricated result.
- Fix research-only correctness defects with focused regression tests. A finding that requires changing production trading formulas is reported for separate approval, not silently applied.

**Pass condition:** Concrete tests and traced examples support the filters, warm-up, timing, ranking, outcome math and card metrics; unresolved evidence is explicitly disclosed.

## 6. Deploy, verify and stop for your review
- Commit the Phase A changes to the canonical GitHub source and confirm that exact revision reaches Vercel. If deployment access is unavailable, name the blocker rather than claiming deployment.
- Verify the real production Research Lab on desktop and an iPhone-sized browser: all seven researchers, every range selector, graph dates, returns, horizon metrics, coverage messages and error states.
- Verify an actual scheduled refresh from its recorded start through saved-result readback; a manual run alone does not certify scheduling. If the next scheduled run is outside the work window, leave that evidence pending.
- Rerun the affected regression tests and review production runtime errors.
- Update Phase A checkboxes and write a concise certification with revision, destination, dates, point counts, measured timings, test results, schedule evidence and unresolved blockers.
- Stop here. You review Phase A before any Phase B work begins.

## Technical implementation notes
- Focus changes on the existing ledger runner, selection replay, research pipeline, snapshot/coverage helpers and their tests; preserve the three separate research record layers.
- Use per-stage/per-lane progress and a complete resumable simulation checkpoint where needed; verify equivalence before cutover. Any additive schema change must preserve records and follow the existing security and migration rules.
- Use only GitHub, Vercel, the existing database and the AI provider for runtime operation. Never use this project's published preview host as a production dependency.
- Tests cover concrete mathematical and safety rules, not styling or text snapshots. Browser verification covers rendering and real saved-result readback.

## What you need to do
Review this Phase A plan first. No credentials need to be pasted into chat. During implementation, use existing configured access; ask you for a specific permission only if it is genuinely unavailable. Afterward, you check the finished Research Lab before we move on.