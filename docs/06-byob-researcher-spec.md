BYOB Researcher & BOYB Tab

Complete Product Specification, Research Engine, Historical Validation, and ASTR Analyze Desk Integration

Project: ASTR (Automatic Stock Trading Robot)
Feature: BYOB — Build Your Own Brain
Primary integration: Analyze Desk (/analyze)
Purpose: Build an independent, stock-specific quantitative research specialist that discovers, tests, and manages its own trading strategies and holding periods using historical evidence.

⸻

1. THE CORE IDEA

BYOB is a researcher that builds its own brain around individual stocks.

It should not simply copy ASTR’s existing scoring formula, use one universal formula for every stock, or track a list of stocks recommended by someone else.

Instead, BYOB should investigate each assigned stock, identify potentially useful patterns, develop candidate strategies, test them against historical market data, determine which conditions have predictive value, and establish an evidence-supported holding period.

For example, NVDA and DELL might require entirely different strategies.

* NVDA might perform best under a momentum-based setup with a validated holding period of several trading days.
* DELL might perform best under a different combination of trend, relative strength, volume, and price behavior.
* AMD might have multiple profitable setups, each with a different holding period.
* A stock’s best strategy and holding period may change as market conditions change.

These are illustrative examples, not predetermined conclusions. BYOB must discover the results through testing.

The central objective is to learn what works for each stock, determine whether the results hold up outside the training data, and present the resulting research as an independent specialist in Analyze Desk.

BYOB is initially research-only and paper-simulation-only. It must never submit live brokerage orders.

2. INITIAL STOCK UNIVERSE

Begin with these 15 seed stocks:

1. NVDA — NVIDIA
2. AMD — Advanced Micro Devices
3. MU — Micron Technology
4. DELL — Dell Technologies
5. LRCX — Lam Research
6. SHOP — Shopify
7. AVGO — Broadcom
8. ASML — ASML Holding
9. ANET — Arista Networks
10. KLAC — KLA Corporation
11. STX — Seagate Technology
12. LITE — Lumentum
13. FTNT — Fortinet
14. MRVL — Marvell Technology
15. AMAT — Applied Materials

These are initial research candidates, not a claim that every stock is currently profitable or qualifies for a recommendation.

The stock universe must be expandable. Do not impose an arbitrary hard limit of 15, 25, or 30 stocks. The initial universe is 15; future additions should be possible without redesigning the system.

The user should eventually be able to add a stock through the existing Analyze stock workflow and assign it to BYOB.

Adding a stock should initiate the required historical-data preparation and research workflow. It should not automatically make that stock a qualified recommendation.

3. BYOB MUST BE A DISTINCT RESEARCH SPECIALIST

Integrate BYOB into the existing ASTR Analyze Desk specialist/researcher architecture.

The existing specialist selection mechanism, researcher records, qualification system, historical-data services, and related UI should be inspected and reused wherever appropriate.

Do not build a duplicate researcher system if the current architecture already supports these capabilities.

BYOB must appear as its own identifiable specialist, with its own:

* Research identity and strategy records.
* Stock assignments.
* Stock-specific formulas and candidate setups.
* Historical experiments and validation results.
* Selected holding periods.
* Qualification decisions.
* Recommendation records.
* Performance statistics.
* Research history and graph.
* Evidence and confidence information.

BYOB is a single research specialist that can investigate multiple stocks simultaneously. It is not necessary to create a completely separate researcher identity for every ticker.

However, each stock must have its own independently evaluated strategy and performance record.

A BYOB result for NVDA must not automatically become the result for AMD or DELL.

4. STOCK-SPECIFIC FORMULA ENGINE

BYOB must be capable of evaluating different technical factors, combinations, thresholds, and setups for different stocks.

Potential inputs include:

* Moving averages, including MA20, MA50, and MA200 where appropriate.
* RSI and changes in momentum.
* MACD and trend confirmation.
* Relative strength against an appropriate market benchmark.
* Price momentum over multiple lookback periods.
* Volume relative to normal trading activity.
* Support, resistance, breakouts, and pullbacks.
* Volatility and ATR.
* Price gaps and reversals.
* Trend persistence and changes in market regime.
* Market-wide conditions that may affect a stock.
* Other features supported by reliable, available data.

These are candidate inputs, not mandatory indicators that must all appear in every formula.

BYOB should test whether each feature contributes useful predictive information for a particular stock and holding period.

