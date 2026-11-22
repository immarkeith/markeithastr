# Step 3 — historical selection graphs

Completed 2026-11-22 in the running project, without manual setup.

## Evidence and scope
- Reads immutable daily selections and paginated horizon-1 evaluations; never rescoring historical picks or changing their original evidence.
- Selection at T close, entry at T+1 open, exit at T+1 close. Only matured, consistent, finite-price outcomes with valid chronology count.
- Fixed $20 stake; exact price-derived gross dollar P/L is accumulated once. Curves are levels, not compounded portfolio returns. No-pick sessions remain flat; pending/missing outcomes are disclosed, never treated as wins or fabricated breakevens.
- All seven researchers (including Lead) have 508 recorded market-session points, November 6, 2024–November 16, 2026. The earlier plan's November 18 endpoint was not supported by stored SPY session evidence.
- Latest comparable cached cohort: 563 stocks. Historical listing/delisting membership remains unverified, explicitly disclosed in the UI. This is not a survivorship-free full-market certification.
- Versioned `research_runs` snapshots preserve legacy prototypes but never display them as verified Layer 2 curves. Page reads remain read-only. The existing daily callback saves a new historical snapshot after replay; no new scheduler or provider required.
- No trades, strategy ledger, broker state, cash books, settings, or live money changed.

## Verified totals
| Researcher | Matured | Wins | Gross P/L | Pending | No pick |
|---|---:|---:|---:|---:|---:|
| Lead | 507 | 249 | -9.96 | 1 | 0 |
| Trend | 506 | 240 | -18.19 | 1 | 1 |
| Contrarian | 410 | 207 | -4.40 | 1 | 97 |
| Consistency | 507 | 238 | -2.51 | 1 | 0 |
| Growth | 506 | 248 | -22.72 | 1 | 1 |
| Risk | 507 | 275 | +5.47 | 1 | 0 |
| Skeptic | 507 | 256 | +12.05 | 1 | 0 |

## Verification
- 31 tests across selection-curve, history-reconstruction, selection-evaluations, selection-replay and ledger-chart suites pass.
- Snapshot independently read back with structural equality.
- Unlocked `/lab` at 1280×1800 and 390×710; all seven graphs and 1W/1M/3M/YTD/1Y/5Y/All controls exercised, graph paths present, no horizontal overflow or page errors.
- Inspected phone Lead and desktop seven-graph screenshots.
- Preview build diagnostics report build OK.

## Remaining scope
Step 4 has not been authorized or executed: scheduled firing and independent production-host deployment are not established by preview checks. Historical membership and further price-history collection remain separate existing prerequisites, not silently claimed complete.
