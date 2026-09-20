# ASTR fresh start — exact setup steps

These 9 files rebuild the database exactly as ASTR runs today (every table,
column, index, security rule, permission, the 8 strategies, the 6 researchers
plus Lead, the paper research slots, the Master Formula rules, the settings, and
the automatic daily schedule). Old research history is not included — the
researchers start writing new notes and findings from day one.

Each file is small enough to copy and paste on a phone.

## 1. New database
1. Create a brand-new project at supabase.com and wait for it to finish.
2. Open **SQL Editor**.
3. For each file in order (01 → 09): tap **+** for a new query, paste the whole
   file, make sure nothing is highlighted, tap **Run**, wait for *Success*.
   - If a warning about Row Level Security appears, choose **Run and enable RLS**.
4. Before running `09-schedule.sql`, edit two things inside it:
   - replace `https://YOUR-APP.vercel.app` with your live app address
   - replace `PASTE_A_LONG_RANDOM_SECRET_HERE` with any 32+ random characters
     (keep a copy — it is only used by the scheduler, nothing to paste elsewhere)

## 2. New app deployment
Create a new Vercel project from the GitHub repo and add these Environment
Variables (Production + Preview), then Deploy:

| Name | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `VITE_SUPABASE_URL` | same value |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase API page (anon/publishable key) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | same value |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase API page (secret key) — required |
| `SITE_PASSWORD` | the passcode you want for the lock screen |
| `SESSION_SECRET` | any 32+ random characters |
| `ALPACA_LIVE_KEY_ID` / `ALPACA_LIVE_SECRET_KEY` | Alpaca live account |
| `ALPACA_PAPER_KEY_ID` / `ALPACA_PAPER_SECRET_KEY` | Alpaca paper account |
| `NITRO_PRESET` | `vercel` |

Optional: `MARKET_DATA_API_KEY` (Polygon). Without it the app uses free Alpaca
IEX data. Optional: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
for phone push alerts.

## 3. Finish
1. Open the app address, unlock with `SITE_PASSWORD`.
2. Confirm the ASTR photo shows on the lock screen and header.
3. If the address changed after deploying, re-run `09-schedule.sql` with the
   correct address so the daily jobs point at the live app.

## What the schedule does (US Eastern, weekdays)
- 9:35 AM — pre-open check and buys
- 3:50 PM — close out same-day positions before the bell
- 5:30 PM — daily research cycle (Lead + two assistants)
- every 15 min in market hours + hourly otherwise — health check
