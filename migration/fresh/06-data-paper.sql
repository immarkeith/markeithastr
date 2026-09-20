-- ASTR fresh setup 6 of 8: paper research slots

INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (1, 'fc99a1e4-686c-4a18-b961-22b7f3426059', false, 3, 20, 0, 0, '2026-09-17', '2026-08-24', '2026-08-24 04:03:17.564041+00', '2026-09-17 22:54:39.926768+00', NULL);
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (2, 'd72c5d37-a356-4881-9e26-4163a6638321', false, 1, 20, 0, 0, '2026-09-17', '2026-08-24', '2026-08-24 04:03:17.564041+00', '2026-09-17 22:54:39.926768+00', NULL);
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (3, 'bf5f3062-546c-4b2c-a9fe-6cb189ec778c', false, 1, 20, 0, 0, '2026-09-17', '2026-08-24', '2026-08-24 04:03:17.564041+00', '2026-09-17 22:54:39.926768+00', NULL);
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (11, '69b3556c-828a-4543-ad5b-683606de679c', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:10.395802+00', 'lead');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (12, 'd3ffd675-48e8-4a2b-aef4-0adbc5b3d2a3', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:10.664762+00', 'trend');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (13, '9c162418-608f-49db-9d18-71e8544bed63', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:11.052797+00', 'contrarian');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (14, '70c73a78-efcc-442c-93f1-5edfc95505ff', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:11.458694+00', 'consistency');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (15, 'b5396b3e-0fe2-41a2-98be-9c0492dfb57c', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:11.824493+00', 'growth');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (16, '861fc7f9-108e-4e6f-8884-daeb4f3c1e11', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:12.375961+00', 'risk');
INSERT INTO public.paper_slots (id, strategy_id, enabled, stocks_per_day, position_dollars, stable_days, breach_days, last_evaluated_date, started_on, created_at, updated_at, lane) VALUES (17, '72ab182f-c255-4ed8-accb-232b1bd34b5e', true, 1, 20, 0, 1, '2026-09-18', '2026-09-17', '2026-09-17 22:54:39.926768+00', '2026-09-18 19:45:12.657245+00', 'skeptic');


-- Give every research slot its own simulated $50 of paper cash.
INSERT INTO public.ledger_entries (kind, amount, note, strategy_id, entry_date, available_on)
SELECT 'deposit', 50, 'paper research starting cash', ps.strategy_id, CURRENT_DATE, CURRENT_DATE
FROM public.paper_slots ps
WHERE NOT EXISTS (
  SELECT 1 FROM public.ledger_entries le
  WHERE le.strategy_id = ps.strategy_id AND le.note = 'paper research starting cash'
);
