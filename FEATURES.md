# ASTR Autonomous System Manual & Comprehensive Feature Catalog (FEATURES.md)

**ASTR** (Autonomous Stock Trading & Research) is an institutional-grade, research-driven trading engine built on TanStack Start (React 19 + Vite + Tailwind CSS v4) with Lovable Cloud (PostgreSQL backend). The system couples rigorous, multi-specialist quantitative paper research with a zero-compromise live execution firewall.

---

## 1. System Philosophy & Architecture Principles

### 1.1 The Free-Tier Mandate ($0 Operating Cost)
ASTR is engineered from the ground up to operate indefinitely with zero software subscriptions, third-party data fees, or proprietary cloud service charges:
- **Brokerage & Data Feeds:** Utilizes Alpaca Markets' single Live Account credentials for live streaming, real-time market snapshots, historical daily bars, and authenticated order routing. All secondary paper API endpoints and keys have been permanently eliminated.
- **Regulatory Catalysts:** Integrates directly with the U.S. Securities and Exchange Commission (SEC) EDGAR public dissemination system via user-agent HTTP protocols, reading 8-K, 10-K, and 10-Q filings with zero API keys.
- **Public Entity Adapters:** Employs open sports, entertainment, and corporate feeds (ESPN, MusicBrainz, Wikidata, public venue calendars) with automated health probes that fall back to static structures if any endpoint enforces paid walls.
- **Compute & Storage:** Runs entirely within serverless Edge Workers and server functions (`createServerFn`) backed by Lovable Cloud PostgreSQL with `pg_cron` schedules.

### 1.2 The Paper/Live Isolation Barrier
A foundational design rule of ASTR is the absolute physical and logical separation between **Research** and **Live Capital**:
- **Paper Research:** Completely self-contained inside the application database. Paper research simulations, multi-candidate tracking, stability tests, and backtest historical runs simulate fills against authentic historical OHLCV bars. They can never alter live account balances, query live buying power, or route transactions to Alpaca.
- **Live Trading:** Strictly isolated. Research findings, hypothesis ledgers, and specialist rankings serve exclusively as analytical aids. They cannot autonomously trigger, submit, modify, or cancel a live trade.

---

## 2. Live Trading Controls & Hard Safety Firewalls

### 2.1 The Code-Level Firewall
Live execution is protected by a multi-barrier software gate:
1. **Disabled by Default:** The global live trading master toggle remains deactivated upon deployment until explicitly armed by the user.
2. **Autonomous Live BUY Ban:** The background autonomous scan cycles (Pre-Open, Market Open, Intraday, Pre-Close) possess zero permission to submit live BUY orders. When a scan identifies an exceptional setup, it formats an actionable push notification with the setup rationale, forcing the human operator to review the analysis.
3. **Mandatory Explicit Confirmation (`confirmed: true`):** The server-side order router (`broker.server.ts`) inspects every incoming live order payload. Any request lacking an explicit `confirmed: true` flag verified from an interactive UI modal is immediately rejected before touching the Alpaca network client.

### 2.2 Live Position Archetypes & Execution Rules

#### SAME_DAY Positions (Day Trades)
- **Zero Overnight Rule:** Live positions classified as `SAME_DAY` must never be held past the regular market session close (4:00 PM ET).
- **Automated Exit Enforcement:** The 3:45 PM ET Pre-Close cycle runs an emergency audit on all open live positions flagged as `SAME_DAY`. If still open, market sell orders are broadcast directly to Alpaca to guarantee zero overnight gap exposure.
- **Holding Period Indicator:** Represented across all analytical dashboards and trade logs as a `0D` target hold.

#### ROTATION Positions (Swing Holds)
- **Formula-Calibrated Duration:** Positions assigned a dynamic target horizon between 1 and 252 trading sessions based on historical parameter stability.
- **Automated Exit Logic:** Monitored against trailing stop thresholds, profit targets, or the Lead Researcher's decay curves. If the formula-driven exit criterion triggers during a regular cycle, the position is automatically closed unless overridden by the operator.

#### LONG_TERM Positions (Protected Holds)
- **Immutable Automated Protection:** Live positions designated by the operator as `LONG_TERM` are shielded with a hard bypass in all automated scanning and exit routines.
- **Manual Intervention Exclusivity:** Automated pre-close flushes, stop-loss triggers, and rotation sweeps cannot sell a `LONG_TERM` position under any market condition. Liquidations can only occur through the interactive `LongTermSellDialog.tsx` modal with explicit user authorization.

### 2.3 Partial Sells & Dollar-Based Exits
- The execution engine treats partial liquidations on live positions as manual, dollar-denominated orders.
- Users specify the exact dollar amount to capture. The engine computes the required share quantity from the latest live bid/ask quote, submits the order, and updates the remaining tax lots without resetting the original entry timestamp or invalidating target holding horizons.

---

## 3. Autonomous Execution Lifecycle (Market-Aware Schedules)

All background jobs are scheduled using Eastern Time (ET) and execute only on authorized NYSE/NASDAQ trading days verified against the internal market calendar (`market-calendar.ts`):

