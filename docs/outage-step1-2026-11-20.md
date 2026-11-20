# Step 1 outage repairs — November 20, 2026

## Applied and verified
- Reproduced 18 fill errors across 13 paper trades against exact-session cached ranges.
- Annotated five closed zero-profit outage records without changing historical prices, cash or booked results. Saved per-record before/after evidence in the repair log.
- Quarantined seven proven-invalid stale open research entries. These remain open with null exit prices and null profit; no principal return or invented breakeven sale was posted.
- Automatic health detection requires more than five trading sessions past the target, a real invalid-entry bar, internal paper mode, a strategy identity, and no broker order.
- Normal paper closing and hypothetical same-day evaluation now reject invalid or unverifiable entries. Missing-exit retries cannot erase explicit entry quarantine. Valid-entry exit recovery still works.
- Saved scoreboard excludes explicit quarantines; saved daily research curves remain unchanged.
- Maintenance script `bun scripts/repair-paper-outages.ts` is portable to the independent host's existing environment. Second run annotated zero rows and quarantined zero rows.
- 29 rule/regression tests pass. Unlocked Audit Desk manual result saved and read back on desktop and 390×710 phone, with no overflow or runtime errors.

## Remaining exception and honest verdict
GNK trade `e14dae3a-8b53-46aa-b24c-97264a338247` has a booked $0.30 gain and a linked profit reserve, not a zero-dollar breakeven as the earlier plan claimed. Its two fill violations remain FAIL pending the user's reversal decision. No profit or ledger adjustment was made to this exception.

Latest saved audit: 2 fill errors, 0 scoreboard errors, 0 cash-book errors. Evidence gaps remain warnings; a green PASS cannot honestly be certified while evidence is missing. Daily/weekly FAIL alerts remain enabled. Independent production deployment and scheduled firing are not verified. Graph Steps 2–4 are unchanged and require later authorization.