# Phase K — Missing GitHub Actions Workflow Implementation Plan

## Problem Statement

The Phase K Self-Development AI Engineer (`/engineer`) is fully implemented in code (SQL migrations, server functions, runner, verifier, firewall, approval gate, health monitor, UI), but **the GitHub Actions workflow file `.github/workflows/astr-engineer.yml` is missing**. This workflow is required for the engineer to actually execute tasks end-to-end.

The workflow is referenced throughout the codebase:
- `src/lib/engineer/health.server.ts:161` - checks for `astr-engineer.yml` presence
- `src/lib/engineer/github.server.ts:220, 290` - dispatches workflow runs
- `docs/phase-k-deployment.md` - documents exact workflow requirements

## Current State

| Component | Status |
|-----------|--------|
| SQL Migration (`supabase/migrations/20261103010000_engineer_phase_k.sql`) | ✅ Complete |
| Server functions (`engineer.functions.ts`, `tasks.server.ts`, `approval.server.ts`, etc.) | ✅ Complete |
| Runner script (`scripts/engineer-runner.ts`) | ✅ Complete |
| Verifier script (`scripts/engineer-verify.ts`) | ✅ Complete |
| Firewall, lint, patch, plan, health, provider modules | ✅ Complete |
| UI routes (`/engineer`, `/engineer/recovery`) | ✅ Complete |
| **GitHub Actions workflow (`.github/workflows/astr-engineer.yml`)** | ❌ **MISSING** |

## Implementation Plan

### 1. Create `.github/workflows/astr-engineer.yml`

Based on `docs/phase-k-deployment.md` and the runner/verifier scripts, create a workflow with:

**Complete Workflow File Structure:**
```yaml
name: ASTR Engineer

on:
  workflow_dispatch:
  repository_dispatch:
    types: [engineer-task-queued]

jobs:
  engineer-runner:
    name: Engineer Runner
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write      # push engineer/* branch
      checks: write        # not used here; verifier job publishes check run
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      ENGINEER_LLM_API_KEY: ${{ secrets.ENGINEER_LLM_API_KEY }}
      GITHUB_RUN_ID: ${{ github.run_id }}
    steps:
      - name: Validate required secrets
        run: |
          for var in SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY ENGINEER_LLM_API_KEY; do
            if [ -z "${!var}" ]; then
              echo "::error::Missing required secret: $var"
              exit 1
            fi
          done
      - name: Assert credential isolation
        run: |
          if [ -n "$ALPACA_LIVE_KEY_ID" ] || [ -n "$ALPACA_LIVE_SECRET_KEY" ]; then
            echo "::error::Credential isolation violated: live trading keys present"
            exit 1
          fi
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ github.token }}
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run engineer runner
        id: runner
        run: |
          bun run scripts/engineer-runner.ts
        env:
          GITHUB_TOKEN: ${{ github.token }}
      - name: Upload runner outputs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: engineer-runner-output
          path: ${{ runner.temp }}/astr-engineer-*/result.json
          retention-days: 1

  independent-verify:
    name: Independent Verification
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: engineer-runner
    if: needs.engineer-runner.result == 'success'
    permissions:
      contents: read       # checkout exact SHA
      checks: write        # publish engineer/independent-verify check run
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      ENGINEER_LLM_API_KEY: ${{ secrets.ENGINEER_LLM_API_KEY }}
    steps:
      - name: Download runner outputs
        uses: actions/download-artifact@v4
        with:
          name: engineer-runner-output
          path: /tmp/engineer-output
      - name: Parse runner outputs
        id: parse
        run: |
          RESULT_FILE=$(find /tmp/engineer-output -name "result.json" | head -1)
          if [ ! -f "$RESULT_FILE" ]; then
            echo "::error::Runner output artifact not found"
            exit 1
          fi
          TASK_ID=$(jq -r '.task_id' "$RESULT_FILE")
          BRANCH=$(jq -r '.branch' "$RESULT_FILE")
          SHA=$(jq -r '.sha' "$RESULT_FILE")
          BASE_SHA=$(jq -r '.base_sha' "$RESULT_FILE")
          echo "task_id=$TASK_ID" >> $GITHUB_OUTPUT
          echo "branch=$BRANCH" >> $GITHUB_OUTPUT
          echo "sha=$SHA" >> $GITHUB_OUTPUT
          echo "base_sha=$BASE_SHA" >> $GITHUB_OUTPUT
      - name: Assert credential isolation
        run: |
          if [ -n "$ALPACA_LIVE_KEY_ID" ] || [ -n "$ALPACA_LIVE_SECRET_KEY" ]; then
            echo "::error::Credential isolation violated: live trading keys present"
            exit 1
          fi
      - name: Checkout exact commit SHA
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ steps.parse.outputs.sha }}
          token: ${{ github.token }}
      - name: Verify HEAD matches expected SHA
        run: |
          ACTUAL=$(git rev-parse HEAD)
          EXPECTED=${{ steps.parse.outputs.sha }}
          if [ "$ACTUAL" != "$EXPECTED" ]; then
            echo "::error::HEAD ($ACTUAL) != expected SHA ($EXPECTED)"
            exit 1
          fi
      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - name: Install dependencies
        run: bun install --frozen-lockfile
      - name: Run typecheck
        id: typecheck
        run: |
          bunx tsc --noEmit
        continue-on-error: true
      - name: Run lint
        id: lint
        run: |
          bun run lint
        continue-on-error: true
      - name: Run build
        id: build
        run: |
          bun run build
        continue-on-error: true
      - name: Determine verification outcome
        id: verdict
        run: |
          LINT=${{ steps.lint.outcome }}
          TYPE=${{ steps.typecheck.outcome }}
          BUILD=${{ steps.build.outcome }}
          echo "lint=$LINT" >> $GITHUB_OUTPUT
          echo "typecheck=$TYPE" >> $GITHUB_OUTPUT
          echo "build=$BUILD" >> $GITHUB_OUTPUT
      - name: Run independent verifier
        env:
          TASK_ID: ${{ steps.parse.outputs.task_id }}
          SHA: ${{ steps.parse.outputs.sha }}
          BRANCH: ${{ steps.parse.outputs.branch }}
          LINT_OUTCOME: ${{ steps.verdict.outputs.lint }}
          TYPECHECK_OUTCOME: ${{ steps.verdict.outputs.typecheck }}
          BUILD_OUTCOME: ${{ steps.verdict.outputs.build }}
          GITHUB_TOKEN: ${{ github.token }}
          GITHUB_REPOSITORY: ${{ github.repository }}
        run: |
          bun run scripts/engineer-verify.ts
```