```text
+-------------------+-------------------------------------------------------------+
| Time (ET)         | Automated Task & System Actions                             |
+-------------------+-------------------------------------------------------------+
| 08:00 AM (Daily)  | Alpaca Key Check (`migration 14` via `pg_cron`):            |
|                   | Verifies live API credentials and connectivity.             |
+-------------------+-------------------------------------------------------------+
| 09:15 AM (Pre-Mkt)| Pre-Open Scan (`preopen.ts`):                               |
|                   | Captures overnight SEC filings, pre-market SPY regime, and  |
|                   | generates top morning candidates across all 7 researchers.  |
+-------------------+-------------------------------------------------------------+
| 09:30 AM (Open)   | Market Open Audit:                                          |
|                   | Records opening auction prices and updates paper portfolios.|
+-------------------+-------------------------------------------------------------+
| 11:30 AM / 2:00 PM| Intraday Scans:                                             |
|                   | Evaluates volume pacing, intraday momentum, and stop limits.|
+-------------------+-------------------------------------------------------------+
| 03:45 PM (Pre-Cls)| Pre-Close Execution Sweep (`preclose.ts`):                  |
|                   | Liquidates all live SAME_DAY positions (Zero Overnight).   |
|                   | Evaluates multi-day rotation exit rules.                    |
+-------------------+-------------------------------------------------------------+
| 04:00 PM (Close)  | Market Close Snapshots:                                     |
|                   | Freezes official closing prices for all active securities.  |
+-------------------+-------------------------------------------------------------+
| 06:00 PM (Audit)  | Lead Researcher Quantitative Self-Audit (`audit.server.ts`):|
|                   | Reconstructs all daily fills against raw historical bars.   |
|                   | Validates calendar precision and flags fill anomalies.      |
+-------------------+-------------------------------------------------------------+
| 10:00 AM (Sat)    | Saturday Closed-Loop Balance Reconciliation:                |
|                   | Verifies: Starting Capital + Net Realized P&L = Book Value. |
+-------------------+-------------------------------------------------------------+

---

## 4. Research Department: Seven Independent Researchers

ASTR does not use one universal stock-picking formula. Each specialist independently evaluates every candidate using its own evidence priorities, score construction, holding-period logic, and historical behavior.

The purpose is not to force every ticker into a single strategy. It is to identify which analytical approach, if any, has the strongest evidence for that specific ticker and market context.

### 4.1 Core Researcher Rules

- Every ticker analysis evaluates all active researchers independently.
- Each researcher may produce a different score, qualification result, explanation, and proposed holding horizon for the same ticker.
- A researcher is allowed to produce **no qualifying setup**. A lack of a candidate is a valid protective outcome.
- The highest-ranked researcher is highlighted as the strongest current fit, but it is not automatically selected for a purchase.
- The operator may select any qualifying researcher from the Analyze results.
- A selected live or paper position is permanently associated with its owning researcher and original target horizon.
- Researcher identity must remain visible on holdings, trade history, research records, scoreboard views, and audit records.
- The Skeptic participates in challenge and risk review but is excluded from BUY ranking and direct capital allocation.
- The Lead Researcher independently verifies the department's evidence. The Lead does not blindly approve a majority vote.
- A qualification failure by the top-ranked researcher should suggest a pass or further review; it must not automatically redirect capital to the next-ranked researcher.

### 4.2 Researcher Roster

```text
+--------------+---------------------------------------------------------------+
| Researcher   | Primary Function                                              |
+--------------+---------------------------------------------------------------+
| Trend        | Identifies established directional momentum and continuation. |
| Contrarian   | Searches for statistically supportable reversals or recoveries.|
| Consistency  | Favors stable, repeatable performance and lower variability.  |
| Growth       | Evaluates growth acceleration and improving business momentum. |
| Risk         | Focuses on downside containment and asymmetric payoff quality. |
| Skeptic      | Challenges assumptions; cannot receive BUY allocation.         |
| Lead         | Independently validates evidence, rankings, and system health. |
+--------------+---------------------------------------------------------------+
```

---

## 5. Researcher Methodologies and Decision Roles

### 5.1 Trend Researcher

The Trend Researcher seeks securities already demonstrating durable directional strength rather than attempting to predict a reversal before evidence exists.

Primary areas of inspection include:

- Short-, medium-, and long-term price direction.
- Relationship between current price and major moving averages.
- Relative strength versus the broader market and comparable securities.
- Momentum persistence across multiple recent sessions.
- Volume confirmation during advances.
- Breakout behavior, consolidation quality, and trend continuation risk.
- Whether a move is orderly or excessively extended.

The Trend Researcher is most useful when market conditions support sustained directional movement. It should become less aggressive when a ticker is overextended, volume is deteriorating, or broad market conditions conflict with the apparent trend.

Typical holding logic:
- Shorter holds for fast momentum or breakout continuation setups.
- Longer holds where the evidence indicates a stable trend rather than a brief price surge.
- Same-day horizons are possible only when the formula-derived target duration is zero trading days.

### 5.2 Contrarian Researcher

The Contrarian Researcher looks for cases where negative sentiment, price weakness, or oversold behavior may have moved beyond what the underlying evidence supports.

Primary areas of inspection include:

- Magnitude and duration of recent price decline.
- Oversold or overbought technical conditions.
- Distance from historical averages, support areas, or normalized ranges.
- Signs that selling pressure is exhausting rather than accelerating.
- Volume and volatility behavior around a potential reversal.
- Whether a catalyst, earnings event, macro condition, or market regime makes a recovery plausible.
- Risk that the apparent bargain is actually a structurally deteriorating security.

The Contrarian Researcher should not treat a large decline as proof of value. It requires evidence that the downside move may be stabilizing and that the potential upside sufficiently compensates for continued risk.

Typical holding logic:
- Holds may range from short reversal attempts to multi-session recovery periods.
- Low-confidence reversal conditions should result in a pass rather than a forced trade.
- The researcher should be especially cautious in bearish, high-volatility market regimes.

### 5.3 Consistency Researcher

The Consistency Researcher prioritizes repeatability, controlled variability, and evidence of dependable behavior over dramatic upside potential.

Primary areas of inspection include:

- Stability of returns across historical periods.
- Frequency of positive versus negative outcomes for comparable setups.
- Drawdown depth and recovery behavior.
- Variability of volatility, volume, and price action.
- Consistency of the security's reaction to similar market conditions.
- Whether a strategy has performed reliably across different historical windows rather than only in a narrow sample.

This researcher is intended to identify candidates with a more dependable evidence profile, not necessarily the largest expected single-trade return.

Typical holding logic:
- Holding periods should reflect historically stable payoff windows.
- A setup with inconsistent or brittle performance should receive a weaker score even if one historical period looked exceptional.
- Consistency evidence should be considered alongside parameter stability testing.

### 5.4 Growth Researcher

The Growth Researcher evaluates evidence of improving business and market momentum.

Primary areas of inspection include:

- Revenue, earnings, margin, or guidance acceleration where public evidence is available.
- Relative price strength associated with improving growth expectations.
- Changes in institutional attention, volume participation, or market response.
- Earnings-event behavior and post-report follow-through.
- Whether price action confirms or contradicts a growth narrative.
- Whether the growth evidence is durable, already priced in, or vulnerable to disappointment.

The Growth Researcher should avoid treating headlines or a single favorable data point as sufficient proof. Its goal is to distinguish sustained improvement from temporary excitement.

Typical holding logic:
- Holds may extend longer when growth acceleration and price confirmation remain intact.
- The target horizon must be derived from research evidence, not assigned as a generic long-term label.
- Negative event follow-through or deteriorating confirmation can reduce confidence or lead to a pass.

### 5.5 Risk Researcher

The Risk Researcher evaluates whether the potential reward is acceptable after accounting for downside, volatility, liquidity, and adverse-regime exposure.

Primary areas of inspection include:

- Historical and current volatility.
- Maximum adverse excursion and drawdown behavior in comparable setups.
- Liquidity, spread, and execution-quality risk.
- Stop-distance practicality relative to expected reward.
- Correlation with the market regime and concentration exposure.
- Whether a proposed trade is unusually vulnerable to gaps, event risk, or whipsaw behavior.
- Return relative to capital time commitment.

The Risk Researcher is not simply bearish. A candidate can receive a favorable risk score when its downside is controlled and its reward-to-risk profile is compelling.

Typical holding logic:
- May support shorter horizons for volatile opportunities.
- May reject otherwise attractive setups when downside asymmetry is unacceptable.
- Risk evidence informs exposure ceilings and should never be bypassed merely because another researcher reports a high raw score.

### 5.6 Skeptic Researcher

The Skeptic Researcher is ASTR's dedicated challenge function.

Its purpose is to identify reasons a proposed idea may be misleading, overfit, regime-dependent, stale, too optimistic, or unsupported by sufficient evidence. It examines:

- Contradictory technical signals.
- Small-sample or weak historical support.
- Possible data leakage or look-ahead contamination.
- Overfitting to a narrow parameter set.
- Poor performance in adverse market regimes.
- Event, liquidity, volatility, or execution risks not adequately captured by the proposing specialist.
- Whether a price move is already extended or based on weak confirmation.

**Important restriction:** The Skeptic is excluded from BUY ranking, capital allocation, and direct purchase selection. It may downgrade confidence, create warnings, or recommend a pass, but it cannot become the selected BUY researcher.

### 5.7 Lead Researcher

The Lead Researcher is not a seventh formula competing for allocation in the same way as the specialists. The Lead is the independent verification and governance layer.

Lead responsibilities include:

- Reviewing the full multi-researcher output for a ticker.
- Checking whether evidence is internally consistent.
- Identifying conflicts between researcher conclusions.
- Verifying that the selected researcher's proposed holding horizon is supported by evidence.
- Reviewing regime context, data sufficiency, and historical reliability.
- Highlighting warnings from the Skeptic and Risk Researchers.
- Monitoring research-quality metrics, strategy drift, and audit findings.
- Supporting a pass recommendation when evidence is insufficient.

The Lead must not silently alter a researcher's methodology or replace a failed researcher with another without clear evidence and user review.

---

## 6. Analyze Desk: Ticker-Specific Research Workflow

The Analyze Desk is the primary manual decision surface for researching a ticker before a possible trade.

### 6.1 Search and Evidence Flow

When the operator enters a ticker:

1. ASTR normalizes and validates the ticker symbol.
2. The system loads the available historical market information, recent pricing context, and applicable public-event evidence.
3. All active specialist researchers evaluate the same ticker independently.
4. Each specialist returns its own:
   - Score or confidence assessment.
   - Qualification state.
   - Supporting rationale.
   - Formula-derived holding horizon.
   - Risk notes and data-quality caveats.
5. The system ranks qualifying researchers by ticker-specific evidence.
6. The Lead review summarizes the overall evidence and any concerns.
7. The user decides whether to pass, continue researching, create paper tracking, or initiate a manually confirmed live order.

### 6.2 Researcher Results Table

The Analyze results should present every active researcher in one comparable table.

Expected row-level information:

```text
+-------------------+---------------------------------------------------+
| Field             | Meaning                                           |
+-------------------+---------------------------------------------------+
| Researcher        | The specialist producing this assessment.         |
| Score             | That researcher's ticker-specific evaluation.     |
| Qualification     | Whether its evidence clears the current threshold.|
| Hold Target       | Formula-derived duration, such as 0D, 3D, 17D.    |
| Rationale         | Concise explanation of supporting evidence.       |
| Risks / Warnings  | Skeptic, regime, liquidity, or data concerns.     |
| Action            | Paper-track or user-initiated BUY, if qualified.  |
+-------------------+---------------------------------------------------+
```

The highest-ranked qualified researcher should be visually identified as the current top fit. This is a recommendation signal only; it is not authorization for automatic execution.

### 6.3 Holding Horizon Rules

Holding horizons are research outputs, not cosmetic labels.

- A hold target is based on the selected researcher's formula and supporting historical evidence.
- Valid targets range from **0 to 252 trading sessions**.
- A target of **0 days** represents a SAME_DAY trade that must not be held overnight.
- When insufficient evidence supports a custom horizon, the system may use the established fallback horizon of **3 trading days** for research classification.
- Horizons should be measured in trading sessions, not calendar days, so weekends and market holidays do not count as holding sessions.
- The original target must remain attached to the position record even if the operator later performs a manual partial sell.

### 6.4 Direct Buy Selection Rules

A direct BUY action from Analyze must follow these rules:

- It is available only through an explicit user interaction.
- The operator chooses the desired qualified researcher rather than relying on automatic selection.
- The chosen researcher, score, rationale, target horizon, and position type are recorded with the trade.
- The execution flow requires a final confirmation modal.
- The server-side order request must contain explicit confirmation from that modal.
- Background scans and researcher ranking results cannot bypass this confirmation step.
- A failed qualification should make the trade unavailable or clearly warned, depending on the selected workflow; it must not silently turn into a different researcher's recommendation.

---

## 7. Research Lab and Paper Simulation

The Research Lab is ASTR's controlled evidence environment. It tests researcher behavior without placing live capital at risk.

### 7.1 Paper Research Principles

- Paper research is internal simulation only.
- It uses historical market data rather than broker paper-trading endpoints.
- It must not access, alter, or place live brokerage orders.
- Simulated entries, exits, capital use, and results remain separate from live account records.
- Research findings are hypotheses and evidence, not automatic execution commands.

### 7.2 Multi-Candidate Tracking

Researchers are expected to evaluate all qualifying historical setups under their formulas rather than tracking only a hand-picked subset of successful outcomes.

This protects against cherry-picking by requiring:
- Broad candidate coverage.
- Preserved losing and winning outcomes.
- Historical analysis across multiple regimes and time periods.
- Evidence summaries that do not hide failed trades.
- Separation between initial setup evidence and eventual outcome.

### 7.3 Parameter Stability and Sensitivity Testing

A research formula is not trustworthy merely because one exact configuration performed well historically.

ASTR tests whether results remain credible when key numeric inputs move slightly, such as:

- Lookback windows adjusted by approximately ±2 trading sessions.
- Threshold values adjusted by approximately ±5%.
- Comparable variations in momentum, volatility, stop, or holding-period assumptions.

The purpose is to determine whether the strategy is:

- **Robust:** Similar settings show reasonably stable outcomes.
- **Sensitive:** Small changes materially alter results and require caution.
- **Brittle:** The result depends on one narrow, potentially overfit parameter combination.

Parameter stability should affect confidence and risk interpretation. It should not be used to conceal weak historical evidence.

### 7.4 Show Me Why Diagnostics

Research cards should provide a diagnostic view explaining why a setup received its current assessment.

The diagnostic material may include:

- Raw input metrics.
- Formula parameters and thresholds.
- Evidence contributing positively or negatively to the score.
- Historical comparable outcomes.
- Sensitivity and stability results.
- Market-regime context.
- Known data gaps, warnings, and Skeptic objections.

The goal is explainability: an operator should be able to see the evidence behind a recommendation rather than treating ASTR as a black box.

---

## 8. Research Performance Curves

Researcher performance charts must represent real portfolio behavior rather than only completed-trade events.

### 8.1 Required Mark-to-Market Standard

A valid researcher equity curve requires:

1. Realized profit and loss from completed positions.
2. Unrealized profit and loss from open positions.
3. Historical closing or interval pricing for each open position at each sampled chart time.
4. A running equity or normalized-return calculation across the selected period.
5. Clear treatment of entries, exits, transaction-cost assumptions, and missing price data.

A curve that remains flat until a trade exits and then jumps by the entire final P&L is only a realized-P&L step chart. It is not a complete mark-to-market performance curve.

### 8.2 Normalized Percentage Curves

Researcher comparisons should use normalized percentage performance where appropriate so that researchers are not ranked merely because one had access to more simulated dollars.

Normalization should preserve:
- Actual sequence of returns.
- Realized and unrealized changes.
- Transaction-cost assumptions.
- Drawdown behavior.
- Effects of capital being committed during the holding period.

### 8.3 Available Chart Ranges

The Research Lab supports these performance windows:

```text
Today | 1W | 1M | 3M | YTD | 1Y | 5Y | All
```

The sampling resolution should match the period:

```text
+----------------+-----------------------------------------------+
| Range          | Preferred Sampling Resolution                  |
+----------------+-----------------------------------------------+
| Today          | Approximately 15-minute observations.          |
| 1W             | Approximately 30-minute observations.          |
| 1M             | Hourly observations where data exists.         |
| 3M / YTD / 1Y  | Daily closing observations.                    |
| 5Y / All       | Weekly observations or another truthful rollup. |
+----------------+-----------------------------------------------+
```

If the required historical data is unavailable, the interface should label the limitation clearly rather than inventing a smooth curve or presenting incomplete data as a true mark-to-market result.

---

## 7. Clarification on Execution: Research Paper Engine vs. Live Trading

A foundational rule of the ASTR architecture is the absolute separation between **Research Data Generation** and **Live Market Execution**:

```text
+-----------------------------------------------------------------------------------+
|                              MARKET DATA INGESTION                                |
|        (Free-tier Alpaca Market API, Historic Bars, SEC EDGAR 8-K / 10-Q)         |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
   +------------------------------------+    +------------------------------------+
   |       RESEARCH & PAPER LAB         |    |        LIVE TRADING ENGINE         |
   |                                    |    |                                    |
   | - 100% Autonomous                  |    | - 100% Manual User Authorization   |
   | - ZERO Real Money / ZERO Live API  |    | - Real Brokerage Capital At Stake  |
   | - Consumes API bars to simulate    |    | - Live Trading Toggle MUST be ON   |
   |   paper entries, targets & exits   |    | - Live BUYs CANNOT fire without    |
   | - Computes researcher win rates,   |    |   explicit user "Confirm" click    |
   |   Sharpe ratios & equity curves    |    | - Holds protected from auto-sells  |
   | - Tests hypotheses risk-free       |    | - Strict T+1 settled cash gating   |
   +------------------------------------+    +------------------------------------+
