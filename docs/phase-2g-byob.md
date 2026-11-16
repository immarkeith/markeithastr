# Phase 2g — corrected BYOB research

## Current result
The corrected engine and storage are installed in the preview backend. All 30 legacy model rows are preserved. Fifteen new records were saved: 12 provisional because earlier test history has already been exposed, and 3 insufficient-data records (DELL, SHOP, ANET) because historical coverage/price evidence fails integrity checks. No corrected model is active. No live trading, specialist ranking, shared ledger or cash-pool behavior changed.

All seed stocks were prepared with the existing adapter from January 2020: most have 1,585 sessions; DELL and ANET have 1,582; SHOP has 1,583. Existing cached rows were never overwritten. Stored cache provenance remains unverified; retrospective adjustment is never treated as proof of point-in-time corporate-action availability.

## Operation
Analyze loads saved research and evaluates a frozen candidate without training. Update research requires the existing owner passcode. Maintenance runs independently with `bun scripts/research-byob.ts [TICKER ...]`. Only the original 15 candidates can train; SPY supplies reference inputs. The adapter does not execute brokerage orders.

## Statistical and scoring contract
The final approved plan in `.lovable/plan/phase-2g-final-corrected-byob-plan-2026-11-16.md` is the governing methodology. The engine reserves 250 warmup sessions and partitions the remaining sessions 60/20/20 using floor boundaries. Entry is next-session open; exit is entry+H session close. Signal, entry and exit remain inside one partition. One position at a time, $20 maximum settled simulated stake, no auto-top-ups; the next signal follows exit and the next entry follows T+1.

Three archetypes discover optional MACD, ATR, Bollinger, EMA, relative-strength/SPY, volume-MA and support/resistance filters from a bounded single/pair-feature grid. Training selects one candidate per family, validation selects its horizon, holdout only evaluates the frozen result. Each newly run experiment records its candidate and metrics. Previously exposed history never becomes independent holdout for a revised candidate.

Qualification requires 10 training / 5 validation / 5 holdout trades, holdout net expectancy >=0.50%, positive profit factor (explicit no-loss/unbounded state), positive expectancy in at least two known **holdout-only** regimes, and <=25% marked drawdown. Validation regime results are reported separately, never pooled for qualification. Sparse/unknown evidence stays provisional. Positive below-threshold and demonstrated-negative results remain distinguishable. Source/action provenance is a separate hard gate.

Costs: entry x1.0005, exit x0.9995. Score = 0.50 signal + 0.30 quality + 0.20 compatibility; missing signal or holdout evidence gives no aggregate. Quality boundaries 0/0.50/1.50/3.00% and the >=2 top-tier profit-factor condition follow the approved plan. >=65 is checked before rounding; qualification and current signal are separate. Non-overlap does not prove independence. Quarter distribution, regime counts, trial counts and descriptive chronological block-resampling intervals (30+ holdout trades) expose limitations.

## Storage and recovery
Models, research runs, event records and activation history are append-only. A ticker registry points to exactly one intended model, not necessarily the latest attempt. Composite foreign keys prevent cross-ticker activation; compare-and-swap revisions prevent racing activation. Browser users have no direct write permissions. No legacy row is promoted automatically.

Input fingerprints make completed runs idempotent. Stalled runs with a stored frozen choice can resume against the exact same input after ten minutes; recovery evaluates that choice rather than rediscovering against its exposed holdout. Stalled discovery without a frozen choice requires new input. Evidence survives failure. A fully durable externally leased worker queue is not yet installed; current bounded discovery runs in the owner request or maintenance process.

## Verification
107 core tests pass, covering qualification boundaries, holdout-only regimes, 60/90-session horizon capacity, purging, causal features, frozen recovery, cost/score rules, price integrity and paper/live isolation. Browser verification signed in through the passcode screen, loaded NVDA v3, invoked Update research, and read back v3 unchanged; desktop/390px layouts had no horizontal overflow or page errors.

## External prerequisites and honest limitations
- Apply `migration/fresh/21-byob-corrected-research.sql` on an independent database **after** the original `20` setup, then deploy the code. This preview cannot verify a separate Vercel deployment.
- Previously exposed holdout is not repaired by downloading older bars. New untouched future test sessions are required.
- Verified corporate-action/point-in-time source provenance is not available from the legacy shared cache. Full qualification remains blocked until real evidence is supplied; the engine never fabricates it.
- DELL/SHOP/ANET require authentic missing-session/price-source review; no historical prices are filled synthetically.
- No live orders were used for validation. Current results are research findings, not live authorization.
