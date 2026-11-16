# Recent ASTR setup — November 16, 2026

## What was verified
- GitHub main contains the corrected BYOB update `86c759f`; GitHub records its Vercel deployment as successful. User screenshots confirm Ready and NVDA research readback.
- Engineer PR #5 was merged; recent Engineer workflows succeeded.
- The connected database contains 4,627 researcher ledger rows (seven lanes × 661 sessions), through November 13, and all corrected BYOB storage. Its 15 corrected models are 12 provisional and three integrity-blocked; zero active.
- An authenticated local integrity callback saved a report and the unlocked Audit Desk displayed its history. Unauthenticated callbacks return 401. Existing discrepancies remain visible, not repaired.

## Changes in this update
- Existing job destinations and x-hook-secret authentication are preserved. UTC schedules cover both Eastern DST offsets; the app accepts only its intended local-time window. Half-day exits run at 12:45 and retry at 12:52 Eastern.
- Entries run 9:35; exits 3:45 and retry 3:52; key check 8 AM; daily research cycle 5:30 PM Eastern. The existing saved-Lab job refreshes and audits at 6 PM weekdays and 10 AM Saturday. No new subscription or service.
- Newly produced predictions retain the actual stock/proxy input boundary. Historical proxy features now stop before the entry session, just like stock features. This proves the recorded price boundary, NOT a historically frozen formula or survivorship-free universe. Legacy records are neither rewritten nor credited with invented evidence.
- Replay refuses an incompatible checkpoint instead of deleting old research; existing predictions are not overwritten.

## User steps
1. In Vercel, open ASTR → Deployments. Find the **new** change titled “Finish Eastern scheduling and preserve research input evidence.” Wait for **Ready**. If automatic deployment does not appear, redeploy that latest main change, not the older BYOB deployment.
2. Open the production site using Vercel's **Visit** button. Open Analyze → NVDA, then Research → All, then append `/audit` to that same address. Confirm saved research, chart history, and audit history appear. Provisional and historical audit FAIL are expected limitations, not instructions to alter balances.
3. Keep Autonomous Live Trading OFF until production schedules are confirmed. This work did not enable any live switch. The inspected connected database has both live automation and the general bot off; the independent site's settings may differ.
4. If Vercel uses another database, its owner must apply the schedule changes below there. Do NOT run them just because the inspected database has been updated: job IDs differ by database. No new schema migration is needed for this update.
5. After the next market session, check Research for November 16 results and `/audit` after 6 PM Eastern. To verify settlement, observe an actual paper sale: its proceeds must not be spendable until the next open session. No live trade is required.

## Separate-database schedule copy
Only run after the new app update is Ready. Use each database's actual matching job IDs/names. These statements preserve stored destinations and credentials. If a named job is missing, do not create unauthenticated replacements; stop and verify the authorized scheduler setup.

```sql
SELECT cron.alter_job(jobid, schedule := CASE jobname
  WHEN 'astr-daily-cycle' THEN '30 21,22 * * 1-5'
  WHEN 'astr-preclose-exit' THEN '45 16,17,19,20 * * 1-5'
  WHEN 'astr-preclose-retry' THEN '52 16,17,19,20 * * 1-5'
  WHEN 'astr-preopen-recheck' THEN '35 13,14 * * 1-5'
  WHEN 'astr-key-check' THEN '0 12,13 * * *'
  WHEN 'astr-lab-refresh' THEN '0 14,15,22,23 * * *'
END, active := true)
FROM cron.job
WHERE jobname IN ('astr-daily-cycle','astr-preclose-exit','astr-preclose-retry',
  'astr-preopen-recheck','astr-key-check','astr-lab-refresh');
```

## Still blocked, not forgotten
- Production authenticated inspection: available deployment URLs require Vercel sign-in. Local authenticated verification is not production verification.
- First scheduled paper session and real live execution cannot be verified before the market opens; no real-money test was initiated.
- Untouched future BYOB holdout sessions and source/corporate-action evidence cannot be manufactured. DELL/SHOP/ANET historical integrity review remains pending authentic evidence.
- Historical audit fill/balance discrepancies need source and bookkeeping reconciliation before any correction. This update does not authorize invented P&L or balance adjustments.