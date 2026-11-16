# Phase 2g — Final corrected BYOB plan

## Status and scope
Planning only. This revision does not authorize implementation, migrations, price ingestion, training or record changes.

The previous approval already resulted in an initial BYOB implementation and saved seed results. Those records do **not** establish compliance with these new requirements. Preserve them unchanged as legacy evidence; do not reinterpret or promote their qualification. Implement this corrected methodology only after separate approval, using fresh untouched test periods where required.

Keep the original 15 stocks: NVDA, AMD, MU, DELL, LRCX, SHOP, AVGO, ASML, ANET, KLAC, STX, LITE, FTNT, MRVL, AMAT. SPY is reference data, not a sixteenth research candidate. Retain Momentum Breakout, Trend Pullback and Mean Reversion.

## 1. Confirmed gaps in the current implementation
- Qualification presently accepts positive holdout expectancy instead of requiring at least +0.50%; it has no 25% drawdown gate or explicit profit-factor gate.
- Current indicators are limited to moving averages, volume and price distances.
- Current drawdown measures completed-trade equity only; it can miss losses while a position is held.
- Model reads select the latest version, not the intended active model. Multiple rows default to `is_active = true`; there is no single-active constraint.
- Calendar and OHLC checks exist, but corporate-action provenance, cross-provider consistency and point-in-time adjustment evidence are not established.
- A 250-bar discovery minimum is not a qualification guarantee, especially for long horizons.

## 2. Separate responsibilities
**Discovery:** Prepare verified stored history; enumerate bounded feature combinations on training data; select model/horizon on validation; freeze the choice; evaluate untouched holdout once; save all evidence and decisions.

**Evaluation:** Load only the intended active model and recent completed-session inputs; evaluate its already frozen conditions. Never train when opening Analyze.

**Presentation:** Show qualification, model quality, signal strength, confidence, periods, costs, sample distribution, regime evidence, simulated outcomes and model history separately. Failed/latest research must not silently replace an active model.

## 3. Historical eligibility and exact partition rules
Let W be the candidate's declared warmup requirement, including every selected feature and its SPY prerequisites. Reserve W valid preceding sessions as warmup; let N be the remaining usable research sessions.

- Fewer than 250 verified total ticker bars: insufficient history for initial discovery.
- At least 250 verified total bars: preliminary discovery is allowed only for candidates with adequate warmup. No qualification is implied.
- Partition usable sessions chronologically: training [0, floor(0.60N)); validation [floor(0.60N), floor(0.80N)); holdout [floor(0.80N), N). No shuffling.
- Earlier stored bars may warm up later-partition indicators. Future bars may never affect earlier signals, parameter discovery or selection.
- Signal at session s close; enter at s+1 open; exit at s+1+H close, where H is one of 1, 2, 3, 5, 7, 10, 13, 20, 30, 60, 90 trading sessions. This convention explicitly treats H as sessions elapsed after entry, not an inclusive count of the entry session.
- Signal, entry and exit must all belong to the same partition. Purge signals whose exit crosses a boundary; record purged counts. Reset the isolated simulation between partitions.
- One position per model/ticker. Do not accept signals through the exit session; next signal is no earlier than the following session. Proceeds settle T+1. Use at most $20 settled simulated cash per entry, less if the isolated book has lost money; no auto-top-ups or live buying power.

With this conservative non-overlap rule, a partition of L usable sessions can fit at most floor(L/(H+2)) trades before signal scarcity. Full qualification therefore requires training length >=10(H+2), validation length >=5(H+2), and holdout length >=5(H+2), plus actual observed trade counts. These are necessary capacity checks, not evidence of signals.

Examples: H=60 requires validation and holdout each >=310 sessions, approximately 1,550 usable total sessions plus warmup. H=90 requires each >=460 sessions, approximately 2,300 usable sessions plus warmup. Calculate exact floor-boundary capacity rather than relying on those approximations. A 971-session history cannot qualify a 60/90-day model under these rules.

Warmup: SMA/volume MA/support-resistance/Bollinger windows use their declared lookback; ATR14 uses at least 15 preceding bars; MACD/EMA use a deterministic first-period SMA initialization and at least five times the longest EMA period as stabilization warmup. MACD(12,26,9) therefore reserves at least 130 sessions. Existing SPY regime inputs require SMA200/RV20 history. Missing prerequisites leave affected signals unevaluable, not neutral.

