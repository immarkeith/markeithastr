# Roadmap

- [x] Calculate capital-analysis readiness and observed strategy statistics from existing completed research
- [x] Add the configurable advisory capital analysis to the Research Lab
- [x] Validate data counts, projection safeguards, and desktop/mobile presentation

## Researcher learning & progression
- [x] Per-example starting characteristics + outcomes stored per researcher (researcher_examples)
- [x] Per-researcher learned beliefs with hold-out testing and confidence decay (researcher_beliefs)
- [x] Learning pass runs after each daily research pass; failures are warnings only
- [x] "What I've learned" + dropped assumptions shown in each researcher card
- [x] Supported characteristics bias experiment ORDER only; skeptic/validation unchanged
- [x] SQL for the self-hosted copy: migration/fresh/12-researcher-learning.sql

## Phase A — historical paper rebuild (in progress)
- [x] Trading calendar read from the whole market, not a single proxy ticker
- [x] Stale "complete with 0 trades" checkpoints restart instead of staying stuck
- [x] Every researcher (not just the Lead) logs 1M / 3M / 9M horizon predictions
- [x] Runner-up qualifying candidates tracked as background horizon watches
- [x] Home/Lab graph ranges: 1D | 1M | 3M | 9M | All Time
- [x] All rebuilt records keep their true historical timestamps

## Phase B — deeper free history
- [ ] Pull several years of free daily bars into the shared history in resumable chunks

## Phase C — autonomous metric discovery
- [ ] Specialist roles: Risk (recovery vs deterioration), Profit Potential, Trend, Smart Money, Consistency, Lead
- [ ] Each specialist discovers how to measure its own objective instead of fixed weights
- [ ] Streak backtesting: long qualification streaks flag a stock for deeper study, and
      researchers test whether streak length predicts continuation or exhaustion