### 2. Validate the Complete Loop

After creating the workflow:
1. Run the SQL migration in Supabase (if not already done)
2. Configure app secrets: `GITHUB_ENGINEER_TOKEN`, `GITHUB_ENGINEER_REPO`, `ENGINEER_LLM_API_KEY`
3. Configure GitHub Actions secrets: `ENGINEER_LLM_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
4. In `/engineer` → Provider settings: set LLM base URL and model
5. Queue a pilot task from `/engineer` UI
6. Verify the full flow: queue → runner → verification → review_ready → approve → merge → deploy dispatch

## Files to Create/Modify

| File | Action |
|------|--------|
| `.github/workflows/astr-engineer.yml` | **CREATE** - Main workflow file |
| No other files needed | The rest of Phase K is complete |

## Validation Steps

1. **Workflow syntax**: `gh workflow validate .github/workflows/astr-engineer.yml` (or push and check Actions tab)
2. **Secrets validation**: Runner step 1 explicitly checks and names missing secrets
3. **Credential isolation**: Runner/verifier abort if `ALPACA_LIVE_*` present
4. **End-to-end test**: Queue pilot task, watch it complete through `review_ready`
5. **Approval gate**: Approve in `/engineer`, verify merge + check run re-read
6. **Deployment dispatch**: If `deployment_enabled` + `deploy_workflow` configured, verify dispatch

## Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| Runner fails before pushing branch | Verifier job skipped (`if: needs.engineer-runner.result == 'success'`); task stays `failed` in DB |
| Runner pushes but verifier finds typecheck/lint/build failures | Verifier records `failed` + diagnosis; task stays `failed`; operator can request revision in `/engineer` |
| Verifier passes but check run publish fails | Verifier logs warning but still records `review_ready` in DB; approval gate re-reads checks and will see zero checks (fails closed) |
| Branch moves after verification (force push) | Approval gate re-reads branch tip vs `verified_sha` and refuses merge if mismatched |
| Monthly budget exhausted | Runner detects at start, sets task to `budget_paused`; operator resumes in `/engineer` |
| Free LLM provider returns empty completion | Runner treats as one repair attempt (max 3), retries while attempts remain |
| Runner heartbeat stops (crash) | `sweep_stalled_engineer_tasks()` requeues after 5 min; health monitor surfaces stalled count |
| Multiple tasks queued | `claim_next_engineer_task` uses `FOR UPDATE SKIP LOCKED` — one runner picks one task FIFO |
| Migration proposed in diff | Runner extracts SQL files from diff; task gets `has_migration=true`; separate approval card in `/engineer` |
| Deployment workflow missing/misconfigured | Approval gate detects at merge time, sets `deployment_status=unavailable`; merge still succeeds |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Workflow syntax error | Validate with `gh workflow validate` before push |
| Missing secrets in GitHub | Runner step 1 explicitly checks and names missing secrets |
| Live credentials leak | Runner/verifier both assert `ALPACA_LIVE_*` absent |
| Branch protection blocks push | `GITHUB_TOKEN` has Contents: Write; `GITHUB_ENGINEER_TOKEN` optional for stricter rules |
| Verification SHA mismatch | Verifier checks out exact SHA and re-asserts `git rev-parse HEAD` |
| Artifact not found / expired | `retention-days: 1`; verifier runs immediately after runner; `if: always()` uploads even on failure |
| `jq` not available in runner | GitHub-hosted runners include `jq` by default |
| Runner timeout (30 min) | Covers full lint+typecheck+build+3 repair attempts; increase if needed |
| Verifier timeout (15 min) | Covers fresh install + typecheck+lint+build; increase if needed |

## Out of Scope

- Running the SQL migration (one-time manual step in Supabase SQL editor)
- Configuring app/GitHub secrets (manual setup)
- Choosing LLM provider/model (done in `/engineer` UI)
- Deployment workflow configuration (separate repository workflow)

## Success Criteria

- [ ] `.github/workflows/astr-engineer.yml` created and pushed
- [ ] Workflow validates without syntax errors
- [ ] Pilot task queues, runs, verifies, reaches `review_ready`
- [ ] Operator can approve in `/engineer`, task merges to target branch
- [ ] Check run `engineer/independent-verify` appears on verified commit
- [ ] Deployment dispatch works when `deployment_enabled` + `deploy_workflow` set