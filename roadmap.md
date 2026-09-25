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

## Reliability, controls, and phone alerts
- [x] Keep researcher entries inside the post-open window and exits before the same close
- [x] Make the Research Lab stop control block all new scheduled researcher tests
- [x] Display trade timestamps in New York market time
- [x] Upgrade push encryption for current iPhone web notifications
- [ ] Match live allocation quantities and prices against the broker in Self Check
- [ ] Replace fixed UTC scheduler times with daylight-saving-safe calls