For example, it should be able to compare:

* A momentum-only strategy.
* A trend-confirmation strategy.
* A volume-confirmed breakout.
* A pullback strategy.
* A combination of several indicators.
* Different thresholds for the same indicator.
* Different entry conditions.
* Different exit conditions.

It should also be able to determine that a feature does not help and exclude it.

Do not simply optimize an enormous number of combinations until one appears profitable in historical data. That risks overfitting.

Maintain a reproducible record of the formula, feature definitions, parameter values, training window, validation window, and final test results for every evaluated strategy.

5. HOLDING-PERIOD DISCOVERY

BYOB must discover the best-supported holding period for each stock and setup instead of assigning a fixed duration in advance.

Evaluate candidate horizons covering:

1. 1 trading day
2. 2 trading days
3. 3 trading days
4. 5 trading days
5. 7 trading days
6. 10 trading days
7. 13 trading days
8. 20 trading days
9. 30 trading days
10. 60 trading days
11. 90 trading days

These are trading-day horizons, not calendar-day durations.

Additional horizons can be tested when justified by the data.

The research engine should determine whether a setup is better suited to a short holding period, a multiday trade, or a longer-duration strategy.

For example, one stock may favor a 3-day setup, while another may perform better over 20 trading days. A third may have separate short-term and longer-term setups.

Do not force one holding period onto all stocks.

The chosen horizon must be based on out-of-sample evidence, realistic execution assumptions, and the relevant performance metrics.

If no horizon has sufficient evidence, mark the result as unqualified or provisional rather than inventing a reliable duration.

Dynamic reassessment

BYOB may reassess its strategy and holding period as new data becomes available.

It must not change the historical record when a strategy changes.

Every strategy revision must have a version, effective date, supporting evidence, and an identifiable reason for the change.

Previously generated recommendations must retain the formula and horizon that applied when they were created.

6. HISTORICAL DATA AND POINT-IN-TIME RESEARCH

Historical data is essential because BYOB must establish whether its strategy would have worked before it was tested in the present.

First inspect and reuse ASTR’s existing historical-data module and cached data. Do not build a second data pipeline without a demonstrated need.

When a stock is added:

1. Determine what historical data is already available.
2. Identify missing periods or fields.
3. Reuse cached data wherever possible.
4. Fetch only the missing information using existing supported data sources.
5. Record data coverage, timestamps, source, and any gaps.
6. Queue the stock for research after sufficient data is available.

Avoid repeatedly downloading the same historical data for every formula or experiment.

The system should support historical investigations without requiring every stock to be downloaded again for every new strategy.

Point-in-time correctness

Every historical test must use only information that would have been available at the simulated decision time.

Prevent look-ahead bias, including:

* Using future prices to calculate an earlier signal.
* Using future news or revised information before its publication.
* Using future indicator values in a historical decision.
* Selecting a strategy based on the test period and then reporting that same period as independent validation.
* Accidentally using today’s researcher qualification or threshold to represent a historical decision.

Historical prices must account for splits and dividends appropriately, with execution and return calculations using consistent price conventions.

If the required historical data is unavailable, the system must disclose the limitation rather than silently substituting future knowledge or fabricated values.

Exact and approximate historical dates

Not every historical recommendation will necessarily have an exact timestamp.

Preserve the original date and time when known.

If a source only establishes an approximate date, record that date as approximate, preserve the source, and distinguish it from an exact timestamp.

Never fabricate exact historical recommendation times.

7. HISTORICAL RECOMMENDATION RECONSTRUCTION

BYOB should investigate relevant historical stock recommendations and reconstruct what happened after each recommendation.

Where suitable historical recommendations are available, capture:

* Stock ticker.
* Original recommendation.
* Source and source URL or identifier, when available.
* Original publication date and time, if available.
* Exact or approximate date designation.
* Price information available at the recommendation time.
* Strategy or rationale, if provided.
* Earliest realistic execution opportunity.
* Subsequent price outcomes.
* Outcome measurement period.
* Data quality and reconstruction confidence.

The recommendation’s original source and date must remain independent of BYOB’s own strategy decisions.

Next-session execution

For historical recommendations, simulate execution at the next eligible trading session after the recommendation became available, using a documented execution rule and an appropriate available price.

Do not assume the user could buy at a price that occurred before the recommendation was published.

Account for market closures, weekends, missing data, and the timing of information availability.