```

### 7.1 Researchers Do Not Place Real Trades
- **Purely Analytical**: The six specialist researchers (Trend, Contrarian, Consistency, Growth, Risk, Skeptic) and the Lead Researcher never have programmatic access to submit live brokerage orders.
- **API Bar Processing**: Researchers run algorithms against historical and real-time market API price bars. They calculate synthetic indicators, generate theoretical entry signals, track virtual paper holding periods, and log hypothetical exits to measure strategy efficacy.
- **Hypothesis Isolation**: All performance metrics on the Research Lab leaderboard, researcher scorecards, and strategy win rates reflect **simulated paper research**. They prove statistical edge before any real capital is considered.

### 7.2 The Live Execution Firewall
- Real money is traded **only** when the user navigates to the Live Trading / Analyze desk, inspects the ranked research data, selects a candidate ticker, and explicitly clicks **"Confirm Buy"**.
- Automated background scans (e.g., the 9:45 AM or 2:00 PM scans) may generate notifications or alerts regarding qualified candidates, but the system is hardcoded to **never autonomously submit a live BUY order**.
- If Live Trading mode is switched off in Settings, all live API endpoints are completely dormant.

---

## 8. Continuous Mark-to-Market Performance Curves & Sampling Intervals

To replace deceptive realized-only step charts, ASTR implements a true continuous equity curve for each researcher strategy and live portfolio. The curve plots total portfolio value:

Portfolio Equity(t) = Starting Capital + sum of Realized P&L through t + sum of Unrealized P&L at t

Where:
- Realized P&L through t is the cumulative profit/loss of all positions closed on or before timestamp t.
- Unrealized P&L at t is the mark-to-market gain/loss of all positions that were active at timestamp t, priced against the historical bar at that exact timestamp: (Bar Close(t) - Entry Price) x Shares.

### 8.1 Sampling Intervals by Zoom Range
The chart engine adjusts its time-series resolution dynamically based on the selected historical window:

| Zoom Window | Sampling Interval | Data Source & Resolution | Primary Use Case |
| :--- | :--- | :--- | :--- |
| **Today (1D)** | **15 Minutes** | 15-minute intraday OHLCV bars | Intraday price swings and same-day position tracking |
| **1 Week (1W)** | **30 Minutes** | 30-minute intraday bars across 5 sessions | Short-horizon momentum and swing trade progression |
| **1 Month (1M)** | **1 Hour** | Hourly intraday bars | Multi-week trend holding performance |
| **3 Months (3M)** | **1 Day (Daily)** | Daily official closing bars | Quarterly cycle and regime-transition tracking |
| **Year to Date (YTD)** | **1 Day (Daily)** | Daily official closing bars from Jan 1 | Annual benchmark comparison against SPY |
| **1 Year (1Y)** | **1 Day (Daily)** | Daily official closing bars over 252 trading days | Full-year Sharpe, drawdown, and win-rate analysis |
| **5 Years / All** | **1 Week (Weekly)** | Friday weekly closing bars | Macro regime stress-testing across full market cycles |

### 8.2 Truthful Representation Standard
1. **No Stale Carryover**: Active open trades must be evaluated against genuine intermediate price points. An open trade entered at $100 and closed 20 days later at $120 cannot be plotted as a flat line at $100 followed by a sudden $20 vertical jump at exit.
2. **Missing Bar Transparency**: If historical API data is missing for a specific ticker on a specific timestamp, the system logs a notice and linearly interpolates only if bounded, or explicitly flags the gap rather than synthesizing fictitious market bars.

---

## 9. The Nine-Regime Market Matrix

ASTR maps broad market conditions into a 3x3 matrix using SPY (S&P 500 ETF) as the primary macro proxy. This prevents strategies from operating blindly during hostile macroeconomic environments.

```text
                        SPY 20-DAY HISTORICAL REALIZED VOLATILITY
                       Low (<15%)        Normal (15-28%)      High (>28%)
                    +------------------+------------------+------------------+
   Bull (> +5%)     |     Regime 1     |     Regime 2     |     Regime 3     |
