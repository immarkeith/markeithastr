# ASTR Logic & Operations Checklist

**Inspection date:** November 27, 2026 (UTC).

## Approved formula evolution — Phase 1 completion supplement

This supplement records the separately approved foundation; original audit findings below remain historical observations.

- [x] Store seven permanent original-seed V0 benchmarks and independent current-best references without changing operational research formulas.
- [x] Preserve candidate definitions, failed/paused experiment evidence and seasonal context; retirement is not permanent defectiveness.
- [x] Validate lifecycle transitions, serialize per-lane champion replacement, retain V0 and reject stale comparisons.
- [x] Prepare chronological multi-metric validation contracts and a 30-evaluated-session review rule; immature outcomes do not imply failure.
- [ ] Production installation/readback: separate Vercel database is not yet verified.
- [ ] Phase 2: independent discovery, protected walk-forward evaluation, genuine historical benchmark performance and continuous improvement have not started.

Implementation and verification details: `docs/formula-evolution-phase-one.md`. No historical books, picks, graphs or trading settings were changed.

## Decision key

- Leave `[ ]` empty to keep the current behavior / take no action.
- Replace the blank in **Decision** with `[C]` for change or `[R]` / `[D]` for delete. R and D mean the same thing.
- Add details under **My instructions**. You can also send a list such as `L012 C — ...`.
- Mark the Decision field only; the leading checkbox is a review marker, not a second decision.
- Every decision starts blank. A mark requests discussion, NOT implementation. We will review dependencies and agree on a plan before you authorize changes.
- Deleting a process does not authorize deleting saved data. Hidden UI does not imply the associated operation should stop.

## Audit boundaries and verification

This is a source and read-only catalog inventory, not a rebuild, certification of investment performance, or permission to run jobs. Only documentation and audit roadmap completion were changed. No application behavior, formulas, weights, settings, trades, cash management, broker calls, migrations, historical records, scheduled jobs or research pipeline were changed or executed for this audit.

Evidence labels distinguish **implemented in source**, **connected-backend catalog/values observed**, **inactive in the inspected configuration**, **partial**, **potential defect**, and **unverified production behavior**. A table, code path, active schedule definition or screenshot is not proof of successful production execution. Connected catalog observations below were gathered read-only earlier in this audit; production was not newly queried.

Source citations refer to this audit revision and may shift after future edits. Provider credentials, backend URLs/IDs and hook token values are deliberately excluded. Exact provider plan limits, production host targets, successful hook delivery, effective permissions, real order lifecycle and full historical membership/corporate-action evidence remain unverified. No runtime test was used where it could write data or call the broker.

### Corrections to the earlier chat outline

- Current ledger completeness is **50% of the loaded panel maximum**, not 400 stocks / 40%.
- Independent scoring systems and intentionally rejected extra schedule firings are not automatically defects. Their comparability and integration are documented without inventing a reconciliation requirement.
- Exact target-session paper marks replace the earlier oversimplified midpoint/VWAP description.
- The earlier static-only learning claim was incorrect: saved specialist weights can evolve and Master rules promote/retire automatically within research; Lead boards consume those rules. Explicit strategy activation remains a separate mechanism.
- Learning must be separated into fixed specialist base formulas, learned/adopted rule mechanisms, stored evidence and advisory ML; the detailed entries below identify what actually consumes each result.
- The earlier category counts were provisional; the table below reports the actual generated inventory.

## Category breakdown

**Total: 472 individually numbered items; all decisions blank.**

| Category | Items |
|---|---:|
| 1. ASTR Overall Operations | 7 |
| 2. Stock Universe & Stock Selection | 6 |
| 3. Individual Researcher Logic | 61 |
| 4. Researcher Competition & Recommendations | 8 |
| 5. Research Timing, Dates & Scheduling | 13 |
| 6. Formulas, Scoring & Calculations | 90 |
| 7. Formula Updates & Learning Rules | 85 |
| 8. Historical Data & Performance Evaluation | 29 |
| 9. Trading Logic & Execution Rules | 71 |
| 10. Data Sources, APIs & Database Operations | 58 |
| 11. Automation, Background Jobs & Dependencies | 23 |
| 12. Errors, Recovery & System Safeguards | 21 |

## Conflict and contradiction register

Each entry names X and Y, explains the mismatch, and states whether it is a direct contradiction, a comparability difference, a potential defect or a verification gap. These are review findings, not an authorized fix list.

### X01 — Roster mismatch
The six specialist simulation lanes plus Lead do not match the assignment role list. Momentum and Influence assignment labels are not evidence of matching independent simulated books; Skeptic is not in that assignment list. Trend, momentum, volume and volatility factor names must not be substituted for the actual lane roster.
- **Evidence:** src/lib/department.server.ts; src/lib/assign.functions.ts
- **Checklist references:** See individual roster/scoring entries below.

### X02 — Missing 180-session outcome producer
The 9M metric consumer requests 180-session evaluations, but selection replay produces only 1, 5, 10, 20 and 60. These directly conflict; no 180-session producer was verified.
- **Evidence:** src/lib/selection-evaluations.ts:2; src/lib/selection-replay.ts:7
- **Checklist references:** L292, L288

### X03 — Different historical coverage gates
The ledger accepts dates with at least 50% of the maximum loaded daily panel count. The shared historical comparable-universe start rule is 80%, and selection history has its own eligibility/coverage checks. These are not one unified gate; books and selection evidence can cover different dates. The previously described 400-stock/40% ledger rule is NOT the current source rule.
- **Evidence:** src/lib/researcher-ledger.server.ts:101–110; historical-coverage standing constraint
- **Checklist references:** L273, L287

### X04 — Incompatible return models, not interchangeable evidence
Ledger close-entry books, next-session-open forward outcomes, fixed-stake selection history, trade-table paper holdings and broker fills use different models. This is a comparability conflict if presented as the same performance; independent models are not automatically bugs. Paper due exits use exact target-session marks, not a blanket midpoint/VWAP rule.
- **Evidence:** src/lib/researcher-ledger.ts; src/lib/selection-replay.ts; src/lib/selection-curve.ts; src/lib/race.server.ts
- **Checklist references:** L278, L288, L294, L359

### X05 — Lab schedule template contradicts handler
Fresh SQL requests every five minutes during UTC weekday market hours; the handler accepts weekday 18:00 Eastern or Saturday 10:00 Eastern five-minute windows. The template cannot reach these windows. Connected active cron is different and can reach them; production delivery remains unverified.
- **Evidence:** migration/fresh/15-lab-refresh-schedule.sql; src/lib/schedule-rules.ts
- **Checklist references:** L087

### X06 — One-offset templates versus date-aware Eastern guards
Single UTC-offset daily-cycle/key-check templates do not cover both summer and winter Eastern time. Connected definitions use multiple offsets; rejected wrong-offset invocations are an intentional guard, not proof of false alarms or failed orders. Normal/early-close preclose schedules likewise use extra candidate times deliberately.
- **Evidence:** migration/fresh/09-schedule.sql; migration/fresh/14-key-check-schedule.sql; src/lib/schedule-rules.ts
- **Checklist references:** L085, L086, L084

### X07 — Health cadence and weekend gap
Connected market-window health is every 15 minutes, while the optional audit template defines five minutes. The complementary offhours expression excludes weekend 13–20 UTC even though market-window health is weekdays only. This is a schedule-definition gap, not a measured outage.
- **Evidence:** migration/fresh/16-autonomous-audit.sql; connected read-only cron metadata
- **Checklist references:** L088, L089

### X08 — Fixed UTC selection cutoff versus date-aware session time
Selection curve validation uses entry-date 13:30 UTC while completed-session modeling is DST-aware. Those conventions are not universally equivalent; boundary effects need a separate approved reproduction.
- **Evidence:** src/lib/selection-curve.ts:18–44; src/lib/research-session.ts:4–18
- **Checklist references:** L293, L095

### X09 — Expected repair table absent in connected catalog
Repair logging expects audit_repair_log but that table was absent in the inspected connected catalog. Logging catches failures, so repairs can continue without a stored repair receipt. This is not a finding about the separately deployed production database.
- **Evidence:** src/lib/repair-log.server.ts; read-only public table catalog
- **Checklist references:** L459, L425

### X10 — Read-looking maintenance requests versus write authorization
History-deepening and discovery GET handlers perform writes without the explicit local token/passcode checks used by protected POST hooks. Discovery restart can delete its checkpoint rows. Upstream access protection is unverified; neither route was invoked.
- **Evidence:** src/routes/api/public/hooks/deepen-history.ts; src/routes/api/public/hooks/discover.ts
- **Checklist references:** L466, L467, L464

### X11 — New replay checkpoint version contradicts required version
The legacy replay absent-state default is version 1 while the continuation reader expects version 2. This is a potential fresh-start defect identified in source, not a write-tested failure.
- **Evidence:** src/lib/replay.server.ts:27–43
- **Checklist references:** L430

### X12 — Reported autonomous sale versus close result
The autonomous exit wrapper can report a sale without checking closed:false from closeTrade. Reported success can therefore contradict the underlying close result; no broker action was performed to reproduce it.
- **Evidence:** src/lib/autonomous.server.ts:160–167; src/lib/scan.server.ts:738–762
- **Checklist references:** L352

### X13 — Broker fills versus non-atomic local bookkeeping
An order fill precedes separate trade and cash-record writes; daily limits and duplicate checks are read-before-write rather than a verified atomic reservation. Concurrent requests or failed local writes may conflict with broker exposure. Incidence is unverified.
- **Evidence:** src/lib/scan.server.ts:565–615; src/lib/autonomous.server.ts:73–78,123–137
- **Checklist references:** L306, L343, L304

### X14 — Calendar and holding conventions differ
Historical paper settlement uses computed trading holidays, while the main market calendar explicitly lists 2026–2027. Ledger, paper and autonomous held-session counting also differ; a shared label does not guarantee the same exit date.
- **Evidence:** src/lib/settlement-rules.ts; src/lib/market-calendar.ts; src/lib/autonomous.ts
- **Checklist references:** L004, L362, L350, L279

### X15 — Bridge scope versus privileged direct access
The Engineer bridge restricts tables/actions, but optional direct privileged database credentials bypass that bridge scope. File-edit firewall protection is not a universal database permission boundary.
- **Evidence:** src/lib/engineer/bridge-rules.ts; scripts/engineer-db.ts
- **Checklist references:** L439, L440

### X24 — SEC-only event collector versus the multi-source relationship requirement
The verified event collector reads mapped SEC 8-K filings only. That is narrower than the standing requirement for multi-source sports/entertainment evidence and time-scoped entity relationships. A full corroborated relationship graph was not verified; do not describe this collector as that completed system or grant its hypotheses production authority.
- **Evidence:** src/lib/events.server.ts:38–79; Entertainment & Events standing requirements
- **Checklist references:** L244, L246

### X25 — Same horizon labels use different session counts
Selection cards use 20/60/180 sessions for 1M/3M/9M while Influence assignment outcomes use 21/63/189. Labels therefore do not imply identical comparison windows. Influence outcomes are separate and do not supply the missing Layer 2 180-session results.
- **Evidence:** src/lib/selection-evaluations.ts:2; src/lib/assign.server.ts:9
- **Checklist references:** L292, L248, L249, L250

### X21 — Static-only learning description contradicts executed learning
The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here.
- **Evidence:** src/lib/department.server.ts:1206–1228,1361–1395; src/lib/master-formula.server.ts:438–449; src/lib/research-boards.server.ts:111–125
- **Checklist references:** L205, L210, L222, L223, L230

### X22 — Skeptic non-picker comment contradicts actual board participation
Comments describe Skeptic as a non-picker reviewer, but it has a lane seed, gates and a runtime candidate board. Its separate skepticReview role also vetoes experiments; these are two distinct responsibilities.
- **Evidence:** src/lib/department.server.ts:490–503,817–821; src/lib/research-boards.server.ts:111–125
- **Checklist references:** L071

### X23 — Proposal activation loses specialist fields
Proposal serialization keeps the five core weights and general score/count settings, not all extra specialist factor weights or lane-specific filter fields. The resulting activated strategy is not an exact copy of the full specialist experiment.
- **Evidence:** src/lib/research.server.ts:614–656
- **Checklist references:** L230

### X18 — Strict out-of-sample claim versus overlapping forward labels
Walk-forward training dates immediately precede test dates without a horizon purge. Training labels use future holding-period closes, so boundary labels can reach into the test interval despite the strict out-of-sample header. This is a source-level leakage risk, not a measured production error.
- **Evidence:** src/lib/ml.server.ts:4–7,119–133,366–382
- **Checklist references:** L154

### X19 — Forecast provenance and grading mismatch
Freshly retrained predictions can reference the latest stored model version without configuration agreement, and later grading uses current holding settings rather than the original persisted prediction horizon. Persisted first-200 unsorted predictions also differ from displayed ranked top-50. These directly weaken reproducible forecast evidence.
- **Evidence:** src/lib/ml.server.ts:625–748
- **Checklist references:** L161, L162, L163

### X20 — Probability target versus directional accuracy label
The probability-target accuracy statistic compares predicted target probability to return sign, not actual target attainment. Its reported accuracy therefore measures a different event than the model target.
- **Evidence:** src/lib/ml.server.ts:467–475
- **Checklist references:** L184

### X17 — Scoring systems have different meanings
Scanner weighted technical scores, specialist lane factors, BYOB configurable indicators and Random Forest forecasts are separate calculations. A high score in one does not guarantee acceptance in another. This is a comparability/integration difference, not proof that they should all be merged or that every output affects execution.
- **Evidence:** src/lib/scoring.ts; src/lib/factors.ts; src/lib/byob-indicators.ts; src/lib/ml.server.ts
- **Checklist references:** See individual roster/scoring entries below.

### X16 — Schema check success versus full operational completeness
The production checker primarily probes selected tables/columns; it does not certify RPCs, triggers, grants or job delivery. A passing check cannot establish full migration or operational completeness.
- **Evidence:** scripts/check-production-schema.ts:5–40
- **Checklist references:** L374, L373

## November 28 — Authorized X01–X08 implementation progress

Your explanatory X01–X09 answer key replaces checkbox-only instructions. X09 remains on hold. The original November 27 inventory below is retained as audit evidence; dated resolution notes distinguish source changes, verified configured-backend outcomes and pending production activation. A checked leading box means this item's stated resolution was verified, not that all ASTR production operations are certified.

| Finding | Progress | Remaining boundary |
|---|---|---|
| X01 | Paper roster aligned and verified with actual AAPL lookup | Legacy records and existing live-buy specialist permissions/ranking preserved |
| X02 | 180-session producer implemented; 2,288 matured and 1,238 pending outcomes saved/read back | Production database identity/deployment not independently established; use outcomes-only workflow there |
| X03 | Shared June 2021 benchmark foundation; removed fixed percentage exclusions | Existing books/picks remain intact; no retroactive book replay authorized or run |
| X04 | Independent formulas/results preserved; isolation regressions passed | Distinct return models remain intentional, not interchangeable investment evidence |
| X05 | Actual-session hook and unchanged-payload receipt verified | Production every-few-minutes schedule and actual open-session delivery pending |
| X06 | Date-aware timestamps, exchange authority and device-local display implemented | Existing unmanaged job definitions preserved; deployed timing/actual delivery pending |
| X07 | Authenticated bounded monitor healthy; optional existing-server runner prepared | Always-on server answer, completely free budget, measured safe cadence and production activation pending |
| X08 | Winter/summer opening-cutoff regressions passed | Production deployment/selection chart refresh pending; original picks/outcomes not rewritten |
| X09 | Held, no implementation | Await operator clarification |

**Verification:** 212 tests passed (206 TypeScript rules plus six existing price-integrity checks); build OK. Actual AAPL paper dropdown contains exactly seven operating researchers. Phone/desktop Lab loaded saved June 2021 book dates without overflow or page errors. Current ticker followed a Los Angeles device zone. Configured backend outcome catch-up inserted no selections and changed no books, trades or live settings. Repeat Lab refresh returned `unchanged` and preserved generation time. Unauthorized monitor request returned 401; read-only bounded monitor returned healthy. Existing nine-month display sections remain hidden where prior UI cleanup hid them; saved metric readback, not hidden controls, verifies their data.

**Conflict wording:** X01's old paper label list contradicted the operating lane roster; the dropdown mismatch is resolved. X02's old producer contradicted the 180-session consumer; producer and saved configured-backend evidence now agree. X03's 50%/80% gates contradicted the answer key's no-fixed-percentage foundation; those replay gates were removed without imposing 400 stocks. X05's old handler contradicted market-open refresh, now corrected in source, but the deployed hourly scheduler still contradicts every-few-minutes intent. X06's fixed UTC cutoff contradicted winter exchange time; shared conversion fixes that; deployed job metadata is not a delivery receipt. X07's weekend gap still contradicts 24/7 monitoring until the free runner/scheduler is activated. X04's different models do not contradict independent researcher logic; treating them as one result would. X09 remains unresolved.

Deployment and next actions: `docs/x01-x08-implementation.md`. No migrations or scheduler mutations were performed. Existing callback credentials were preserved; no managed-platform runtime dependency introduced.

## Reviewable inventory

## 1. ASTR Overall Operations

* [ ] **L001 — Application startup**
  * **Current behavior:** Starting the web host serves requests; it does not launch a continuous market worker.
  * **How it works:** Normalize backend configuration and lazily load the framework request handler.
  * **Inputs and dependencies:** Hosting runtime and configured database connection.
  * **Execution schedule:** Host startup / incoming requests.
  * **Relevant formulas or rules:** Operational work is initiated separately by hooks, functions, workflows or browser refreshes.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/server.ts:12–21,49–64
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L002 — Application shutdown**
  * **Current behavior:** Stopping the host removes its ability to serve requests; separate scheduling does not automatically disappear.
  * **How it works:** There is no inspected shutdown procedure that cancels every database/GitHub job or liquidates holdings.
  * **Inputs and dependencies:** Host process, external scheduler, GitHub runner, existing holdings.
  * **Execution schedule:** Host stopped or redeployed.
  * **Relevant formulas or rules:** Do not equate website shutdown with a universal trading stop.
  * **Current implementation status:** No universal shutdown/liquidation coordinator verified; independent components exist.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/server.ts; .github/workflows/astr-engineer.yml; migration/fresh/09-schedule.sql
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L003 — Regular automation switch**
  * **Current behavior:** auto_run controls regular live-strategy cycle calls, not all research and not autonomous timed exits.
  * **How it works:** Hooks perform paper/research work before checking the switch.
  * **Inputs and dependencies:** app_settings.auto_run, auto_live_trading and hook callers.
  * **Execution schedule:** Entry, preclose and after-close hooks.
  * **Relevant formulas or rules:** Connected backend auto_run=false; autonomous=false; research_auto=true.
  * **Current implementation status:** Source behavior and connected setting values verified; production switches unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/preopen.ts:15–31; preclose.ts:15–27; daily-cycle.ts:17–74
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L004 — Market calendar and holidays**
  * **Current behavior:** Market scheduling now reads the current exchange calendar/clock for actual closures and early hours; standard historical/future holiday coverage extends beyond 2026–2027.
  * **How it works:** Market calendar gates weekends, listed holidays and early closes.
  * **Inputs and dependencies:** Date, America/New_York timezone and maintained holiday lists.
  * **Execution schedule:** Every guarded trading hook.
  * **Relevant formulas or rules:** Normal close 16:00 Eastern; early closes come from sessionCloseMinutes.
  * **Current implementation status:** November 28 — X06 source and read-only provider calendar verified. Production schedule/delivery pending; X14 holding/settlement convention differences outside this scope remain unresolved.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X06 source and read-only provider calendar verified. Production schedule/delivery pending; X14 holding/settlement convention differences outside this scope remain unresolved.
  * **Source evidence:** src/lib/market-calendar.ts:7–38,176–186; src/lib/schedule-rules.ts
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X06 source and read-only provider calendar verified. Production schedule/delivery pending; X14 holding/settlement convention differences outside this scope remain unresolved.

* [ ] **L005 — Independent and simultaneous processes**
  * **Current behavior:** Hooks, browsers, scripts and GitHub workflows can start independent work.
  * **How it works:** Each entrypoint controls its own run; workflow concurrency is not a system-wide lock.
  * **Inputs and dependencies:** Web requests, jobs, database writes and workflow groups.
  * **Execution schedule:** Whenever multiple triggers fire.
  * **Relevant formulas or rules:** No whole-system durable lease was verified.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-watermark.server.ts; src/lib/scan.server.ts:1335–1394; .github/workflows/research-production-replay.yml:48–55
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L006 — Process communication**
  * **Current behavior:** Processes communicate primarily through saved database rows and server calls.
  * **How it works:** Scans save scores; research saves ledger/picks/evaluations; snapshots read saved evidence; engineer uses tasks/logs and dispatch.
  * **Inputs and dependencies:** Public application tables and GitHub workflow dispatch.
  * **Execution schedule:** At each pipeline boundary.
  * **Relevant formulas or rules:** Saved evidence is distinct from transient in-memory status.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-pipeline.server.ts; src/lib/engineer/tasks.server.ts:241–252
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L007 — Daily-cycle partial failure**
  * **Current behavior:** Several research errors are logged without cancelling unrelated later work.
  * **How it works:** Separate try blocks catch department/horizon errors; event scan/evaluation/history share a try.
  * **Inputs and dependencies:** Paper exits, department, horizons, events, history, pipeline and regular cycle.
  * **Execution schedule:** After-close daily hook.
  * **Relevant formulas or rules:** Failed graph pipeline => HTTP 503; regular enabled cycle is still attempted before response.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/daily-cycle.ts:17–75
  * **Decision:** [ ]
  * **My instructions:**

## 2. Stock Universe & Stock Selection

* [ ] **L008 — Cache liquidity shortlist**
  * **Current behavior:** Choose initial cache symbols.
  * **How it works:** Keep proxy OR (close >= min_price AND close*volume >= 0.6*min_avg_dollar_volume*share); sort close*volume descending; take max(50,max_universe); append proxy if available.
  * **Inputs and dependencies:** Provider daily bars and current settings
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Keep proxy OR (close >= min_price AND close*volume >= 0.6*min_avg_dollar_volume*share); sort close*volume descending; take max(50,max_universe); append proxy if available.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:171-185
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L009 — Alpaca asset universe**
  * **Current behavior:** Use active tradable non-OTC US equities.
  * **How it works:** GET asset list; require tradable, exchange != OTC, symbol /^[A-Z]{1,5}$/; take first limit in provider order (not liquidity-sorted).
  * **Inputs and dependencies:** Alpaca assets
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** GET asset list; require tradable, exchange != OTC, symbol /^[A-Z]{1,5}$/; take first limit in provider order (not liquidity-sorted).
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/market-data.server.ts:181-192
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L010 — Stable cached universe**
  * **Current behavior:** Reuse existing universe once 100 symbols exist.
  * **How it works:** If cachedTickers.length >=100 use existing else alpacaUniverse(max(50,max_universe)); append proxy; existing universe bypasses daily liquidity prefilter.
  * **Inputs and dependencies:** Cached symbols and settings
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** If cachedTickers.length >=100 use existing else alpacaUniverse(max(50,max_universe)); append proxy; existing universe bypasses daily liquidity prefilter.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:211-228
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L011 — Scanner eligibility and ranking**
  * **Current behavior:** Score all paginated cached candidates, not merely max_universe.
  * **How it works:** 500-symbol pages over HISTORY_DAYS=160; require snapshot, close>=minPrice, mean20(close*volume)>=minAvgDollarVolume; rank descending rounded score; persist top300; tradeable score>=min_score_to_trade.
  * **Inputs and dependencies:** Cached bars/current settings
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** 500-symbol pages over HISTORY_DAYS=160; require snapshot, close>=minPrice, mean20(close*volume)>=minAvgDollarVolume; rank descending rounded score; persist top300; tradeable score>=min_score_to_trade.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:61-66; src/lib/scan.server.ts:318-325; src/lib/scan.server.ts:381-423; src/lib/scoring.ts:225-253
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L012 — ML candidate universe differs from scanner**
  * **Current behavior:** ML rows survive a null ASTR score.
  * **How it works:** Default limit=min(600,max_universe||400), one scan_input page; retain every finite feature row even if scoreSecurity returns null; model-only/blend have no ASTR gate.
  * **Inputs and dependencies:** Historical cache and current settings
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Review universe comparability; not evidence of a bug by itself.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:67-87; src/lib/ml.server.ts:114-136; src/lib/ml.server.ts:439-459; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L013 — Discovery current-winner selection risk**
  * **Current behavior:** Research uses latest scan top200, retrospectively.
  * **How it works:** Initialize tickers from latest run ordered rank limit200; analyze their full cached history, 12 tickers per pass.
  * **Inputs and dependencies:** Latest scan and historical bars
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** Inference: current ranking selection can induce survivorship/selection bias; not an independent historical point-in-time universe.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:73-86; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

## 3. Individual Researcher Logic

