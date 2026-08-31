# Research Department: 6 Specialists + Lead Researcher

## The MLR question, settled first

All three paper formulas bought MLR on Aug 28 because MLR scored a perfect 100 — full points on trend, momentum, relative strength, volume *and* volatility quality. A stock that maxes every factor wins under any weighting, so this was agreement, not a bug. Per your direction, convergence stays a finding and is never artificially broken up.

## What gets built

Today there is one research engine that tests a fixed list of weight-tilt hypotheses and files candidates. It becomes a department: six specialists that each own a research philosophy plus their own experiment space, and one Lead Researcher that validates and merges.

### The six researchers

1. **Trend Researcher** — momentum, trend strength, breakouts, direction. Tunes trend/momentum weights, SMA relationships, ROC lookbacks, RSI floors.
2. **Contrarian Researcher** — oversold, overreaction, neglected names. Needs new factors: pullback depth from recent high, RSI-low reversal, down-day streaks, volume dry-up. Tunes those.
3. **Consistency Researcher** — stable, repeatable behavior. New factors: return standard deviation, share of positive days, max drawdown over the window, ATR stability.
4. **Growth Researcher** — improving business performance. Fundamentals are not available on the current data plan, so this one starts with price-based growth proxies (multi-horizon acceleration, 3/6-month relative strength, post-gap follow-through) and is written so real earnings/revenue fields can be plugged in later without redesign.
5. **Risk Researcher** — reward per unit of risk. New factors: return/ATR ratio, downside deviation, worst-day exposure, liquidity depth. Optimises risk-adjusted return, not raw return.
6. **Skeptic (your #6 contrarian)** — a challenger, not a stock picker. It re-tests every other researcher's leading idea against the ways it could be wrong: different time windows, up vs down markets, thin-evidence checks, luck tests, and whether the edge survives with the top handful of lucky trades removed. Output is warnings and vetoes.

Each researcher only changes its own variables. A researcher may report an observation outside its lane, but cannot act on it.

### The Lead Researcher

Runs after the six. It:
- collects every finding, re-tests promising ones on data the finding was not tuned on,
- applies the Skeptic's vetoes,
- passes validated cross-lane observations to the researcher who owns that lane,
- merges surviving discoveries into the **Balanced Strategy**, which becomes the only thing proposed for live use,
- keeps a permanent **What Doesn't Work** ledger so the same dead end is never re-tested. Rejected variable ranges are excluded from future experiments.

Nothing is applied to live money automatically — the Balanced Strategy still lands on the Strategy tab as a candidate you approve.

### What you see

A new **Research Department** view (extending the existing research page):
- one card per researcher: specialty, current best idea, its evidence, its evolution history,
- the Skeptic's open objections,
- the Lead Researcher's Balanced Strategy with a before/after comparison and a link to approve it,
- the What Doesn't Work list.

The three Research Lab paper slots stay as they are, and can be pointed at any researcher's current best formula so it trades a simulated $20 book beside live.

## Cost

All of this replays market history already cached in the database — compute, not new data calls, so it stays inside the free data tier. The department runs on the existing daily schedule, one pass per day.

## Technical notes

- New factor library module for the contrarian / consistency / growth-proxy / risk indicators, computed from cached bars and exposed weight-independently (same percentage-then-recombine trick the panel already uses) so thousands of weight combinations cost almost nothing.
- Extend the research panel row to carry the new factor percentages and a multi-day forward return so the Risk and Consistency researchers can measure risk-adjusted outcomes.
- Replace the flat `hypotheses()` generator with per-researcher generators, each seeded from that researcher's last accepted params so they evolve rather than restart.
- New tables: `researchers` (identity, lane, current params, generation), `research_findings` (proposal, evidence, verdict, which researcher, skeptic notes), `research_dead_ends` (rejected variable ranges with reason). Each with grants and RLS matching the existing passcode-gated server-only pattern.
- Lead Researcher logic lives in its own server module; the Balanced Strategy is written through the existing candidate/approve path so the current approve-and-activate flow keeps working unchanged.
- Daily hook gains a research-department step, guarded by the market calendar like the rest.

## Build order

1. Factor library + panel extension.
2. Researcher tables and identities, seeded with the six lanes.
3. Per-researcher experiment generators and evaluation.
4. Skeptic pass and the dead-end ledger.
5. Lead Researcher validation, merge, and Balanced Strategy output.
6. Research Department UI.
7. Schedule it into the daily cycle.
