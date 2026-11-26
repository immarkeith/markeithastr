# Production research replay (manual GitHub Actions run)

Use this one-time workflow to copy the verified June 2021 research setup into the production database. It is intentionally manual: no push, schedule, or application visitor can trigger it.

## What the run does

1. Checks the exact confirmation phrase and the four existing Actions secrets. Secret values are never printed.
2. Uses the locked 2,417-symbol 2026-11-26 stock manifest, including SPY, so production uses the same research cohort as the verified preview replay.
3. Downloads missing adjusted daily bars in monthly windows. Existing bars are preserved with upsert-only writes; rerunning is safe.
4. Saves the old researcher ledger both as a `research_runs` archive and as a downloadable run artifact before replacing it.
5. Replays all seven paper researcher books continuously from June 1, 2021.
6. Refreshes immutable selections, their outcomes, historical selection snapshots, and the saved Research Lab graph in dependency order.
7. Re-reads the saved rows and graph. The run fails on identity, continuity, date-order, snapshot, unexpected missing-session, start-date, or lane-coverage errors.

The two approved low-coverage sessions, October 25, 2021 and March 8, 2022, remain saved as raw market data but excluded from the books and graphs. They are the only missing sessions the final gate allows. This is arithmetic/source certification, not point-in-time membership or corporate-action certification.

No step places an order, changes a trade, changes live-trading settings, or deploys the website. Alpaca credentials are present only in the market-data download step.

## Run it

1. Open the canonical GitHub repository and confirm this workflow commit is on `main`.
2. Open **Actions → Production Research Replay (Manual) → Run workflow**.
3. Select the `main` branch.
4. In the confirmation field, type exactly `REPLAY PRODUCTION RESEARCH`.
5. Leave **from** as `2020-07-01` for the first full run. Leave **until** blank to finish at the last completed UTC day; the provider end is exclusive.
6. Click **Run workflow**. If the repository's `production` environment requires approval, approve the run there.
7. Wait for every step to finish. The full download and replay can take hours; closing the browser does not stop GitHub's runner.
8. After the green run, hard-refresh the live Research Lab. Every researcher should report saved sessions beginning **2021-06-01** and ending at the latest replayed session.

The workflow uses the existing repository or `production`-environment secrets named `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALPACA_LIVE_KEY_ID`, and `ALPACA_LIVE_SECRET_KEY`. The credential preflight reports only missing names, never values.

## If it stops or fails

- Read the first failed step in the Actions run. Do not treat a partial run as complete.
- The download is restartable. For a provider timeout or temporary network failure, run the same workflow again with the same window.
- Before the ledger is cleared, the previous rows are archived in the database and written to `pre-replay-ledger.json`. The artifact also contains `certification.json` when certification was reached. Artifacts are retained for 30 days.
- A failed downstream stage remains marked failed and cannot produce a green run. Selection/history writes are additive; no historical pick is rewritten.
- For an interrupted data download, a later manual resume can use a narrower **from** date. Use the full default again for a normal retry unless the run log establishes a specific completed boundary.

## After the one-time run

This workflow does not replace the app's nightly research hooks. Those existing production schedules must remain enabled so future sessions append incrementally and the saved Lab graph refreshes automatically. The manual workflow is only the historical bootstrap and recovery path.