Apply the same execution convention consistently so that results are comparable.

Two separate research tracks

Maintain two separate performance records:

Track A — External recommendation replay

Measures what happened after an independently sourced historical recommendation.

This answers: If this recommendation had been followed using the documented next-session execution rule, what happened afterward?

Track B — BYOB strategy performance

Measures the results of BYOB’s own formula, entry conditions, exit conditions, and selected holding period.

This answers: How did BYOB’s own strategy perform when it generated a signal?

These tracks must never be merged into one performance record or presented as interchangeable evidence.

An external recommendation that succeeds does not prove BYOB’s formula works. Likewise, BYOB’s strategy results do not prove an external recommendation source is reliable.

8. BACKTESTING AND VALIDATION

Build a repeatable experiment engine for evaluating candidate formulas and holding periods.

Use a disciplined sequence:

1. Research/training: Explore historical relationships and develop candidate setups.
2. Validation: Compare candidate setups and select promising configurations.
3. Out-of-sample testing: Evaluate the selected strategy on data not used to develop or select it.
4. Walk-forward testing: Repeat the process across successive historical windows to see whether the edge persists.
5. Ongoing paper observation: Track subsequent signals and outcomes prospectively.

The exact window sizes should depend on available data and sample sufficiency. Record the chosen windows and do not present in-sample results as independent validation.

Avoid repeatedly tuning against the same holdout period. Preserve a final untouched test window wherever practical.

Compare the strategy with appropriate baselines, including buy-and-hold or a relevant market benchmark where suitable.

Required metrics

For each stock, formula, and holding horizon, calculate and retain as much of the following as the available data supports:

* Number of qualifying historical signals.
* Number of completed simulated trades.
* Win rate.
* Average winning return.
* Average losing return.
* Average return per trade.
* Expected return or expectancy.
* Gross and net return after modeled costs.
* Maximum drawdown.
* Profit factor, where meaningful.
* Performance by market regime.
* Performance by calendar period.
* Results against the relevant benchmark.
* Maximum favorable excursion (MFE).
* Maximum adverse excursion (MAE).
* Sample size and data coverage.
* Stability across walk-forward periods.
* Uncertainty and evidence limitations.

Include realistic transaction costs and slippage assumptions where supported. Document those assumptions and avoid presenting gross returns as net returns.

Do not qualify a strategy solely because it has a high win rate. A strategy that wins frequently but loses heavily on its remaining trades may have negative expectancy.

9. THE 0–100 BYOB SCORE

BYOB must produce a stock-specific score from 0 to 100 when there is enough evidence to calculate one.

The score should represent the strength of the current stock-specific setup under BYOB’s validated strategy, not a generic opinion about whether a company is a good investment.

The score should be based on the validated strategy and current signal, potentially incorporating:

* Alignment with the stock’s tested setup.
* Current trend and momentum conditions.
* Volume confirmation when relevant.
* Relative strength when relevant.
* Similarity between current conditions and historically tested conditions.
* Historical expectancy for the applicable setup and horizon.
* Out-of-sample performance.
* Sample size and uncertainty.
* Current market regime.
* Data freshness and completeness.

Do not assume that every feature should have the same weight for every stock.

A score of 80 for NVDA should not automatically mean the same thing as a score of 80 for DELL if the strategies, sample sizes, and historical distributions differ.

Document how the score is calculated and calibrated.

Score versus qualification

The score and the qualification decision are separate concepts.

A high score alone does not establish that a strategy is reliable.

BYOB must use the existing researcher qualification architecture where appropriate, including any learned, researcher-specific qualification thresholds.

Do not hardcode a universal qualification threshold such as 65 unless the existing system explicitly requires it for a documented reason.

The system should account for statistical evidence, sample sufficiency, out-of-sample results, drawdown, and strategy stability.

A strategy with insufficient evidence must remain provisional or unqualified, even if a raw score is high.

10. QUALIFICATION AND EVIDENCE LEVELS

Each stock-specific strategy should have an explicit research status.

Suggested states:

* Researching: Historical preparation or initial experiments are underway.
* Insufficient Data: There is not enough reliable information to evaluate the strategy.
* Provisional: A candidate setup exists, but its evidence is not sufficient for full qualification.
* Qualified: The strategy meets the documented evidence and performance criteria.
* Under Review: Recent results or changing conditions require reassessment.
* Disqualified: The strategy no longer meets the qualification criteria or failed validation.

