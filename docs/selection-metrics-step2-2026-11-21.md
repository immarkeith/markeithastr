# Step 2 — Research selection card metrics

- Read-only aggregation uses saved `research_selection_evaluations`, not trades or the strategy ledger.
- 1M = 20 sessions; 3M = 60. Positive returns count as wins; zero and negative returns are non-wins.
- Only matured rows with finite returns, entry after selection, and nonfuture exit/maturity dates count. Pending, missing-bar and quarantined outcomes remain outside the denominator.
- Benchmark averages count only authentic paired returns; missing benchmarks are not zeros.
- The replay has no 180-session records. 9M accurately displays unavailable, not fictitious maturing predictions. Adding that evaluation horizon is outside Step 2.
- Both full and incremental Lab snapshot refreshes read the new metrics. Existing nightly order already runs selection replay before snapshot rebuild; no new service, credentials, migrations or user setup required.
- Saved metrics were refreshed and independently read back. An initial string comparison differed because database JSON key order changes; structural equality passed.
- Eight new calculation tests and six replay tests pass. Phone and desktop verification exercises all three selectors on every research card.
- Historical membership and current-formula hindsight limitations remain; these results are not certified survivorship-free evidence.
- Live trading, cash books, original selections, evaluation outcomes, strategy curves and broker state are unchanged.
- Separate Vercel deployment and scheduled production firing are not verified by these preview checks.