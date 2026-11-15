# Finish Phase K — AI Engineer

## Goal
Make /engineer fully working end to end: queue a task, watch it run on GitHub, review the verified change, approve it — with live trading never reachable.

## Step 1 — Lock down the database
- Re-run the updated Engineer setup (migration 17) on the active database so only the server can claim or heartbeat tasks.
- Confirm: the public key gets "permission denied" on all three task functions; the six Engineer tables exist.

## Step 2 — GitHub secrets (you add these)
- In GitHub repo Settings → Secrets → Actions: ENGINEER_LLM_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
- App side: GITHUB_ENGINEER_TOKEN and GITHUB_ENGINEER_REPO (immarkeith/markeithastr).
- I confirm each is present (never shown) via the /engineer health panel.

## Step 3 — AI model
- Current model is a free OpenRouter model (slow, sometimes empty replies). Keep it for $0, or switch once you fund an account.

## Step 4 — Pilot run (Level 1 task)
- Queue a harmless task, e.g. "fix a typo in the guide".
- Verify: lease → plan → patch → firewall → typecheck/lint/build → branch pushed → independent verify check on exact commit → "Review ready".
- Approve, confirm the merge lands that exact commit and a checkpoint is written.

## Step 5 — Safety drills
- Queue a task touching the broker file: must be blocked by the firewall.
- Queue a destructive SQL change: must be rejected.
- Run a recovery from the pilot checkpoint: must create a forward commit only.

## Step 6 — Close out
- Deployment stays off unless you set a deploy workflow.
- Update the roadmap and project notes; mark Phase K done.

## What I can't do for you
- Add GitHub Actions secrets or fund the AI account — those need you.