Reuse existing status conventions if ASTR already has an equivalent model.

Every qualification decision must include a reason and a record of the data, strategy version, thresholds, and test results supporting it.

A researcher must not be labeled qualified merely because it completed a backtest.

11. RESEARCH THESIS AND SETUP EXPLANATION

For every stock that BYOB evaluates, provide an understandable explanation of its current research conclusion.

Where supported by the evidence, show:

* What setup BYOB is evaluating.
* Why the current stock conditions match or do not match that setup.
* The stock-specific formula or strategy version.
* The selected holding period.
* The historical evidence supporting the setup.
* The estimated expectancy and relevant risk measures.
* The number of comparable historical examples.
* The validation and walk-forward results.
* What conditions would invalidate the thesis.
* Any missing data or limitations.

Separate established findings from hypotheses.

Do not fabricate explanations for model decisions that cannot be traced to the underlying strategy or data.

12. ANALYZE DESK INTEGRATION

BYOB must be selectable in the existing ASTR Analyze Desk at /analyze.

It should function as an active research specialist alongside the existing specialists, using the established specialist-selection workflow rather than a separate, disconnected application.

When a user analyzes a stock:

1. The user selects the ticker.
2. BYOB’s stock-specific research result is made available if that stock has been assigned and evaluated.
3. The interface displays BYOB’s current score when calculable.
4. The interface displays the current research status and evidence level.
5. The interface displays the stock-specific thesis and formula summary.
6. The interface displays the validated holding period when one exists.
7. The interface shows relevant historical expectancy, sample size, and validation results.
8. The user can compare BYOB with the other available specialists.
9. The user decides which specialist or recommendation to use.

If BYOB has not researched the stock, show that state clearly and allow the research workflow to begin or continue.

Do not invent a score, qualification, formula, or holding period merely to fill the UI.

Manual selection is mandatory

BYOB’s appearance in Analyze Desk is advisory and research-oriented.

It must not automatically become the selected researcher, override the user’s selection, or initiate a trade.

The user retains control over which researcher’s result to consider.

Do not change the existing specialists’ formulas, rankings, scoring, selection logic, or qualification rules as part of BYOB integration unless a specific, separately approved change is necessary.

13. RESEARCH LAB AND PERFORMANCE GRAPH

BYOB should have its own identifiable research record and performance graph in the appropriate existing Research Lab/researcher area.

The graph must represent BYOB’s own qualified research results under clearly defined performance rules.

It must not indiscriminately combine:

* External recommendation replay results.
* BYOB strategy results.
* Unqualified exploratory experiments.
* Incomplete or failed simulations.
* Live ASTR trading results.
* Results belonging to other researchers.

Only include results that satisfy the existing graph’s qualification requirements, adapted as necessary to BYOB’s research model.

Maintain the distinction between completed tests and tests that actually qualified.

The interface should allow the user to inspect the underlying trades or outcomes contributing to a graph, along with the applicable strategy version and evaluation period.

Display the graph’s data source, performance basis, and important limitations.

Reuse the existing researcher graph and history architecture wherever possible.

14. PAPER SIMULATION AND MONEY SEPARATION

BYOB is research-only and paper-simulation-only.

Use a standard simulated stake of $20 per simulated position so its results are comparable under a consistent stake assumption.

The $20 stake is a research simulation convention, not a live investment allocation or an instruction to place a brokerage order.

Record the simulated entry, exit, shares or units, costs, realized result, and applicable strategy version according to the existing simulation model.

If the system cannot realistically simulate a fractional share or the relevant execution, document the supported execution convention rather than inventing fills.

Strict separation requirements

BYOB must never:

* Submit live orders to Alpaca or another brokerage.
* Change a live position.
* Use live ASTR cash as its simulation balance.
* Change live ASTR realized or unrealized P/L.
* Mix its simulated trades into the live ASTR Trade Log.
* Affect the SAME_DAY or LONG_TERM live portfolio buckets.
* Change ASTR’s live trading schedule, buy/sell rules, or strategy.
* Automatically transfer its recommendations into live execution.

Use the existing Research Lab/paper-only infrastructure if it supports these requirements.

If an existing paper-trading API is obsolete or scheduled for removal, inspect the actual dependencies first. Remove or replace only the pieces that are no longer needed, and do not remove shared functionality required by other researchers.

