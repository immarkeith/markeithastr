# Step 4 — Hardening & certification (2026-11-24)

## Results
- GitHub `b722ca2` (safeguards) deployed by Vercel to Production (deployment 7989924547, success).
- Live Vercel `/lab` (desktop 1280 and iPhone 390): no full-page crash, no overflow, 7 lanes. But all 7 researcher cards hit their section fallback:
  `TypeError: reading 'toFixed'` — a saved snapshot without the newer average-return fields (`=== null` missed `undefined`).
  Fixed in `src/routes/lab.tsx` (`fixed()` / `signedPct()` guards). Preview: 0 fallbacks on desktop and iPhone.
- Full pipeline `runSelectionGraphPipeline()`: ok in 329 s — replay (508 sessions, 2024-11-06 start), history snapshot readback (7 lanes), lab graph readback.
  Price-history load was the bottleneck (sequential walk over ~900k cached rows); now walks 26 alphabetical segments in parallel and fetches 16 tickers at a time (206 s for 624 tickers).
- Replay added 0 new selections: the newest cached session is still 2026-11-16, so no new day was available to select.
- `bun test`: 178 pass, 0 fail. `/audit`: WARNING, no FAIL violations.

## Open
- Recheck live Vercel `/lab` after the card fix deploys.
- The 329 s run is close to serverless function limits; watch the first scheduled nightly run.
