# Historical data expansion — verified 2026-11-17

## Completed download, not a completed graph reconstruction

`scripts/expand-research-history.ts` downloaded the established **624-symbol cached research cohort**, including SPY, in monthly windows from **2020-07-27 through 2026-11-16**. Database readback: **900,233 daily bars**, up from **286,989** (+613,244), across **2,194 total stored tickers**. Other cached tickers have shorter/sparse coverage and are not all members of the established cohort.

All existing price rows were preserved with duplicate-key inserts ignored. No trades, balances, settings, researcher formulas, graph designs, performance intervals or saved researcher results were changed. No brokerage orders were submitted. The source remained Alpaca IEX with `adjustment=all`; no secondary-provider prices were mixed into the shared cache.

## 80% gate: six years is NOT certified

For the fixed 624-symbol cohort, the conservative requirement is **500 valid symbols per session**. Exact cohort-only database aggregation found:

- First passing session: **2021-01-12**.
- Last under-covered session: **2022-03-08**.
- Uninterrupted passing coverage: **2022-03-09 onward**.
- 2020 coverage was below 500 symbols per session.

No securities were removed from the denominator merely because their earliest downloaded bar is later. Verified listing-date evidence is needed to exclude not-yet-listed securities. Downloaded bars alone cannot establish that evidence.

**This cohort is not the full eligible market.** The existing adapter returned **12,677 active tradable non-OTC alphabetic symbols** from Alpaca; that is a raw candidate pool, not the price/liquidity-filtered eligible research universe. Current settings also have a scanner cap; neither a cap nor a 300/624-stock cached shortlist establishes the user's requested largest reliable universe. Historical membership, inactive security identities, timestamped fundamentals and corporate-action provenance still require verification. Current-survivor history retains survivorship bias.

## Validation

- Actual provider downloads and saved-bar readback completed.
- 14 tests passed: 80% gate, not-yet-listed handling, price validation and existing researcher ledger rules.
- Latest available app validation log: build OK.
- Invalid or out-of-window provider rows were rejected (27,469 returned rows, including non-session/out-of-window data; not a count of missing trading sessions).
- No historical ranking or chart replay was run: the existing reconstruction runner does not fulfill all requested complete rankings, configured horizons and input-boundary requirements.

## Remaining acceptance work

1. Establish today's genuinely eligible universe and historical comparable membership using verified listing evidence, including reliably available inactive securities.
2. Fetch any additional required history and apply the shared 80% gate to actual comparable eligible counts, not raw symbol counts.
3. Reserve formula warm-up before the first research day; stored start is not automatically usable scoring start.
4. Implement/verify independent daily complete rankings, number-one observations, existing performance intervals and append-only ongoing operation before chart certification.
5. A separate production database is not proven to contain this download; apply the portable script there if it is separate, using that host's existing securely configured credentials.

Portable usage: `bun scripts/expand-research-history.ts --from=2020-07-27 --until=2026-11-17`. A locked JSON manifest with a `symbols` array can be supplied with `--symbols-file=...` to avoid changing the cohort between windows. Completion output intentionally keeps `full_market_verified: false` and `replay_performed: false`.