# Phase E — quantitative integrity audit

## Delivered
- Entry and closed-exit paper fills checked against exact-session bars with 0.5% tolerance. Explicit intraday intent requires SAME_DAY, zero hold days and an entry-date target; inherited defaults on swing records are not overnight violations.
- All paper trades and cash entries are paginated. Null-strategy live books and broker APIs are excluded.
- Paper scoreboards compared with matching saved `lab_graph` entrants. Different trade counts are stale-cache warnings, not proof of corruption. Win rates respect the scoreboard's whole-percent rounding. Profit factor is calculated from gross gains/losses and compared when stored.
- Research graphs remain saved-ledger based. Audit verifies $100 base equity/P&L identities, never reconstructs graph points from trades.
- Balance reconciliation includes signed withdrawals, unsettled proceeds, reserved profit and open/pending-mark invested cost. Reserve-release transfers are not new deposits. Any penny difference fails.
- Historical runs/predictions need explicit signal and input-history boundaries. Missing provenance warns, including fewer than five verifiable samples. Outcome dates cannot substitute for input provenance.
- Manual checks save history without sending push alerts. Scheduled failures notify; warnings never push. A failed read cannot produce PASS. The existing daily cycle now records the audit.

## First verified preview result (2026-11-16)
Manual check saved and read back through the Audit Desk:
- Fills: 122 paper trades checked; 119 violations, five missing-bar warnings.
- Scoreboard/ledger identities: 10 books and 4,627 saved rows; two violations, three warnings.
- Cash: 10 paper books; eight discrepancies.
- Lookahead: zero provable boundaries; 31 warnings. This is NOT a clean bill of health.

These are discrepancies, not authorization to repair data. Historical rows, quarantines, balances, formula weights and live trading were not modified. Bar-adjustment conventions and legacy bookkeeping need investigation before accepting any re-pricing or balance correction.

## Deployment and remaining setup
The preview database now has `audit_integrity_results`; the portable, additive copy is `migration/fresh/19-phase-e-integrity-history.sql`. Apply it to any separate deployment database through that database's authorized maintenance process. The authorized ASTR server reads/writes history; public database clients cannot access it.

The inspected scheduler has a daily cycle but NO dedicated integrity job. Existing daily-cycle timing is not 6 PM Eastern. Exact daily 6 PM Eastern and Saturday 10 AM Eastern schedules remain unconfigured. Use the existing independent Vercel host and authenticated `/api/public/hooks/integrity` hook, body `{"cadence":"daily"}` or `{"cadence":"weekly"}`. Keep the hook secret in the scheduler's secret store; do not put it in source. Schedule in `America/New_York` to follow daylight saving time. Weekly uses 180 days and a larger evidence sample; daily uses 60 days. Do not repoint live scan/exit schedules as part of this setup.

Legacy runs do not contain input provenance. Add genuine cutoff recording to research producers in a separately reviewed change; never backfill invented provenance. Stale snapshots or missing cached profit factors remain disclosed limitations.

## Verification
`bun test` — 50 tests passed. Unlocked preview audit, saved result, read-back, category/severity filtering and phone layout were checked. No browser page errors or page-wide phone overflow. Vercel deployment/database and dedicated schedules were not verified.