SPY                 |    Steady Bull   |   Volatile Bull  |    Chaotic Bull  |
200-DAY             +------------------+------------------+------------------+
SMA    Neutral      |     Regime 4     |     Regime 5     |     Regime 6     |
TREND  (-5% to +5%) |  Quiet Sideways  | Dynamic Sideways | Turbid Sideways  |
                    +------------------+------------------+------------------+
   Bear (< -5%)     |     Regime 7     |     Regime 8     |     Regime 9     |
                    |    Slow Grind    |   Orderly Bear   |   Panic Crash    |
                    +------------------+------------------+------------------+
```

### 9.1 Regime Parameters
1. **Macro Trend Axis (SPY vs. 200-Day SMA)**:
   - **Bullish**: SPY closing price is > +5.0% above its 200-day simple moving average.
   - **Neutral**: SPY closing price is between -5.0% and +5.0% of its 200-day simple moving average.
   - **Bearish**: SPY closing price is < -5.0% below its 200-day simple moving average.
2. **Volatility Axis (SPY 20-Day Realized Annualized Volatility)**:
   - **Low**: Annualized volatility < 15.0%.
   - **Normal**: Annualized volatility between 15.0% and 28.0%.
   - **High / Crisis**: Annualized volatility > 28.0%.

### 9.2 High-Volatility Precedence
- When 20-day realized volatility exceeds 28.0%, the market is classified into a **High Volatility regime** regardless of whether price is slightly above or below moving averages.
- High volatility immediately enforces defensive capital rules: maximum position sizes are trimmed by 50%, stop-losses are widened to prevent whipsaws, and the Skeptic's disqualification weighting is doubled.

### 9.3 Point-in-Time Calculation
Regime classification must use strictly point-in-time data calculated at the 6:00 PM ET nightly close. Backtesting and historical audit replays must use the exact regime classified on that historical calendar date without utilizing future price information.

---

## 10. Lead Quantitative Self-Audit Engine (The 4 Pillars)

The Lead Researcher operates as an independent internal auditor, auditing both simulated research records and live trade logs. The audit runs automatically every evening at 6:00 PM ET and every Saturday at 10:00 AM ET, and can also be triggered manually on the Audit Desk.

```text
+-----------------------------------------------------------------------------------+
|                            THE 4 AUDIT PILLARS                                    |
+-----------------------------------------------------------------------------------+
| Pillar 1: Raw-Bar Trade Reconstruction                                            |
|   - Re-queries raw historical OHLCV bars for every filled order.                  |
|   - Verifies entry price fell inside [Low, High] of entry session.                |
|   - Verifies exit price fell inside [Low, High] of exit session.                  |
|   - Confirms live day trades were exited on same calendar date before close.      |
+-----------------------------------------------------------------------------------+
| Pillar 2: Independent Scoreboard Recalculation                                    |
|   - Recomputes win rates, net profit, and trade count from scratch from raw logs. |
|   - Compares computed results to displayed metrics in the Research Lab.           |
|   - Flags discrepancy if variance exceeds $0.01 or 0.1% win rate.                 |
+-----------------------------------------------------------------------------------+
| Pillar 3: Saturday Closed-Loop Balance Reconciliation                             |
|   - Verifies mathematical identity:                                               |
|       Starting Capital + Net Realized P&L - Fees = Stored Account Balance         |
|   - Flags any unexplained drift, phantom credit, or unrecorded cash loss.         |
+-----------------------------------------------------------------------------------+
| Pillar 4: Point-in-Time Anti-Lookahead Validation                                 |
|   - Inspects research candidates and logged qualification timestamps.             |
|   - Confirms candidate indicators were computed using only bars dated <= run date.|
|   - Flags any strategy that referenced future prices or earnings reports.         |
+-----------------------------------------------------------------------------------+
```

### 10.1 Audit Status Codes
- **PASS**: All reconstructed values match database records within strict numerical tolerances (<= $0.01).
- **WARNING**: Discrepancies caused by missing external historical bars from the data vendor, or historical trade anomalies logged prior to system upgrades.
- **FAIL**: Internal logic corruption, mathematical drift in cash accounts, fills occurring outside authentic market price boundaries, or detected look-ahead bias.

### 10.2 The Discrepancy Ledger
Every anomaly detected by the audit engine is appended to an immutable `audit_discrepancies` ledger with:
- Timestamp of audit run
- Pillar category (Pillar 1-4)
- Ticker symbol and trade ID
- Expected value vs. Actual recorded value
- Status severity (Warning vs. Critical Failure)

---

## 11. Capital Calibration, T+1 Settlement & Adaptive Allocation

To ensure institutional realism even on cash accounts, ASTR strictly models SEC/FINRA **T+1 Settlement Rules**.

### 11.1 T+1 Cash Settlement Logic
- **Stock Trade Settlement**: Under current US market regulations, stock purchases and sales settle on the next business day (T+1).
- **Proceeds Gating**: When a stock is sold on Monday, the cash proceeds are marked as **Unsettled Cash** until Tuesday morning at 8:30 AM ET.
- **Good Faith Violation Prevention**: Unsettled cash cannot be used to fund new live BUY orders if doing so would trigger a brokerage restriction. The execution engine enforces:

Available Buying Power = Total Cash - Unsettled Proceeds (T+1) - Reserved Capital

### 11.2 Dual Capital Pools (Short vs. Long)
To prevent swing positions from locking up day-trading capital (and vice versa), portfolio funds are partitioned into two distinct allocations:

```text
+-----------------------------------------------------------------------------------+
|                             TOTAL PORTFOLIO CAPITAL                               |
+-----------------------------------------+-----------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
       +----------------------------+            +----------------------------+
       |      SHORT-TERM POOL       |            |       LONG-TERM POOL       |
       |     (1 - 3 Day Holds)      |            |      (4+ Day Holds)        |
       |  Allocation: ~40% Capital  |            |  Allocation: ~60% Capital  |
       |  Turnover: High            |            |  Turnover: Low to Medium   |
       |  Target: Quick momentum,   |            |  Target: Multi-week trend, |
       |  breakouts, earnings pops  |            |  growth, deep value        |
       +----------------------------+            +----------------------------+