The core requirement is that BYOB’s simulation and records remain isolated from live trading.

15. RESEARCH QUEUE AND BACKGROUND PROCESSING

BYOB may need to process multiple stocks, historical windows, candidate formulas, and holding periods.

Design the workflow so research jobs can be queued, resumed, and tracked instead of requiring every experiment to run synchronously inside the Analyze Desk request.

Use existing queue, job, or background-processing infrastructure where available.

Track:

* Stock being researched.
* Research job status.
* Historical data preparation status.
* Formula or experiment being evaluated.
* Completed and remaining work.
* Errors and retry status.
* Last successful research time.
* Strategy version and data version.
* Whether results have passed validation.

Reuse cached prices, indicators, and experiment outputs where safe.

Do not rerun every historical experiment every time the user opens Analyze Desk.

Prioritize getting a usable initial strategy for a stock before exhaustively evaluating every possible formula.

New data should trigger appropriate updates and reassessments, but not uncontrolled, redundant backtesting.

16. HISTORICAL RESEARCH DEPTH AND CONTINUOUS LEARNING

BYOB should learn from historical market behavior while protecting the integrity of its validation process.

It should be able to investigate:

* Why a setup worked in one period but failed in another.
* Whether its edge depends on a particular market regime.
* Whether the best horizon changes between historical periods.
* Which indicators improve or weaken the result.
* Whether a promising result survives different time windows.
* Whether performance deteriorates after a strategy is deployed in prospective paper observation.

Where useful, compare related stocks or peer behavior as additional context. However, another stock’s performance must not substitute for the target stock’s own validation.

The system should preserve the difference between:

1. A hypothesis.
2. A backtested candidate.
3. A validated strategy.
4. A qualified research result.
5. A prospective paper-observed result.

New research may produce a revised formula or horizon, but it must not silently overwrite an earlier strategy or its results.

Maintain an auditable history of revisions and qualification changes.

17. ARCHITECTURE AND IMPLEMENTATION REQUIREMENTS

Before changing code, inspect the actual repository and document the existing implementation of these four critical integration points:

1. Analyze Desk integration: The specialist list, stock-analysis flow, selection state, and recommendation presentation.
2. Researcher selection and qualification: Existing researcher identities, selection mechanisms, qualification thresholds, and research-result records.
3. Historical data: Existing price-data provider, caching, historical snapshots, indicator calculations, and date handling.
4. Research and simulation: Existing experiment runners, queues, paper-only records, graphs, and trade-history models.

Verify the relevant files, functions, database tables, migrations, and call paths. Do not rely solely on file names or assumptions.

Reuse existing infrastructure wherever practical.

Do not duplicate the stock-data pipeline, create a competing qualification system, or introduce an unnecessary new research framework.

If an essential capability is missing, identify the gap and propose the smallest compatible addition.

Data integrity

Every result should be traceable to:

* Stock ticker.
* Strategy and formula version.
* Data source and relevant data timestamps.
* Research and evaluation windows.
* Execution assumptions.
* Selected holding period.
* Experiment identifier.
* Qualification decision.
* Result-generation timestamp.

Use the existing database conventions and migration system.

Ensure that adding BYOB does not alter existing production strategies or historical records.

Resource constraints

Prefer existing providers, existing cached data, and current project dependencies.

Do not introduce paid APIs, subscriptions, or new paid data services without explicit approval.

Reuse existing data sources within their permitted limits. Record missing coverage and rate-limit failures rather than silently substituting fabricated data.

Avoid unnecessary repeated historical downloads and uncontrolled combinations of experiments.

18. ACCEPTANCE TESTS

BYOB is not complete simply because a new researcher name or score appears in the interface.

The following behavior must be demonstrated.

Test A — Specialist integration

* BYOB appears in Analyze Desk.
* The user can manually select it.
* Other researchers remain available and unchanged.
* Selecting BYOB does not place a trade.

Test B — Stock independence

* NVDA and AMD can have different formulas, horizons, and qualification outcomes.
* Updating NVDA does not overwrite AMD’s strategy or results.
* An unresearched stock is not given fabricated research results.

Test C — Historical correctness

* Historical decisions use only information available at the decision time.
* Recommendations preserve original sources and exact/approximate dates.
* Next-session execution does not use a price from before the recommendation became available.
* Missing historical data is identified.

Test D — Independent validation