* [ ] **L014 — trend: trend seed weight**
  * **Current behavior:** Hardcoded initial trend contribution for trend; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=35%; contribution=factor_pct[trend]*35/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:427-433; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L015 — trend: momentum seed weight**
  * **Current behavior:** Hardcoded initial momentum contribution for trend; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[momentum]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:427-433; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L016 — trend: relative_strength seed weight**
  * **Current behavior:** Hardcoded initial relative_strength contribution for trend; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=20%; contribution=factor_pct[relative_strength]*20/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:427-433; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L017 — trend: volume seed weight**
  * **Current behavior:** Hardcoded initial volume contribution for trend; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[volume]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:427-433; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L018 — trend: RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 80; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:429; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L019 — trend: Volume floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rel_volume >= 1.2; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:430; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L020 — trend: ATR floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct >= 1.5; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:431; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L021 — trend: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** avg_return_pct; risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:433; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L022 — contrarian: pullback seed weight**
  * **Current behavior:** Hardcoded initial pullback contribution for contrarian; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[pullback]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:439-445; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L023 — contrarian: oversold_reversal seed weight**
  * **Current behavior:** Hardcoded initial oversold_reversal contribution for contrarian; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[oversold_reversal]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:439-445; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L024 — contrarian: down_streak seed weight**
  * **Current behavior:** Hardcoded initial down_streak contribution for contrarian; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[down_streak]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:439-445; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L025 — contrarian: volume_dryup seed weight**
  * **Current behavior:** Hardcoded initial volume_dryup contribution for contrarian; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=10%; contribution=factor_pct[volume_dryup]*10/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:439-445; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L026 — contrarian: trend seed weight**
  * **Current behavior:** Hardcoded initial trend contribution for contrarian; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[trend]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:439-445; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L027 — contrarian: RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 55; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:441; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L028 — contrarian: Washed-out RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 40; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:442; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L029 — contrarian: ATR ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct <= 6; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:443; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L030 — contrarian: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** avg_return_pct; risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:445; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L031 — consistency: return_stability seed weight**
  * **Current behavior:** Hardcoded initial return_stability contribution for consistency; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[return_stability]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:451-457; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L032 — consistency: positive_days seed weight**
  * **Current behavior:** Hardcoded initial positive_days contribution for consistency; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=25%; contribution=factor_pct[positive_days]*25/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:451-457; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L033 — consistency: low_drawdown seed weight**
  * **Current behavior:** Hardcoded initial low_drawdown contribution for consistency; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=20%; contribution=factor_pct[low_drawdown]*20/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:451-457; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L034 — consistency: atr_stability seed weight**
  * **Current behavior:** Hardcoded initial atr_stability contribution for consistency; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=10%; contribution=factor_pct[atr_stability]*10/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:451-457; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L035 — consistency: trend seed weight**
  * **Current behavior:** Hardcoded initial trend contribution for consistency; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[trend]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:451-457; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L036 — consistency: ATR ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct <= 4; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:453; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L037 — consistency: ATR floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct >= 1; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:454; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L038 — consistency: RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 72; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:455; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L039 — consistency: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** 2*risk_adjusted + avg_return_pct; risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:457; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L040 — growth: growth_acceleration seed weight**
  * **Current behavior:** Hardcoded initial growth_acceleration contribution for growth; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[growth_acceleration]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:463-469; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L041 — growth: long_relative_strength seed weight**
  * **Current behavior:** Hardcoded initial long_relative_strength contribution for growth; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[long_relative_strength]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:463-469; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L042 — growth: sustained_advance seed weight**
  * **Current behavior:** Hardcoded initial sustained_advance contribution for growth; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=25%; contribution=factor_pct[sustained_advance]*25/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:463-469; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L043 — growth: momentum seed weight**
  * **Current behavior:** Hardcoded initial momentum contribution for growth; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[momentum]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:463-469; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L044 — growth: Volume floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rel_volume >= 1.1; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:465; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L045 — growth: RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 78; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:466; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L046 — growth: RSI floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 >= 45; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:467; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L047 — growth: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** avg_return_pct; risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:469; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L048 — risk: reward_per_risk seed weight**
  * **Current behavior:** Hardcoded initial reward_per_risk contribution for risk; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=30%; contribution=factor_pct[reward_per_risk]*30/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:475-481; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L049 — risk: downside_protection seed weight**
  * **Current behavior:** Hardcoded initial downside_protection contribution for risk; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=25%; contribution=factor_pct[downside_protection]*25/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:475-481; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L050 — risk: worst_day seed weight**
  * **Current behavior:** Hardcoded initial worst_day contribution for risk; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[worst_day]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:475-481; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L051 — risk: liquidity_depth seed weight**
  * **Current behavior:** Hardcoded initial liquidity_depth contribution for risk; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[liquidity_depth]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:475-481; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L052 — risk: volatility_quality seed weight**
  * **Current behavior:** Hardcoded initial volatility_quality contribution for risk; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[volatility_quality]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:475-481; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L053 — risk: ATR ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct <= 5; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:483; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L054 — risk: Hard ATR ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct <= 3.5; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:484; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L055 — risk: RSI ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 <= 75; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:485; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L056 — risk: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** 3*risk_adjusted + avg_return_pct; risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:487; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L057 — skeptic: trend seed weight**
  * **Current behavior:** Hardcoded initial trend contribution for skeptic; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=25%; contribution=factor_pct[trend]*25/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:496-502; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L058 — skeptic: momentum seed weight**
  * **Current behavior:** Hardcoded initial momentum contribution for skeptic; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=25%; contribution=factor_pct[momentum]*25/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:496-502; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L059 — skeptic: volatility_quality seed weight**
  * **Current behavior:** Hardcoded initial volatility_quality contribution for skeptic; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=20%; contribution=factor_pct[volatility_quality]*20/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:496-502; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L060 — skeptic: low_drawdown seed weight**
  * **Current behavior:** Hardcoded initial low_drawdown contribution for skeptic; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[low_drawdown]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:496-502; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L061 — skeptic: worst_day seed weight**
  * **Current behavior:** Hardcoded initial worst_day contribution for skeptic; persisted evolved parameters override the seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Seed weight=15%; contribution=factor_pct[worst_day]*15/100 before subsequent normalized tuning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:496-502; src/lib/department.server.ts:313-329,1034-1048; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L062 — skeptic: Calm ATR ceiling**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct <= 4; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:498; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L063 — skeptic: Hot RSI floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi14 >= 60; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:499; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L064 — skeptic: Remove volume floor**
  * **Current behavior:** An allowed independent filter experiment, not an always-on seed restriction. Seed filters are null; adopted persisted params can apply it at runtime.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rel_volume_min = null; boundaries inclusive; lane gates generate separate candidates, not a conjunction of all listed gates.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:500; src/lib/department.server.ts:332-340,506-516,612-614
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L065 — skeptic: optimization objective**
  * **Current behavior:** Ranks shortlisted confirmation trials using this lane-specific objective.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** min(avg_return_pct,risk_adjusted); risk_adjusted=mean(return)/sample_stdev(return), or 0 if stdev=0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:502; src/lib/department.server.ts:381-405,1080-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L066 — Shared weighted score and normalization**
  * **Current behavior:** Combines fixed factor transforms with configurable/evolved weights.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** score=sum(factor_pct/100*weight); positive weights normalize to 100 rounded to 0.1; empty positives fallback trend=100.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:313-329
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L067 — Shared gate: Minimum price**
  * **Current behavior:** Independent shared selection requirement; setting value is not available from static code alone.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** close >= Number(settings.min_price)
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:333; src/lib/department.server.ts:332-359
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L068 — Shared gate: Liquidity floor**
  * **Current behavior:** Independent shared selection requirement; setting value is not available from static code alone.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** avg_dollar_volume >= Number(settings.min_avg_dollar_volume)*share
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:334; src/lib/department.server.ts:332-359
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L069 — Shared gate: Score threshold**
  * **Current behavior:** Independent shared selection requirement; setting value is not available from static code alone.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** score >= params.min_score_to_trade
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:355; src/lib/department.server.ts:332-359
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L070 — Shared gate: Daily candidate count**
  * **Current behavior:** Independent shared selection requirement; setting value is not available from static code alone.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** top max(1,params.num_day_trades) per date after filters, non-null forward_return and descending score
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:357; src/lib/department.server.ts:332-359
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L071 — Skeptic role contradiction**
  * **Current behavior:** Despite comments calling Skeptic a non-picker, it has its own weights/gates and participates in runtime lane boards. The independent skepticReview also reviews every best finding.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** LANES contains skeptic; researchBoards loops all LANES; six backups plus lead.
  * **Current implementation status:** Implemented; comments and executed board path differ.
  * **Conflicts or contradictions:** X22: Comments describe Skeptic as a non-picker reviewer, but it has a lane seed, gates and a runtime candidate board. Its separate skepticReview role also vetoes experiments; these are two distinct responsibilities. Related items: L071.
  * **Source evidence:** src/lib/department.server.ts:490-503,817-821; src/lib/research-boards.server.ts:111-125
  * **Decision:** [ ]
  * **My instructions:**

* [x] **L072 — Assignment role mismatch**
  * **Current behavior:** Paper assignments now offer Lead, Trend, Contrarian, Consistency, Growth, Risk and Skeptic from the operating roster. Legacy assignments and existing live-buy authorization/ranking remain unchanged.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Assignment form label and ticker.
  * **Execution schedule:** On manual assignment.
  * **Relevant formulas or rules:** Assignment labels=Lead,Trend,Momentum,Contrarian,Consistency,Growth,Risk,Influence; runtime lanes=trend,contrarian,consistency,growth,risk,skeptic plus lead.
  * **Current implementation status:** November 28 — X01 resolved for the paper dropdown: actual AAPL lookup verified seven choices; assignment remains a saved research record, not a new execution or learning dispatcher.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X01 resolved for the paper dropdown: actual AAPL lookup verified seven choices; assignment remains a saved research record, not a new execution or learning dispatcher.
  * **Source evidence:** src/lib/assign.functions.ts:6-15; src/lib/assign.server.ts:61-81; src/lib/department.server.ts:422-504; src/lib/research-boards.server.ts:121-125
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X01 resolved for the paper dropdown: actual AAPL lookup verified seven choices; assignment remains a saved research record, not a new execution or learning dispatcher.

* [ ] **L073 — Lead runtime role**
  * **Current behavior:** Lead uses assembled active Master Formula rules, not a seventh hardcoded specialist seed.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** runDepartment calls runMasterCycle; balanced.filed=version_changed && active_rules>0 && lead_test.edge>0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:1361-1382; src/lib/research-boards.server.ts:121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L074 — Legacy Lead merge is not current runtime**
  * **Current behavior:** The old leadResearcher function remains defined but the current department path calls runMasterCycle instead. Do not attribute its consensus merge to current Lead execution.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Legacy merge=(base_weight+edge-weighted normalized core mix)/2; vote weight=max(0.2,edge); filters need >=2 votes. Defined only, no call found.
  * **Current implementation status:** Legacy defined implementation; current runtime uses Master cycle.
  * **Conflicts or contradictions:** Unused legacy definition describes consensus merging; current runDepartment explicitly calls runMasterCycle instead.
  * **Source evidence:** src/lib/department.server.ts:1361-1382,1467-1508
  * **Decision:** [ ]
  * **My instructions:**

## 4. Researcher Competition & Recommendations

* [ ] **L075 — Competition rankings source**
  * **Current behavior:** Paper slots are ranked through each lane’s research board, not rankUniverse generic scanner weights.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** slot ranking=boards.get(slot.lane), or [] for missing lane.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:312-320; src/lib/research-boards.server.ts:111-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L076 — Competition board population**
  * **Current behavior:** Research board samples cached research panel and chooses most recent sufficiently covered session.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** BOARD_UNIVERSE=300; session count >=0.5*max session row count; filter, descending weighted score+band bonuses; top 10; tradeable iff score>=min_score.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-boards.server.ts:41-42,76-105
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L077 — Competition control and standings**
  * **Current behavior:** Includes live control and paper entrants; rank is realized absolute dollars, not risk-adjusted return or unrealized P/L.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** total_pnl=sum(non-quarantined closed profit), rounded cents; sort total_pnl descending; rank=i+1.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:1076-1082,1111-1115,1135-1219
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L078 — Competition win-rate definition**
  * **Current behavior:** Measures closed profitable trades, excluding quarantined closes.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** wins=count(closed profit>0); win_rate=round(100*wins/closed.length), null if empty; trade read limit=400 per entrant.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:1062-1086,1111-1114
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L079 — Competition maturity clock**
  * **Current behavior:** Uses oldest slot start, not each challenger’s tenure or market sessions.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** days=max(0,round((UTC today-oldest slot.started_on)/86400000)); RACE_MIN_DAYS=28.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:75,1222-1235
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L080 — Switch suggestion gate**
  * **Current behavior:** Suggests leading paper strategy after sufficient race age and closed trades; no explicit positive edge test means tied paper-first ordering can qualify.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** leader exists && live exists && !leader.live && daysRunning>=28 && leader.trades>=5; edge=round(leader.total_pnl-live.total_pnl,2).
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:1217-1241
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L081 — Switch notification is not activation**
  * **Current behavior:** Only sends review notification; dedupe is per strategy and calculated UTC week.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** When maybeSuggestSwitch is invoked.
  * **Relevant formulas or rules:** week=ceil(((now-Jan1UTC)/86400000+1)/7); dedupe=race-suggest:strategy_id:year-Wweek.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:1288-1305
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L082 — Enabled participants do not rotate**
  * **Current behavior:** Every enabled slot is marked testing_today; department defaults to every enabled lane, supports force_lanes.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** enabled is false only when explicitly saved false; force list intersects enabled; empty intersection falls back all enabled.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:1103-1106; src/lib/department.server.ts:982-998
  * **Decision:** [ ]
  * **My instructions:**

## 5. Research Timing, Dates & Scheduling

* [ ] **L083 — Entry hook execution window**
  * **Current behavior:** Scheduled entry is a post-open pass, not premarket activity.
  * **How it works:** Check token and New York trading-day time before paper and regular entry.
  * **Inputs and dependencies:** Hook token, market calendar and settings.
  * **Execution schedule:** 09:35 inclusive through before 09:40 Eastern.
  * **Relevant formulas or rules:** Installed connected cron: 35 13,14 * * 1-5 GMT; wrong-offset call should be rejected.
  * **Current implementation status:** Connected schedule active; target and successful delivery not returned by safe metadata tool; production unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/schedule-rules.ts:6–17; src/routes/api/public/hooks/preopen.ts:8–33; read-only cron metadata 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L084 — Preclose hook execution windows**
  * **Current behavior:** Preclose hook uses authoritative exchange close with existing close−15 and close−8 windows; live/paper exit logic and existing authentication are unchanged.
  * **How it works:** Guard uses sessionCloseMinutes, then paper exits precede autonomous and regular exits.
  * **Inputs and dependencies:** Hook token and date-specific market close.
  * **Execution schedule:** [close−15,close−10) and [close−8,close−3) Eastern.
  * **Relevant formulas or rules:** Connected cron: 45 16,17,19,20 * * 1-5; retry 52 16,17,19,20 * * 1-5 GMT.
  * **Current implementation status:** November 28 — X06 source/tests verified; existing unmanaged candidate-time jobs were not changed. Production delivery remains unverified.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X06 source/tests verified; existing unmanaged candidate-time jobs were not changed. Production delivery remains unverified.
  * **Source evidence:** src/lib/schedule-rules.ts:12–14; src/routes/api/public/hooks/preclose.ts:8–28; read-only cron metadata
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X06 source/tests verified; existing unmanaged candidate-time jobs were not changed. Production delivery remains unverified.

* [ ] **L085 — After-close daily hook schedule**
  * **Current behavior:** Daily-cycle hook uses authoritative trading-session eligibility and preserves the existing 17:30 Eastern after-close pipeline.
  * **How it works:** Guard accepts only a five-minute Eastern slot on trading days.
  * **Inputs and dependencies:** Hook token, trading calendar and research dependencies.
  * **Execution schedule:** 17:30–17:34 Eastern; connected cron 30 21,22 * * 1-5 GMT.
  * **Relevant formulas or rules:** Fresh SQL declares only 30 21 * * 1-5, so template alone misses winter offset.
  * **Current implementation status:** November 28 — X06 DST guard remains date-aware; production scheduler not changed. After-close processing of completed new data is retained, not an unnecessary offhours graph loop.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X06 DST guard remains date-aware; production scheduler not changed. After-close processing of completed new data is retained, not an unnecessary offhours graph loop.
  * **Source evidence:** src/lib/schedule-rules.ts; src/routes/api/public/hooks/daily-cycle.ts; migration/fresh/09-schedule.sql:14–55; read-only cron metadata
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X06 DST guard remains date-aware; production scheduler not changed. After-close processing of completed new data is retained, not an unnecessary offhours graph loop.

* [ ] **L086 — Provider-key check schedule**
  * **Current behavior:** Existing 08:00 Eastern daily key check and credential handling are retained; bounded continuous monitor also checks exchange access independently.
  * **How it works:** Token and Eastern-time guard precede key checks.
  * **Inputs and dependencies:** Provider credentials; never copied into this checklist.
  * **Execution schedule:** 08:00–08:04 Eastern; connected cron 0 12,13 * * * GMT.
  * **Relevant formulas or rules:** Fresh template uses 0 12 * * * only.
  * **Current implementation status:** November 28 — Existing dual-offset schedule preserved; single-offset template conflict and production delivery are not marked resolved by this build.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: Existing dual-offset schedule preserved; single-offset template conflict and production delivery are not marked resolved by this build.
  * **Source evidence:** src/routes/api/public/hooks/key-check.ts:23–27; src/lib/schedule-rules.ts; migration/fresh/14-key-check-schedule.sql
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. Existing dual-offset schedule preserved; single-offset template conflict and production delivery are not marked resolved by this build.

* [ ] **L087 — Scheduled Lab refresh window**
  * **Current behavior:** Scheduled graph hook runs only inside actual exchange hours, separates deep audits, refuses expensive implicit history bootstrap, and retains snapshot timestamps when actual payloads are unchanged.
  * **How it works:** Guard then ledger initialization, pipeline and integrity check.
  * **Inputs and dependencies:** Saved research, hook token and market calendar.
  * **Execution schedule:** Weekdays 18:00–18:04 Eastern or Saturday 10:00–10:04; connected cron 0 14,15,22,23 * * * GMT.
  * **Relevant formulas or rules:** Fresh SQL */5 13-20 * * 1-5 cannot reach current accepted evening/Saturday windows.
  * **Current implementation status:** November 28 — X05 hook/no-change behavior verified. Connected existing job remains hourly candidate invocations; every-few-minutes production activation awaits actual scheduler access and free-budget confirmation.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X05 hook/no-change behavior verified. Connected existing job remains hourly candidate invocations; every-few-minutes production activation awaits actual scheduler access and free-budget confirmation.
  * **Source evidence:** src/routes/api/public/hooks/lab-refresh.ts:12–31; src/lib/schedule-rules.ts; migration/fresh/15-lab-refresh-schedule.sql; read-only cron metadata
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X05 hook/no-change behavior verified. Connected existing job remains hourly candidate invocations; every-few-minutes production activation awaits actual scheduler access and free-budget confirmation.

* [ ] **L088 — Market-window health schedule**
  * **Current behavior:** Prepared five-minute read-only authenticated monitoring and a sequential optional existing-server runner; expensive safe-repair health remains independently paced.
  * **How it works:** HTTP scheduler initiates health; health handler does not apply the same Eastern slot guard.
  * **Inputs and dependencies:** Hook token, provider, cache, trades and health_checks.
  * **Execution schedule:** */15 13-20 * * 1-5 GMT; optional fresh audit file replaces with */5.
  * **Relevant formulas or rules:** Source versions disagree about five versus fifteen minutes.
  * **Current implementation status:** November 28 — X07 not activated: completely free hosting budget, safe measured cadence and production schedule are pending. Existing 15-minute job unchanged.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X07 not activated: completely free hosting budget, safe measured cadence and production schedule are pending. Existing 15-minute job unchanged.
  * **Source evidence:** migration/fresh/09-schedule.sql;16-autonomous-audit.sql:73–95; src/routes/api/public/hooks/health.ts; read-only cron metadata
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X07 not activated: completely free hosting budget, safe measured cadence and production schedule are pending. Existing 15-minute job unchanged.

* [ ] **L089 — Offhours health schedule**
  * **Current behavior:** Optional existing-server runner has no market-hours/weekend restriction for bounded checks; health and self-audits run independently of market calendar.
  * **How it works:** Complementary UTC-hour cron expression excludes 13–20 every day.
  * **Inputs and dependencies:** Health hook and token.
  * **Execution schedule:** 7 0-12,21-23 * * * GMT.
  * **Relevant formulas or rules:** Weekend hours 13–20 are uncovered because market-window job is weekday-only.
  * **Current implementation status:** November 28 — X07 production weekend gap remains unresolved until runner/scheduler activation; no claim that five minutes is free or fastest without evidence.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X07 production weekend gap remains unresolved until runner/scheduler activation; no claim that five minutes is free or fastest without evidence.
  * **Source evidence:** migration/fresh/09-schedule.sql;16-autonomous-audit.sql:81–95; read-only cron metadata
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X07 production weekend gap remains unresolved until runner/scheduler activation; no claim that five minutes is free or fastest without evidence.

* [ ] **L090 — Standalone daily integrity schedule**
  * **Current behavior:** Fresh audit SQL defines a daily integrity job in addition to the Lab hook’s integrity call.
  * **How it works:** Submit POST with daily cadence.
  * **Inputs and dependencies:** pg_cron, pg_net, hook token and integrity hook.
  * **Execution schedule:** 0 22 * * 1-5 GMT in template.
  * **Relevant formulas or rules:** Not present in the connected safe schedule listing.
  * **Current implementation status:** Defined in source; standalone installation not verified; Lab-triggered integrity remains separate.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/16-autonomous-audit.sql:97–103; src/routes/api/public/hooks/integrity.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L091 — Standalone weekly integrity schedule**
  * **Current behavior:** Fresh audit SQL defines a weekly deeper audit.
  * **How it works:** Submit POST with weekly cadence.
  * **Inputs and dependencies:** Scheduler extensions and integrity hook.
  * **Execution schedule:** 0 12 * * 6 GMT in template.
  * **Relevant formulas or rules:** Not present in the connected safe schedule listing; Lab hook has a separate Saturday path.
  * **Current implementation status:** Source-defined; no standalone active connected job shown.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/16-autonomous-audit.sql:105–111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L092 — Premarket versus post-open activity**
  * **Current behavior:** The preopen-named hook actually operates after the open.
  * **How it works:** Entry guard starts at 09:35; providers may still be checked separately at 08:00.
  * **Inputs and dependencies:** Calendar, entry and key-check hooks.
  * **Execution schedule:** Entry 09:35 Eastern; key check 08:00 Eastern.
  * **Relevant formulas or rules:** No separate operational premarket researcher scan was verified from these hooks.
  * **Current implementation status:** Naming discrepancy verified; do not present post-open pass as premarket.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/schedule-rules.ts; src/routes/api/public/hooks/preopen.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L093 — Browser-driven graph refresh**
  * **Current behavior:** Open Lab pages can initiate their own snapshot refresh.
  * **How it works:** Run immediately and every five minutes while market is open; keep previous snapshot on error.
  * **Inputs and dependencies:** Browser page, gated graph function and market state.
  * **Execution schedule:** Only while Lab page is open and market open.
  * **Relevant formulas or rules:** Multiple devices may each trigger a call; not a durable scheduler.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/lab.tsx:87–106; src/lib/race.functions.ts:145–176
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L094 — History and formula-update scheduling**
  * **Current behavior:** Research department and historical work have distinct limits and triggers.
  * **How it works:** Daily hook runs department universe250, horizons, event/history work and bounded replay; optional regular cycle invokes research/ML universe300.
  * **Inputs and dependencies:** Settings research_auto/ml_enabled and daily hook chain.
  * **Execution schedule:** After-close hook; additional manual functions available.
  * **Relevant formulas or rules:** Research before auto_run gate is distinct from optional regular-cycle research.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/daily-cycle.ts:17–75; src/lib/scan.server.ts:1339–1394
  * **Decision:** [ ]
  * **My instructions:**

* [x] **L095 — Research completed-session timestamp**
  * **Current behavior:** Selection receipts and validation opens use marketSessionTimestamp with the session date’s actual New York offset. Receipts remain close+5 minutes; historical timestamps are modeled evidence.
  * **How it works:** Convert America/New_York GMT offset to UTC; reject closed-market dates.
  * **Inputs and dependencies:** market-calendar holiday/early-close rules and Intl timezone data.
  * **Execution schedule:** Selection replay for each candidate date.
  * **Relevant formulas or rules:** selected_at = session close +5 minutes with actual date-specific UTC offset.
  * **Current implementation status:** November 28 — X08 converter verified across winter, summer, early closes and holidays; not proof of actual historical live prediction execution.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X08 converter verified across winter, summer, early closes and holidays; not proof of actual historical live prediction execution.
  * **Source evidence:** src/lib/research-session.ts:4–18
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X08 converter verified across winter, summer, early closes and holidays; not proof of actual historical live prediction execution.

## 6. Formulas, Scoring & Calculations