## 4. Qualification and evidence states
A model is **Qualified** only when every rule passes:
1. At least 10 training, 5 validation and 5 untouched holdout completed trades (20 total follows automatically).
2. Mean holdout net return per completed trade >=+0.50%.
3. Holdout profit factor is positive. PF = sum positive net returns / absolute sum negative net returns. If there are wins and no losses, store an explicit unbounded/no-loss flag, not JSON Infinity or an ambiguous null. No wins and no losses means undefined, not positive.
4. The untouched holdout alone must contain actual completed trades in at least two distinct known market regimes, each with positive mean net expectancy. Validation regime results are used for model selection and reported separately; they cannot independently establish multi-regime survival and must never be pooled with holdout results to satisfy this gate. Unknown regimes never count. Continue reporting every tested regime in each partition, including negative results; one negative regime is not an additional automatic global rejection rule. No new per-regime minimum trade count is introduced; display actual counts and sparse-sample limitations.
5. Maximum observed marked-equity drawdown <=25% in every partition and the separately evaluated combined out-of-sample book. Exactly 25% passes; any larger value fails. Use authenticated session OHLC: close-marked drawdown plus conservative within-session low-marked drawdown; no invented intraday price path. Missing necessary marks blocks this gate.
6. All partition, provenance, integrity and frozen-holdout safeguards pass.

**Insufficient data:** Invalid/missing history, warmup or integrity evidence.
**Provisional — insufficient evidence:** Missing trade counts, inadequate untouched-holdout coverage of at least two distinct known regimes with positive mean net expectancy, or unavailable uncertainty/mark evidence. Validation coverage cannot resolve insufficient holdout coverage. Never label this demonstrated failure.
**Below qualification threshold:** Adequate evidence but positive holdout expectancy below +0.50%, or another measured qualification gate fails. Distinguish this from negative performance.
**Disqualified — demonstrated failure:** Adequate evidence with negative/zero expectancy or excessive measured drawdown. Record all applicable reasons independently; insufficient samples remain visibly insufficient even if their point estimate is negative.

Do not add a PF>=1 or statistical-significance requirement as a hidden qualification rule. Report PF<=1 and sparse positive regime cells prominently. Qualification is not proof of statistical independence or reliability.

## 5. Indicator discovery and anti-overfitting
Optional toolkit: MACD, ATR, Bollinger Bands, EMA, relative strength against SPY, volume moving averages and support/resistance. No stock is forced to use all indicators.

Version feature definitions and bounded parameter grids before starting a run. Training discovers family/indicator/parameter combinations; validation selects from a training-created shortlist and the approved horizons. Log all tried candidates and selection objectives. Prefer simpler candidates on exact metric ties using a recorded deterministic ordering.

Freeze formula, indicators, parameters, horizon, entry/exit rules and score mapping before holdout inspection. Evaluate holdout once; failure never triggers a runner-up search on that holdout. Previously inspected test sessions cannot become an untouched test for a revised model. Require a genuinely new future test period or show the revision as provisional without independent holdout evidence. Preserve exposure history even across failed/restarted runs.

Report trade counts, dates, holding durations, calendar-year/quarter distribution, concentration, regime counts, skipped/purged signals and number of experiments. Non-overlapping is not synonymous with independent. Report descriptive uncertainty; use chronological block-resampling within sufficiently populated held-out periods, otherwise show “insufficient evidence for a dependable interval.” Do not treat bootstrap output as a new qualification rule or ignore multiple testing.

## 6. Exact scoring mathematics
Let C(x)=min(1,max(0,x)). All displayed scores range 0–100; round only for display. Keep the unrounded value for the >=65 paper recommendation gate.

### Current signal S
The frozen model first applies all its selected Boolean entry filters. Any failure gives S=0; missing feature inputs give S=unavailable, not zero.

- **Momentum Breakout:** B = highest high of preceding L sessions, A = prior-session ATR14, v = current volume / preceding volume-MA, theta = learned required volume ratio. If close>B and v>=theta, S=50+25 C((close-B)/(2A))+25 C((v/theta-1)/0.5); otherwise zero. A<=0 blocks evaluation.
- **Trend Pullback:** F = learned fast EMA, T = learned slow EMA, d=(F-close)/F, delta=learned maximum pullback fraction. If F>T, 0<=d<=delta, and selected filters pass, S=50+50(1-d/delta); otherwise zero. delta>0 is mandatory.
- **Mean Reversion:** m = learned trailing mean, sigma = corresponding price standard deviation, z=(m-close)/sigma, z0=learned minimum deviation. If z>=z0 and selected filters pass, S=50+50 C((z-z0)/2); otherwise zero. sigma<=0 blocks evaluation.

Optional indicators act as discovered, frozen filters initially; adding an indicator does not silently change these score definitions.

### Model quality Q
If fewer than five holdout trades or invalid cost/price evidence, Q=unavailable. Otherwise let E be mean holdout net return in percent and P be profit factor:
- E<=0: Q=0.
- 0<E<0.50: Q=25.
- 0.50<=E<1.50: Q=50.
- 1.50<=E<3.00: Q=75.
- E>=3.00: Q=100 when P>=2 or explicitly unbounded from positive wins/no losses; otherwise Q=75.
- Undefined/nonpositive P gives Q=0 and a visible failed/undefined evidence flag.

This defines the interaction without inventing PF>=2 as a qualification requirement.

