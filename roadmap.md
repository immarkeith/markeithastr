# ASTR Master Completion Roadmap

Status: Phase A in progress (researcher logic & graphs are the current priority).

## Phase A / Step 1: Research Lab Snapshot & Continuous Ledger Unification
- [x] Connect the saved Lab snapshot and all seven researcher cards to the canonical `researcher_daily_ledger`, rather than the legacy trade-reconstruction curves. (Nov 26: snapshot now stores 668 ledger sessions per researcher, 2024-03-28 → 2026-11-24.)
- [x] (This project's database: ledger read paged to avoid timeouts; 7 new sessions appended through Nov 24. Production database still to do.) Verify the recorded 661-session history per researcher, then append missing completed sessions through the latest available market day on the production database. Treat dates and row counts as verification inputs, not proof of current coverage.
- [ ] Reconcile displayed dates, returns and every plotted point with the saved ledger. Preserve the existing daily/weekly intervals, range rebasing and graph designs.
- [ ] Replace misleading legacy coverage messages with ledger-based coverage checks; remove warnings only when verified coverage supports it, and retain genuine evidence-gap disclosures.
- [ ] Verify full tracked-universe ingestion, including SPY, using paginated/distinct ticker discovery and non-destructive bar upserts. Missing exact-session marks remain pending without invented P&L.
- [ ] Make scheduled research updates incremental: append new selections, mature pending evaluations and extend ledger/snapshot results without replaying the full history. Target under 15 seconds for routine updates; measure actual runtime against Vercel's configured limits and provide bounded recovery for larger catch-ups.
- [ ] Preserve immutable selections, separate forward evaluations and strategy records; enforce selection/entry/exit timestamps, 200 preceding sessions for SMA200 and 252-session percentile warm-up where required.
- [ ] Verify point-in-time eligibility, historical IPO dates and delisted/inactive symbols against free source evidence. Apply the shared 80% comparable-universe start gate; do not present a cached shortlist as the full market or claim survivorship-free coverage without evidence.
- [ ] Confirm GitHub's canonical revision reaches Vercel and verify production curves, metrics, latest session and the first scheduled refresh on desktop and iPhone.

- [ ] Audit each researcher's scoring filters so picks stay distinct and philosophy-aligned, and confirm multi-horizon outcomes feed the cards.

## Phase B / Step 2: AI Engineer Perfection & Queue Management
- [ ] Keep every Engineer reply for a request inside the same conversation thread.
- [ ] Make review cards explain why Approve is disabled (e.g. scope authorization pending) and offer one-tap approval once checks pass.
- [ ] Diagnose the reported Engineer errors using task logs, configuration, runner dispatch and provider responses before deciding repairs.
- [ ] Add a **Delete** button to queued task cards, with confirmation, so accidental or stuck queued requests can be cleared. Preserve audit history; active tasks must be safely cancelled before dismissal, never silently deleted while running.
- [ ] Show clear GitHub runner connection/dispatch status, including queue-only mode and actionable failure reasons.
- [ ] Distinguish informational questions from code-change instructions so conversational requests do not become unrunnable locked tasks.
- [ ] Verify existing GitHub repository/token configuration, Actions workflow and required secrets; repair only missing or incorrect setup without exposing credentials.
- [ ] Verify the configured $0 AI provider/model, including empty replies, rate limits, retry limits and accurate error messages.
- [ ] Exercise queue → scope approval when required → dispatch → lease → patch → independent verification → exact-commit approval → merge → observed Vercel deployment.
- [ ] Verify cancellation, stalled-task recovery, checkpoint recovery and firewall protections. Nothing merges without approval of the exact independently verified commit; no live credentials, trading changes or automatic database migrations.
- [ ] Confirm Engineer and queue controls work on production desktop and iPhone.

## Phase C / Step 3: Central Calibration Layer & Adaptive Capital Allocation (Former Phase G)
- [ ] Collect independent candidate setups and learned holding horizons from the seven specialists.
- [ ] Build six-pillar calibration using historical hit rate, regime fit, setup quality, reward/drawdown asymmetry, whipsaw penalty and capital-turnaround efficiency.
- [ ] Validate dynamic specialist weighting and earned capital-access ceilings using untouched out-of-sample evidence.
- [ ] Apply a calibrated confidence threshold: recommend **Protect 100% Cash** ($0 allocation) when no setup qualifies.
- [ ] Route 1–3-session holdings to the Short-Term pool and 4+ sessions to the Long-Term pool, with confidence-based sizing constrained by approved ceilings and settlement rules.
- [ ] Show the Daily Confidence Matrix and regime recommendations on Home and Research Lab.
- [ ] Validate in isolated paper/advisory mode first. Any production formula, allocation or live-decision integration requires separate explicit approval; this roadmap does not authorize live changes.

## Phase D / Step 4: Autonomous Entertainment & Events Researcher (Former Phase H)
- [ ] Maintain a strictly research-only hypothesis ledger with zero authority over production formulas, live decisions, holding horizons or broker orders.
- [ ] Connect $0 public event feeds, sports/entertainment calendars, official announcements, Wikidata and relevant SEC filings through a source registry with health checks and free fallbacks.
- [ ] Build revalidatable time-scoped entity relationships using `entity_a`, `entity_b`, `relationship_type`, `valid_from` and `valid_to`.
- [ ] Corroborate relationships across multiple sources; do not rely exclusively on SEC 8-Ks or assume cached relationships are permanent.
- [ ] Add Research Lab views for events, evidence, relationship pathways, hypotheses and historical comparable outcomes.
- [ ] Show relevant searched-ticker event filings on Analyze.
- [ ] Verify historical timestamps, source provenance and research isolation on desktop and iPhone.

## Phase E / Step 5: Grand Codebase Cleanup & System Sign-Off (Former Phase I)
- [ ] Inventory the full system as KEEP, MERGE, REVIEW or DELETE, reconciling implemented features and remaining prerequisites against the system manual and earlier certification notes.
- [ ] Consolidate redundant prototypes, temporary scripts and superseded builders only after their replacements are verified; preserve behavior, historical records and audit evidence. No database purge or schema change is authorized by cleanup.
- [ ] Resolve remaining production evidence gaps: actual scheduled audit firing, paper-session settlement/readback, historical source/corporate-action evidence and untouched BYOB holdout qualification. Unavailable evidence remains explicitly blocked, not marked complete.
- [ ] Confirm ASTR operates using only GitHub as canonical source, Vercel as production host, the existing database and the AI provider, with no Lovable/Replit/Base44/Bolt runtime dependency and no paid integrations.
- [ ] Complete clean typechecking, automated rule/regression tests, production runtime checks and desktop/iPhone verification for all critical workflows.
- [ ] Keep any real-money end-to-end exercise separate and blocked unless explicitly authorized; never use live orders merely to certify research or Engineer features.
- [ ] Publish final certification documenting verified results, deployed revision, scheduled-run evidence and any unresolved external blockers. Mark ASTR complete only when all agreed scope is verified or an exception is explicitly accepted.
