# ASTR UI and layout reorganization

## Goal
Reorganize the existing ASTR information into a cleaner set of tabs without changing trading, scoring, research, schedules, alerts, settings, or execution behavior.

## Navigation
Use these primary tabs:
1. Home
2. Research Lab
3. Analyze
4. Trade Log
5. Scoreboard
6. Strategy
7. Alerts
8. Settings

Remove Research Verification and Research Log from the primary navigation after their useful views are folded into Scoreboard and Trade Log. Keep their existing URLs working so saved links do not break. Replace `/watchlist` with `/scoreboard`, while preserving `/watchlist` as a compatibility redirect.

## Home
- Keep the current broker-provided Account Value, Cash at Broker, Ready to Invest, Saved Profit, Currently Owned, bot controls/status, and P/L graph unchanged.
- Increase the existing scan-derived long-term suggestions from three to five and label them clearly as suggestions only.
- Remove “Up next,” candidate statistics, the candidate ranking table, and Rescore from Home so ranking information appears only on Scoreboard.
- Keep Home focused on current live-account information and the five long-term ideas.

## Research Lab
- Keep the existing three isolated paper-testing slots, Best Paper Formula calculation, holdings, “Up next,” controls, and per-slot P/L graphs unchanged.
- Reorganize the Research Department list with Lead Researcher permanently first, then enabled/recently active researchers, then inactive researchers.
- Preserve each researcher’s findings, notebook, experiments, paper results, and P/L information.
- Move researcher descriptions and ranked stock boards out of Research Lab and into Scoreboard.
- Keep non-ranking research evidence such as experiments, disagreements, dead ends, and Lead conclusions available in the Lab.

## Trade Log
- Combine live and paper/research trades into one display using the existing shared trade records.
- Clearly label every entry with its real source: Live Trading Bot, Lead Researcher where present, or the saved strategy/researcher name.
- Show BUY and SELL details, timestamps, prices, P/L, and existing context: recorded score-factor reasons, strategy description, exit rule, or saved status note. Do not generate new rationale.
- Default the recent view to approximately 72 hours, while also retaining each source’s latest relevant trade when it falls outside that window.
- Preserve access to full history and useful live/paper/open/closed filtering.

## Scoreboard
- Create `/scoreboard` as the single ranking and researcher-explanation destination.
- Reuse the latest live scan, Research Department board, paper strategy rankings, verification reports, and Lead Researcher summary. Do not introduce a second scoring pipeline.
- Provide a researcher/formula selector covering the existing specialist formulas, active paper formulas, and Live Trading Bot.
- Show a compact top-three preview and the selected source’s complete Top 10 with existing score values.
- Show the selected researcher/formula’s existing explanation beside its rankings.
- For the Skeptic, which does not independently rank stocks, clearly show its existing challenge/verification evidence instead of inventing a Top 10.
- Add the existing assistant recommendation, historical verification verdict, confidence, evidence, and the existing Lead Researcher decision/reasoning in one research-flow section.
- Preserve current watchlist approval information only where it adds status to a ranked ticker; do not keep a separate traditional Watchlist screen.

## Unchanged areas
- Do not modify Analyze.
- Do not modify Strategy behavior or controls.
- Do not modify Alerts.
- Do not modify Settings.
- Do not change formulas, scoring, researcher allocation, research methods, trading schedules, orders, settlement, or buy/sell rules.

## Technical details
- Reuse `fetchDashboard` for live account data and the existing watchlist-derived suggestions; only change the displayed suggestion count to five.
- Extend the existing trade-history read to include strategy-linked paper trades and resolve their saved strategy names/descriptions. This is read/display-only.
- Reuse `departmentOverview().last_run.summary.board` for specialist rankings and Lead findings.
- Reuse the existing paper ranking function/results for active paper formulas and `fetchLatestRun` for Live Trading Bot rankings.
- Reuse `verificationOverview()` for assistant evidence.
- Extract shared presentation helpers where needed so ranking and explanation UI is moved rather than duplicated.

## Validation
- Verify the revised navigation and all affected pages on desktop and mobile widths.
- Confirm Home still displays broker account values and the existing P/L graph.
- Confirm Scoreboard rankings match their source formula and no duplicate ranking board remains in Home or Research Lab.
- Confirm Trade Log identifies the actor and displays only already-recorded reasoning/context.
- Run focused type and route checks and inspect browser/server errors without executing or changing any trade.
