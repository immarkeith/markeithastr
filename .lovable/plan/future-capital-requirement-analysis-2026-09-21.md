# Future Capital Requirement Analysis

## Goal
Add an advisory capital-planning section to the Research Lab. It will use only completed paper-research results, clearly show when evidence is still being collected, and never alter live trading, research formulas, position sizing, or scoreboards.

## Build

1. **Calculate readiness from existing research history**
   - Count completed same-day paper results from the seven active researcher books only.
   - Count completed 1M, 3M, and 9M researcher predictions separately.
   - Show progress against the minimums: 250 same-day, 30 one-month, 20 three-month, and 10 nine-month observations.
   - Keep collecting and using all later results after the minimums are reached.
   - Report the observed testing span and market-condition coverage from the existing market-proxy history, with a narrow-coverage warning when appropriate.

2. **Build the advisory projection**
   - Use actual completed same-day return percentages and actual testing frequency; do not invent returns.
   - Retain separate summaries for each researcher/strategy: trades, wins/losses, average return, average winner, average loser, observed frequency, cumulative performance, maximum drawdown, and longest losing streak.
   - Use the same-day paper results for capital-return math. Use long-term outcomes for readiness and horizon-specific evidence only; never combine unrelated long-term returns into a P&L total.
   - Once all minimums are met, work backward from $52,000/year and show estimated capital per bot, total estimated capital, observed monthly/annualized performance, included strategies, and assumptions.
   - If observed annual performance is zero or negative, say the target cannot be supported by the current evidence instead of producing a false capital figure.

3. **Add configurable six-bot planning UI**
   - Default the model to 6 bots and allow the displayed model to be changed without saving or changing trading settings.
   - While below any minimum, show “Capital Analysis: Collecting Data” and exact progress.
   - When all minimums are met, show “Capital Analysis: Ready,” the projection, the market-coverage note, strategy-level evidence, and a clear paper-results/no-guarantee disclaimer.
   - Keep this section visually separate from researcher scoreboards and current capital controls.

4. **Preserve the shared-data architecture**
   - Continue using `daily_bars` as the one shared stock-price history for scans, all researcher formulas, long-term checkpoints, and this analysis.
   - Do not add per-researcher market-data tables, duplicate bars, new downloads, or external sources.
   - Researchers continue to apply and record their own independent formulas and predictions; long-term prediction dates remain unchanged and are never backdated.
   - No database migration is needed because the required completed results and shared price history are already stored.

## Validation
- Verify the current database counts feed the progress display correctly.
- Confirm changing bot count changes only the projection.
- Confirm no projection appears before all four minimums are met.
- Confirm no live settings, orders, position sizes, scoreboards, or research formulas are modified.
- Run the project’s automated checks and inspect the Research Lab at desktop and phone widths.