```

- **No Cannibalization**: The short-term pool cannot borrow capital from the long-term pool without explicit user rebalancing.
- **Position Ceilings**: No single stock can consume more than 20% of its respective pool, ensuring diversified exposure.

---

## 12. Event Intelligence & Entertainment/Events Research Layer

ASTR incorporates a zero-cost research pipeline that ingests public corporate filings directly from the **SEC EDGAR system** without third-party API fees.

### 12.1 Supported SEC Filings
- **Form 8-K (Unscheduled Material Events)**: Executive changes, earnings announcements, major contract wins, corporate restructurings, bankruptcy notifications.
- **Form 10-Q (Quarterly Reports)**: Unaudited financial statements, revenue acceleration, cash flow changes.
- **Form 10-K (Annual Reports)**: Full audited financials, business risk factor revisions.

### 12.2 Research-Only Catalyst Scoring
1. **Automated Keyword & Sentiment Extraction**: Ingested filings are scanned for material catalyst keywords (e.g., "merger agreement", "exceeded guidance", "litigation settlement", "default").
2. **Catalyst Impact Score (-100 to +100)**: Filings are assigned an objective score reflecting potential impact on near-term price behavior.
3. **Strict Research Isolation**: Filing scores serve as research context in the Analyze Desk and Research Lab. In accordance with Core Constraints, **an SEC filing event cannot autonomously liquidate live positions or trigger emergency sells without explicit user approval**.

---

## 13. Complete Screen-by-Screen Navigation & Feature Guide

ASTR organizes its workflow across clean, dedicated views designed for clarity, data density, and risk control.

### 13.1 Home / Dashboard (`/index`)
- **Portfolio Overview**: Real-time display of total account value, cash balance, unsettled T+1 cash, and today's total P&L.
- **Live Holdings Table**: Displays all currently open positions with ticker symbol, current market price, entry price, unrealized dollar P&L, percentage gain/loss, holding type (Day vs. Swing vs. Long-Term), and the **Owning Researcher** who qualified the setup.
- **Quick Action Triggers**: Instant links to launch Analyze, inspect Research Lab, or check the Audit Desk.

### 13.2 Analyze Desk (`/analyze`)
- **Candidate Research Bar**: Enter any US equity ticker (e.g., NVDA, AAPL, PLTR) to run an on-demand multi-horizon scan.
- **Parallel Specialist Ranking**: Instantly displays cards for all 6 specialists (Trend, Contrarian, Consistency, Growth, Risk, Skeptic) showing:
  - Qualification score (0-100)
  - Recommended holding period
  - Specific mathematical setup triggers
  - Skeptic's counter-arguments and risk warnings
- **Lead Synthesis**: Shows the top-ranked specialist or recommends a PASS if qualifications fail.
- **Live Buy Confirmation Modal**: If user decides to execute, a confirmation dialog appears showing target allocation, estimated shares, stop-loss price, and requires an explicit click to submit to Alpaca Live.

### 13.3 Research Lab (`/research`)
- **Strategy Leaderboard**: Displays long-term win rates, cumulative profit, average holding period, and profit factor for each researcher persona.
- **Strategy Equity Curves**: Interactive time-series performance graphs with selectable zoom tabs (**Today 15m, 1W 30m, 1M 1h, 3M Daily, YTD Daily, 1Y Daily, 5Y Weekly**).
- **Recent Research Trades**: Complete ledger of simulated paper trades with simulated entry date, exit date, and realized return.

### 13.4 Audit Desk (`/audit`)
- **Pillar Status Dashboard**: Clear visual badges (PASS, WARNING, FAIL) for each of the 4 Lead Self-Audit pillars.
- **Discrepancy Ledger Table**: Filterable log of all historical anomalies, fill discrepancies, and missing-bar notices.
- **"Run Audit Now" Button**: Allows immediate on-demand re-execution of the 4-pillar audit suite.

### 13.5 Regimes View (`/regimes`)
- **Current Market Condition**: Displays active SPY trend (vs. 200 SMA), 20-day realized volatility, and the active 1-of-9 regime card.
- **Historical Regime Timeline**: Chart showing historical regime transitions over the past 12 months.
- **Regime Defense Rules**: Summary of active risk modifiers, position size caps, and researcher weighting adjustments.

### 13.6 Settings & Live Controls (`/settings`)
- **Live Trading Master Toggle**: Hardware-style switch requiring confirmation to enable live order routing.
- **Brokerage API Status**: Displays Alpaca connection health, account buying power, and paper/live mode verification.
- **Notification Preferences**: Configurable alerts for scan completions, target holding exits, and audit warnings.

---

## 14. Roadmap Phases Summary (Phases A through J)

| Phase | Title | Focus & Core Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **A** | **Researcher-Fit Engine** | Per-stock ranking across holding horizons; Skeptic exclusion from buy rank; owning researcher logged on entry. | Complete |
| **B** | **Continuous Performance Lab** | Continuous mark-to-market performance curves across 7 zoom intervals (15m to weekly); honest equity tracking. | In Progress |
| **C** | **Market Regimes & Data Foundation** | 9-regime SPY matrix; high-volatility precedence; 0.1% transaction friction; point-in-time calculation. | Complete |
| **D** | **Live Execution Firewall** | Elimination of paper keys; manual confirmation for live BUYs; overnight protection on day trades. | Complete |
| **E** | **Lead Quantitative Self-Audit** | 4-pillar verification (raw-bar fills, scoreboard recalculation, balance reconciliation, anti-lookahead); Audit Desk. | In Progress |
| **F** | **T+1 Cash Realism** | Strict T+1 cash settlement simulation; prevention of good faith violations; unsettled cash gating. | Planned |
| **G** | **Adaptive Capital Calibration** | Dual capital pools (Short: 1-3 days, Long: 4+ days); volatility-adjusted exposure ceilings; anti-cannibalization. | Planned |
| **H** | **Event Intelligence & Entertainment** | Zero-cost SEC EDGAR 8-K/10-Q ingestion; filing sentiment scoring; non-exclusive catalyst research layer. | Planned |
| **I** | **System Purge & Code Hardening** | Second-to-last phase: removal of duplicate helpers, dead types, and legacy placeholders without altering behavior. | Planned |
| **J** | **Complete System Breakdown** | Final phase: Comprehensive institutional manual (`FEATURES.md`) documenting all formulas, personas, and workflows. | Complete |

***
*End of ASTR Autonomous System Manual (`FEATURES.md`)*