* Training, validation, out-of-sample, and walk-forward results are distinguishable.
* The system does not qualify a strategy solely on in-sample performance.
* Formula and horizon changes do not rewrite prior results.

Test E — Score and qualification

* A 0–100 score is traceable to its documented calculation.
* Qualification is separate from the raw score.
* Sample size and evidence limitations are visible.
* A high score cannot automatically bypass qualification requirements.

Test F — Research performance

* BYOB has its own graph and inspectable performance records.
* External recommendation replay is separated from BYOB’s own strategy.
* Unqualified experiments do not accidentally count as qualified results.

Test G — Financial isolation

* Every applicable simulated position uses the standard $20 stake.
* Simulated outcomes remain within the research/paper environment.
* No live orders are submitted.
* Live cash, live P/L, live positions, and live trading behavior remain unchanged.

Test H — Data reuse and reliability

* Cached historical data is reused.
* Missing data is fetched only when necessary and supported.
* Jobs can report progress, errors, and completion.
* Reopening Analyze Desk does not unnecessarily rerun every experiment.

19. IMPLEMENTATION PHASES

Implement BYOB in controlled phases.

Phase 1 — Architecture and data audit

Verify the current repository and document the actual files, components, services, tables, and functions that support the four integration points.

Identify what already exists, what is reusable, what is incomplete, and what must be created.

Confirm the stock universe, historical-data coverage, qualification architecture, simulation isolation, and Analyze Desk integration.

Do not assume a capability is missing before inspecting it.

Phase 2 — Research data and experiment engine

Implement or adapt the stock-specific formula and holding-period experiment engine.

Establish point-in-time data correctness, reproducible strategy versions, historical experiment records, and realistic simulation assumptions.

Start with a small number of stocks and candidate strategies to validate the entire pipeline before scaling to all 15.

Phase 3 — Qualification and validation

Implement the documented evaluation workflow, qualification criteria, evidence levels, score calculation, and strategy-version history.

Demonstrate that the engine can reject an unprofitable or inadequately supported candidate instead of forcing a qualification.

Phase 4 — Analyze Desk integration

Add BYOB to the existing specialist-selection mechanism.

Display its current score, qualification status, thesis, validated horizon, expectancy, and supporting evidence when available.

Preserve manual user selection and all existing specialist behavior.

Phase 5 — Research Lab, graph, and history

Add or adapt BYOB’s independent research history, graph, and inspectable simulation results.

Keep external recommendation replay, BYOB’s own strategy performance, unqualified experiments, and live trading records separate.

Phase 6 — Expand and monitor

Expand research to the complete 15-stock seed universe.

Implement queued research, caching, resumability, and appropriate reassessment as new data becomes available.

Verify the acceptance tests before declaring the feature complete.

20. CHANGE CONTROL AND FINAL DELIVERABLES

Protect the existing ASTR production system.

Do not change existing stock scoring, researcher formulas, qualification behavior, automatic daily rotation, market-hours rules, live order execution, portfolio separation, or existing Analyze Desk functionality as a side effect of building BYOB.

Do not silently remove existing features or database records.

Keep changes focused on BYOB and its necessary integration points. If a change outside that scope is necessary, explain why and obtain approval before proceeding.

At completion, provide:

1. A summary of the actual architecture discovered.
2. The files and database structures reused or added.
3. The BYOB workflow from stock assignment through research and qualification.
4. The formula, horizon, scoring, and qualification methodology.
5. The historical-data and point-in-time safeguards.
6. The paper-simulation isolation safeguards.
7. The tests run and their actual results.
8. Any failed tests, incomplete work, or data limitations.
9. Any remaining decisions that require the user’s approval.

Do not report tests as passing unless they were actually run and passed.

Do not describe a feature as implemented when only its UI or database schema exists.

FINAL PRODUCT DEFINITION

BYOB is ASTR’s independent, stock-specific research brain.

It investigates assigned stocks, develops and tests their own candidate strategies, discovers evidence-supported holding periods, evaluates historical expectancy, maintains point-in-time research records, and exposes its findings as a selectable specialist in Analyze Desk.

Its output is a research recommendation, not an automatic trade.

Its simulated performance is separate from external recommendation replay and completely isolated from live ASTR cash, positions, P/L, and order execution.

The goal is not to make BYOB look intelligent. The goal is to build a reproducible research system that can demonstrate what it has tested, what it has learned, where its strategy appears to work, and when the evidence is not strong enough to qualify.