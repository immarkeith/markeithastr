# ASTR — Implementation Plan & Migration Assessment

Approved PRD scope: autonomous audit + safe self-repair, Phase E audit
corrections, researcher-specific qualification, adaptive researcher + selected
stock queue, event-focused researcher, mark-to-market P&L, persistent research
graphs, and tests. The full system spec lives in `docs/04-astr-system-specification.txt`;
the per-feature requests are `docs/01`–`docs/05`.

Reference docs (saved verbatim from the request):
- `docs/01-suggested-proven-stocks.txt` — 15 suggested/proven tickers.
- `docs/02-researcher-qualification-thresholds.txt` — qualification thresholds,
  Home ranking/hold display, and persistent research-graph caching.
- `docs/03-adaptive-stock-researcher.txt` — dedicated adaptive researcher.
- `docs/04-astr-system-specification.txt` — full ASTR system spec (reference).
- `docs/05-event-entertainment-researcher.txt` — event/entertainment researcher.

## Findings from inspecting the current code

- **Researcher qualification is already implemented.** `src/lib/analyze.server.ts`
  `researcherFits()` computes each specialist's `fit`, reads that researcher's
  `qualified_min_score` from `researchers.params`, and returns `qualified` +
  `qualify_reason` + `threshold`. `src/components/ResearcherBuyTable.tsx` already
  renders a "Qualified" badge and the concise not-qualified reason, and already
  warns when the top specialist fails its own bar. Ranking and qualification are
  already independent (ranked by `fit`, qualified vs the researcher's own bar).
  _Gap:_ when a researcher has no calibrated `qualified_min_score` yet, its
  qualification is indeterminate ("No calibrated bar yet"). The spec wants an
  explicit, inspectable threshold per researcher. See Phase 3.
- **Audit engine (`src/lib/audit.server.ts`) has the four Phase E pillars but is
  incomplete exactly as described:** reconstruction checks only the entry bar
  (not exit), treats a missing bar as a warning, and the same-day check uses
  `position_type === "SAME_DAY"` (the live `trades` rows use `kind`/`hold_days`,
  so the check may misfire); stats recalculation only bounds the win rate (does
  not compare to cached `paper_slots`/`strategies`/scoreboard numbers); balance
  reconciliation only checks `netDeposits <= 0` (never the
  `Starting Capital + Net Realized P&L = Current Value` equation); lookahead
  audits `verification_reports`, which has 0 rows → hollow pass.
- **No scheduled audit today.** `runLeadSelfAudit()` only runs on demand from
  the Audit Desk. `src/lib/health.server.ts` is the existing scheduled health
  loop (every 15 min in market hours, hourly off-hours, via `migration/fresh/09-schedule.sql`).
- **Audit Desk tab** is a normal nav entry in `src/routes/__root.tsx` `NAV`.
- **P&L chart** (`src/components/PnlChart.tsx`) adds realized profit on
  `exit_date` plus today's open move only; open holdings contribute nothing
  between entry and exit, so the curve is flat during multi-day holds.
- **Adaptive / event researchers do not exist yet.** Researchers are defined in
  `src/lib/department.server.ts` (`LANES`) and seeded in the DB (`researchers`).
- **Live data** sits in the Supabase project configured by Base44 secrets
  (see `AGENTS.md`). All migrations must be additive and preserve existing rows.

## Migration assessment (review before applying)

| Phase | Schema / data change | Existing data affected | Preservation strategy |
|---|---|---|---|
| 0 — Plan + Audit Desk tab removal | None (code only) | None | — |
| 1 — Autonomous audit & safe repair | Additive: `audit_repair_log`, `audit_integrity_results` tables; new `pg_cron` jobs (5-min health already partly scheduled; add daily + weekly integrity). | None (new tables/jobs only) | Additive; never delete existing `health_checks`. |
| 2 — Phase E audit corrections | None (code only in `audit.server.ts`) | None | — |
| 3 — Researcher qualification completeness | Additive only: baseline threshold stored in `researchers.params` (JSONB, no DDL) or a new nullable column. | `researchers` rows read, not modified unless a baseline is backfilled (reviewed first). | Calibrated `qualified_min_score` always wins; baseline only fills the null case. |
| 4 — Adaptive researcher + stock queue | Additive: `adaptive_stock_queue` table; new `researchers` row(s) for the adaptive specialist; seed the 15 tickers with `ON CONFLICT` dedupe. | None (new rows) | Seed is idempotent; never overwrite existing `watchlist_candidates` statuses. |
| 5 — Event researcher | Additive: `events`, `event_entities`, `event_relationships`, `event_research_runs` tables; source-registry config; new `researchers` row. | None | Research-only isolation; no writes to trading tables. |
| 6 — Mark-to-market P&L | None (code only; reads `daily_bars`) | None | Missing bars → flat segment, never fabricated prices. |
| 7 — Persistent research graphs | Additive: a research-result cache table (or reuse existing) with source-version/freshness marker. | None | Last valid snapshot retained on background-update failure. |
| 8 — Tests + safe rollout | None | None | — |

**No destructive or data-transforming migration is proposed.** Every schema
change is additive; existing ASTR records are never deleted or overwritten.
Any backfill (e.g. baseline thresholds, the 15-ticker seed) is reviewed and
run once, idempotently.

## Open decisions to confirm

1. **Baseline qualification thresholds.** The spec says each researcher must have
   its own explicit threshold and "do not create generic fallback scores", yet
   researchers without a calibrated bar are currently indeterminate. Proposal:
   define a methodology-owned baseline threshold per researcher (used only when
   no calibrated bar exists), with the calibrated bar always taking precedence.
   Confirm acceptable, or supply explicit per-researcher threshold values.
2. **Audit Desk route.** Remove only the nav tab and keep the route reachable by
   direct URL so the engine/verdicts remain inspectable. Confirm.
3. **Safe-repair allowlist.** Proposed auto-repairs only: re-run a missed scan,
   backfill missing `daily_bars`, settle a stuck simulated paper position. Any
   formula/weight/strategy change stays manual and human-approved. Confirm the
   allowlist.
4. **Event-researcher sources.** No paid keys/subscriptions. Rely on free/public
   feeds (ESPN/iCal, MusicBrainz, Wikidata, SEC EDGAR). Availability varies per
   source; unavailable sources are marked and fall back. Confirm the source set.

## Phased sequence

- **Phase 0 (this turn):** save reference docs; produce this plan; remove the
  Audit Desk tab from normal navigation (engine preserved).
- **Phase 1 — Autonomous monitoring & safe repair:** repair-log + integrity
  tables (additive); 5-min health loop with allowlisted, idempotent, bounded
  repairs and post-repair verification; daily + weekly integrity checks;
  alert only critical/unresolved; schedule new cron jobs; keep the audit engine.
- **Phase 2 — Phase E audit corrections:** rewrite the four pillars
  (entry + exit bar validation; distinguish unavailable bars from real
  violations; fix same-day/overnight using `kind`/`hold_days`; scoreboard drift
  vs cached metrics; balance equation vs current equity to the cent; lookahead
  from `research_runs` when `verification_reports` is empty; no pass on zero
  samples); check the five Phase E roadmap boxes.
- **Phase 3 — Researcher qualification completeness:** per-researcher baseline
  thresholds (calibrated bar precedence); confirm Analyze display; Home
  researcher ordering + per-researcher hold display (same source of truth as
  Analyze, no fixed order).
- **Phase 4 — Adaptive researcher + stock queue:** `adaptive_stock_queue` +
  adaptive specialist; research/reassess with available data (no fixed
  strategy/hold/lookback, independent of Lead); idempotent 15-ticker seed.
- **Phase 5 — Event researcher:** entity-graph tables + free-source adapters +
  discovery/research lifecycle; research-only isolation; explicit source
  availability.
- **Phase 6 — Mark-to-market P&L:** daily unrealized marks for open holdings
  between entry and exit; preserve realized accounting; flat on missing bars.
- **Phase 7 — Persistent research graphs:** cached snapshots + incremental
  updates; background refresh; live-trading 5-min exception; stale-on-failure.
- **Phase 8 — Tests + safe rollout:** targeted tests for audit failures, repair
  suppression, post-repair verification, qualification boundaries, adaptive/event
  queue, seed dedupe, daily mark-to-market; verify non-destructive rollout.

Each phase is implemented, typechecked, and verified in the preview before the
next begins. No trading formula, scoring methodology, holding-period testing,
authorization, or live BUY flow is changed unless a request explicitly says so.
