# X01–X08 implementation and production activation

Your explanatory answer key is authoritative. X09 is held. No migration, live order, cash-rule change, live permission expansion or historical book rewrite is included.

## Implemented and tested

- **X01:** Paper assignment offers Lead, Trend, Contrarian, Consistency, Growth, Risk and Skeptic. Legacy assignments are preserved. Existing live-buy permissions are deliberately separate and unchanged; the Analyze live-buy specialist ranking is not silently rebuilt by this research-only cleanup.
- **X02:** Forward outcomes include 1, 5, 10, 20, 60 and **180 sessions**. Missing long-horizon evidence forces full price-history access instead of using the latest-pick watermark. Pending old evaluations use their earliest needed history. Final outcomes and original picks remain locked.
- **X03:** Stored, validated daily bars are shared. Both replay paths use completed benchmark sessions and the approved June 2021 start, without the old 50%/80% density exclusions or an invented 400-stock substitute. Each stock still needs its real indicator warm-up and liquidity eligibility. Missing prices remain pending. Existing books and picks are not rewritten; retroactive book repairs would require a separate continuous replay and certification.
- **X04:** Lane formulas, scoring, simulated books and outcome models remain independent. Shared input is not blended P&L. This was already implemented and is preserved, not replaced with one common return model.
- **X05:** Scheduled Lab work checks the actual exchange session and open clock; manual functions remain unblocked. The hook no longer initializes a full history or bundles a deep audit into an intraday refresh. Identical payloads keep their prior generation timestamp. Empty quote responses preserve stored marks.
- **X06:** Existing scheduled preopen/preclose/daily-cycle hooks consult the read-only exchange calendar. Clock/calendar failure returns unavailable instead of claiming the market is open. Current-day unexpected closures and changed hours use that authority; standard historical/future holiday rules extend beyond 2026–2027. Device-local ticker, trade, audit, alert and Engineer timestamps use an explicit Eastern fallback before hydration. Existing market operations and live safeguards otherwise remain intact.
- **X08:** Selection validation uses the shared New York opening timestamp: 14:30 UTC in winter and 13:30 UTC in summer. Opening-bell/late selections stay excluded.

## X07 — prepared, not activated

The new authenticated `/api/public/hooks/monitor` does bounded read-only checks of configuration, stored-history/ledger availability and exchange access. No full backfills, scans, repairs, trading or deep investment audit run every five minutes.

`scripts/run-free-monitoring.ts` is optional for an **already available** always-on server. It runs sequentially, with no overlap: lightweight monitoring and market-gated Lab callbacks every five minutes, existing safe-repair health hourly, existing full integrity audit daily including weekends. Failed attempts wait until their next interval. No service is purchased; no runner is launched on deployment. Deep-audit frequency is a conservative proposal pending measured duration/free budget, not a claim that it is the fastest free interval.

Required server environment:
- `ASTR_APP_ORIGIN`: the independent production HTTPS origin.
- Existing database URL and server credential, already configured server-side.
- `ASTR_FREE_MONITORING_CONFIRMED=yes`: only after confirming the existing machine and request budget incur no added cost.

Run `bun scripts/run-free-monitoring.ts --once` for an explicit check or omit `--once` to continue. The script reads the existing hook credential privately and never prints it or response account evidence. Do not run multiple copies or retain duplicate schedules for the same work.

## Outstanding activation / verification

1. Deploy the committed revision to the independent production host.
2. For **production** long-horizon catch-up, run **Production Research Replay (Manual)** with exact confirmation `REPLAY PRODUCTION RESEARCH` and **outcomes_only** checked. This ignores backfill/book-replay switches, preserves picks/books, fills missing/pending evaluations, refreshes the saved view and runs the existing certification gate. It does not promise June 2021 selection evidence where no immutable picks were originally saved.
3. Confirm the always-on server/free-hosting budget before selecting the actual production cadence. Frequent calls are not automatically free on Vercel or GitHub. An existing-server runner does not remove app-host/database request costs.
4. Classify and update the **production** schedules through their owning scheduler. The connected catalog contains unmanaged jobs with no managed target/body metadata; their existing authentication was preserved and they were not migrated or edited. The current Lab job is hourly at several candidate times, not every five minutes. Existing health schedules have a weekend gap. **Those deployed schedule gaps remain unresolved until the actual production scheduler is accessible.** No Lovable-managed job or platform dependency was introduced.
5. Observe a real open-session refresh, an overnight/weekend check and a daily audit. Verify saved-result readback and time/duration/budget. A Saturday calendar probe cannot certify a market-open refresh or scheduled delivery.

## Verification evidence

- 212 tests passed: 206 TypeScript rules/regressions and six existing price-integrity checks.
- Actual AAPL Home lookup showed all seven assignment choices, including Skeptic. No assignment or buy was submitted solely for testing.
- Phone and desktop Lab rendered without horizontal overflow or page errors. A subsequent unlocked check showed saved June 2021 book dates and fully rendered researcher cards. Hidden nine-month sections remain hidden by earlier approved UI cleanup.
- Read-only configured-backend evidence: 9,646 book rows from June 1, 2021; 3,626 selection rows from August 26, 2024; initially zero 180-session outcomes; additive catch-up saved/read back 2,288 matured and 1,238 pending 180-session outcomes, creating no selections. Repeat refresh returned unchanged with the same generation timestamp. Book history and immutable pick history are different evidence and must not be labeled interchangeable.
- The provider calendar confirmed November 27, 2026 closed at 13:00 Eastern and November 30 opens 09:30/ closes 16:00. Current Saturday calendar/clock reported closed. Bounded monitor returned healthy with November 25 latest bar and ledger dates, without repairs.
- The configured backend is not independently proven to be the Vercel production backend. Production catch-up and deployed callback delivery must not be checked off from sandbox evidence.