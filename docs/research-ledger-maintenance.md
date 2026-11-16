# Research ledger maintenance

## Portable operation

Run `bun scripts/backfill-research-ledger.ts` on a trusted machine configured for the intended app database. It uses the existing server database settings and Alpaca live credential pair for **market data only**, never for orders. Keep credentials in the host environment, not source or logs.

The script freezes the existing 300-symbol `scan_input` universe for the download, adds SPY, requests monthly IEX adjusted daily bars from January 2024, validates prices, and inserts missing keys in batches of 500. Existing prices are neither overwritten nor deleted. Rerunning is safe. `--replay-only` skips the download.

After ingestion, researchers apply their current formulas to chronological historical features, and save daily $100 paper-book levels to `researcher_daily_ledger`. Charts read only those rows; Today uses the last saved session, weekly display retains actual session dates, and empty windows do not reconstruct trades. Missing held-stock marks are flagged as pending; no sale occurs without its session price.

## Verified preview run: November 16, 2026

- Provider accepted November historical bars with the free IEX feed.
- 301 requested symbols, including the benchmark; market history starts January 2, 2024 and extends through November 13, 2026.
- Seven researchers, 661 evaluated sessions each: March 28, 2024–November 13, 2026 (after indicator warmup).
- 4,627 saved researcher rows, read with deterministic date/lane pagination.
- All 32 tests passed. Unlocked browser checks confirmed seven charts; 1M, 3M, 1Y, All and Today produced finite saved-result paths. Phone viewport 390×710 had no horizontal overflow.

## Boundaries and limitations

This run targets the database configured in the preview environment. The separate Vercel database was not changed or verified; run the same script with that deployment's environment to populate it. Code delivery does not deploy Vercel or transfer database rows.

The existing universe is alphabetically selected by `scan_input`, not verified as the top 300 liquid equities. This replay applies current researcher settings retrospectively; it is not a reconstruction of historical formula revisions or an out-of-sample performance certification. IEX has limited exchange coverage, and existing stored prices are preserved rather than re-normalized for corporate actions. No promise of smooth, profitable, full-market, or survivorship-free results is implied.

No trades, broker state, live settings, Engineer tasks, or schedules were modified by this maintenance run.