* [ ] **L096 — Simple moving average**
  * **Current behavior:** Computes Simple moving average using the calculation below; this inventory does not change its value or use.
  * **How it works:** SMA_n = sum(last n closes)/n; null if fewer than n.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** SMA_n = sum(last n closes)/n; null if fewer than n. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:55-64
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L097 — Live RSI14**
  * **Current behavior:** Computes Live RSI14 using the calculation below; this inventory does not change its value or use.
  * **How it works:** g=mean14(max(deltaClose,0)); l=mean14(max(-deltaClose,0)); RSI=100-100/(1+g/l); l=0 returns null, not 100.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** g=mean14(max(deltaClose,0)); l=mean14(max(-deltaClose,0)); RSI=100-100/(1+g/l); l=0 returns null, not 100. Simple rolling averages, not Wilder smoothing; null RSI rejects live snapshot.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:66-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L098 — Live ATR14**
  * **Current behavior:** Computes Live ATR14 using the calculation below; this inventory does not change its value or use.
  * **How it works:** TR_t=max(high-low,abs(high-prevClose),abs(low-prevClose)); ATR14=mean14(TR).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** TR_t=max(high-low,abs(high-prevClose),abs(low-prevClose)); ATR14=mean14(TR). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:83-94
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L099 — Snapshot data floor**
  * **Current behavior:** Computes Snapshot data floor using the calculation below; this inventory does not change its value or use.
  * **How it works:** Require >=55 bars; SMA20,SMA50,RSI14,ATR14,mean20(volume),mean20(close*volume) non-null; average volume !=0; close five sessions ago !=0.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Require >=55 bars; SMA20,SMA50,RSI14,ATR14,mean20(volume),mean20(close*volume) non-null; average volume !=0; close five sessions ago !=0. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:109-137
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L100 — Five-session ROC**
  * **Current behavior:** Computes Five-session ROC using the calculation below; this inventory does not change its value or use.
  * **How it works:** ROC5=100*(close_t-close_(t-5))/close_(t-5).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** ROC5=100*(close_t-close_(t-5))/close_(t-5). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:135-137
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L101 — Live relative volume**
  * **Current behavior:** Computes Live relative volume using the calculation below; this inventory does not change its value or use.
  * **How it works:** relVolume=volume_t/mean20(volume), including signal bar.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** relVolume=volume_t/mean20(volume), including signal bar. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:119-146
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L102 — Average dollar volume**
  * **Current behavior:** Computes Average dollar volume using the calculation below; this inventory does not change its value or use.
  * **How it works:** ADV20=mean20(close_t*volume_t), not latestClose*meanVolume.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** ADV20=mean20(close_t*volume_t), not latestClose*meanVolume. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:120-121
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L103 — Trend factor**
  * **Current behavior:** Computes Trend factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** raw=40*I(close>SMA20)+30*I(close>SMA50)+30*I(SMA20>SMA50); range 0..100; default weight25.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** raw=40*I(close>SMA20)+30*I(close>SMA50)+30*I(SMA20>SMA50); range 0..100; default weight25. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:154-170
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L104 — Momentum factor**
  * **Current behavior:** Computes Momentum factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** raw=min(100, RSIterm + (ROC5>0 ? min(50,10*ROC5):0)); RSIterm=50 if 55<=RSI<=75,20 if RSI>75,else0; default weight25.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** raw=min(100, RSIterm + (ROC5>0 ? min(50,10*ROC5):0)); RSIterm=50 if 55<=RSI<=75,20 if RSI>75,else0; default weight25. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:172-187
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L105 — Volume factor**
  * **Current behavior:** Computes Volume factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** raw=100 if relVolume>=1.5,60 if >=1.1,else0; default weight20.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** raw=100 if relVolume>=1.5,60 if >=1.1,else0; default weight20. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:189-197
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L106 — Relative-strength factor**
  * **Current behavior:** Computes Relative-strength factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** d=ROC5-security minus marketROC5; raw=d>0 ? min(100,15*d):0; default weight15.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** d=ROC5-security minus marketROC5; raw=d>0 ? min(100,15*d):0; default weight15. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:199-205
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L107 — Volatility-quality factor**
  * **Current behavior:** Computes Volatility-quality factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** a=100*ATR14/close; raw=100 if 1<=a<=4,30 if a<1,else20; default weight15.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** a=100*ATR14/close; raw=100 if 1<=a<=4,30 if a<1,else20; default weight15. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:207-216
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L108 — Weighted live score**
  * **Current behavior:** Computes Weighted live score using the calculation below; this inventory does not change its value or use.
  * **How it works:** score=round1(sum(rawFactor/100*configuredWeight)); individual contributions round1 separately; defaults25/25/20/15/15. No weight normalization here; 0..100 only under nonnegative weights summing100.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** score=round1(sum(rawFactor/100*configuredWeight)); individual contributions round1 separately; defaults25/25/20/15/15. No weight normalization here; 0..100 only under nonnegative weights summing100. Display invalidation: close below SMA20 OR RSI14<45; returned string, not enforced by scoreSecurity.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scoring.ts:45-51; src/lib/scoring.ts:235-257
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L109 — Feed-adjusted liquidity gate**
  * **Current behavior:** Computes Feed-adjusted liquidity gate using the calculation below; this inventory does not change its value or use.
  * **How it works:** effectiveMinADV=Number(min_avg_dollar_volume)*share; share=1 unless Alpaca; Alpaca IEX share=0.025.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** effectiveMinADV=Number(min_avg_dollar_volume)*share; share=1 unless Alpaca; Alpaca IEX share=0.025. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:90-107; src/lib/market-data.server.ts:166-178
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L110 — Scanner benchmark fallback/alignment risk**
  * **Current behavior:** Computes Scanner benchmark fallback/alignment risk using the calculation below; this inventory does not change its value or use.
  * **How it works:** marketROC5=100*(latestProxyClose/proxyClose5Ago-1); missing/zero prior yields0; same scalar applied to all tickers, with no per-ticker date alignment in runScan.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** marketROC5=100*(latestProxyClose/proxyClose5Ago-1); missing/zero prior yields0; same scalar applied to all tickers, with no per-ticker date alignment in runScan. Also src/lib/scan.server.ts:361-390. Review stale/missing proxy and mixed-date series.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:328-333
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L111 — Research pullback**
  * **Current behavior:** Computes Research pullback using the calculation below; this inventory does not change its value or use.
  * **How it works:** drop=100*(max20(high)-close)/max20(high); 0 if drop<=1; C(100*drop/12) if drop<=12; else C(100-6*(drop-12))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** drop=100*(max20(high)-close)/max20(high); 0 if drop<=1; C(100*drop/12) if drop<=12; else C(100-6*(drop-12)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:119-123
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L112 — Research oversold_reversal**
  * **Current behavior:** Computes Research oversold_reversal using the calculation below; this inventory does not change its value or use.
  * **How it works:** Use last21 daily percentage returns; strength=100*sum(positive)/(sum(positive)+abs(sum(negative))), default50; C((100-strength)*(lastReturn>0?1.4:0.5))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Use last21 daily percentage returns; strength=100*sum(positive)/(sum(positive)+abs(sum(negative))), default50; C((100-strength)*(lastReturn>0?1.4:0.5)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:125-135
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L113 — Research down_streak**
  * **Current behavior:** Computes Research down_streak using the calculation below; this inventory does not change its value or use.
  * **How it works:** Count consecutive close declines; 0 if n=0; C(33*n) if n<=3; else C(100-30*(n-3))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Count consecutive close declines; 0 if n=0; C(33*n) if n<=3; else C(100-30*(n-3)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:137-142
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L114 — Research volume_dryup**
  * **Current behavior:** Computes Research volume_dryup using the calculation below; this inventory does not change its value or use.
  * **How it works:** v=latestVolume/mean(prior20 volumes), default1; C((1.2-v)*125)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** v=latestVolume/mean(prior20 volumes), default1; C((1.2-v)*125) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:144-147
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L115 — Research return_stability**
  * **Current behavior:** Computes Research return_stability using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(100-22*sampleSD(last21 daily percentage returns))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(100-22*sampleSD(last21 daily percentage returns)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:125-126,149-150
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L116 — Research positive_days**
  * **Current behavior:** Computes Research positive_days using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(140*count(last21 returns>0)/count(returns)); empty0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(140*count(last21 returns>0)/count(returns)); empty0 C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:125-150
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L117 — Research low_drawdown**
  * **Current behavior:** Computes Research low_drawdown using the calculation below; this inventory does not change its value or use.
  * **How it works:** Walk last40 closes with running peak; maxDD=max(100*(peak-close)/peak); C(100-5*maxDD)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Walk last40 closes with running peak; maxDD=max(100*(peak-close)/peak); C(100-5*maxDD) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:152-158
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L118 — Research atr_stability**
  * **Current behavior:** Computes Research atr_stability using the calculation below; this inventory does not change its value or use.
  * **How it works:** atrNow=ATR14(all); atrPrev=ATR14(prefix ending14 bars earlier, prefix length at least16), fallback atrNow; ratio=atrNow/atrPrev if atrPrev>0 else1; C(100-160*abs(ratio-1))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** atrNow=ATR14(all); atrPrev=ATR14(prefix ending14 bars earlier, prefix length at least16), fallback atrNow; ratio=atrNow/atrPrev if atrPrev>0 else1; C(100-160*abs(ratio-1)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:160-164
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L119 — Research growth_acceleration**
  * **Current behavior:** Computes Research growth_acceleration using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(8*(2*ROC10-ROC20))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(8*(2*ROC10-ROC20)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:166-169
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L120 — Research long_relative_strength**
  * **Current behavior:** Computes Research long_relative_strength using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(3*(ROC60-marketROC60))
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(3*(ROC60-marketROC60)) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:166-170
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L121 — Research sustained_advance**
  * **Current behavior:** Computes Research sustained_advance using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(2.5*ROC60)*(ROC20>0?1:0.4)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(2.5*ROC60)*(ROC20>0?1:0.4) C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:166-171
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L122 — Research reward_per_risk**
  * **Current behavior:** Computes Research reward_per_risk using the calculation below; this inventory does not change its value or use.
  * **How it works:** ATRpct=100*ATR14/close; ATRpct>0 ? C(22*ROC20/ATRpct):0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** ATRpct=100*ATR14/close; ATRpct>0 ? C(22*ROC20/ATRpct):0 C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:164-173
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L123 — Research downside_protection**
  * **Current behavior:** Computes Research downside_protection using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(100-28*sampleSD(negative last21 returns)); SD<2 observations=0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(100-28*sampleSD(negative last21 returns)); SD<2 observations=0 C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:174-175
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L124 — Research worst_day**
  * **Current behavior:** Computes Research worst_day using the calculation below; this inventory does not change its value or use.
  * **How it works:** C(100-12*abs(min(last21 returns))); empty minimum0; all-positive windows still penalize smallest positive return
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** C(100-12*abs(min(last21 returns))); empty minimum0; all-positive windows still penalize smallest positive return C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:176-177
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L125 — Research liquidity_depth**
  * **Current behavior:** Computes Research liquidity_depth using the calculation below; this inventory does not change its value or use.
  * **How it works:** dv=latestClose*mean(prior20 volume); dv>0 ? C(100*(log10(dv)-6)/2.5):0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** dv=latestClose*mean(prior20 volume); dv>0 ? C(100*(log10(dv)-6)/2.5):0 C(x)=max(0,min(100,x)); independent research percentages, not live-factor replacements. Sample SD denominator n-1. ROC unavailable/zero prior returns0 (lines88-100); ROC60 needs61 bars although comment expects55. Different research definitions are not bugs.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/factors.ts:178-179
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L126 — ML feature roc1**
  * **Current behavior:** Computes ML feature roc1 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close_t/close_(t-1)-1).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close_t/close_(t-1)-1). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:157-165; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L127 — ML feature roc5**
  * **Current behavior:** Computes ML feature roc5 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close_t/close_(t-5)-1).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close_t/close_(t-5)-1). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:157-165; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L128 — ML feature roc10**
  * **Current behavior:** Computes ML feature roc10 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close_t/close_(t-10)-1).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close_t/close_(t-10)-1). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:157-165; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L129 — ML feature roc20**
  * **Current behavior:** Computes ML feature roc20 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close_t/close_(t-20)-1).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close_t/close_(t-20)-1). 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:157-165; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L130 — ML feature dist_sma20**
  * **Current behavior:** Computes ML feature dist_sma20 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close/SMA20-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close/SMA20-1) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:166-167; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L131 — ML feature dist_sma50**
  * **Current behavior:** Computes ML feature dist_sma50 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close/SMA50-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close/SMA50-1) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:166-167; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L132 — ML feature sma20_slope**
  * **Current behavior:** Computes ML feature sma20_slope using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(SMA20_t/SMA20_(t-5)-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(SMA20_t/SMA20_(t-5)-1) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:140-143; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L133 — ML feature sma50_slope**
  * **Current behavior:** Computes ML feature sma50_slope using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(SMA50_t/SMA50_(t-5)-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(SMA50_t/SMA50_(t-5)-1) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:140-143; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L134 — ML feature atr_pct**
  * **Current behavior:** Computes ML feature atr_pct using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*mean14(TR)/close
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*mean14(TR)/close Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:106-115; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L135 — ML feature vol_5d**
  * **Current behavior:** Computes ML feature vol_5d using the calculation below; this inventory does not change its value or use.
  * **How it works:** sampleSD(last5 daily percentage returns)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** sampleSD(last5 daily percentage returns) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:170-172; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L136 — ML feature vol_20d**
  * **Current behavior:** Computes ML feature vol_20d using the calculation below; this inventory does not change its value or use.
  * **How it works:** sampleSD(last20 daily percentage returns)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** sampleSD(last20 daily percentage returns) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:170-172; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L137 — ML feature volume_trend**
  * **Current behavior:** Computes ML feature volume_trend using the calculation below; this inventory does not change its value or use.
  * **How it works:** mean5(volume)/mean20(volume)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** mean5(volume)/mean20(volume) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:149-175; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L138 — ML feature rel_vol_1**
  * **Current behavior:** Computes ML feature rel_vol_1 using the calculation below; this inventory does not change its value or use.
  * **How it works:** volume_t/mean20(volume)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** volume_t/mean20(volume) Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:149-175; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L139 — ML feature rel_vol_5**
  * **Current behavior:** Computes ML feature rel_vol_5 using the calculation below; this inventory does not change its value or use.
  * **How it works:** mean5(volume)/mean20(volume); exact duplicate of volume_trend
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** mean5(volume)/mean20(volume); exact duplicate of volume_trend Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:149-175; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L140 — ML feature high_20_dist**
  * **Current behavior:** Computes ML feature high_20_dist using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close/max20(high)-1), including current high
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close/max20(high)-1), including current high Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:153-177; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L141 — ML feature low_20_dist**
  * **Current behavior:** Computes ML feature low_20_dist using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(close/min20(low)-1), including current low
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*(close/min20(low)-1), including current low Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:153-177; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L142 — ML feature breakout_20**
  * **Current behavior:** Computes ML feature breakout_20 using the calculation below; this inventory does not change its value or use.
  * **How it works:** I(close>=max20(high)), including current high; often only closing at window high qualifies
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** I(close>=max20(high)), including current high; often only closing at window high qualifies Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:153-178; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L143 — ML feature momentum_accel**
  * **Current behavior:** Computes ML feature momentum_accel using the calculation below; this inventory does not change its value or use.
  * **How it works:** ROC5_t-ROC5_(t-5), percentage points
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** ROC5_t-ROC5_(t-5), percentage points Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:157-179; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L144 — ML feature rsi14**
  * **Current behavior:** Computes ML feature rsi14 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100-100/(1+mean14(gains)/mean14(losses)); zero losses gives100 if gains>0 else50, unlike live RSI null
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100-100/(1+mean14(gains)/mean14(losses)); zero losses gives100 if gains>0 else50, unlike live RSI null Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:90-104; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L145 — ML feature rel_momentum_5**
  * **Current behavior:** Computes ML feature rel_momentum_5 using the calculation below; this inventory does not change its value or use.
  * **How it works:** ROC5-marketROC5
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** ROC5-marketROC5 Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:180-182; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L146 — ML feature rel_momentum_20**
  * **Current behavior:** Computes ML feature rel_momentum_20 using the calculation below; this inventory does not change its value or use.
  * **How it works:** ROC20-marketROC20
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** ROC20-marketROC20 Feature set fs1; floor55 bars; finite vector only (lines129-186); no feature uses future bars. Differences from live/research definitions are intentional alternatives unless separately demonstrated.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/features.ts:180-182; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L147 — ML forward-return label**
  * **Current behavior:** Computes ML forward-return label using the calculation below; this inventory does not change its value or use.
  * **How it works:** holding=max(1,ml_holding_days??1); y=100*(close_(i+holding)/close_i-1); null if exit missing. Benchmark uses its own index+holding.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** holding=max(1,ml_holding_days??1); y=100*(close_(i+holding)/close_i-1); null if exit missing. Benchmark uses its own index+holding. Close-to-close gross returns, not intraday execution or net P&L; gaps count observed rows, not guaranteed common sessions.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:83-145; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L148 — ML benchmark date lookup**
  * **Current behavior:** Computes ML benchmark date lookup using the calculation below; this inventory does not change its value or use.
  * **How it works:** Benchmark ROC5/20 matched by sample date; absent proxy/date uses0. Benchmark forward return null when unavailable.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Benchmark ROC5/20 matched by sample date; absent proxy/date uses0. Benchmark forward return null when unavailable. 
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:89-125; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L149 — Forest leaf prediction**
  * **Current behavior:** Computes Forest leaf prediction using the calculation below; this inventory does not change its value or use.
  * **How it works:** Leaf mean=sum(y)/n; posShare=count(y>0)/n; targetShare=count(y>=targetReturnPct)/n.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Leaf mean=sum(y)/n; posShare=count(y>0)/n; targetShare=count(y>=targetReturnPct)/n. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/forest.ts:64-76
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L150 — Forest ensemble prediction**
  * **Current behavior:** Computes Forest ensemble prediction using the calculation below; this inventory does not change its value or use.
  * **How it works:** Equal arithmetic average of reached-leaf means, positive shares and target shares across trees; probabilities0..1.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Equal arithmetic average of reached-leaf means, positive shares and target shares across trees; probabilities0..1. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/forest.ts:192-207
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L151 — Forest bootstrap and defaults**
  * **Current behavior:** Computes Forest bootstrap and defaults using the calculation below; this inventory does not change its value or use.
  * **How it works:** Defaults trees60,maxDepth8,minLeaf12,featureFraction0.6,sampleFraction0.8,seed20260811,target1%; bagSize=max(4*minLeaf,round(N*sampleFraction)), sample rows with replacement; settings trees clamp10..200.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Defaults trees60,maxDepth8,minLeaf12,featureFraction0.6,sampleFraction0.8,seed20260811,target1%; bagSize=max(4*minLeaf,round(N*sampleFraction)), sample rows with replacement; settings trees clamp10..200. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/forest.ts:23-31; src/lib/forest.ts:163-180; src/lib/ml.server.ts:293-298
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L152 — Forest split objective**
  * **Current behavior:** Computes Forest split objective using the calculation below; this inventory does not change its value or use.
  * **How it works:** Try max(1,round(featureCount*0.6)) random features WITH replacement; candidate quantiles .2,.35,.5,.65,.8 from stepped sample (step=max(1,floor(n/40))); gain=populationVar(parent)-(nL*VarL+nR*VarR)/n; accept greatest gain>0, both child n>=minLeaf; depth>=maxDepth or n<2*minLeaf stops.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Try max(1,round(featureCount*0.6)) random features WITH replacement; candidate quantiles .2,.35,.5,.65,.8 from stepped sample (step=max(1,floor(n/40))); gain=populationVar(parent)-(nL*VarL+nR*VarR)/n; accept greatest gain>0, both child n>=minLeaf; depth>=maxDepth or n<2*minLeaf stops. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/forest.ts:78-142
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L153 — Forest importance interpretation**
  * **Current behavior:** Computes Forest importance interpretation using the calculation below; this inventory does not change its value or use.
  * **How it works:** Add estimated node sample count to split feature; recurse actual leaf n else floor/ceil(parent n/2); normalize total contributions. Not impurity-gain or permutation importance.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Add estimated node sample count to split feature; recurse actual leaf n else floor/ceil(parent n/2); normalize total contributions. Not impurity-gain or permutation importance. 
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/forest.ts:145-180
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L154 — Walk-forward label overlap risk**
  * **Current behavior:** Computes Walk-forward label overlap risk using the calculation below; this inventory does not change its value or use.
  * **How it works:** Train dates immediately precede test dates, no horizon purge/embargo; train y uses i+holding. Inference: boundary labels can consume test-period closes despite header strict out-of-sample claim.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Train dates immediately precede test dates, no horizon purge/embargo; train y uses i+holding. Inference: boundary labels can consume test-period closes despite header strict out-of-sample claim. 
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** X18: Walk-forward training dates immediately precede test dates without a horizon purge. Training labels use future holding-period closes, so boundary labels can reach into the test interval despite the strict out-of-sample header. This is a source-level leakage risk, not a measured production error. Related items: L154.
  * **Source evidence:** src/lib/ml.server.ts:4-7; src/lib/ml.server.ts:119-133; src/lib/ml.server.ts:366-382; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L155 — Walk-forward window sizing**
  * **Current behavior:** Computes Walk-forward window sizing using the calculation below; this inventory does not change its value or use.
  * **How it works:** wantTrain=max(20,setting??40); test=max(1,setting??10); actualTrain=max(15,min(wantTrain,availableLabelDates-test)); maxFolds default4; step=test; require>=200 train rows.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** wantTrain=max(20,setting??40); test=max(1,setting??10); actualTrain=max(15,min(wantTrain,availableLabelDates-test)); maxFolds default4; step=test; require>=200 train rows. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:325-377; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L156 — Blended percentile ranking**
  * **Current behavior:** Computes Blended percentile ranking using the calculation below; this inventory does not change its value or use.
  * **How it works:** Sort ASTR ascending (null=>0), model target ascending; percentile=index/max(1,N-1); blend=100*((1-w)*ASTRpct+w*modelPct), w=clamp01(setting??0.5). Ordinal tie handling, no averaged ranks.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Sort ASTR ascending (null=>0), model target ascending; percentile=index/max(1,N-1); blend=100*((1-w)*ASTRpct+w*modelPct), w=clamp01(setting??0.5). Ordinal tie handling, no averaged ranks. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:444-459; src/lib/ml.server.ts:643-675; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L157 — ML gross return summary**
  * **Current behavior:** Computes ML gross return summary using the calculation below; this inventory does not change its value or use.
  * **How it works:** total_return_pct=sum(pick returns); avg=sum/N; win_rate=100*count(r>0)/N; avg_vs_benchmark=mean(r-b) for available b only.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** total_return_pct=sum(pick returns); avg=sum/N; win_rate=100*count(r>0)/N; avg_vs_benchmark=mean(r-b) for available b only. Not compounded or capital-weighted portfolio return; no fee/slippage deduction here.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:193-231; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L158 — ML drawdown summary**
  * **Current behavior:** Computes ML drawdown summary using the calculation below; this inventory does not change its value or use.
  * **How it works:** Group returns by date, sum each date; cumulative additive equity starts0; max_drawdown_pct=min(equity-runningPeak).
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Group returns by date, sum each date; cumulative additive equity starts0; max_drawdown_pct=min(equity-runningPeak). Negative additive percentage-point drawdown, not relative drawdown of invested equity.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:203-232; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L159 — ML profit factor**
  * **Current behavior:** Computes ML profit factor using the calculation below; this inventory does not change its value or use.
  * **How it works:** sum(positive returns)/abs(sum(negative returns)); zero losses gives99 if gains>0 else0.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** sum(positive returns)/abs(sum(negative returns)); zero losses gives99 if gains>0 else0. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:215-234; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L160 — ML Sharpe summary**
  * **Current behavior:** Computes ML Sharpe summary using the calculation below; this inventory does not change its value or use.
  * **How it works:** mean(pick returns)/sampleSD(pick returns)*sqrt(252), else0.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** mean(pick returns)/sampleSD(pick returns)*sqrt(252), else0. Trade observations are not necessarily daily portfolio returns, especially multiple picks/holding>1; review annualization.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:193-234; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L161 — Prediction provenance risk**
  * **Current behavior:** Fresh live model may be linked to unrelated stored version.
  * **How it works:** predictLatest trains anew on all labeled rows, then selects latest model_versions.id without validating model configuration/train window; payload omits per-prediction holding horizon and target threshold.
  * **Inputs and dependencies:** Current settings, labeled cache, latest model version
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** predictLatest trains anew on all labeled rows, then selects latest model_versions.id without validating model configuration/train window; payload omits per-prediction holding horizon and target threshold. Inference: model-version FK does not establish exact trained-model provenance.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** X19: Freshly retrained predictions can reference the latest stored model version without configuration agreement, and later grading uses current holding settings rather than the original persisted prediction horizon. Persisted first-200 unsorted predictions also differ from displayed ranked top-50. These directly weaken reproducible forecast evidence. Related items: L161, L162, L163.
  * **Source evidence:** src/lib/ml.server.ts:625-704; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L162 — Prediction persistence coverage risk**
  * **Current behavior:** Stored sample differs from displayed top-ranked predictions.
  * **How it works:** Delete all predictions for asOf; persist scored.slice(0,200) BEFORE rank sorting; returned rows are combined-ranked top50.
  * **Inputs and dependencies:** Predictions
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Delete all predictions for asOf; persist scored.slice(0,200) BEFORE rank sorting; returned rows are combined-ranked top50. Re-running also replaces same-date prediction records.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** X19: Freshly retrained predictions can reference the latest stored model version without configuration agreement, and later grading uses current holding settings rather than the original persisted prediction horizon. Persisted first-200 unsorted predictions also differ from displayed ranked top-50. These directly weaken reproducible forecast evidence. Related items: L161, L162, L163.
  * **Source evidence:** src/lib/ml.server.ts:659-707; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L163 — Prediction grading horizon risk**
  * **Current behavior:** Computes Prediction grading horizon risk using the calculation below; this inventory does not change its value or use.
  * **How it works:** Use CURRENT ml_holding_days; fetch >=as_of date first holding+1 rows; actual=100*(exit.close/entry.close-1); round3, result sign.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** Use CURRENT ml_holding_days; fetch >=as_of date first holding+1 rows; actual=100*(exit.close/entry.close-1); round3, result sign. No persisted original horizon used, nor exact entry-date equality guard; settings changes/missing asOf bar can alter label semantics.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** X19: Freshly retrained predictions can reference the latest stored model version without configuration agreement, and later grading uses current holding settings rather than the original persisted prediction horizon. Persisted first-200 unsorted predictions also differ from displayed ranked top-50. These directly weaken reproducible forecast evidence. Related items: L161, L162, L163.
  * **Source evidence:** src/lib/ml.server.ts:711-748; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L164 — Discovery streak**
  * **Current behavior:** Computes Discovery streak using the calculation below; this inventory does not change its value or use.
  * **How it works:** Increment if priorClose>mean20(closes before prior bar) AND priorClose>close_(i-6), else reset0; add streak bucket only if>0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** Increment if priorClose>mean20(closes before prior bar) AND priorClose>close_(i-6), else reset0; add streak bucket only if>0 Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L165 — Discovery gap**
  * **Current behavior:** Computes Discovery gap using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(todayOpen/priorClose-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** 100*(todayOpen/priorClose-1) Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L166 — Discovery mom5**
  * **Current behavior:** Computes Discovery mom5 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(priorClose/close_(i-6)-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** 100*(priorClose/close_(i-6)-1) Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L167 — Discovery mom20**
  * **Current behavior:** Computes Discovery mom20 using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(priorClose/close_(i-21)-1)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** 100*(priorClose/close_(i-21)-1) Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L168 — Discovery volratio**
  * **Current behavior:** Computes Discovery volratio using the calculation below; this inventory does not change its value or use.
  * **How it works:** priorVolume/mean20(volume before prior bar)
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** priorVolume/mean20(volume before prior bar) Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L169 — Discovery range**
  * **Current behavior:** Computes Discovery range using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(priorHigh-priorLow)/priorClose
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** 100*(priorHigh-priorLow)/priorClose Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L170 — Discovery offhigh**
  * **Current behavior:** Computes Discovery offhigh using the calculation below; this inventory does not change its value or use.
  * **How it works:** 100*(priorClose/max(highs of20 bars before prior plus priorHigh)-1); effectively21 highs
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** 100*(priorClose/max(highs of20 bars before prior plus priorHigh)-1); effectively21 highs Independent paper-research model; not a bug merely for differing from live factors.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:85-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L171 — Discovery fixed bins**
  * **Current behavior:** Computes Discovery fixed bins using the calculation below; this inventory does not change its value or use.
  * **How it works:** First bin whose edge >= value (advance while value>edge). Edges streak[1,3,7,15]; gap[-2,-.5,.5,2]; mom5[-5,-1,1,5]; mom20[-10,-3,3,10]; volratio[.6,.9,1.3,2]; range[1.5,3,5,8]; offhigh[-20,-10,-5,-1].
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** First bin whose edge >= value (advance while value>edge). Edges streak[1,3,7,15]; gap[-2,-.5,.5,2]; mom5[-5,-1,1,5]; mom20[-10,-3,3,10]; volratio[.6,.9,1.3,2]; range[1.5,3,5,8]; offhigh[-20,-10,-5,-1]. Exact boundary belongs lower bin, even where textual labels imply strict <.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:20-43; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L172 — Discovery outcome and split**
  * **Current behavior:** Computes Discovery outcome and split using the calculation below; this inventory does not change its value or use.
  * **How it works:** Outcome=100*(todayClose/todayOpen-1); require open>0,priorClose>0,finite return,abs(return)<=50; learn date<latestCachedDate-365 calendar days, holdout otherwise.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** Outcome=100*(todayClose/todayOpen-1); require open>0,priorClose>0,finite return,abs(return)<=50; learn date<latestCachedDate-365 calendar days, holdout otherwise. 
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:78-80; src/lib/discovery.server.ts:92-106; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L173 — Discovery validation rule**
  * **Current behavior:** Computes Discovery validation rule using the calculation below; this inventory does not change its value or use.
  * **How it works:** learnEdge=mean(bucket learn)-mean(all learn); holdoutEdge likewise; require learnN>=200,holdoutN>=80,same edge sign,abs(both edges)>=0.05 percentage points; else failed or insufficient.
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** runDiscoveryStep processes12 symbols per call; GET discover hook auto-refreshes every2 seconds while incomplete (not a server cron).
  * **Relevant formulas or rules:** learnEdge=mean(bucket learn)-mean(all learn); holdoutEdge likewise; require learnN>=200,holdoutN>=80,same edge sign,abs(both edges)>=0.05 percentage points; else failed or insufficient. Heuristic validation, no significance/multiple-testing adjustment in this rule; potentially no learn data if cache only160 sessions.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/discovery.server.ts:116-132; src/routes/api/public/hooks/discover.ts:7-18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L174 — BYOB warmup**
  * **Current behavior:** Computes BYOB warmup using the calculation below; this inventory does not change its value or use.
  * **How it works:** Require i>=max(130,period*5); prefix through signal bar; range/volume stats use prior period excluding current
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Require i>=max(130,period*5); prefix through signal bar; range/volume stats use prior period excluding current BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:18-21; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L175 — BYOB EMA**
  * **Current behavior:** Computes BYOB EMA using the calculation below; this inventory does not change its value or use.
  * **How it works:** technicalindicators EMA(period) and EMA50 using prefix closes; momentum fast>slow; reversion close<fast
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** technicalindicators EMA(period) and EMA50 using prefix closes; momentum fast>slow; reversion close<fast BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:22-23; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L176 — BYOB ATR**
  * **Current behavior:** Computes BYOB ATR using the calculation below; this inventory does not change its value or use.
  * **How it works:** technicalindicators ATR14 computed on prefix EXCLUDING current bar; pass ATR>0 AND ATR/close<=0.08 in either mode; undefined=>null
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** technicalindicators ATR14 computed on prefix EXCLUDING current bar; pass ATR>0 AND ATR/close<=0.08 in either mode; undefined=>null BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:24-24; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L177 — BYOB MACD**
  * **Current behavior:** Computes BYOB MACD using the calculation below; this inventory does not change its value or use.
  * **How it works:** Library MACD fast12 slow26 signal9, exponential oscillator/signal; momentum histogram>=0, reversion<0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Library MACD fast12 slow26 signal9, exponential oscillator/signal; momentum histogram>=0, reversion<0 BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:25-25; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L178 — BYOB Bollinger**
  * **Current behavior:** Computes BYOB Bollinger using the calculation below; this inventory does not change its value or use.
  * **How it works:** Library bands(period,stdDev2) include current close; momentum close>=middle, reversion close<=lower
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Library bands(period,stdDev2) include current close; momentum close>=middle, reversion close<=lower BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:26-26; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L179 — BYOB prior sigma**
  * **Current behavior:** Computes BYOB prior sigma using the calculation below; this inventory does not change its value or use.
  * **How it works:** m=mean(prior period closes); sigma=sqrt(mean((priorClose-m)^2)), population denominator
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** m=mean(prior period closes); sigma=sqrt(mean((priorClose-m)^2)), population denominator BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:27-27; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L180 — BYOB relative strength**
  * **Current behavior:** Computes BYOB relative strength using the calculation below; this inventory does not change its value or use.
  * **How it works:** close_t/close_(t-period)-SPY_t/SPY_(t-period), fractional difference (not percent); missing/falsey prices=>null; momentum>=0,reversion<=0
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** close_t/close_(t-period)-SPY_t/SPY_(t-period), fractional difference (not percent); missing/falsey prices=>null; momentum>=0,reversion<=0 BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:28-32; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L181 — BYOB volume**
  * **Current behavior:** Computes BYOB volume using the calculation below; this inventory does not change its value or use.
  * **How it works:** mean(prior period volumes); pass currentVolume>=mean in both modes; mean<=0=>null
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** mean(prior period volumes); pass currentVolume>=mean in both modes; mean<=0=>null BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:30-31; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L182 — BYOB support resistance**
  * **Current behavior:** Computes BYOB support resistance using the calculation below; this inventory does not change its value or use.
  * **How it works:** support=min(prior period lows),resistance=max(prior period highs); momentum close>=.98*resistance; reversion close<=1.02*support
  * **Inputs and dependencies:** Historical OHLCV through calculation date
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** support=min(prior period lows),resistance=max(prior period highs); momentum close>=.98*resistance; reversion close<=1.02*support BYOB uses technicalindicators and different windows/gates than live scanner; differences alone are not defects. Library internals/smoothing not verified here.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-indicators.ts:30-31; src/lib/byob-indicators.ts:35-44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L183 — ML rank correlation**
  * **Current behavior:** Verify the implemented statistic and its interpretation.
  * **How it works:** For N>=5 assign ordinal ranks1..N sorted ascending (ties not averaged); Pearson correlation of ranks=sum((ra-m)*(rb-m))/sqrt(sum((ra-m)^2)*sum((rb-m)^2)), m=(N+1)/2; round3; zero denominator/null or N<5=>null.
  * **Inputs and dependencies:** Out-of-sample predictions and realized returns
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** For N>=5 assign ordinal ranks1..N sorted ascending (ties not averaged); Pearson correlation of ranks=sum((ra-m)*(rb-m))/sqrt(sum((ra-m)^2)*sum((rb-m)^2)), m=(N+1)/2; round3; zero denominator/null or N<5=>null. Independent ML research statistic; not a live score replacement.
  * **Current implementation status:** Implemented in source with interpretation/dependency review needed; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:240-264; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L184 — ML directional accuracy target mismatch risk**
  * **Current behavior:** Verify the implemented statistic and its interpretation.
  * **How it works:** 100*mean(I((prediction > (return target?0:0.5)) == (actual_return>0))); round1. For prob_target this compares probability of meeting configured target against sign of return, not actual target attainment.
  * **Inputs and dependencies:** Out-of-sample predictions and realized returns
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** 100*mean(I((prediction > (return target?0:0.5)) == (actual_return>0))); round1. For prob_target this compares probability of meeting configured target against sign of return, not actual target attainment. Independent ML research statistic; not a live score replacement.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** X20: The probability-target accuracy statistic compares predicted target probability to return sign, not actual target attainment. Its reported accuracy therefore measures a different event than the model target. Related items: L184.
  * **Source evidence:** src/lib/ml.server.ts:467-475; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L185 — ML calibration quintiles**
  * **Current behavior:** Verify the implemented statistic and its interpretation.
  * **How it works:** bucketIndex=min(4,floor(rankIndex/max(1,N)*5)); rankIndex0 is highest prediction; aggregate mean realized returns per bucket.
  * **Inputs and dependencies:** Out-of-sample predictions and realized returns
  * **Execution schedule:** Walk-forward: explicit gated POST; live grading/prediction: explicit gated POST or scanner orchestration when ml_enabled, universe300; predictLatest retrains on each call. No ml_retrain cadence enforced in these functions.
  * **Relevant formulas or rules:** bucketIndex=min(4,floor(rankIndex/max(1,N)*5)); rankIndex0 is highest prediction; aggregate mean realized returns per bucket. Independent ML research statistic; not a live score replacement.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ml.server.ts:308-310; src/lib/research.functions.ts:45-68; src/lib/scan.server.ts:1372-1384
  * **Decision:** [ ]
  * **My instructions:**

## 7. Formula Updates & Learning Rules

* [ ] **L186 — Learning invocation and failure isolation**
  * **Current behavior:** Department runs example learning after Master cycle; exceptions become warnings instead of ending department result.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** Each department pass after Master cycle.
  * **Relevant formulas or rules:** await runLearningPass(); catch adds Learning pass skipped warning.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:1385-1395
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L187 — Own-lane own-horizon example partitions**
  * **Current behavior:** Learning groups saved examples by lane and horizon; no cross-lane training merge.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** read non-null returns ascending example_date LIMIT 20000; panel universe=min(400,Number(max_universe)||300).
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:510-547
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L188 — Same-day example harvest**
  * **Current behavior:** Harvests closed strategy-associated trades using current paper slot strategy-to-lane mapping and recorded same_day_pct.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** paper_slots, trades, cached factor snapshots.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** latest 2000 closed trades; require mapped lane, same_day_pct!=null, available point-in-time factors; successful=return>0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:145-187
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L189 — Long-horizon example harvest**
  * **Current behavior:** Harvests evaluated researcher horizon predictions; characteristics reconstructed from cached bars when absent from sampled panel.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** research_horizon_predictions, daily_bars.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** latest 4000 non-null-return predictions; horizons same_day,1M,3M,9M; characteristics use decision date.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:190-246,40-49,134-140
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L190 — Learning minimum: same_day**
  * **Current behavior:** Independent readiness floor before mining this horizon.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** completed examples >= 25; at most 14 graded tests retained per horizon per pass.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:40-53,570-578
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L191 — Learning minimum: 1M**
  * **Current behavior:** Independent readiness floor before mining this horizon.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** completed examples >= 12; at most 14 graded tests retained per horizon per pass.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:40-53,570-578
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L192 — Learning minimum: 3M**
  * **Current behavior:** Independent readiness floor before mining this horizon.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** completed examples >= 10; at most 14 graded tests retained per horizon per pass.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:40-53,570-578
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L193 — Learning minimum: 9M**
  * **Current behavior:** Independent readiness floor before mining this horizon.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** completed examples >= 8; at most 14 graded tests retained per horizon per pass.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:40-53,570-578
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L194 — Factor test eligibility**
  * **Current behavior:** Requires enough measured observations for each characteristic.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** factor numeric in >=MIN_BAND*3=15 examples; MIN_BAND=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:50-51,315-317
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L195 — Belief test: High level**
  * **Current behavior:** Builds a separate empirical hypothesis; quantile index=round((n-1)*q) in sorted values.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** high=factor>=quantile(2/3); compare against middle+low; both groups>=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:321-343; src/lib/learning.server.ts:300-304
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L196 — Belief test: Low level**
  * **Current behavior:** Builds a separate empirical hypothesis; quantile index=round((n-1)*q) in sorted values.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** low=factor<=quantile(1/3); compare against middle+high; both groups>=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:321-328,345-354; src/lib/learning.server.ts:300-304
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L197 — Belief test: Ceiling**
  * **Current behavior:** Builds a separate empirical hypothesis; quantile index=round((n-1)*q) in sorted values.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** compare high>=q2/3 versus strict middle q1/3<factor<q2/3; both groups>=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:355-366; src/lib/learning.server.ts:300-304
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L198 — Belief test: Combination**
  * **Current behavior:** Builds a separate empirical hypothesis; quantile index=round((n-1)*q) in sorted values.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** take top 2 single-factor absolute lifts; compare both high versus exclusive-or high; both groups>=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:369-391; src/lib/learning.server.ts:300-304
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L199 — Belief holdout-direction gate**
  * **Current behavior:** Requires same lift direction in both chronological halves, not a formal significance test.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** lift=mean(inside returns)-mean(outside returns); sign(lift)!=0; sign(firstLift)=sign(secondLift)=sign(lift); abs(lift)>=0.05 percentage points; halves keyed by date|return (not unique source ID).
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:418-454
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L200 — Belief evidence score**
  * **Current behavior:** Combines directional persistence, lift, inside sample size, regime consistency.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** round1(clamp[0,95]((holdsUp?45:12)+min(25,abs(lift)*12)+min(1,nInside/20)*20+(both regime signs equal direction?10:0))).
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:449-469
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L201 — Belief confidence update**
  * **Current behavior:** Confirmation requires holdout consistency and no direction flip against prior.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** direction=lift>=0?helps:hurts; confirmed=holdsUp && (!prior || prior.direction==direction); prior confidence default 30; confirmed:min(95,0.6*previous+0.4*evidence+6); failure:max(5,0.65*previous), rounded 1.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:586-597
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L202 — Belief support threshold**
  * **Current behavior:** Promotes supported empirical belief, distinct from active Master rules.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** confirmed && confidence>=55 && cumulative confirmations>=2; confirmation increments confirmations and decreases failures by 1 to minimum 0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:598-610
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L203 — Belief weakening and drop threshold**
  * **Current behavior:** Only tests retained in the current graded list have their state updated; unselected prior beliefs are not globally decayed by this loop.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** dropped if failures>=3 && confidence<25; else supported test; else weakening if failures>confirmations; otherwise forming. Failures increment on nonconfirmation.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:570-614,635-645
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L204 — Learned beliefs affect actual experiment selection**
  * **Current behavior:** Supported helps characteristics from the same lane are prioritized ahead of in-sample objective; combinations split into factor names. This is real learned runtime use, not just displayed memory.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** priority=1 if variable contains learned factor label else 0; sort priority desc THEN lane objective desc; only first 4 get full evaluation. Horizon not filtered in supported-belief query.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:964-977,1052-1082
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L205 — Weight mutation learning**
  * **Current behavior:** Hardcoded lane seeds are starting points; search mutates own factors and persisted validated params drive future boards.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** step=max(2,round(current.step??12)); changes=+/-step,+/-max(1,round(step/2)), plus drop-to-zero; skip negative weights; normalize after mutation.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** X21: The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here. Related items: L205, L210, L222, L223, L230.
  * **Source evidence:** src/lib/department.server.ts:565-603,1206-1228; src/lib/research-boards.server.ts:111-118
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L206 — Score threshold search**
  * **Current behavior:** Searches trade cutoff independently from factor mutations.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** candidate=min_score+delta, delta in {-step,-halfStep,+halfStep,+step}; accept search values 25<=candidate<=92.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:606-610
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L207 — Pick count search**
  * **Current behavior:** Generates independent candidate daily pick counts.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** candidates=max(1,current.num_day_trades-1), current.num_day_trades+1; omit unchanged.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:616-619
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L208 — Adaptive search step**
  * **Current behavior:** Changes search resolution after each generation.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** validated resets step=12; otherwise nextStep=max(2,round(step/2)) when unchanged signature, else min(14,step).
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:628-630,1210-1213
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L209 — Discovery-confirmation split**
  * **Current behavior:** Uses chronological cached sessions; fewer than 20 completed sessions warns rather than aborts.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** split=floor(0.6*usable dates); discovery first 60%, confirmation remaining 40%; confirmation split in halves.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:935-949
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L210 — Lane validation and evolution**
  * **Current behavior:** Only best non-vetoed positive-edge result becomes next params; other findings retain current params.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** edge=round(OOS mean-baseline OOS mean,3); verdict=vetoed if review.vetoed else edge>0?validated:rejected.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** X21: The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here. Related items: L205, L210, L222, L223, L230.
  * **Source evidence:** src/lib/department.server.ts:1019-1020,1100-1105,1206-1228
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L211 — Skeptic independent test: Thin evidence**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** OOS picks<15 adds objection; picks<8 vetoes.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:825-830
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L212 — Skeptic independent test: Outlier dependence**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** trimmed mean<=baseline trimmed mean adds objection; veto only if OOS picks>=15; remove best 3 and worst 3.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:831-839,1004-1018
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L213 — Skeptic independent test: Tuning gap**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** in_sample.mean>2*out_sample.mean+0.2 adds objection; veto if OOS picks>=15.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:843-849
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L214 — Skeptic independent test: Confirmation halves**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** Either confirmation half mean<=0 adds objection, not standalone veto.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:840-842
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L215 — Skeptic independent test: Down market**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** down_market.picks>=5 && mean<0 adds objection, not standalone veto.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:851-853
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L216 — Skeptic independent test: Benchmark**
  * **Current behavior:** Applies reviewer criteria to best lane experiment.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** benchmark_picks>=ceil(0.5*OOS picks) && avg_vs_benchmark<=0 adds objection, not standalone veto.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:854-862
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L217 — Dead-end memory**
  * **Current behavior:** Previously failed signatures are skipped except exact current params candidate; failed best veto and nonpositive edge are recorded.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** failed=edge<=0 || (trial==best && review.vetoed); signature contains rounded normalized weights, score threshold, pick count and filters.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/department.server.ts:548-553,1052-1054,1145-1160
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L218 — Master candidate weight extraction**
  * **Current behavior:** Converts escalated lane parameters to separate testable rules.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** select largest 2 weights >=15; rule weight=round(weight/5)*5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:225-251
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L219 — Master candidate band extraction**
  * **Current behavior:** Finds lead-factor favorable band among positive-return selected picks.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** winners>=8; low=round(sorted[floor(n*0.2)]/5)*5; high=round(sorted[floor(n*0.8)]/5)*5; require high-low>=5.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:254-277
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L220 — Master candidate filter extraction**
  * **Current behavior:** Creates one candidate rule per non-null saved lane filter.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** For each rsi_max,rsi_min,atr_pct_min,atr_pct_max,rel_volume_min emit rule with exact parameter value.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:99,280-292
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L221 — Master rule confirmation test**
  * **Current behavior:** Evaluates each candidate in isolation against baseline on confirmation dates.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** picks>=15; edge>0; symmetric trimmed mean>baseline untrimmed mean; if up/down regime picks>=5, each regime mean>0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:43,412-435
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L222 — Master promotion lifecycle**
  * **Current behavior:** Active rules evolve based on repeated tests; retirement distinct from belief weakening.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** pass increments confirmations, failure leaves confirmations unchanged; pass decrements failures to min0; failure increments failures; nonactive confirmation>=3 promotes, active failures>=4 retires.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** X21: The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here. Related items: L205, L210, L222, L223, L230.
  * **Source evidence:** src/lib/master-formula.server.ts:37-43,438-449
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L223 — Runtime Master learned weights**
  * **Current behavior:** Lead actually assembles learned active weight rules at runtime; not accurate to claim all lane weights hardcoded or no learning.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** For active nonzero weight rules: arithmetic mean per factor, normalize to 100. If none, fallback base live weights. When rules exist, factors absent from rules are not filled from base.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** X21: The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here. Related items: L205, L210, L222, L223, L230.
  * **Source evidence:** src/lib/master-formula.server.ts:109-125,144-145; src/lib/research-boards.server.ts:121-125; src/lib/race.server.ts:312-320
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L224 — Runtime Master learned filter: rsi_max**
  * **Current behavior:** Applies active learned filter rule values through assembled Lead params and shared filters.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi_max=median(finite active filter values for key), else null; shared bound is inclusive.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:127-134,148-152; src/lib/department.server.ts:332-340; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L225 — Runtime Master learned filter: rsi_min**
  * **Current behavior:** Applies active learned filter rule values through assembled Lead params and shared filters.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rsi_min=median(finite active filter values for key), else null; shared bound is inclusive.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:127-134,148-152; src/lib/department.server.ts:332-340; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L226 — Runtime Master learned filter: atr_pct_min**
  * **Current behavior:** Applies active learned filter rule values through assembled Lead params and shared filters.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct_min=median(finite active filter values for key), else null; shared bound is inclusive.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:127-134,148-152; src/lib/department.server.ts:332-340; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L227 — Runtime Master learned filter: atr_pct_max**
  * **Current behavior:** Applies active learned filter rule values through assembled Lead params and shared filters.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** atr_pct_max=median(finite active filter values for key), else null; shared bound is inclusive.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:127-134,148-152; src/lib/department.server.ts:332-340; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L228 — Runtime Master learned filter: rel_volume_min**
  * **Current behavior:** Applies active learned filter rule values through assembled Lead params and shared filters.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** rel_volume_min=median(finite active filter values for key), else null; shared bound is inclusive.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:127-134,148-152; src/lib/department.server.ts:332-340; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L229 — Runtime Master learned band bonus**
  * **Current behavior:** Lead runtime score includes favorable bands from active learned rules.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** On the relevant research pass or board read.
  * **Relevant formulas or rules:** score=sum(factor_pct*weight/100)+5 per active band with low<=factor_pct<=high; bonuses stack; missing factor defaults 0.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/master-formula.server.ts:37,136-142,157-163; src/lib/research-boards.server.ts:90-103,121-125
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L230 — Proposal consumer and activation boundary**
  * **Current behavior:** Candidate approval creates strategy; only explicit activate applies settings. This is distinct from automatic research/Lead paper-rule evolution.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** research_candidates.params and user activation decision.
  * **Execution schedule:** Explicit approval/approval+activation action.
  * **Relevant formulas or rules:** approved strategy serializes only 5 core weights + min_score_to_trade + num_day_trades; activate calls updateSettings with active_strategy_id; status applied vs approved. Extra factor weights and lane filter fields are not serialized here.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** X21: The earlier chat assertion that all researcher weights are fixed and only human proposals exist was inaccurate. Source implements saved specialist weight evolution, supported-belief prioritization and automatic Master rule promotion/retirement; Lead boards consume active Master weights, filters and band bonuses. These research mechanisms are separate from explicit proposal approval/strategy activation and do not authorize changes here. Related items: L205, L210, L222, L223, L230. X23: Proposal serialization keeps the five core weights and general score/count settings, not all extra specialist factor weights or lane-specific filter fields. The resulting activated strategy is not an exact copy of the full specialist experiment. Related items: L230.
  * **Source evidence:** src/lib/research.server.ts:614-656; src/lib/research.functions.ts:35-42
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L231 — Learning display consumer**
  * **Current behavior:** Lab overview exposes learned profiles separately from runtime board rule consumption.
  * **How it works:** Static source inspection; no execution or live calls.
  * **Inputs and dependencies:** Cached factor rows and saved research parameters.
  * **Execution schedule:** Lab overview reads.
  * **Relevant formulas or rules:** learnedProfiles reads researcher_beliefs and researcher_examples; department overview returns learning or empty fallback.
  * **Current implementation status:** Implemented in source; runtime/database state not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/learning.server.ts:658-680; src/lib/department.server.ts:1710-1721
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L232 — Events hypothesis mapping: material agreement**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 1.01 contributes 5 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:13,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L233 — Events hypothesis mapping: bankruptcy**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 1.03 contributes -30 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:14,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L234 — Events hypothesis mapping: acquisition/disposal**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 2.01 contributes 0 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:15,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L235 — Events hypothesis mapping: accelerated debt**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 2.04 contributes -15 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:16,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L236 — Events hypothesis mapping: restructuring**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 2.05 contributes -5 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:17,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L237 — Events hypothesis mapping: impairment**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 2.06 contributes -12 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:18,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L238 — Events hypothesis mapping: delisting**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 3.01 contributes -25 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:19,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L239 — Events hypothesis mapping: auditor change**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 4.01 contributes -5 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:20,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L240 — Events hypothesis mapping: restatement**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 4.02 contributes -25 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:21,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L241 — Events hypothesis mapping: management change**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 5.02 contributes -3 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:22,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L242 — Events hypothesis mapping: other event**
  * **Current behavior:** Hardcoded SEC item classification, not a learned event coefficient.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 8-K item 8.01 contributes 0 points; filing score=sum matched item scores.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:23,59-69
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L243 — Events aggregate classification**
  * **Current behavior:** Classifies matched filings for research grouping.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** bearish if sum<=-10; bullish if sum>=5; otherwise watch; category from lowest-score item; confidence high if any abs(item score)>=20, otherwise medium.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/events.server.ts:61-70
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L244 — Events collection scope**
  * **Current behavior:** Existing SEC 8-K collector, not a separate seventh backup lane.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Default latest scan top 25; lookback 30 calendar days; only 8-K and recognized item mappings; accession dedup.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** X24: The verified event collector reads mapped SEC 8-K filings only. That is narrower than the standing requirement for multi-source sports/entertainment evidence and time-scoped entity relationships. A full corroborated relationship graph was not verified; do not describe this collector as that completed system or grant its hypotheses production authority. Related items: L244, L246.
  * **Source evidence:** src/lib/events.server.ts:38-44,58-79
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L245 — Events directional outcome hypothesis**
  * **Current behavior:** Tests bearish/bullish filing cohorts using cached subsequent closes; advisory only.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Latest 300 events; require 6 bars on/after filing; outcome=100*(close[5]/close[0]-1); per-sentiment arithmetic mean rounded 2.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Comment asks whether filings do worse/better than otherwise, but implementation has no matched control or benchmark; it measures absolute returns.
  * **Source evidence:** src/lib/events.server.ts:83-98
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L246 — Events bearish recommendation gate**
  * **Current behavior:** Produces research verdict, not live score/position changes.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** ready=bearish n>=20; helpful-filter verdict only if bearish mean<0; otherwise no recommendation; saves research_runs kind event_intelligence.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** X24: The verified event collector reads mapped SEC 8-K filings only. That is narrower than the standing requirement for multi-source sports/entertainment evidence and time-scoped entity relationships. A full corroborated relationship graph was not verified; do not describe this collector as that completed system or grant its hypotheses production authority. Related items: L244, L246.
  * **Source evidence:** src/lib/events.server.ts:99-107
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L247 — Influence assignment hypothesis**
  * **Current behavior:** Tests whether manually supplied stock tips outperform SPY at declared horizons; not a runtime department lane.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** influence=true iff label==Influence Researcher; results only with tip_date and horizon; positive return and beat-SPY tracked separately.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/assign.server.ts:61-81,91-112; src/lib/assign.functions.ts:6-15
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L248 — Influence outcome horizon: 1M**
  * **Current behavior:** Computes tip outcome from first cached bar on/after tip date.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** horizon=21 sessions; end=min(entryIndex+21,lastIndex); return=100*(endClose/entryClose-1); complete iff entryIndex+21<bar count; beat_spy=stock return>SPY return.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** X25: Selection cards use 20/60/180 sessions for 1M/3M/9M while Influence assignment outcomes use 21/63/189. Labels therefore do not imply identical comparison windows. Influence outcomes are separate and do not supply the missing Layer 2 180-session results. Related items: L292, L248, L249, L250.
  * **Source evidence:** src/lib/assign.server.ts:9,52-58,94-111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L249 — Influence outcome horizon: 3M**
  * **Current behavior:** Computes tip outcome from first cached bar on/after tip date.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** horizon=63 sessions; end=min(entryIndex+63,lastIndex); return=100*(endClose/entryClose-1); complete iff entryIndex+63<bar count; beat_spy=stock return>SPY return.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** X25: Selection cards use 20/60/180 sessions for 1M/3M/9M while Influence assignment outcomes use 21/63/189. Labels therefore do not imply identical comparison windows. Influence outcomes are separate and do not supply the missing Layer 2 180-session results. Related items: L292, L248, L249, L250.
  * **Source evidence:** src/lib/assign.server.ts:9,52-58,94-111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L250 — Influence outcome horizon: 9M**
  * **Current behavior:** Computes tip outcome from first cached bar on/after tip date.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** horizon=189 sessions; end=min(entryIndex+189,lastIndex); return=100*(endClose/entryClose-1); complete iff entryIndex+189<bar count; beat_spy=stock return>SPY return.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** X25: Selection cards use 20/60/180 sessions for 1M/3M/9M while Influence assignment outcomes use 21/63/189. Labels therefore do not imply identical comparison windows. Influence outcomes are separate and do not supply the missing Layer 2 180-session results. Related items: L292, L248, L249, L250.
  * **Source evidence:** src/lib/assign.server.ts:9,52-58,94-111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L251 — Influence outcome horizon: 1Y+**
  * **Current behavior:** Computes tip outcome from first cached bar on/after tip date.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** horizon=252 sessions; end=min(entryIndex+252,lastIndex); return=100*(endClose/entryClose-1); complete iff entryIndex+252<bar count; beat_spy=stock return>SPY return.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Stock and SPY each choose their own first bar on/after tip; aligned entry/end sessions are not enforced.
  * **Source evidence:** src/lib/assign.server.ts:9,52-58,94-111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L252 — Influence profile evidence isolation**
  * **Current behavior:** Aggregates completed influence assignments only, separate from department learned examples.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Latest 300 assignment records; group complete outcomes by horizon; win%=100*positive/n; beatSPY%=100*beat_spy/n; mean return arithmetic.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Missing SPY outcome becomes beat_spy=null, but remains in completed stock denominator; assignment records are not harvested by the shown learning consumers.
  * **Source evidence:** src/lib/assign.server.ts:84-115; src/lib/learning.server.ts:145-198
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L253 — BYOB per-ticker learning scope**
  * **Current behavior:** Learns a stock-specific candidate from approved seed symbols, not by replacing department weights.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 15 seeds only; inputs=ticker history, SPY history and SPY-derived regimes; cached bars exclude current UTC date.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob.server.ts:7-14,30-35; src/lib/byob-rules.ts:4
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L254 — BYOB chronological evidence partitions**
  * **Current behavior:** Uses warmup then disjoint chronological training, validation and holdout windows.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Warmup=250 bars; n=bars-250; trainingEnd=floor(.6*n); validationEnd=floor(.8*n); holdout remainder; <=250 bars cannot discover.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:19,89-92
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L255 — BYOB bounded candidate learning**
  * **Current behavior:** Searches implemented formula and parameter grids, no invented future adaptive methods.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** 3 formulas momentum_breakout/trend_pullback/mean_reversion; periods 10,20,50; thresholds respectively [1.2,1.5,2]/[2,3,5]/[1,1.5,2]; optional empty/single/registered-pair filter bundles; initial horizon 3.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:94-100
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L256 — BYOB training shortlist**
  * **Current behavior:** Selects one configuration per formula using training only.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** training n>=10; maximize training avg_return; then shortlist survivors.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:96-103
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L257 — BYOB validation horizon selection**
  * **Current behavior:** Uses validation to choose final candidate and horizon before holdout.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** For HORIZONS candidates require capacity.training>=10 and capacity.validation>=5, actual training n>=10 and validation n>=5; maximize validation avg_return.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Validation is selection evidence, not untouched out-of-sample confirmation; diagnostics explicitly acknowledge this at src/lib/byob-rules.ts:125.
  * **Source evidence:** src/lib/byob-rules.ts:104-111
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L258 — BYOB frozen holdout isolation**
  * **Current behavior:** Persists candidate before evaluating holdout; blocks previously exposed history from serving as fresh holdout.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Fingerprint=SHA256(engine,bars,SPY,regimes,provenance); discover holdoutAllowed=false; allowed iff holdoutStart>all prior/exposure data_to; same-run same-candidate exposure may resume frozen evaluation.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob.server.ts:34-64
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L259 — BYOB run recovery isolation**
  * **Current behavior:** Preserves prior evidence rather than silently retraining stalled work on exposed outcomes.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Same input completed returns saved model; in-progress age<10 minutes rejects; stale run requires persisted frozen model; no frozen model requires new input.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob.server.ts:37-48,66-70
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L260 — BYOB independent qualification: Training sample**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** training n>=10
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L261 — BYOB independent qualification: Validation sample**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** validation n>=5
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L262 — BYOB independent qualification: Holdout sample**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** holdout n>=5
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L263 — BYOB independent qualification: Regime evidence**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** at least 2 known (not unknown) holdout regimes with n>0 and avg_return>0
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L264 — BYOB independent qualification: Drawdown**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** max(training DD,validation DD,holdout DD,combined DD)<=25%; above 25 disqualifies
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L265 — BYOB independent qualification: Net expectancy**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** holdout avg_return>0; <=0 disqualifies; 0<avg<0.50% is below_threshold; >=0.50% passes this gate
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L266 — BYOB independent qualification: Profit factor**
  * **Current behavior:** One independent qualification condition; sample/regime insufficiency returns provisional before later tests.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** pf_kind must not be undefined; finite profit_factor must be >0; null accepted for unbounded positive-no-loss case
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob-rules.ts:74-81
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L267 — BYOB provenance blocks full qualification**
  * **Current behavior:** Current training adapter explicitly marks cache provenance unverified; statistical success alone cannot qualify or activate.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** qualified requires no integrity errors && qualified_integrity && point_in_time && corporate_actions_verified; current adapter supplies all three flags false; statistically qualified downgrades provisional.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Activation path exists, but current cache-provenance adapter cannot satisfy it. Do not report active qualified models from source inspection.
  * **Source evidence:** src/lib/byob.server.ts:28-29,33,65; src/lib/byob-integrity.ts:14-15
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L268 — BYOB automatic registry activation boundary**
  * **Current behavior:** Qualified per-ticker research model can auto-activate its BYOB registry entry, distinct from live strategy approval.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Saved initially is_active=false; activation RPC only if model.status=qualified && check.qualified; passes expected registry revision.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** Server checks RPC error but does not check returned boolean; SQL can return false for failed model eligibility. Activation does not imply live trading activation.
  * **Source evidence:** src/lib/byob.server.ts:69-72; migration/fresh/21-byob-corrected-research.sql:23-36
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L269 — BYOB recommendation freshness**
  * **Current behavior:** Display favors active model over latest failed attempt and requires current integrity/aligned latest date.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** row=active??latest; legacy methodology=>provisional; recommended=e.recommended && active && ticker latest date==SPY latest date && integrity.qualified.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/byob.server.ts:15-26
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L270 — BYOB immutable research evidence separation**
  * **Current behavior:** Stores versioned models, run events and active registry separately from department beliefs and Master rules.
  * **How it works:** Read-only source inspection; no live calls or application/database edits.
  * **Inputs and dependencies:** Saved research records and cached bars.
  * **Execution schedule:** On the corresponding explicit research evaluation or training call.
  * **Relevant formulas or rules:** Events started/frozen/holdout_exposed/completed/failed; result stores training, validation, holdout, regime metrics, candidate, fingerprint; below_threshold compatibility status=disqualified but evidence_state retains below_threshold.
  * **Current implementation status:** Verified implementation in source; no live outcome claim.
  * **Conflicts or contradictions:** These shown BYOB learning/activation paths write BYOB tables/RPC, not researcher_beliefs or master_rules; no claim that every other application consumer was audited.
  * **Source evidence:** src/lib/byob.server.ts:35-49,69-74
  * **Decision:** [ ]
  * **My instructions:**

## 8. Historical Data & Performance Evaluation

* [ ] **L271 — Canonical saved researcher books**
  * **Current behavior:** The seven Lab book curves use researcher_daily_ledger rather than reconstructing opinions from trade rows.
  * **How it works:** runResearcherLedger records sessions; readLedgerCurves maps the saved rows to graph points.
  * **Inputs and dependencies:** daily_bars, researchers, master_rules, paper_slots, app_settings.
  * **Execution schedule:** Research pipeline and explicit ledger replay.
  * **Relevant formulas or rules:** One lane/session row; base equity 100; seven lanes.
  * **Current implementation status:** Implemented; connected database has 1,378 rows in each lane, 2021-06-01 through 2026-11-25; production readback not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:37–54,219–253; read-only ledger query, 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L272 — Ledger historical start and warm-up window**
  * **Current behavior:** Recorded books begin June 1, 2021; earlier prices are available only as input history.
  * **How it works:** Bootstrap loads up to 2,000 sessions; resume input window is 320 sessions, with full cached ticker loading.
  * **Inputs and dependencies:** Cached history, LEDGER_START_DATE and completed market-proxy session.
  * **Execution schedule:** Bootstrap/replay or nightly catch-up.
  * **Relevant formulas or rules:** Start=2021-06-01; engine=v2-t1; base=100; declared universe=2600.
  * **Current implementation status:** Implemented; universe constant does not itself prove full historical market membership.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:37–44,89–110
  * **Decision:** [ ]
  * **My instructions:**

* [x] **L273 — Ledger session-completeness filter**
  * **Current behavior:** The ledger uses completed benchmark sessions from the shared June 2021 foundation, without the former 50% peak-panel threshold. Valuation reads real cached closes independently of scoring eligibility.
  * **How it works:** Group panel by date, find maximum and filter dates after the start.
  * **Inputs and dependencies:** Panel row counts, not verified listing records.
  * **Execution schedule:** Every ledger build.
  * **Relevant formulas or rules:** count(date) >= 0.5 × max count across input dates.
  * **Current implementation status:** November 28 — X03 source gate resolved and regression tested; existing historical book rows remain append-only. Retrospective missing book rows were not invented or rewritten.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X03 source gate resolved and regression tested; existing historical book rows remain append-only. Retrospective missing book rows were not invented or rewritten.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:101–110
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X03 source gate resolved and regression tested; existing historical book rows remain append-only. Retrospective missing book rows were not invented or rewritten.

* [ ] **L274 — Saved-book continuity preflight**
  * **Current behavior:** The writer refuses to append to internally inconsistent saved books.
  * **How it works:** Reads existing rows in 1,000-row pages and checks every adjacent equity/return pair before price loading or writes.
  * **Inputs and dependencies:** Stored equity and daily_return_pct.
  * **Execution schedule:** Each runResearcherLedger invocation.
  * **Relevant formulas or rules:** ledgerReturnMatches must pass for every adjacent pair.
  * **Current implementation status:** Implemented; no append or replay invoked in this audit.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:53–70; src/lib/research-certification.ts:8–14
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L275 — No-change ledger short circuit**
  * **Current behavior:** A run can return zero rows when every lane already reaches the latest cached proxy bar.
  * **How it works:** Compare latest saved date for all lane names with latest proxy bar.
  * **Inputs and dependencies:** app_settings.market_proxy, daily_bars, saved lane dates.
  * **Execution schedule:** Incremental ledger runs only.
  * **Relevant formulas or rules:** Bypassed when fullReplay=true.
  * **Current implementation status:** Implemented; source rule, not proof that a scheduled call fired.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:71–79
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L276 — Complete ledger continuation checkpoint**
  * **Current behavior:** Equity alone is not sufficient to resume a researcher book.
  * **How it works:** Parse cash, position, unsettled sales, cash pools, last tranche, activation and previous equity; require saved-date/configuration agreement.
  * **Inputs and dependencies:** research_runs ledger_checkpoint:<lane>; configuration fingerprint and saved ledger row.
  * **Execution schedule:** Before incremental simulation.
  * **Relevant formulas or rules:** Complete validated checkpoint; date must equal latest saved row; fingerprint checks protect continuation.
  * **Current implementation status:** Implemented; incompatible checkpoints require the explicit replay path rather than an invented starting balance.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.server.ts:45–50,80–93; src/lib/researcher-ledger.ts:28–49
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L277 — One held security per historical lane**
  * **Current behavior:** The canonical ledger simulator holds at most one security at a time.
  * **How it works:** A new top pick is bought only when there is no position.
  * **Inputs and dependencies:** Day close map and lane top pick.
  * **Execution schedule:** Each simulated session.
  * **Relevant formulas or rules:** if !pos && day.pick; fractional shares=stake/close.
  * **Current implementation status:** Implemented; distinct from paper trade-table maximum of five open positions.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:80–97
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L278 — Historical ledger purchase price**
  * **Current behavior:** The book simulation enters at the selected session close.
  * **How it works:** Use the close map for the selected ticker and deduct the stake from settled cash.
  * **Inputs and dependencies:** Historical selection and same-session cached close.
  * **Execution schedule:** Each eligible simulated session when no position is held.
  * **Relevant formulas or rules:** shares=stake/close; close>0; stake>0.
  * **Current implementation status:** Implemented model assumption; not the Layer 2 next-session-open evaluation and not a broker fill.
  * **Conflicts or contradictions:** X04: Ledger close-entry books, next-session-open forward outcomes, fixed-stake selection history, trade-table paper holdings and broker fills use different models. This is a comparability conflict if presented as the same performance; independent models are not automatically bugs. Paper due exits use exact target-session marks, not a blanket midpoint/VWAP rule. Related items: L278, L288, L294, L359.
  * **Source evidence:** src/lib/researcher-ledger.ts:80–97
  * **Decision:** [ ]
  * **My instructions:** X04 reviewed November 28: preserve this independent authentic-price return model; do not blend it with other researcher results or interpret it as a broker fill. Existing implementation unchanged; isolation tests passed.

* [ ] **L279 — Historical ledger holding and sale rule**
  * **Current behavior:** The simulator increments held sessions and sells at a real close once the lane hold length is reached.
  * **How it works:** Update mark, increment pos.held and queue proceeds when pos.held>=holdDays.
  * **Inputs and dependencies:** Configured holdDays and exact cached session close.
  * **Execution schedule:** Each held session.
  * **Relevant formulas or rules:** held starts at zero on entry; sale requires a current close.
  * **Current implementation status:** Implemented; holding conventions differ between engines and should be reviewed together before changing.
  * **Conflicts or contradictions:** X14: Historical paper settlement uses computed trading holidays, while the main market calendar explicitly lists 2026–2027. Ledger, paper and autonomous held-session counting also differ; a shared label does not guarantee the same exit date. Related items: L004, L362, L350, L279.
  * **Source evidence:** src/lib/researcher-ledger.ts:67–79
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L280 — Missing ledger marks**
  * **Current behavior:** A missing held-ticker close keeps the last real mark and records a pending-mark action.
  * **How it works:** Does not fabricate movement and does not sell without a current close.
  * **Inputs and dependencies:** Held position and per-date close map.
  * **Execution schedule:** Each simulated session.
  * **Relevant formulas or rules:** No current close => no mark change and no sale.
  * **Current implementation status:** Implemented; continued held-day counting can extend the realized exit until a verified mark exists.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:67–79
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L281 — Ledger sale settlement**
  * **Current behavior:** Simulated proceeds remain equity but cannot be spent until the settlement date.
  * **How it works:** Queue amount and available date, later release into cash and relevant pool.
  * **Inputs and dependencies:** paperSettlementDate, sale date and tranche attribution.
  * **Execution schedule:** On sale and at every subsequent session.
  * **Relevant formulas or rules:** T+1 trading-session settlement; settlement cutover may preserve older saved behavior.
  * **Current implementation status:** Implemented paper-only rule.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:50–65,73–76
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L282 — Short-hold ledger cash tranches**
  * **Current behavior:** Short-hold books alternate A/B settled cash pools instead of reusing unsettled proceeds.
  * **How it works:** Initialize equal pools, choose nextTranche, cap stake by cash and pool, return sale proceeds to originating pool.
  * **Inputs and dependencies:** cash, pools, last tranche and holdDays.
  * **Execution schedule:** When settlement is active and holdDays<=1.
  * **Relevant formulas or rules:** A=B=base/2 initially; stake=min(cash,pool[tranche]).
  * **Current implementation status:** Implemented; longer-hold positions use settled cash rather than an A/B cap.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:40–65,80–97
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L283 — Ledger equity identity**
  * **Current behavior:** Book equity includes cash, unsettled sale proceeds and the current position mark.
  * **How it works:** Compute a level each session, not repeated additions of the entire unrealized balance.
  * **Inputs and dependencies:** Cash, pending queue, shares, real marks.
  * **Execution schedule:** Each ledger session.
  * **Relevant formulas or rules:** equity=cash+sum(pending.amount)+shares×mark; pnl=equity−base; pnl_pct=100×(equity/base−1).
  * **Current implementation status:** Implemented; rounded to four decimal places.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:99–109
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L284 — Ledger daily return**
  * **Current behavior:** Daily return is the change in total book equity since the prior session.
  * **How it works:** Use unrounded prior equity for computation and save rounded result.
  * **Inputs and dependencies:** Current and prior book equity.
  * **Execution schedule:** Each ledger session.
  * **Relevant formulas or rules:** 100×(equity/prevEquity−1), or 0 if prevEquity<=0.
  * **Current implementation status:** Implemented; not the sum of open-position percentage moves.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/researcher-ledger.ts:99–109
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L285 — Independent arithmetic certification**
  * **Current behavior:** Certification checks identities, daily continuity, session order, missing sessions and snapshot agreement.
  * **How it works:** Compare saved lane rows with expected session dates and ledger-source graph points.
  * **Inputs and dependencies:** Recorded ledger, expected sessions, saved curves and base 100.
  * **Execution schedule:** Manual certification script / production replay workflow.
  * **Relevant formulas or rules:** Identity tolerance 0.00011; snapshot point pnl tolerance 0.00001; all error counts must be zero.
  * **Current implementation status:** Implemented; historical_market_qualification remains unverified even when arithmetic certification passes.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-certification.ts:16–44
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L286 — Rounded-return continuity tolerance**
  * **Current behavior:** Continuity accepts only the return interval implied by four-decimal equity and return rounding.
  * **How it works:** Calculate lower/upper bounds from equity±0.00005, with 1e-8 boundary tolerance.
  * **Inputs and dependencies:** Previous equity, current equity, saved daily return.
  * **Execution schedule:** Ledger preflight and certification.
  * **Relevant formulas or rules:** lower=100×((current−0.00005)/(previous+0.00005)−1)−0.00005; upper=100×((current+0.00005)/(previous−0.00005)−1)+0.00005.
  * **Current implementation status:** Implemented; nonfinite values and previous<=0.00005 fail.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-certification.ts:8–14
  * **Decision:** [ ]
  * **My instructions:**

* [x] **L287 — Forward-selection warm-up and liquidity eligibility**
  * **Current behavior:** Selections use the same completed benchmark foundation and June 2021 start without a fixed 80% gate. Each stock retains its genuine 200-session indicator warm-up and price/liquidity eligibility.
  * **How it works:** eligibleAt reads only the history supplied through decision date T.
  * **Inputs and dependencies:** History through T; min price and dollar-volume settings.
  * **Execution schedule:** Each selection-replay date/ticker.
  * **Relevant formulas or rules:** history.length>=201; close>=minPrice; mean(last20 close×volume)>=minDollarVolume.
  * **Current implementation status:** November 28 — X03 source gate resolved. Historic pick records remain immutable; no cutoff reduction or fabricated missing prices.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X03 source gate resolved. Historic pick records remain immutable; no cutoff reduction or fabricated missing prices.
  * **Source evidence:** src/lib/selection-replay.ts:5–30
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X03 source gate resolved. Historic pick records remain immutable; no cutoff reduction or fabricated missing prices.

* [x] **L288 — Forward evaluation entry and exit convention**
  * **Current behavior:** Forward evaluation retains next-session open entry and T+H close exit; includes 180 sessions alongside 1,5,10,20,60.
  * **How it works:** Use shared session calendar with exact ticker bars, without trade-table fills.
  * **Inputs and dependencies:** Immutable pick, bars, calendar and horizon.
  * **Execution schedule:** Selection replay and later pending-outcome maturity.
  * **Relevant formulas or rules:** H in [1,5,10,20,60]; H=1 is entry-day close.
  * **Current implementation status:** November 28 — X02 producer implemented and configured-backend readback verified: 2,288 matured 180-session outcomes and 1,238 pending. No picks or books changed; production deployment separate.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X02 producer implemented and configured-backend readback verified: 2,288 matured 180-session outcomes and 1,238 pending. No picks or books changed; production deployment separate.
  * **Source evidence:** src/lib/selection-replay.ts:1–6,40–55
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X02 producer implemented and configured-backend readback verified: 2,288 matured 180-session outcomes and 1,238 pending. No picks or books changed; production deployment separate.

* [ ] **L289 — Missing forward outcome prices**
  * **Current behavior:** Outcomes stay pending until both exact-session entry open and exit close exist and are positive finite values.
  * **How it works:** Return pending rather than inventing an exit, profit or settlement.
  * **Inputs and dependencies:** Expected calendar dates and exact cached bars.
  * **Execution schedule:** Each evaluation attempt.
  * **Relevant formulas or rules:** Missing future calendar date or invalid/missing entry or exit => pending.
  * **Current implementation status:** Implemented; declared missing_bar type is not returned by current evaluate function.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/selection-replay.ts:32–55
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L290 — Forward and benchmark return arithmetic**
  * **Current behavior:** Ticker and benchmark returns use matching next-session-open / horizon-close conventions.
  * **How it works:** Compute percentage return and excess only when benchmark bars exist.
  * **Inputs and dependencies:** Ticker/benchmark entry and exit bars.
  * **Execution schedule:** When an outcome matures.
  * **Relevant formulas or rules:** return_pct=100×(exit−entry)/entry; excess=return_pct−benchmark_return_pct; four-decimal rounding.
  * **Current implementation status:** Implemented; absent benchmark remains null rather than zero.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/selection-replay.ts:40–55
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L291 — Selection metric maturity and date validation**
  * **Current behavior:** Win-rate cards count only matured, finite, correctly ordered outcomes available at the as-of time.
  * **How it works:** Filter by lane/horizon, decision<=as-of, entry>decision, exit>=entry, exit<=as-of, maturity<=as-of.
  * **Inputs and dependencies:** research_selection_evaluations and as-of timestamp.
  * **Execution schedule:** Lab snapshot rebuild and incremental evidence refresh.
  * **Relevant formulas or rules:** wins count return_pct>0; win_rate=100×wins/completed rounded to 0.1.
  * **Current implementation status:** Implemented; zero-return outcomes are not wins.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/selection-evaluations.ts:29–49
  * **Decision:** [ ]
  * **My instructions:**

* [x] **L292 — Displayed horizon availability**
  * **Current behavior:** 9M consumer now has a 180-session producer; saved metrics count authentic matured outcomes and leave future/missing marks pending.
  * **How it works:** Aggregate matching evaluation cohorts; availability means at least one row exists.
  * **Inputs and dependencies:** Layer 2 evaluation rows.
  * **Execution schedule:** Lab evidence aggregation.
  * **Relevant formulas or rules:** Replay currently creates 1,5,10,20,60 horizons, not 180.
  * **Current implementation status:** November 28 — X02 configured-backend evidence verified; production catch-up remains separately required. Prior hidden UI choices remain unchanged.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X02 configured-backend evidence verified; production catch-up remains separately required. Prior hidden UI choices remain unchanged.
  * **Source evidence:** src/lib/selection-evaluations.ts:2,29–49; src/lib/selection-replay.ts:6
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X02 configured-backend evidence verified; production catch-up remains separately required. Prior hidden UI choices remain unchanged.

* [x] **L293 — Same-day selection chart eligibility**
  * **Current behavior:** Same-day chart validation uses the shared date-aware New York opening timestamp, not fixed 13:30 UTC. All identity, maturity and actual-price checks remain.
  * **How it works:** Reject duplicate lane/date picks/outcomes; require next calendar-session entry, same-day exit, timestamp and price-return agreement.
  * **Inputs and dependencies:** Selections, horizon-1 evaluations, calendar and as-of timestamp.
  * **Execution schedule:** rebuildLabHistory.
  * **Relevant formulas or rules:** Timestamp guard uses entry-date 13:30 UTC; outcome return tolerance 0.00011.
  * **Current implementation status:** November 28 — X08 resolved in source/tests: winter 09:15 ET accepted; winter/summer opening bell and late records excluded. Historical final outcomes untouched.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: X08 resolved in source/tests: winter 09:15 ET accepted; winter/summer opening bell and late records excluded. Historical final outcomes untouched.
  * **Source evidence:** src/lib/selection-curve.ts:18–44
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. X08 resolved in source/tests: winter 09:15 ET accepted; winter/summer opening bell and late records excluded. Historical final outcomes untouched.

* [ ] **L294 — Same-day selection chart P&L model**
  * **Current behavior:** Selection history sums fixed-stake outcome profits by exit date.
  * **How it works:** Adds STAKE×(exit−entry)/entry to cumulative realized selection P&L.
  * **Inputs and dependencies:** Validated horizon-1 outcomes; STAKE from history-reconstruction.ts.
  * **Execution schedule:** Selection-history build.
  * **Relevant formulas or rules:** Fixed stake, no compounding or strategy cash/holding constraints; points rounded to four decimals.
  * **Current implementation status:** Implemented selection-accuracy model, not a tradable equity book.
  * **Conflicts or contradictions:** X04: Ledger close-entry books, next-session-open forward outcomes, fixed-stake selection history, trade-table paper holdings and broker fills use different models. This is a comparability conflict if presented as the same performance; independent models are not automatically bugs. Paper due exits use exact target-session marks, not a blanket midpoint/VWAP rule. Related items: L278, L288, L294, L359.
  * **Source evidence:** src/lib/selection-curve.ts:44–53; src/lib/history-reconstruction.ts
  * **Decision:** [ ]
  * **My instructions:** X04 reviewed November 28: preserve this independent authentic-price return model; do not blend it with other researcher results or interpret it as a broker fill. Existing implementation unchanged; isolation tests passed.

* [ ] **L295 — Saved selection history schema**
  * **Current behavior:** Historical selection snapshots require all seven unique lanes, ordered dates and internally consistent point counts.
  * **How it works:** parseLabHistory uses a strict versioned schema, rejects invalid saved output.
  * **Inputs and dependencies:** research_runs lab_history snapshot.
  * **Execution schedule:** Every saved-history readback.
  * **Relevant formulas or rules:** version=selection-layer2-v1; seven lanes; first/last points and session count must match shared range.
  * **Current implementation status:** Implemented; rejecting invalid snapshot does not certify underlying provider history.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/lab-history.ts:5–30
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L296 — Graph interval rebasing**
  * **Current behavior:** Displayed daily and cumulative series are differences of saved ledger P&L levels.
  * **How it works:** Slice saved points and subtract the latest pre-window point; use first selected point if no earlier baseline exists.
  * **Inputs and dependencies:** Ledger-only source curve, date window and scale.
  * **Execution schedule:** When a user selects a graph interval.
  * **Relevant formulas or rules:** daily=(current level−previous level)×scale; cumulative=(current level−baseline)×scale.
  * **Current implementation status:** Implemented; changing interval does not replay research.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ledger-chart.ts:15–29
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L297 — Weekly graph aggregation**
  * **Current behavior:** Weekly plots retain each week’s final saved point.
  * **How it works:** Group UTC dates by Sunday-start week, then difference saved levels.
  * **Inputs and dependencies:** Saved ledger points and weekly flag.
  * **Execution schedule:** Graph series generation.
  * **Relevant formulas or rules:** Last point in each Sunday-based UTC week wins; no invented intermediate points.
  * **Current implementation status:** Implemented display calculation; distinct from market calendar trading-week grouping.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ledger-chart.ts:18–29
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L298 — Saved curve source guard**
  * **Current behavior:** Research book graphs accept curves explicitly marked source=ledger.
  * **How it works:** recordedLedger rejects missing/wrong-source objects; ledgerWindow avoids backward stale date ranges.
  * **Inputs and dependencies:** Saved graph snapshot and selected dates.
  * **Execution schedule:** Research curve display.
  * **Relevant formulas or rules:** No valid ledger source => no replacement trade-derived researcher history.
  * **Current implementation status:** Implemented; daily ledger inherently has only one point per completed session, not an intraday feed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ledger-chart.ts:1–13
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L299 — Snapshot curve merge behavior**
  * **Current behavior:** Nonempty ledger curves replace fallback curves with the same strategy ID; unmatched ledger lanes are appended.
  * **How it works:** mergeLedgerCurves matches strategy_id, leaving ordinary strategy fallbacks intact.
  * **Inputs and dependencies:** Fallback strategy curves and canonical ledger curves.
  * **Execution schedule:** Lab snapshot rebuild and incremental merge.
  * **Relevant formulas or rules:** Only nonempty ledger curves enter replacement map.
  * **Current implementation status:** Implemented; strategy and researcher book curves remain separate models.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/ledger-curves.ts:6–13
  * **Decision:** [ ]
  * **My instructions:**

## 9. Trading Logic & Execution Rules

* [ ] **L300 — Research, recommendations and execution boundary**
  * **Current behavior:** Research evidence and ordinary live buy suggestions are not orders; autonomous live buys are a separate enabled path.
  * **How it works:** Ordinary live tryOpen notifies only; manual and autonomous origins can reach broker buys.
  * **Inputs and dependencies:** scan_scores, settings, manual confirmation or autonomous authorization.
  * **Execution schedule:** Ordinary scan/entry, manual trade, separate autonomous entry.
  * **Relevant formulas or rules:** Never infer paper-only application-wide behavior merely from researcher graphs.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1266–1291; src/lib/broker.server.ts:19,137–160
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L301 — Live broker destination**
  * **Current behavior:** The broker wrapper supports the live Alpaca account rather than a paper broker endpoint.
  * **How it works:** Use ALPACA_LIVE credential pair on server; return mode live.
  * **Inputs and dependencies:** Server-only broker credentials; never printed or copied.
  * **Execution schedule:** Broker account/order requests.
  * **Relevant formulas or rules:** Internal research paper mode simulates rows; it is not Alpaca paper execution.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/broker.server.ts:14–48
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L302 — Manual live-buy authorization**
  * **Current behavior:** A gated manual server function passes confirmed:true to openTrade.
  * **How it works:** Validate positive price/dollars; live buy rejects absent confirmation.
  * **Inputs and dependencies:** Owner gate and trade request.
  * **Execution schedule:** Explicit manual buy.
  * **Relevant formulas or rules:** Confirmation is a server-side flag from gated request, not an independently signed dialog token.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.functions.ts:89–106; src/lib/scan.server.ts:534–575
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L303 — Manual-buy eligibility scope**
  * **Current behavior:** General manual buy does not run every strategy/autonomous eligibility gate.
  * **How it works:** openTrade checks confirmation/fill and same-day duplicate conditions, not autonomous score/cash/time limits.
  * **Inputs and dependencies:** Requested ticker, dollars and live broker response.
  * **Execution schedule:** Explicit manual buy.
  * **Relevant formulas or rules:** No application settled-cash/score/session gate verified in generic buy; dedicated long-term wrapper checks buying power.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:543–575; src/lib/long-term.functions.ts:18–35
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L304 — Same-day duplicate allocation prevention**
  * **Current behavior:** Manual SAME_DAY live entry refuses another open SAME_DAY ticker allocation.
  * **How it works:** Query existing open same-day position before buy.
  * **Inputs and dependencies:** trades mode/status/ticker/position_type.
  * **Execution schedule:** Before manual same-day buy.
  * **Relevant formulas or rules:** Not a universal cross-position-type ticker ban or an atomic reservation.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X13: An order fill precedes separate trade and cash-record writes; daily limits and duplicate checks are read-before-write rather than a verified atomic reservation. Concurrent requests or failed local writes may conflict with broker exposure. Incidence is unverified. Related items: L306, L343, L304.
  * **Source evidence:** src/lib/scan.server.ts:534–615
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L305 — Broker order fill polling**
  * **Current behavior:** Buy sends a market/day notional order and polls a short bounded window.
  * **How it works:** Require filled status and nonzero actual fill before recording buy.
  * **Inputs and dependencies:** Broker order response/status/filled average price.
  * **Execution schedule:** Each live buy.
  * **Relevant formulas or rules:** Ten polls with700ms waits; partial/nonfinal fills can outlive local polling.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/broker.server.ts:109–160
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L306 — Fill-to-record sequencing**
  * **Current behavior:** Live order, trade row and cash ledger entry are separate steps.
  * **How it works:** Broker fill occurs before database inserts; no single transaction spans broker and database.
  * **Inputs and dependencies:** Fill price, quantity, order ID, trades and ledger_entries.
  * **Execution schedule:** Every live buy.
  * **Relevant formulas or rules:** A database failure or partial fill can leave broker exposure without matching local records; incidence unverified.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X13: An order fill precedes separate trade and cash-record writes; daily limits and duplicate checks are read-before-write rather than a verified atomic reservation. Concurrent requests or failed local writes may conflict with broker exposure. Incidence is unverified. Related items: L306, L343, L304.
  * **Source evidence:** src/lib/scan.server.ts:565–615; src/lib/autonomous.server.ts:123–137
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L307 — Actual live fill bookkeeping**
  * **Current behavior:** Recorded entries use actual fill price and quantity, not the requested estimate.
  * **How it works:** Persist filled_qty, broker order ID and negative deployment.
  * **Inputs and dependencies:** Actual filled order.
  * **Execution schedule:** After confirmed fill.
  * **Relevant formulas or rules:** deployment=−abs(dollars).
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:583–615
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L308 — Ordinary strategy entry switch**
  * **Current behavior:** strategy_enabled=false blocks new ordinary entries but does not block management exits.
  * **How it works:** Check entry state after handling open positions.
  * **Inputs and dependencies:** app_settings.strategy_enabled and ordinary trades.
  * **Execution schedule:** managePaperTrades.
  * **Relevant formulas or rules:** Connected backend strategy_enabled=false; do not assume production matches.
  * **Current implementation status:** Source and connected value verified; production unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1093–1133,1254–1329
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L309 — Ordinary strategy allocation population**
  * **Current behavior:** Ordinary manager handles null-strategy SAME_DAY allocations, not researcher or long-term books.
  * **How it works:** Filter mode/open rows/strategy_id null/position_type SAME_DAY.
  * **Inputs and dependencies:** trades and activeMode.
  * **Execution schedule:** Ordinary management phase.
  * **Relevant formulas or rules:** Mode derives from explicit option or paper_mode=false => live.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1093–1133
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L310 — Ordinary candidate slice**
  * **Current behavior:** Entries consider only top saved ordinary scan ranks.
  * **How it works:** Read top50, retain tradeable candidates and subtract carried day slots.
  * **Inputs and dependencies:** scan_scores and capital ladder.
  * **Execution schedule:** Ordinary entry phase.
  * **Relevant formulas or rules:** Ladder stocks_per_day determines slice; carried positions consume slots.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1137–1151,1295–1315
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L311 — Ordinary live entry recommendation**
  * **Current behavior:** Automated ordinary live candidate selection asks for manual confirmation instead of buying.
  * **How it works:** tryOpen sends a confirmation-needed notification and returns.
  * **Inputs and dependencies:** Live mode, tradeable candidate and notification preferences.
  * **Execution schedule:** Automated ordinary entry phase.
  * **Relevant formulas or rules:** No ordinary automated live buy; autonomous live path is separate.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1266–1291
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L312 — Ordinary simulated-entry cash scope**
  * **Current behavior:** Ordinary paper trade insertion is not the researcher settled-cash book.
  * **How it works:** openTrade writes deployment ledger only for live mode; ordinary paper manager can insert simulations.
  * **Inputs and dependencies:** Ordinary paper mode and trade row.
  * **Execution schedule:** Automated paper entry.
  * **Relevant formulas or rules:** No settled researcher-strategy cash gate in this path.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:534–542,583–615,1266–1291
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L313 — Approved swing entry**
  * **Current behavior:** Approved swing candidates can open with separate swing stake.
  * **How it works:** Use watchlist approvals and swing_dollars after day-slot selection.
  * **Inputs and dependencies:** Approved watchlist and settings.
  * **Execution schedule:** Ordinary entry phase.
  * **Relevant formulas or rules:** Not limited by the day-slot slice; live branch still requires manual confirmation.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1254–1329
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L314 — Ordinary day-position exit age**
  * **Current behavior:** Day-kind exit normally requires at least one elapsed calendar day.
  * **How it works:** Compare max of held cached-bar age and calendar age.
  * **Inputs and dependencies:** Entry date, cached bar date and current date.
  * **Execution schedule:** Ordinary exit phase.
  * **Relevant formulas or rules:** max(heldDays,calendarDays)>=1; SAME_DAY label is not same-session exit guarantee.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1156–1228
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L315 — Ordinary swing exit rule**
  * **Current behavior:** Non-day positions exit below latest scan SMA20 or at maximum hold age.
  * **How it works:** Use current scan close/SMA20 and rounded calendar age.
  * **Inputs and dependencies:** Latest ranking and swing_max_hold_days.
  * **Execution schedule:** Ordinary exit phase.
  * **Relevant formulas or rules:** RSI<45 shown in scanner invalidation text is not an enforced rule here.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1182–1235; src/lib/scoring.ts:257
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L316 — Qualifying overnight carry**
  * **Current behavior:** Eligible top-ranked ordinary day names can carry overnight when configured.
  * **How it works:** Build hold set from tradeable top names and carry-over options.
  * **Inputs and dependencies:** Hold setting, latest ranking and ladder stock count.
  * **Execution schedule:** Preclose phase.
  * **Relevant formulas or rules:** At least max(1,ladder.stocks_per_day) top tradeable names considered.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1200–1228,1501–1547
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L317 — Preclose ranking-refresh failure**
  * **Current behavior:** Regular preclose can continue using prior ranking after scan/reconciliation errors.
  * **How it works:** Catch/log failures, then call manager.
  * **Inputs and dependencies:** Prior scan, missing-day repair and broker reconciliation.
  * **Execution schedule:** Preclose function.
  * **Relevant formulas or rules:** Last3 missing dates fetched; force can bypass internal time gates.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1456–1527
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L318 — After-close direct cycle trade scope**
  * **Current behavior:** Regular daily cycle can manage real live exits even though ML/research parts are advisory.
  * **How it works:** runScan then managePaperTrades default both.
  * **Inputs and dependencies:** auto_run, live mode, ordinary positions and scan.
  * **Execution schedule:** Scheduled17:30 Eastern or manual force.
  * **Relevant formulas or rules:** Function itself checks trading day, not currently-open session.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1339–1396
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L319 — Protected long-term close refusal**
  * **Current behavior:** Generic close and cancellation reject LONG_TERM allocations.
  * **How it works:** Early position-type guard before sale/cancel.
  * **Inputs and dependencies:** Trade ownership and position_type.
  * **Execution schedule:** Generic manual/automatic close or cancel.
  * **Relevant formulas or rules:** Dedicated long-term sale flow is required.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:651–653,711–713
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L320 — Live close allocation protection**
  * **Current behavior:** Close sells only the allocation quantity while protecting long-term quantities of the same ticker.
  * **How it works:** Read broker quantity and protected lots; refuse shortage.
  * **Inputs and dependencies:** filled_qty or dollars/entry, broker quantity and LONG_TERM lots.
  * **Execution schedule:** Before a generic live sale.
  * **Relevant formulas or rules:** brokerQty+0.000001 >= protectedQty+allocationQty.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:702–765
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L321 — Live close verification and retry**
  * **Current behavior:** After sell, remaining quantity can trigger one additional sale attempt.
  * **How it works:** Read quantity; retry excess once; leave open with status note if still held.
  * **Inputs and dependencies:** Broker remaining quantity and sell fills.
  * **Execution schedule:** Generic live close.
  * **Relevant formulas or rules:** Returns closed:false on unconfirmed completion; no cancel-before-retry verified.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:738–765
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L322 — Broker quantity lookup failure**
  * **Current behavior:** positionQty returns zero after any lookup error.
  * **How it works:** Catch failure instead of surfacing unavailable quantity.
  * **Inputs and dependencies:** Broker positions response.
  * **Execution schedule:** Quantity read and post-sale verification.
  * **Relevant formulas or rules:** Zero may mean absent position or failed lookup; can affect sale-completion inference.
  * **Current implementation status:** Potential safety/reporting defect from source; no failure simulated.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/broker.server.ts:174–181
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L323 — Generic live-sale profit**
  * **Current behavior:** Profit uses allocation shares and exit price.
  * **How it works:** Round accounting to cents after actual exit.
  * **Inputs and dependencies:** filled_qty or dollars/entry, entry and last retained fill price.
  * **Execution schedule:** Completed generic close.
  * **Relevant formulas or rules:** profit=shares×(exit−entry); retry path retains last fill price rather than weighted multi-fill price.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:743–813
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L324 — Generic live-sale reserve split**
  * **Current behavior:** Positive kept profit is separated from returned principal; losses reduce principal.
  * **How it works:** Insert settlement and positive reserve ledger entries.
  * **Inputs and dependencies:** profit_keep_pct and closed allocation.
  * **Execution schedule:** Completed live close.
  * **Relevant formulas or rules:** kept=profit>0?profit×keepPct:profit; settlement=dollars+min(profit,0); unused positive-profit remainder not separately credited by this function.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:769–813
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L325 — Live settlement date**
  * **Current behavior:** Generic live accounting uses calendar days, not the paper trading calendar.
  * **How it works:** UTC current date plus configured settlement_days.
  * **Inputs and dependencies:** Sale timestamp and settings.
  * **Execution schedule:** Completed live close.
  * **Relevant formulas or rules:** Connected settlement_days=1; weekends/holidays are not skipped in this calculation.
  * **Current implementation status:** Implemented; differs from paper T+1; actual broker settlement timing not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:787–790; read-only app_settings
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L326 — Cancellation versus liquidation**
  * **Current behavior:** Cancel attempts open-order cancellation then marks local trade cancelled and refunds stake.
  * **How it works:** Does not explicitly sell already-filled holdings; continues after cancellation errors.
  * **Inputs and dependencies:** Trade, broker open orders and live ledger.
  * **Execution schedule:** Explicit generic cancel.
  * **Relevant formulas or rules:** Potential phantom cash if filled exposure remains; LONG_TERM is blocked.
  * **Current implementation status:** Potential accounting/safety defect; no cancel or broker request made.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:644–686
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L327 — Unknown broker position adoption**
  * **Current behavior:** Untracked broker holdings are adopted as protected LONG_TERM allocations.
  * **How it works:** Create local position records from broker holdings.
  * **Inputs and dependencies:** Broker quantities/cost and existing trades.
  * **Execution schedule:** Broker reconciliation/adoption.
  * **Relevant formulas or rules:** Not ordinary daily positions; comments implying preclose will decide their exit are stale.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:879–893,1517–1519
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L328 — Reconciliation shortage reporting**
  * **Current behavior:** Reconciliation reports allocation/broker shortages; the inspected trimmed list remains empty.
  * **How it works:** Compare position ownership and adjust cash; no actual trim action in shown sequence.
  * **Inputs and dependencies:** Broker positions and local trades.
  * **Execution schedule:** Reconcile calls.
  * **Relevant formulas or rules:** Do not treat returned trim/carry wording as proof positions were trimmed.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:916–995
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L329 — Reconciliation cash adjustment**
  * **Current behavior:** Broker cash is compared with local nonreserve cash and a spendable difference may be inserted.
  * **How it works:** Reconcile difference into null-strategy ledger adjustment.
  * **Inputs and dependencies:** Broker cash, local ledger and reserves.
  * **Execution schedule:** Reconcile calls.
  * **Relevant formulas or rules:** Excluding reserves from comparison can make reserve cash appear spendable again; arithmetic risk, incidence unverified.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:968–990,1032–1044
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L330 — Available spending cash**
  * **Current behavior:** Spendable cash excludes reserve entries and future settlement availability.
  * **How it works:** Sum null-strategy ledger rows available by UTC today.
  * **Inputs and dependencies:** ledger_entries and current UTC date.
  * **Execution schedule:** Cash read before protected entry decisions.
  * **Relevant formulas or rules:** Available date<=today; reserve excluded.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1032–1044
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L331 — Capital used for ladder sizing**
  * **Current behavior:** Scaling capital includes null-strategy ledger balances plus broker market value.
  * **How it works:** Include pending/reserve values in sizing total; paper adds open ordinary paper stakes instead.
  * **Inputs and dependencies:** Ledger, broker positions or ordinary paper rows.
  * **Execution schedule:** Capital ladder evaluation.
  * **Relevant formulas or rules:** Broker-read failure logs and can leave reduced calculation; all broker positions contribute.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:1054–1083
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L332 — Capital ladder level 0**
  * **Current behavior:** Level0 allocates 1 stock(s) at $10 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $20.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L333 — Capital ladder level 1**
  * **Current behavior:** Level1 allocates 1 stock(s) at $15 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $25.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L334 — Capital ladder level 2**
  * **Current behavior:** Level2 allocates 1 stock(s) at $20 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $30.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L335 — Capital ladder level 3**
  * **Current behavior:** Level3 allocates 2 stock(s) at $20 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $50.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L336 — Capital ladder level 4**
  * **Current behavior:** Level4 allocates 3 stock(s) at $20 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $70.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L337 — Capital ladder level 5**
  * **Current behavior:** Level5 allocates 4 stock(s) at $20 each.
  * **How it works:** Apply current saved step rather than fixed day-trade input.
  * **Inputs and dependencies:** capital_ladder_state and scaling capital.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** required capital=stocks×stake+$10 cushion; this step requires $90.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:14–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L338 — Capital ladder promotion**
  * **Current behavior:** Increase one step after five qualifying evaluations meeting next requirement.
  * **How it works:** Persist daily evaluation and stable counter.
  * **Inputs and dependencies:** Capital, next requirement and last evaluated date.
  * **Execution schedule:** At most once per supplied date.
  * **Relevant formulas or rules:** Five evaluations, not internally enforced consecutive trading sessions.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:86–199,243–285
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L339 — Capital ladder reduction**
  * **Current behavior:** Decrease one step after two evaluations below current requirement−$0.50.
  * **How it works:** Persist breach counter and reset according to adequate/shortfall states.
  * **Inputs and dependencies:** Capital and current level.
  * **Execution schedule:** Sizing evaluation.
  * **Relevant formulas or rules:** Minimum level does not itself prohibit entry for insufficient capital.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:86–199,243–285
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L340 — Capital ladder manual hold/reset**
  * **Current behavior:** Manual hold freezes step/counters; reset returns1×$20 and zero counters.
  * **How it works:** Explicit controls change capital_ladder_state.
  * **Inputs and dependencies:** Owner request and ladder state.
  * **Execution schedule:** Manual only.
  * **Relevant formulas or rules:** Nearest nonstandard step uses100×abs(stock difference)+abs(dollar difference).
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/capital.server.ts:205–211,326–337
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L341 — Autonomous live entry switches**
  * **Current behavior:** Autonomous actual buys require its own authorization and live mode.
  * **How it works:** Entry wrapper also depends on regular auto_run pass having ran and not reporting stale.
  * **Inputs and dependencies:** auto_live_trading, paper_mode and regular entry result.
  * **Execution schedule:** Post-open hook / authorized autonomous entry.
  * **Relevant formulas or rules:** Both DB and broker wrapper reread switches; connected auto_live_trading=false.
  * **Current implementation status:** Implemented, connected switch off; production switch not assumed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/preopen.ts:24–31; src/lib/broker.server.ts:143–160
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L342 — Autonomous stake cap**
  * **Current behavior:** Stake is constrained by the configured cap and hard maximum.
  * **How it works:** Compute min(configured cap or25,50), validate positive and available cash.
  * **Inputs and dependencies:** auto_max_trade_dollars and cash.
  * **Execution schedule:** Each autonomous entry.
  * **Relevant formulas or rules:** API cap range$1–$50; connected cap$25.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:66–108; src/lib/scan.functions.ts:147–152
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L343 — Autonomous daily entry count**
  * **Current behavior:** Today’s autonomous live trade-row count caps daily entries.
  * **How it works:** Read count before ordering.
  * **Inputs and dependencies:** Autonomous trades and New York date.
  * **Execution schedule:** Each autonomous entry.
  * **Relevant formulas or rules:** API daily count0–3; default1; no atomic capacity reservation verified.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X13: An order fill precedes separate trade and cash-record writes; daily limits and duplicate checks are read-before-write rather than a verified atomic reservation. Concurrent requests or failed local writes may conflict with broker exposure. Incidence is unverified. Related items: L306, L343, L304.
  * **Source evidence:** src/lib/autonomous.server.ts:73–78; src/lib/scan.functions.ts:147–152
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L344 — Autonomous daily loss gate**
  * **Current behavior:** Realized daily autonomous losses plus open unrealized P&L can block entry.
  * **How it works:** Compare combined P&L to negative configured loss limit.
  * **Inputs and dependencies:** Closed autonomous P&L, open marks and loss setting.
  * **Execution schedule:** Each autonomous entry.
  * **Relevant formulas or rules:** Block at <=−abs(limit); API range$1–$500; connected default$50.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:66–108; src/lib/autonomous.ts:90–110
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L345 — Autonomous market-move kill switch**
  * **Current behavior:** Missing proxy move or move exceeding threshold blocks new entry when enabled.
  * **How it works:** Compute100×(latest proxy price/cached close−1), compare absolute value.
  * **Inputs and dependencies:** Latest proxy price, cached proxy close and settings.
  * **Execution schedule:** Each autonomous entry.
  * **Relevant formulas or rules:** Block abs(move)>limit, equality passes; range0.5–10%; connected1.8%, switchtrue.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:39–54,66–108; src/lib/autonomous.ts:90–110
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L346 — Autonomous account and cash gates**
  * **Current behavior:** Blocked/inactive broker account or insufficient application cash prevents entry.
  * **How it works:** Check ACTIVE, trading_blocked and availableCash>=stake.
  * **Inputs and dependencies:** Broker account and local settled cash.
  * **Execution schedule:** Before autonomous selection/order.
  * **Relevant formulas or rules:** These checks are separate from manual generic-buy eligibility.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:66–108
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L347 — Autonomous candidate shortlist**
  * **Current behavior:** Autonomous ranks only a small latest-scan candidate pool.
  * **How it works:** Read top20, exclude open autonomous tickers and keep first10 tradeable.
  * **Inputs and dependencies:** scan_scores and open AUTO_TIMED trades.
  * **Execution schedule:** Each autonomous entry.
  * **Relevant formulas or rules:** Duplicate exclusion is autonomous-specific, not a universal cross-type ticker rule.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:112–120
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L348 — Autonomous researcher track record**
  * **Current behavior:** Positive saved lane-book return establishes trusted researchers.
  * **How it works:** Read up to60 saved records per lane.
  * **Inputs and dependencies:** researcher_daily_ledger.
  * **Execution schedule:** Autonomous candidate choice.
  * **Relevant formulas or rules:** track_pct=100×(latest equity/oldest equity−1); require>0.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.server.ts:10–35
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L349 — Autonomous confidence and owner**
  * **Current behavior:** Choose highest confidence candidate, then assign strongest positive agreeing researcher.
  * **How it works:** Strictly greater confidence replaces winner; ties retain earlier candidate.
  * **Inputs and dependencies:** Candidate score and positive researcher track records.
  * **Execution schedule:** Autonomous choice.
  * **Relevant formulas or rules:** round4(score/max(poolMaxScore,1)+sum(agreeing positive track_pct)/10); owner fallback strongest positive researcher.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/autonomous.ts:36–58
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L350 — Autonomous timed position isolation**
  * **Current behavior:** Recorded live autonomous positions are AUTO_TIMED and retain researcher owner/hold target.
  * **How it works:** Store auto_managed, owner, fill and target after full fill.
  * **Inputs and dependencies:** Actual fill, owner slot hold_days and trades.
  * **Execution schedule:** Autonomous filled entry.
  * **Relevant formulas or rules:** Target=entry+floor(hold_days) additional trading sessions; fallback3, unlike entry-inclusive paper convention.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X14: Historical paper settlement uses computed trading holidays, while the main market calendar explicitly lists 2026–2027. Ledger, paper and autonomous held-session counting also differ; a shared label does not guarantee the same exit date. Related items: L004, L362, L350, L279.
  * **Source evidence:** src/lib/autonomous.server.ts:123–145; src/lib/autonomous.ts:61–70
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L351 — Autonomous exits after switch-off**
  * **Current behavior:** Turning off new autonomous trading does not cancel due timed exits.
  * **How it works:** Preclose invokes autonomous exits independently of regular auto_run.
  * **Inputs and dependencies:** Open AUTO_TIMED trades, target and verified sale.
  * **Execution schedule:** Preclose trading-day hook.
  * **Relevant formulas or rules:** Due if target missing or today>=target; actual close uses closeTrade safeguards.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/preclose.ts:19–27; src/lib/autonomous.server.ts:148–175
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L352 — Autonomous exit success reporting**
  * **Current behavior:** Current exit wrapper can list/notify a sale without checking closeTrade.closed.
  * **How it works:** Append sold result after close function returns even if closed:false.
  * **Inputs and dependencies:** closeTrade result and notification.
  * **Execution schedule:** Autonomous exit pass.
  * **Relevant formulas or rules:** A reported sale is not definitive fill/liquidation evidence.
  * **Current implementation status:** Potential reporting defect; no trade execution undertaken.
  * **Conflicts or contradictions:** X12: The autonomous exit wrapper can report a sale without checking closed:false from closeTrade. Reported success can therefore contradict the underlying close result; no broker action was performed to reproduce it. Related items: L352.
  * **Source evidence:** src/lib/autonomous.server.ts:160–167; src/lib/scan.server.ts:738–762
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L353 — Paper research slot population**
  * **Current behavior:** Up to seven lane-backed strategy slots are loaded; new book seeds only when ledger absent.
  * **How it works:** Filter truthy strategy/lane, truncate7 and seed$50 if no ledger.
  * **Inputs and dependencies:** paper_slots, strategies and strategy ledger.
  * **Execution schedule:** Slot load/setup.
  * **Relevant formulas or rules:** Unexpected nonempty lane can occupy a slot; not an exact lane allowlist.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:116–154,186–198
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L354 — Paper hold length**
  * **Current behavior:** Paper target counts entry as day one.
  * **How it works:** floor valid slot hold_days in1–252, else3; target entry+hold−1 trading sessions.
  * **Inputs and dependencies:** Slot parameters and paper calendar.
  * **Execution schedule:** Paper entry.
  * **Relevant formulas or rules:** Hold3 means two later sessions, unlike ledger/autonomous three-later convention.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:75–94,404–407
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L355 — Paper simultaneous position limit**
  * **Current behavior:** Automated researcher paper entry permits up to five distinct open tickers.
  * **How it works:** free=5−openCount; load forces stocks_per_day=1 but entry code uses five.
  * **Inputs and dependencies:** Research boards, current holdings and settled capacity.
  * **Execution schedule:** Research paper entry phase.
  * **Relevant formulas or rules:** Manual paper buy shown does not enforce same five-position cap or enabled-slot check.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:64,84,145–147,674–699,869–884,1371–1381
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L356 — Paper entry cash transaction**
  * **Current behavior:** Paper buy needs positive price, trading date and sufficient settled strategy cash.
  * **How it works:** Insert paper trade then negative deployment ledger entry; no broker order.
  * **Inputs and dependencies:** Strategy ownership, cash capacity and cached price.
  * **Execution schedule:** Paper entry.
  * **Relevant formulas or rules:** Separate trade/ledger writes; no automatic top-up.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:379–422,688–695
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L357 — Paper short-hold cash tranches**
  * **Current behavior:** Paper holds<=2 use alternating A/B pools; longer holds use total settled cash.
  * **How it works:** Untagged cash splits equally; selected pool caps capacity.
  * **Inputs and dependencies:** Settled nonreserve ledger entries and latest tagged deployment.
  * **Execution schedule:** Paper buy-capacity calculation.
  * **Relevant formulas or rules:** capacity=max(0,min(selected pool,total cash)); cent-rounded affordability; default trancheA.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/settlement-rules.ts:61–94
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L358 — Paper same-day comparison**
  * **Current behavior:** Same-day evidence is hypothetical, not a sale or cash movement.
  * **How it works:** Write once only after verified entry; retain actual holding until target.
  * **Inputs and dependencies:** Entry session authentic range and close.
  * **Execution schedule:** Paper evaluation pass.
  * **Relevant formulas or rules:** Does not create settlement or duplicate profits.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:438–460,470–546
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L359 — Paper target exit price**
  * **Current behavior:** Actual research paper close uses exact target-session mark.
  * **How it works:** Missing target mark keeps open/pending with no profit/settlement.
  * **Inputs and dependencies:** Target date, researchMarketMark and verified entry.
  * **Execution schedule:** When target is due.
  * **Relevant formulas or rules:** Disabled slots also safety-close; current target requires session complete unless forced.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X04: Ledger close-entry books, next-session-open forward outcomes, fixed-stake selection history, trade-table paper holdings and broker fills use different models. This is a comparability conflict if presented as the same performance; independent models are not automatically bugs. Paper due exits use exact target-session marks, not a blanket midpoint/VWAP rule. Related items: L278, L288, L294, L359.
  * **Source evidence:** src/lib/race.server.ts:616–655,767–820
  * **Decision:** [ ]
  * **My instructions:** X04 reviewed November 28: preserve this independent authentic-price return model; do not blend it with other researcher results or interpret it as a broker fill. Existing implementation unchanged; isolation tests passed.

* [ ] **L360 — Paper close claim and cash writes**
  * **Current behavior:** Only one competing closer can claim open->closed, but ledger completion is a separate write.
  * **How it works:** Conditional status=open update then cash inserts.
  * **Inputs and dependencies:** Paper trade row and ledger.
  * **Execution schedule:** Paper close.
  * **Relevant formulas or rules:** No second P&L claim; ignored ledger insert failure can leave closed row without proceeds.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:488–503,545–546
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L361 — Paper close P&L and reserve split**
  * **Current behavior:** Profit and positive unkept remainder are accounted separately.
  * **How it works:** Principal, reserve and remaining-profit entries become available on paper settlement date.
  * **Inputs and dependencies:** dollars, entry/exit and keepPct.
  * **Execution schedule:** Verified paper close.
  * **Relevant formulas or rules:** profit=dollars×(exit/entry−1); kept=positive×keepPct else loss; principal=dollars+min(profit,0); remainder>$0.004 gets separate credit.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/race.server.ts:470–546; src/lib/settlement-rules.ts:37–59
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L362 — Paper settlement calendar**
  * **Current behavior:** Paper proceeds settle next trading session rather than UTC tomorrow.
  * **How it works:** Skip weekends and computed holidays, including historical special closure.
  * **Inputs and dependencies:** Paper calendar and sale date.
  * **Execution schedule:** Each paper sale.
  * **Relevant formulas or rules:** T+1 trading session; main market calendar explicit2026–2027 is a different implementation.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** X14: Historical paper settlement uses computed trading holidays, while the main market calendar explicitly lists 2026–2027. Ledger, paper and autonomous held-session counting also differ; a shared label does not guarantee the same exit date. Related items: L004, L362, L350, L279.
  * **Source evidence:** src/lib/settlement-rules.ts:37–59; src/lib/market-calendar.ts:7–38
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L363 — Paper entry-range evidence**
  * **Current behavior:** Entry must agree with authentic entry-session traded range before outcomes are trusted.
  * **How it works:** Check daily bar and any explicit quarantine/pending notes.
  * **Inputs and dependencies:** Entry price, exact session OHLC and audit tolerance.
  * **Execution schedule:** Same-day evaluation and normal close.
  * **Relevant formulas or rules:** low×0.995 <= entry <= high×1.005 with small floating epsilon.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/paper-outage.server.ts:6–10; src/lib/audit-rules.ts:2,68–72
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L364 — Invalid stale paper quarantine**
  * **Current behavior:** Only proven-invalid stale paper entries are annotated, never repaired by invented exits.
  * **How it works:** Require paper, strategy-owned, no broker order, open, valid target and age beyond target+5 trading sessions.
  * **Inputs and dependencies:** Entry range, trade metadata and date.
  * **Execution schedule:** Health quarantine helper.
  * **Relevant formulas or rules:** Strictly later than target+5; missing evidence alone is not proven invalid; no refund/close/P&L/settlement.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/paper-outage.ts:10–19; src/lib/paper-outage.server.ts:14–42
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L365 — Research price fallback separation**
  * **Current behavior:** Exact cached research marks may fall back to exact-date Yahoo evidence.
  * **How it works:** Validate requested session; never substitute a latest generic price for research close.
  * **Inputs and dependencies:** Cached bar or Yahoo daily history.
  * **Execution schedule:** Paper mark needed.
  * **Relevant formulas or rules:** Research only; not broker execution price or scanner volume input.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-market-mark.server.ts:6–41
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L366 — Long-term live purchase affordability**
  * **Current behavior:** Dedicated long-term buy validates amount, broker block and buying power.
  * **How it works:** Use protected long-term wrapper around confirmed broker purchase.
  * **Inputs and dependencies:** Broker account and manual request.
  * **Execution schedule:** Manual long-term buy.
  * **Relevant formulas or rules:** $1–$1,000,000; buying-power tolerance$0.001.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/long-term.functions.ts:6–35
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L367 — Long-term review horizons**
  * **Current behavior:** Owner chooses1/3/9 calendar months or indefinite; review is not auto-sale authority.
  * **How it works:** Clamp month-end; horizon changes append owner decision history from today.
  * **Inputs and dependencies:** horizons, trade record and owner instruction.
  * **Execution schedule:** Manual buy/horizon edit.
  * **Relevant formulas or rules:** No generic daily strategy exit permission for LONG_TERM.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/horizons.ts:5–19,46–63; src/lib/long-term.server.ts:15–47
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L368 — Long-term manual sale sizing**
  * **Current behavior:** Dedicated sale supports all or a dollar-sized partial slice.
  * **How it works:** Shares=all?heldQty:requestedDollars/currentPrice; cap/round and protect other long lots.
  * **Inputs and dependencies:** filled_qty/cost basis, current broker price and protected quantities.
  * **Execution schedule:** Manual confirmed long-term sale.
  * **Relevant formulas or rules:** Within$0.01 of market value sells all; six decimal shares;0.000001-share protection tolerance.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/long-term.server.ts:77–194
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L369 — Long-term partial-sale records**
  * **Current behavior:** Partial sale reduces original lot and records a closed slice.
  * **How it works:** Use fill price and sold cost for P&L, then return proceeds.
  * **Inputs and dependencies:** Actual sale fill and lot cost.
  * **Execution schedule:** After dedicated partial sale.
  * **Relevant formulas or rules:** Profit=proceeds−sold cost; shown checks require fill/price but not specifically filled status.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/long-term.server.ts:77–194
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L370 — Long-term sale settlement bookkeeping**
  * **Current behavior:** Dedicated sale credits entire proceeds on UTC tomorrow.
  * **How it works:** Create settlement entry using one calendar-day date addition.
  * **Inputs and dependencies:** Actual proceeds and UTC sale date.
  * **Execution schedule:** Manual long-term completed sale.
  * **Relevant formulas or rules:** Not trading-calendar T+1; differs from paper settlement.
  * **Current implementation status:** Implemented in source; no broker call, order, execution test or production-setting change performed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/long-term.server.ts:186–194
  * **Decision:** [ ]
  * **My instructions:**

## 10. Data Sources, APIs & Database Operations

* [ ] **L371 — Scheduler configuration prerequisites**
  * **Current behavior:** SQL templates require usable host/token and scheduler extensions to become operational.
  * **How it works:** Optional audit setup detects pg_cron and hook_tokens; missing pg_net emits warning.
  * **Inputs and dependencies:** Hosting target, hook token, pg_cron and HTTP extension.
  * **Execution schedule:** Manual migration installation only.
  * **Relevant formulas or rules:** Template placeholders and historical development hostnames are not verified production targets.
  * **Current implementation status:** Source prerequisites verified; no migration applied or schedule changed.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/09-schedule.sql:3–12;16-autonomous-audit.sql:50–68; migration/astr-full-schema.sql:679–695
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L372 — Operational data retention**
  * **Current behavior:** No time-based retention scheduler was found among inspected job declarations.
  * **How it works:** Tables retain history unless a specific mutation/maintenance path removes or replaces rows.
  * **Inputs and dependencies:** Scans, research, notifications, trade and audit tables.
  * **Execution schedule:** Writes as processes run; no verified automatic purge schedule.
  * **Relevant formulas or rules:** Read limits are not retention limits.
  * **Current implementation status:** No general purge mechanism verified; storage growth and production retention policy unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/09-schedule.sql;14-key-check-schedule.sql;15-lab-refresh-schedule.sql;16-autonomous-audit.sql
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L373 — Historical schema sources**
  * **Current behavior:** Schema evolution is split across fresh SQL, historical migrations and Drizzle SQL.
  * **How it works:** Different tracks contain later functions/tables and schedule variants; drizzle/schema.ts is blank.
  * **Inputs and dependencies:** migration/fresh, supabase/migrations, drizzle/migrations and generated types.
  * **Execution schedule:** Manual deployment/migration work.
  * **Relevant formulas or rules:** A successful individual file is not proof all newer functions/columns exist.
  * **Current implementation status:** Implemented multi-track deployment; actual production migration completeness unverified.
  * **Conflicts or contradictions:** X16: The production checker primarily probes selected tables/columns; it does not certify RPCs, triggers, grants or job delivery. A passing check cannot establish full migration or operational completeness. Related items: L374, L373.
  * **Source evidence:** drizzle/schema.ts:1; scripts/check-production-schema.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L374 — Read-only production schema checker**
  * **Current behavior:** The workflow probes tables/columns from fresh migrations11–22 before replay.
  * **How it works:** Zero-row select reports missing items; strict mode is fatal only for missing selection-layer tables.
  * **Inputs and dependencies:** Production connection supplied to GitHub, table/column list.
  * **Execution schedule:** Manual production replay workflow.
  * **Relevant formulas or rules:** Does not exhaustively test all RPCs, triggers, indexes, grants or scheduled jobs.
  * **Current implementation status:** Implemented partial checker; previously missing coverage/scan RPCs explain why table-only success is insufficient.
  * **Conflicts or contradictions:** X16: The production checker primarily probes selected tables/columns; it does not certify RPCs, triggers, grants or job delivery. A passing check cannot establish full migration or operational completeness. Related items: L374, L373.
  * **Source evidence:** scripts/check-production-schema.ts:5–40
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L375 — Notification preference behavior**
  * **Current behavior:** Disabled notification categories can suppress saved feed entries as well as phone delivery.
  * **How it works:** Check preferences before insert and push.
  * **Inputs and dependencies:** app_settings notification flags and notification payload.
  * **Execution schedule:** Each notification attempt.
  * **Relevant formulas or rules:** Health preferences can affect visibility of health errors.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/notify.server.ts:140–149
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L376 — Web Push device delivery**
  * **Current behavior:** Phone delivery uses Web Push and configured VAPID credentials.
  * **How it works:** Missing keys returns zero sends; send with one-hour TTL.
  * **Inputs and dependencies:** push_subscriptions and VAPID key pair.
  * **Execution schedule:** Each enabled notification.
  * **Relevant formulas or rules:** No delivery retry loop in inspected send function.
  * **Current implementation status:** Implemented conditional integration; device/credential delivery not exercised.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/notify.server.ts:28–60
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L377 — Push subscription cleanup**
  * **Current behavior:** Expired device endpoints are removed; other failures are counted or logged.
  * **How it works:** Delete on404/410; increment failure counter on other HTTP errors.
  * **Inputs and dependencies:** Push endpoint response and subscription row.
  * **Execution schedule:** During push delivery.
  * **Relevant formulas or rules:** Cleanup is endpoint-specific, not general database retention.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/notify.server.ts:68–92
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L378 — Data dependency: app_settings**
  * **Current behavior:** Global thresholds, switches, sizing, provider and notification configuration.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** app_settings; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L379 — Data dependency: daily_bars**
  * **Current behavior:** Ticker/session OHLCV price history used by scans, research and integrity.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** daily_bars; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L380 — Data dependency: health_checks**
  * **Current behavior:** Saved health issues, checks and repair cooldown evidence.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** health_checks; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L381 — Data dependency: hook_tokens**
  * **Current behavior:** Scheduled-hook singleton shared-secret storage; do not print token.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** hook_tokens; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L382 — Data dependency: ledger_entries**
  * **Current behavior:** Cash deployment, settlement, reserve and adjustment bookkeeping; strategy ownership separates paper books.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** ledger_entries; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L383 — Data dependency: notifications**
  * **Current behavior:** Saved suggestions, alerts, deduplication keys and acknowledgement state.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** notifications; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L384 — Data dependency: push_subscriptions**
  * **Current behavior:** Registered phone/browser push endpoints and expiry/failure tracking.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** push_subscriptions; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L385 — Data dependency: paper_slots**
  * **Current behavior:** Research paper-book activation, strategy mapping, start and settings.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** paper_slots; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L386 — Data dependency: capital_ladder_state**
  * **Current behavior:** Persisted allocation step, stable/breach counters and manual hold.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** capital_ladder_state; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L387 — Data dependency: capital_ladder_events**
  * **Current behavior:** Capital sizing transition history.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** capital_ladder_events; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L388 — Data dependency: model_versions**
  * **Current behavior:** ML model/version, training settings and evaluation evidence.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** model_versions; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L389 — Data dependency: model_predictions**
  * **Current behavior:** Saved per-date machine-learning predictions and grading.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** model_predictions; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L390 — Data dependency: master_formula_versions**
  * **Current behavior:** Versioned master formula learning evidence and settings.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** master_formula_versions; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L391 — Data dependency: master_rules**
  * **Current behavior:** Assembled lead researcher core settings, bands and proposal/active state.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** master_rules; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L392 — Data dependency: lead_tests**
  * **Current behavior:** Lead formula test and validation evidence.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** lead_tests; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L393 — Data dependency: backup_tests**
  * **Current behavior:** Operational backup/recovery test reports; table presence is not a tested backup.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** backup_tests; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L394 — Data dependency: scan_runs**
  * **Current behavior:** Scan receipts, dates and summary counts.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** scan_runs; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L395 — Data dependency: scan_scores**
  * **Current behavior:** Ranked ticker scores associated with scan runs.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** scan_scores; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L396 — Data dependency: strategies**
  * **Current behavior:** Built-in/custom strategy identities, descriptions and parameters.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** strategies; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L397 — Data dependency: trades**
  * **Current behavior:** Ordinary, research-paper, autonomous and long-term allocation records; distinguish mode/strategy/position_type.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** trades; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L398 — Data dependency: watchlist_candidates**
  * **Current behavior:** Repeated appearances, manual approvals/rejections and monitoring status.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** watchlist_candidates; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L399 — Data dependency: verification_reports**
  * **Current behavior:** Saved independent performance/qualification checks.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** verification_reports; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L400 — Data dependency: researchers**
  * **Current behavior:** Six rotating specialist/challenger rows, current/best parameters, experiment counts and generations.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** researchers; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L401 — Data dependency: research_runs**
  * **Current behavior:** Research receipts, graph/history snapshots, checkpoints, archives and assorted process state distinguished by kind.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_runs; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L402 — Data dependency: research_notebook**
  * **Current behavior:** Experiment notes and tested hypothesis history.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_notebook; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L403 — Data dependency: research_findings**
  * **Current behavior:** Stored validated/rejected findings from departmental experiments.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_findings; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L404 — Data dependency: research_candidates**
  * **Current behavior:** Human-reviewed proposed strategy/formula candidates.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_candidates; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L405 — Data dependency: research_dead_ends**
  * **Current behavior:** Rejected hypotheses retained to avoid repeating failures.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_dead_ends; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L406 — Data dependency: research_horizon_predictions**
  * **Current behavior:** Long-horizon selection/holding prediction evaluation evidence.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_horizon_predictions; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L407 — Data dependency: researcher_examples**
  * **Current behavior:** Point-in-time examples and positive/negative outcome evidence for learning.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** researcher_examples; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L408 — Data dependency: researcher_beliefs**
  * **Current behavior:** Researcher characteristic beliefs and evidence summaries.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** researcher_beliefs; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L409 — Data dependency: market_events**
  * **Current behavior:** Event/filing-derived hypotheses and later evaluations.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** market_events; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L410 — Data dependency: researcher_daily_ledger**
  * **Current behavior:** Canonical seven-lane session equity levels and returns.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** researcher_daily_ledger; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L411 — Data dependency: research_daily_selections**
  * **Current behavior:** Immutable original per-lane/date picks, score/formula/universe metadata.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_daily_selections; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L412 — Data dependency: research_selection_evaluations**
  * **Current behavior:** Separate pending/matured forward horizon outcomes.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** research_selection_evaluations; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L413 — Data dependency: audit_integrity_results**
  * **Current behavior:** Quantitative daily/weekly audit results and discrepancies.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** audit_integrity_results; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L414 — Data dependency: engineer_settings**
  * **Current behavior:** AI endpoint/model, repository/branch, deployment and budget configuration.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_settings; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L415 — Data dependency: engineer_tasks**
  * **Current behavior:** Locked instructions/scope, lease, branch/SHA and task lifecycle.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_tasks; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L416 — Data dependency: engineer_logs**
  * **Current behavior:** Task planning, patching and verification log messages.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_logs; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L417 — Data dependency: engineer_checkpoints**
  * **Current behavior:** Versioned code checkpoints; not database backups.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_checkpoints; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L418 — Data dependency: engineer_change_log**
  * **Current behavior:** Approved code change history, protected from checkpoint cascade deletion.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_change_log; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L419 — Data dependency: engineer_health_events**
  * **Current behavior:** Runner/provider/security/deployment health findings and escalation.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** engineer_health_events; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L420 — Data dependency: byob_models**
  * **Current behavior:** Immutable ticker-specific fitted model versions and provenance.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** byob_models; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L421 — Data dependency: byob_registry**
  * **Current behavior:** Current per-ticker active model pointer and revision.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** byob_registry; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L422 — Data dependency: byob_activation_events**
  * **Current behavior:** Append-only activation history.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** byob_activation_events; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L423 — Data dependency: byob_research_runs**
  * **Current behavior:** Immutable BYOB research run provenance/evidence.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** byob_research_runs; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L424 — Data dependency: byob_research_events**
  * **Current behavior:** Immutable BYOB training/evaluation events.
  * **How it works:** Persisted public application table; inspect its consumers before changing or removing associated behavior.
  * **Inputs and dependencies:** byob_research_events; relevant writers/readers documented in this checklist.
  * **Execution schedule:** Process-driven reads/writes; no general purge schedule verified.
  * **Relevant formulas or rules:** Selecting delete here is a discussion flag, not permission to delete table/rows or historical evidence.
  * **Current implementation status:** Table presence verified in connected backend; full production columns/constraints/data completeness unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** migration/fresh/01-structure-part1.sql;02-structure-part2.sql;11–22 additions; drizzle/migrations/0008_researcher_daily_ledger.sql; read-only public catalog 2026-11-27
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L425 — Connected database schema availability**
  * **Current behavior:** The inspected database exposes 48 public tables; audit_repair_log is not among them.
  * **How it works:** Read-only information_schema and pg_tables enumeration.
  * **Inputs and dependencies:** Connected backend catalog only; not production credentials.
  * **Execution schedule:** This audit snapshot, 2026-11-27.
  * **Relevant formulas or rules:** Table presence does not prove schema completeness, scheduled execution or correct permissions.
  * **Current implementation status:** Verified in connected backend; production schema beyond prior screenshots/logs is unverified.
  * **Conflicts or contradictions:** X09: Repair logging expects audit_repair_log but that table was absent in the inspected connected catalog. Logging catches failures, so repairs can continue without a stored repair receipt. This is not a finding about the separately deployed production database. Related items: L459, L425.
  * **Source evidence:** Read-only public table catalog, 2026-11-27; src/lib/repair-log.server.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L426 — Polygon market-data provider**
  * **Current behavior:** Supply grouped adjusted US daily OHLCV.
  * **How it works:** https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/{date}?adjusted=true; MARKET_DATA_API_KEY; numeric OHLCV and /^[A-Z]{1,5}$/ ticker filter.
  * **Inputs and dependencies:** External Polygon daily aggregates
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Storage tables are not providers. No requests were executed.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/market-data.server.ts:74-99
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L427 — Alpaca market-data provider**
  * **Current behavior:** Supply batched daily OHLCV and asset universe.
  * **How it works:** https://data.alpaca.markets/v2/stocks/bars; 200 symbols/batch, timeframe1Day,adjustment=all,feed=iex,limit10000, next_page_token pagination; assets from https://api.alpaca.markets/v2/assets.
  * **Inputs and dependencies:** External Alpaca IEX and assets
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** IEX is partial-market volume; 2.5% adjustment is a fixed heuristic, not measured per symbol.
  * **Current implementation status:** Implemented in inspected source; production execution not verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/market-data.server.ts:181-191; src/lib/market-data.server.ts:220-259
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L428 — Provider fallback/provenance risk**
  * **Current behavior:** Configured Polygon may silently use Alpaca credentials.
  * **How it works:** loadSettings changes in-memory provider to alpaca when MARKET_DATA_API_KEY absent and live Alpaca pair present.
  * **Inputs and dependencies:** Provider setting and credential presence
  * **Execution schedule:** On invocation; no independent timer in the inspected calculation.
  * **Relevant formulas or rules:** Review mixed-feed cached history: row schema contains OHLCV/date/ticker but no provider/feed field (market-data.server.ts:16-24). No credential values inspected.
  * **Current implementation status:** Source-level risk or mismatch; not reproduced through operational writes or broker calls.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/scan.server.ts:68-82
  * **Decision:** [ ]
  * **My instructions:**

## 11. Automation, Background Jobs & Dependencies

* [ ] **L429 — Health stale-paper pre-pass**
  * **Current behavior:** Health tries stale-paper safety closure before main health checks.
  * **How it works:** Catch safety failure and continue to the main check.
  * **Inputs and dependencies:** Paper trades and verified research marks.
  * **Execution schedule:** Every authorized health hook.
  * **Relevant formulas or rules:** Not a live order helper; paper safety path has its own entry/mark rules.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/routes/api/public/hooks/health.ts:17–30
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L430 — Bounded historical replay continuation**
  * **Current behavior:** Legacy replay processes small session batches using date-based continuation.
  * **How it works:** Eight-session steps with65-session lookback.
  * **Inputs and dependencies:** research_runs checkpoint, daily bars and replay version.
  * **Execution schedule:** Manual replay/history step and daily bounded rebuild.
  * **Relevant formulas or rules:** loadState defaults absent checkpoint to version1 then rejects nonversion2.
  * **Current implementation status:** Potential fresh-state initialization defect from source; not reproduced by running writes.
  * **Conflicts or contradictions:** X11: The legacy replay absent-state default is version 1 while the continuation reader expects version 2. This is a potential fresh-start defect identified in source, not a write-tested failure. Related items: L430.
  * **Source evidence:** src/lib/replay.server.ts:27–43,80–100
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L431 — Historical deepening completion**
  * **Current behavior:** Empty successful provider responses mark a ticker exhausted; timeouts/key errors remain retryable.
  * **How it works:** Store history_deepen_done in research_runs.
  * **Inputs and dependencies:** Provider response and cached symbol history.
  * **Execution schedule:** Daily work or explicit deepening request.
  * **Relevant formulas or rules:** Batches of1000 upserts use ignoreDuplicates=true, so this path does not replace existing historical prices.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/historical-data.server.ts:20–49
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L432 — Manual production research replay**
  * **Current behavior:** Research replay is manually dispatched, not a nightly GitHub schedule.
  * **How it works:** Confirmation, locked universe, schema check, optional backfill/rebuild, graph refresh, certification and artifacts.
  * **Inputs and dependencies:** Production environment secrets, locked manifest and scripts.
  * **Execution schedule:** workflow_dispatch only; six-hour timeout; workflow-local concurrency.
  * **Relevant formulas or rules:** Typed confirmation exactly REPLAY PRODUCTION RESEARCH; skip flags independent.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:**  .github/workflows/research-production-replay.yml:7–55,85–140
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L433 — Production replay date window**
  * **Current behavior:** Default blank end is yesterday UTC and is treated as exclusive.
  * **How it works:** Resolve and validate from/to before downloads.
  * **Inputs and dependencies:** Workflow dates and UTC date.
  * **Execution schedule:** Each manually started replay.
  * **Relevant formulas or rules:** Exclusive yesterday means yesterday itself is excluded from backfill window; not a claim all graph dates exclude it.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:**  .github/workflows/research-production-replay.yml:94–102
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L434 — Engineer task dispatch**
  * **Current behavior:** New tasks attempt a GitHub repository dispatch; failed dispatch leaves queued work.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Task creation or manual runner dispatch.
  * **Relevant formulas or rules:** No periodic workflow queue-drain schedule is defined.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/tasks.server.ts:241–252; .github/workflows/astr-engineer.yml:15–18
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L435 — Engineer runner concurrency**
  * **Current behavior:** GitHub serializes engineer runs with cancel-in-progress=false.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Repository/manual dispatch.
  * **Relevant formulas or rules:** One concurrency group; patch job timeout25minutes; independent verifier20minutes.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** .github/workflows/astr-engineer.yml:26–34,86–91
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L436 — Engineer atomic task lease**
  * **Current behavior:** Runner leases one queued task through an RPC and sends heartbeats.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Each workflow runner start.
  * **Relevant formulas or rules:** claim_next_engineer_task; heartbeat every60seconds; empty queue exits.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** scripts/engineer-runner.ts:141–156
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L437 — Engineer patch repair attempts**
  * **Current behavior:** Unusable model output or failed verification spends bounded diagnosis/repair attempts.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Patch runner.
  * **Relevant formulas or rules:** At most three attempts; anchored replacements require strict matches.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** scripts/engineer-runner.ts:43,389–390,471–480
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L438 — Independent exact-commit verification**
  * **Current behavior:** A second job asserts and verifies the produced commit before review.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** After runner produced branch/SHA.
  * **Relevant formulas or rules:** Typecheck, baseline-aware lint, build; this workflow does not run the repository test suite.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** .github/workflows/astr-engineer.yml:93–166
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L439 — Engineer bridge access**
  * **Current behavior:** Runner can use a shared-secret allowlisted bridge instead of direct database credentials.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Runner database requests.
  * **Relevant formulas or rules:** Secret>=32characters; max read1000rows; allowlist excludes trading/approval reach.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** X15: The Engineer bridge restricts tables/actions, but optional direct privileged database credentials bypass that bridge scope. File-edit firewall protection is not a universal database permission boundary. Related items: L439, L440.
  * **Source evidence:** src/routes/api/public/engineer-bridge.ts:15–48; src/lib/engineer/bridge-rules.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L440 — Engineer direct-database alternative**
  * **Current behavior:** Supplying direct privileged database credentials bypasses bridge scope protection.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Runner configuration only.
  * **Relevant formulas or rules:** Direct credential access is broader than the bridge; credential value never documented.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** X15: The Engineer bridge restricts tables/actions, but optional direct privileged database credentials bypass that bridge scope. File-edit firewall protection is not a universal database permission boundary. Related items: L439, L440.
  * **Source evidence:** .github/workflows/astr-engineer.yml:44–55,77–83; scripts/engineer-db.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L441 — Engineer health recovery trigger**
  * **Current behavior:** Engineer overview reads can sweep stalled leases; ordinary health hook does not do it.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Gated engineerOverview GET; health cache60seconds.
  * **Relevant formulas or rules:** sweep_stalled_engineer_tasks; read-triggered health, not periodic independent queue runner.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/health.server.ts:65–93; engineer.functions.ts:17–38
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L442 — Engineer exact-commit approval**
  * **Current behavior:** Approval validates review-ready state, scope, firewall and independent verified SHA before merge.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Explicit owner approval.
  * **Relevant formulas or rules:** Branch tip must equal verified_sha; migration approval separate; missing checks blocks merge.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/approval.server.ts:47–148
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L443 — Engineer checkpoints**
  * **Current behavior:** Checkpoint records branch SHA and attempts a repository tag.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Explicit checkpoint or successful approval.
  * **Relevant formulas or rules:** Tag failure may yield recorded checkpoint plus warning; no database backup implied.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/checkpoints.server.ts:104–151
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L444 — Engineer forward recovery**
  * **Current behavior:** Recovery writes selected checkpoint file contents as a new commit.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Explicit confirmed owner action.
  * **Relevant formulas or rules:** No historical reset; refuses protected SQL/trading/engineer paths and does not restore database.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/checkpoints.server.ts:162–179; src/lib/engineer/firewall.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L445 — Engineer deployment reporting**
  * **Current behavior:** Deployment is a configured workflow dispatch, not implied by successful merge.
  * **How it works:** Follow the stated task/verification chain and persist logs/status.
  * **Inputs and dependencies:** engineer settings/tasks/logs/checkpoints, GitHub and configured AI provider.
  * **Execution schedule:** Approval/deployment-status refresh.
  * **Relevant formulas or rules:** Off unless workflow configured; report deployed only after run for exact SHA observed successful.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/engineer/approval.server.ts; src/lib/engineer/github.server.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L446 — Ordered research pipeline**
  * **Current behavior:** Ledger, selections, selection history and Lab graph run in sequence.
  * **How it works:** executeResearchPipeline stops after failed stage; snapshot stages compare saved generation timestamps with readback.
  * **Inputs and dependencies:** Research watermark, ledger, immutable selections/evaluations, history and Lab builders.
  * **Execution schedule:** Daily cycle, lab refresh and manual graph refresh callers.
  * **Relevant formulas or rules:** Order: researcher_ledger → selection_replay → selection_history → lab_graph.
  * **Current implementation status:** Implemented; audit did not execute any stage.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-pipeline.server.ts:14–35
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L447 — Research pipeline no-change receipt**
  * **Current behavior:** Unforced calls skip all stages when the saved verified watermark matches current inputs.
  * **How it works:** Read latest research_pipeline_verified config and compare hash.
  * **Inputs and dependencies:** Latest saved evidence, recent bar coverage, settings, researchers, master rules and paper slots.
  * **Execution schedule:** Each graph pipeline call.
  * **Relevant formulas or rules:** force bypasses skip; fullReplay is separately passed only to selection replay by this wrapper.
  * **Current implementation status:** Implemented; source hash does not detect every older price correction.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-pipeline.server.ts:5–12,18–20; src/lib/research-watermark.server.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L448 — Research pipeline receipts**
  * **Current behavior:** Each attempted pipeline stores verified or failed status plus stage durations and failures.
  * **How it works:** Persist result and duration with watermark after stage execution.
  * **Inputs and dependencies:** research_runs and executeResearchPipeline result.
  * **Execution schedule:** Every non-skipped pipeline run.
  * **Relevant formulas or rules:** kind=research_pipeline_verified or research_pipeline_failed; receipt write failure throws.
  * **Current implementation status:** Implemented; stage failure is not a successful nightly generation.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-pipeline.server.ts:37–46
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L449 — Research watermark coverage window**
  * **Current behavior:** Input-change detection hashes latest source timestamps, whole small configuration tables and 120-day date coverage.
  * **How it works:** Latest-row queries and bounded coverage RPC are combined into SHA-256.
  * **Inputs and dependencies:** daily_bars; ledger/picks/evaluations; graph/history runs; four configuration tables; bar_dates_present_since.
  * **Execution schedule:** Before and after successful pipeline.
  * **Relevant formulas or rules:** SHA-256(JSON.stringify(entries)); coverage window starts UTC today−120 days.
  * **Current implementation status:** Implemented; forced refresh needed after historical corrections not visible to the hash.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/research-watermark.server.ts:1–30
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L450 — Cached ticker enumeration**
  * **Current behavior:** History input discovers all distinct cached symbols using alphabetical primary-key walks.
  * **How it works:** Run six alphabet segments at once; each query fetches the next distinct ticker by primary key.
  * **Inputs and dependencies:** daily_bars ticker index.
  * **Execution schedule:** loadSelectionInput.
  * **Relevant formulas or rules:** No fixed aggregate 1,000-row cap; alphabet bounds span stored ticker strings.
  * **Current implementation status:** Implemented; cached symbols are not proof of point-in-time exchange membership.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/selection-input.server.ts:3–29
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L451 — Per-ticker historical paging**
  * **Current behavior:** Historical input is paginated per ticker, not one full-cache aggregate RPC.
  * **How it works:** Six tickers concurrently; pages of 1,000 bars descending, reverse to chronological order.
  * **Inputs and dependencies:** daily_bars and optional since date.
  * **Execution schedule:** Ledger or selection input loading.
  * **Relevant formulas or rules:** Exclude ticker input with <55 stored bars; since optionally bounds nightly reads.
  * **Current implementation status:** Implemented; avoids aggregate RPC timeout but still incurs per-ticker requests.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/selection-input.server.ts:32–54
  * **Decision:** [ ]
  * **My instructions:**

## 12. Errors, Recovery & System Safeguards

* [ ] **L452 — Health repair cooldowns**
  * **Current behavior:** Repair decisions inspect only recent saved checks.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Eight recent checks; compare repair text for cooldown; latest four issue arrays for repeated-issue suppression.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:31–57
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L453 — Thin-history health repair**
  * **Current behavior:** Health may backfill a too-thin cache.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** <55 dates or widest session<50 tickers; one-hour rebuild cooldown; ordinary cycle uses a different <100 newest-session threshold.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:69–82; src/lib/scan.server.ts:1358–1362
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L454 — Missing-day safe repair**
  * **Current behavior:** Health may fetch missing research bar dates.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Up to three missing-day downloads per repair pass; ingestion remains upsert-based.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:59–217
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L455 — Missed-scan safe repair**
  * **Current behavior:** Health may rerun a missing scan.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Trading-day check, not a strict currently-open check.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:165–175
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L456 — Empty-score safe repair**
  * **Current behavior:** Health can rescore an empty scan.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Thirty-minute cooldown; no automatic formula/weight modification.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:59–217
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L457 — Live fill versus ledger health comparison**
  * **Current behavior:** Health detects unmatched live filled orders without fixing broker state.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Only paper_mode=false; broker order IDs matched in concatenated ledger notes.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/health.server.ts:265–295
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L458 — Health check persistence and alerts**
  * **Current behavior:** Existing health persistence/notifications are preserved. New bounded monitoring reports read-only failures; runner prints safe status summaries and never response account evidence.
  * **How it works:** Read saved evidence, apply stated condition, record/report the result.
  * **Inputs and dependencies:** health_checks, cache, settings and relevant trade/ledger evidence.
  * **Execution schedule:** Health invocation; cooldowns as stated.
  * **Relevant formulas or rules:** Notification key uses first issue’s first60 characters and New York date.
  * **Current implementation status:** November 28 — Bounded monitor healthy and unauthorized HTTP request rejected (401). Full persistence, alerts and production scheduled delivery still require actual activated-run verification.
  * **Conflicts or contradictions:** Original finding retained in register; November 28 resolution: Bounded monitor healthy and unauthorized HTTP request rejected (401). Full persistence, alerts and production scheduled delivery still require actual activated-run verification.
  * **Source evidence:** src/lib/health.server.ts:300–322
  * **Decision:** [C]
  * **My instructions:** Apply authoritative X01–X08 answer key; preserve independent formulas, history and live safeguards. Bounded monitor healthy and unauthorized HTTP request rejected (401). Full persistence, alerts and production scheduled delivery still require actual activated-run verification.

* [ ] **L459 — Safe-repair logging**
  * **Current behavior:** Allowlisted repairs attempt to save post-repair verification status without interrupting the caller.
  * **How it works:** logRepair catches storage failures.
  * **Inputs and dependencies:** audit_repair_log and repair evidence.
  * **Execution schedule:** After allowlisted repair attempt.
  * **Relevant formulas or rules:** No formula/strategy change is an automatic repair.
  * **Current implementation status:** Implemented graceful degradation; audit_repair_log absent from connected table catalog; production presence unverified.
  * **Conflicts or contradictions:** X09: Repair logging expects audit_repair_log but that table was absent in the inspected connected catalog. Logging catches failures, so repairs can continue without a stored repair receipt. This is not a finding about the separately deployed production database. Related items: L459, L425.
  * **Source evidence:** src/lib/repair-log.server.ts; migration/fresh/16-autonomous-audit.sql
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L460 — Integrity sample depth**
  * **Current behavior:** Daily/manual audits are lighter than weekly audits.
  * **How it works:** runIntegrityCheck wraps lead quantitative self-audit and stores outcome.
  * **Inputs and dependencies:** Trade, price and researcher integrity evidence.
  * **Execution schedule:** Manual/daily/weekly trigger.
  * **Relevant formulas or rules:** Daily/manual:60-day lookback,15 samples; weekly:180 days,60 samples.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/integrity.server.ts:27–33
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L461 — Integrity result storage**
  * **Current behavior:** Failed audit storage does not fabricate a successful saved audit.
  * **How it works:** Catch/log write failure and return stored:false.
  * **Inputs and dependencies:** audit_integrity_results and audit output.
  * **Execution schedule:** Each integrity invocation.
  * **Relevant formulas or rules:** Warnings do not push; nonmanual FAIL can notify.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/integrity.server.ts:40–79
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L462 — Integrity alert deduplication**
  * **Current behavior:** Duplicate notifications are limited, not duplicate audit executions.
  * **How it works:** Use cadence and UTC date as notification key.
  * **Inputs and dependencies:** notifications, audit cadence and timestamp.
  * **Execution schedule:** On eligible failed integrity result.
  * **Relevant formulas or rules:** No run-level serialization established; Lab and standalone schedules may overlap.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/integrity.server.ts:66–72; src/routes/api/public/hooks/lab-refresh.ts:24–26
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L463 — Shared owner passcode gate**
  * **Current behavior:** Protected manual functions require an unlocked shared-passcode session.
  * **How it works:** No password => allow; password with missing/short session secret => fail closed.
  * **Inputs and dependencies:** SITE_PASSWORD, SESSION_SECRET and signed cookie.
  * **Execution schedule:** Each function that explicitly attaches requireGate.
  * **Relevant formulas or rules:** Secret>=32 characters; session90 days; secure HTTP-only SameSite Lax.
  * **Current implementation status:** Implemented; production password/session configuration not inspected.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/gate.server.ts:8–72; src/lib/gate-middleware.ts:7–11
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L464 — Hook-token authorization**
  * **Current behavior:** Scheduled POST hooks authenticate independently of owner passcode.
  * **How it works:** Read hook_tokens singleton1; compare SHA-256 digests with timingSafeEqual.
  * **Inputs and dependencies:** x-hook-secret header and server-stored token.
  * **Execution schedule:** Each authorized maintenance/trading POST.
  * **Relevant formulas or rules:** Missing token/lookup error/incorrect header => unauthorized.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** X10: History-deepening and discovery GET handlers perform writes without the explicit local token/passcode checks used by protected POST hooks. Discovery restart can delete its checkpoint rows. Upstream access protection is unverified; neither route was invoked. Related items: L466, L467, L464.
  * **Source evidence:** src/lib/hooks.server.ts:12–39
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L465 — Server-function request protection**
  * **Current behavior:** Startup attaches bearer authentication and server-function CSRF protection.
  * **How it works:** Middleware applies to its declared request paths; not every public GET maintenance route.
  * **Inputs and dependencies:** src/start.ts middleware and generated auth attachment.
  * **Execution schedule:** Server-function request handling.
  * **Relevant formulas or rules:** Explicit handler checks remain necessary for public routes.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/start.ts:21–30
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L466 — Public history-deepening GET**
  * **Current behavior:** The source exposes a GET route that performs history writes without the explicit token/gate checks used by POST hooks.
  * **How it works:** Downloads eight tickers per pass and can repeatedly refresh its HTML response.
  * **Inputs and dependencies:** Provider, database history and URL request.
  * **Execution schedule:** GET; two-second productive refresh; five-second retry page.
  * **Relevant formulas or rules:** No explicit route-level owner/hook check found; upstream access protection unverified.
  * **Current implementation status:** Potential authorization gap, not an exploit tested; route not invoked.
  * **Conflicts or contradictions:** X10: History-deepening and discovery GET handlers perform writes without the explicit local token/passcode checks used by protected POST hooks. Discovery restart can delete its checkpoint rows. Upstream access protection is unverified; neither route was invoked. Related items: L466, L467, L464.
  * **Source evidence:** src/routes/api/public/hooks/deepen-history.ts:11–28
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L467 — Public discovery GET and restart**
  * **Current behavior:** Source GET performs discovery and accepts restart=1 without an explicit route token/gate check.
  * **How it works:** runDiscoveryStep; restart deletes only its checkpoint-kind research_runs.
  * **Inputs and dependencies:** Request query, provider/cache and discovery checkpoints.
  * **Execution schedule:** GET; two-second page refresh while unfinished.
  * **Relevant formulas or rules:** A read-looking page can trigger writes; no audit request was made.
  * **Current implementation status:** Potential authorization/destructive-checkpoint gap; upstream protection unverified.
  * **Conflicts or contradictions:** X10: History-deepening and discovery GET handlers perform writes without the explicit local token/passcode checks used by protected POST hooks. Discovery restart can delete its checkpoint rows. Upstream access protection is unverified; neither route was invoked. Related items: L466, L467, L464.
  * **Source evidence:** src/routes/api/public/hooks/discover.ts:7–18; src/lib/discovery.server.ts:53
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L468 — Error logging capture**
  * **Current behavior:** Error capture supports readable server failures but is not a durable repair queue.
  * **How it works:** Wrap console.error and retain one process-global error briefly.
  * **Inputs and dependencies:** Exception causes and server request handling.
  * **Execution schedule:** When an error occurs.
  * **Relevant formulas or rules:** Five-second capture window; cause-depth5; description limit8000; concurrent errors may overwrite capture.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** src/lib/error-capture.ts:4–16,52–80; src/server.ts:49–64
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L469 — Archived ledger rebuild**
  * **Current behavior:** Full rebuild is destructive to the active ledger after archiving, unlike ordinary incremental research.
  * **How it works:** Save archive, then delete ledger rows dated1900-01-01 onward and rebuild.
  * **Inputs and dependencies:** researcher_daily_ledger, research_runs archive and explicit confirmation.
  * **Execution schedule:** Manual confirmed rebuild script/workflow only.
  * **Relevant formulas or rules:** Never run merely to inspect this checklist; preserve archive and records until separate approval.
  * **Current implementation status:** Implemented in source; production configuration and successful execution not independently verified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** scripts/rebuild-researcher-ledger.ts:22; .github/workflows/research-production-replay.yml:129–137
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L470 — Connected database row-access boundaries**
  * **Current behavior:** All 48 public tables have row security enabled; policy catalog shows one public daily_bars SELECT policy.
  * **How it works:** Read pg_tables and pg_policies; privileged server reads bypass normal row policies.
  * **Inputs and dependencies:** Backend role grants, row policies and server gate.
  * **Execution schedule:** Every database request subject to caller role.
  * **Relevant formulas or rules:** RLS enabled is not proof every privileged handler verifies its caller; grant effective access was not end-to-end tested.
  * **Current implementation status:** Catalog verified; full role/session authorization matrix unverified.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** Read-only pg_tables / pg_policies catalog, 2026-11-27; src/integrations/supabase/client.server.ts
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L471 — Immutable research-selection storage**
  * **Current behavior:** The connected database has enabled original-pick and final-outcome immutability triggers.
  * **How it works:** pg_trigger confirms research_selection_frozen and research_evaluation_final.
  * **Inputs and dependencies:** research_daily_selections, research_selection_evaluations and trigger functions.
  * **Execution schedule:** On attempted table mutation.
  * **Relevant formulas or rules:** Original decisions cannot be rewritten; pending outcomes mature once, finalized rows lock.
  * **Current implementation status:** Trigger existence verified; no intentional mutation attempted during this audit.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** Read-only pg_trigger catalog, 2026-11-27; migration/fresh/22-research-selection-layers.sql
  * **Decision:** [ ]
  * **My instructions:**

* [ ] **L472 — Immutable BYOB research evidence**
  * **Current behavior:** The connected database has enabled immutable model, activation, research-event and research-run triggers.
  * **How it works:** Reject mutation through byob_reject_mutation.
  * **Inputs and dependencies:** byob_models, byob_activation_events, byob_research_events and byob_research_runs.
  * **Execution schedule:** On attempted mutation.
  * **Relevant formulas or rules:** Activation registry remains distinct from append-only evidence history.
  * **Current implementation status:** Trigger presence verified; failure behavior not exercised by writes.
  * **Conflicts or contradictions:** No direct contradiction established for this item; distinct model behavior and deployment uncertainty are retained in its status. Dependency removal is not approved.
  * **Source evidence:** Read-only pg_trigger catalog, 2026-11-27; migration/fresh/21-byob-corrected-research.sql
  * **Decision:** [ ]
  * **My instructions:**

## Audit closeout: missing, partial, redundant and unverified areas

- **Missing/partial:** no verified 180-session outcome producer; no universal shutdown coordinator, whole-system durable lease, general retention policy or comprehensive schema certification. Connected repair-log storage is absent; standalone integrity schedules were not in the connected schedule listing.
- **Potentially overlapping, not approved for removal:** daily versus optional regular-cycle research, browser versus scheduled Lab refreshes, standalone versus Lab-triggered integrity, multiple model-specific indicator implementations and parallel schema tracks. Each has different consumers; do not delete merely because names overlap.
- **Potential defects:** source replay checkpoint version mismatch, success reporting without checking the close result, schedule-template/handler disagreement, GET-triggered maintenance authorization gaps, non-atomic broker/local bookkeeping, plus the ML evidence/provenance limitations documented in its entries. These are not newly reproduced production incidents.
- **Inactive is configuration-specific:** the inspected connected settings disable ordinary automation, autonomous live entries, strategy entries and ML, while research_auto is enabled. This does not establish production switch values or stop exit-management logic.
- **Learning limitations:** proposals, adopted rules, experiments, learned beliefs and model retraining have different authorities; no finding here authorizes production weight mutation or research-to-live promotion. See category 7 for the exact mechanisms and gates.
- **Historical limits:** arithmetic agreement does not verify survivorship-free membership, genuine original-time execution, every corporate action, or historical provider completeness. Missing exact-session marks remain pending rather than fabricated profits.
- **Unverified operational evidence:** production job URLs/delivery, role/session permission matrix, provider rate-limit plans and current credentials, broker order outcomes, runner/deployment success for the current configuration and recovery under concurrent failure. These cannot honestly be labeled operational solely from source.

**Next step:** Mark the Decision fields and add instructions; we will discuss each selection, conflicts and what depends on it before any approved implementation. No rebuild is started by this checklist.