### Regime compatibility R and total score
Use the saved out-of-sample regime means. R=0 if the current known regime mean <=0; R=100 if it is the positive highest-mean known regime (ties resolved deterministically); R=50 for other positive known regimes or untested/unknown regimes, with untested status displayed.

BYOB score =0.50S+0.30Q+0.20R. If S or Q is unavailable, the aggregate is unavailable; still show independently calculable components. Never fill missing evidence with favorable points.

A paper recommendation requires Qualified status, S>0, aggregate >=65, valid current input coverage and sufficient isolated settled simulation cash. It never creates a live order. Confidence is separate: holdout n<5 insufficient, 5–29 preliminary, >=30 moderate; show concentration and uncertainty limitations alongside the label.

## 7. Historical integrity and costs
Before research: verify sorted unique dates, expected sessions including historical holidays/exceptional closures, requested start/end coverage, OHLC relationships, finite positive prices, nonnegative volume, ticker identity and corporate-action consistency. Compare price jumps with documented splits/dividends; unexplained jumps or conflicting duplicates require review, not silent replacement.

Record provider/feed, ingestion time, adjustment mode, action evidence and data fingerprint. Use one consistent adjustment basis across ticker and SPY inputs; never stitch incompatible volume or adjustment conventions. Existing “adjustment=all” alone does not prove point-in-time corporate-action availability. When true point-in-time data cannot be obtained at $0, label retrospective adjusted-price research and do not claim full point-in-time qualification. Missing required integrity evidence prevents full qualification.

Use entry price x1.0005 and exit price x0.9995 in all partitions. Net return =100(adjusted exit/adjusted entry -1), approximately 0.10% complete round trip. Historical sources never substitute for broker execution prices. Static seed selection remains subject to survivorship/selection bias; disclose it.

## 8. Proposed storage and architectural changes
Additive, separately approved migration only; never edit an already applied migration.

- Keep `byob_models` immutable. Add new methodology, feature-definition, data/provenance and qualification-version fields; preserve legacy fields/results.
- Add a BYOB-specific ticker registry with one active-model pointer per ticker. A composite reference must ensure the pointed model belongs to that ticker. Latest attempt and active model are different concepts. One ticker row means exactly one intended active model or none.
- Add append-only qualification/activation events and research-run records: frozen candidate hash, partition boundaries, test-exposure history, status, progress, retries and immutable result reference.
- Activation must be transactional and server-authorized after all gates; no automatic promotion of legacy qualified rows. Failed research leaves the intended active model unchanged, with stale/current validity displayed.
- Unique ticker/model version and run/data/methodology keys prevent duplicate completion; compare-and-swap activation prevents simultaneous runs racing. RLS and grants remain server-only; browser actions use the existing owner gate. Never expose service credentials.

Implement in BYOB-specific rules, indicators, discovery/evaluation and presentation modules plus tests; reuse existing market-data adapters, historical research calendar and actual Phase C classifier without altering them. The classifier currently uses fixed SMA200 distance/annualized-volatility bands, not the stale percentile-based description.

## 9. Implementation order after separate approval
1. Pure indicators, partitions, horizon-capacity checks, simulation, qualification and score tests.
2. Additive BYOB provenance/versioning/active-pointer storage; preserve and label legacy records.
3. Data integrity inspection and bounded resumable discovery with frozen candidate/test exposure tracking.
4. Fast evaluation and explicit model-quality/signal/confidence states.
5. Analyze presentation, immutable result inspection and isolated simulated recommendations.
6. Prepare verified seed history, evaluate only eligible horizons and leave unsupported horizons provisional.
7. End-to-end saved/read-back checks, independent-host setup instructions and roadmap updates.

## 10. Verification and protected boundaries
Test exact 10/5/5 counts; E below/at/above 0.50%; PF zero/undefined/no-loss/unbounded; drawdown 25% versus >25%; one/two known positive holdout regimes; insufficient versus negative evidence. Confirm two positive validation regimes plus only one positive known holdout regime remains Provisional; validation and holdout never pool for qualification; unknown holdout regimes never count; two positive known holdout regimes satisfy the regime gate only, not the other qualification gates; all negative regime results remain reported separately by partition. Test 60/90-day capacity, warmup, all split boundaries, settlement and non-overlap. Changing future/holdout bars must not change training features or the frozen candidate. Test every score boundary, missing feature/holdout inputs and the >=65 gate. Validate duplicate/conflicting bars, gaps, corporate actions, stale evaluation, immutable versions, cross-ticker pointer rejection and concurrent activation. Verify desktop/phone views and owner-authorized discovery through saved result read-back.

Do not change live broker/autonomous modules, credentials, buying power, trading schedules, LONG_TERM/SAME_DAY buckets, trades, shared ledgers, cash pools, existing specialist scores/rankings, standard research formulas or unrelated tables. BYOB graphs and outcomes read its saved records only. No live order is used for verification. All integrations remain $0 and independently hostable.

No additional ticker or archetype decision is needed. The remaining authorization is approval to implement this corrected revision; this plan itself makes no application or production-data changes.