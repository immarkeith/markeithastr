# Researcher metrics and live graph label

## What will change

- Keep each short-term researcher focused on Same-Day P&L, Same-Day Win Rate, and one Same-Day performance graph.
- Remove every user-visible 3-day P&L, return, value, graph line, legend, notebook column, test summary, and explanatory label across ASTR.
- Keep existing stored history and paper-test mechanics intact so unrelated research automation is not disrupted; the removed 3-day information will no longer appear in the app.
- In each researcher’s details, show Same-Day Return and Same-Day Value only.
- Add a Long-Term Win Rate area with separate 1 Month, 3 Months, and 9 Months selectors. Each selection uses only that researcher’s completed predictions for that exact horizon and shows an explicit insufficient-data state when appropriate.
- Keep long-term research as prediction accuracy only—no researcher long-term P&L total or graph.
- Always show “Where researchers agree & disagree” below the Lead suggestions. When there is nothing to report, show a quiet empty-state message instead of hiding the section.
- On the Home graph’s LIVE view only, show `LIVE — TICKER` using the current real same-day holding. Hide it outside LIVE, when the market is closed, or when no current holding exists.

## Data and behavior preserved

- One shared long-term candidate per trading day remains shared by all researchers.
- Each researcher’s 1M, 3M, and 9M prediction and outcome remains separate.
- Existing shared market-price history remains the source; no duplicate price storage is added.
- Live trading rules, sell timing, position management, P&L calculations, long-term live holdings, and the short-term scoreboard are unchanged.

## Technical details

- Add a gated server read that groups completed `research_horizon_predictions` by researcher lane and exact horizon, returning wins, completed tests, and win rate for 1M/3M/9M.
- Feed those statistics through the existing Research Lab query and researcher detail cards.
- Simplify the Lab graph call to the same-day rows only and remove the dual-metric presentation helper.
- Add an optional live-position label to the shared graph component, with its visibility derived from the selected range and the existing market-status utility. Only Home supplies this label.
- Remove remaining user-visible 3-day references from Research Lab, research summaries, notebooks, and verification-period displays without altering unrelated horizon calculations.
- Verify the app typechecks and confirm the Home and Research Lab states in the running preview.
