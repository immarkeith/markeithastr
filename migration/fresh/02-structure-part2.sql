-- ASTR fresh setup 2 of 9 (database structure)
-- Run parts in order, each in its own new query.

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: research_dead_ends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_dead_ends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lane text NOT NULL,
    signature text NOT NULL,
    label text DEFAULT ''::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    edge numeric,
    hits integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lane text NOT NULL,
    generation integer DEFAULT 0 NOT NULL,
    name text NOT NULL,
    hypothesis text DEFAULT ''::text NOT NULL,
    change_summary text DEFAULT ''::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    edge numeric,
    robustness numeric,
    confidence numeric,
    verdict text DEFAULT 'proposed'::text NOT NULL,
    objections jsonb DEFAULT '[]'::jsonb NOT NULL,
    lead_note text,
    adopted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_notebook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_notebook (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lane text NOT NULL,
    generation integer DEFAULT 0 NOT NULL,
    experiment_no integer DEFAULT 0 NOT NULL,
    variable text DEFAULT ''::text NOT NULL,
    previous_value text DEFAULT ''::text NOT NULL,
    new_value text DEFAULT ''::text NOT NULL,
    result text DEFAULT ''::text NOT NULL,
    conclusion text DEFAULT ''::text NOT NULL,
    accepted boolean DEFAULT false NOT NULL,
    edge numeric,
    horizons jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: research_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text DEFAULT 'walk_forward'::text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    warnings jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: researchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.researchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lane text NOT NULL,
    name text NOT NULL,
    focus text DEFAULT ''::text NOT NULL,
    mission text DEFAULT ''::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    best_params jsonb,
    best_evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    best_edge numeric,
    generation integer DEFAULT 0 NOT NULL,
    experiments_run integer DEFAULT 0 NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scan_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_date date NOT NULL,
    status text DEFAULT 'complete'::text NOT NULL,
    universe_size integer DEFAULT 0 NOT NULL,
    scored_count integer DEFAULT 0 NOT NULL,
    bars_as_of date,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scan_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scan_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_id uuid NOT NULL,
    ticker text NOT NULL,
    rank integer NOT NULL,
    score numeric NOT NULL,
    close numeric NOT NULL,
    sma20 numeric,
    tradeable boolean DEFAULT false NOT NULL,
    factors jsonb DEFAULT '{}'::jsonb NOT NULL,
    invalidation text
);


--
-- Name: strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    builtin boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticker text NOT NULL,
    kind text DEFAULT 'day'::text NOT NULL,
    entry_date date NOT NULL,
    entry_price numeric NOT NULL,
    dollars numeric NOT NULL,
    exit_date date,
    exit_price numeric,
    profit numeric,
    kept numeric,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    mode text DEFAULT 'paper'::text NOT NULL,
    status_note text,
    hold_days integer DEFAULT 0 NOT NULL,
    entry_at timestamp with time zone,
    exit_at timestamp with time zone,
    strategy_id uuid,
    same_day_price numeric,
    same_day_profit numeric,
    same_day_pct numeric,
    same_day_at timestamp with time zone,
    hold_target_date date,
    position_type text DEFAULT 'SAME_DAY'::text NOT NULL,
    filled_qty numeric,
    broker_order_id text
);


--
-- Name: verification_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assistant_id text NOT NULL,
    lane text NOT NULL,
    scientist_name text NOT NULL,
    strategy_id text NOT NULL,
    strategy_version text NOT NULL,
    backtest_version text NOT NULL,
    ticker text NOT NULL,
    signal_date date NOT NULL,
    signal_at timestamp with time zone DEFAULT now() NOT NULL,
    direction text NOT NULL,
    signal_strength numeric,
    reason text DEFAULT ''::text NOT NULL,
    formula jsonb DEFAULT '{}'::jsonb NOT NULL,
    entry_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    exit_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    lookback_sessions integer DEFAULT 0 NOT NULL,
    history_start date,
    history_end date,
    comparable_signals integer DEFAULT 0 NOT NULL,
    sample_size integer DEFAULT 0 NOT NULL,
    results jsonb DEFAULT '{}'::jsonb NOT NULL,
    conclusion text NOT NULL,
    confidence text NOT NULL,
    data_quality text DEFAULT 'unknown'::text NOT NULL,
    limitations jsonb DEFAULT '[]'::jsonb NOT NULL,
    data_source text DEFAULT 'cached daily bars'::text NOT NULL,
    dedupe_key text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: watchlist_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist_candidates (
    ticker text NOT NULL,
    streak_days integer DEFAULT 0 NOT NULL,
    best_pick_ever boolean DEFAULT false NOT NULL,
    last_seen_date date,
    status text DEFAULT 'suggested'::text NOT NULL,
    approved_at timestamp with time zone,
    hold_until date,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: backup_tests backup_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_tests
    ADD CONSTRAINT backup_tests_pkey PRIMARY KEY (id);


--
-- Name: backup_tests backup_tests_test_date_lane_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_tests
    ADD CONSTRAINT backup_tests_test_date_lane_key UNIQUE (test_date, lane);


--
-- Name: capital_ladder_events capital_ladder_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_ladder_events
    ADD CONSTRAINT capital_ladder_events_pkey PRIMARY KEY (id);


--
-- Name: capital_ladder_state capital_ladder_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_ladder_state
    ADD CONSTRAINT capital_ladder_state_pkey PRIMARY KEY (id);


--
-- Name: daily_bars daily_bars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_bars
    ADD CONSTRAINT daily_bars_pkey PRIMARY KEY (ticker, bar_date);


--
-- Name: health_checks health_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_checks
    ADD CONSTRAINT health_checks_pkey PRIMARY KEY (id);


--
-- Name: hook_tokens hook_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hook_tokens
    ADD CONSTRAINT hook_tokens_pkey PRIMARY KEY (id);


--
-- Name: lead_tests lead_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_tests
    ADD CONSTRAINT lead_tests_pkey PRIMARY KEY (id);


--
-- Name: lead_tests lead_tests_test_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_tests
    ADD CONSTRAINT lead_tests_test_date_key UNIQUE (test_date);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: master_formula_versions master_formula_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_formula_versions
    ADD CONSTRAINT master_formula_versions_pkey PRIMARY KEY (id);


--
-- Name: master_rules master_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_rules
    ADD CONSTRAINT master_rules_pkey PRIMARY KEY (id);


--
-- Name: master_rules master_rules_signature_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_rules
    ADD CONSTRAINT master_rules_signature_key UNIQUE (signature);


--
-- Name: model_predictions model_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_predictions
    ADD CONSTRAINT model_predictions_pkey PRIMARY KEY (id);


--
-- Name: model_versions model_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_versions
    ADD CONSTRAINT model_versions_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paper_slots paper_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paper_slots
    ADD CONSTRAINT paper_slots_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: research_candidates research_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_candidates
    ADD CONSTRAINT research_candidates_pkey PRIMARY KEY (id);


--
-- Name: research_dead_ends research_dead_ends_lane_signature_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_dead_ends
    ADD CONSTRAINT research_dead_ends_lane_signature_key UNIQUE (lane, signature);


--
-- Name: research_dead_ends research_dead_ends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_dead_ends
    ADD CONSTRAINT research_dead_ends_pkey PRIMARY KEY (id);


--
-- Name: research_findings research_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_findings
    ADD CONSTRAINT research_findings_pkey PRIMARY KEY (id);


--
-- Name: research_notebook research_notebook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_notebook
    ADD CONSTRAINT research_notebook_pkey PRIMARY KEY (id);


--
-- Name: research_runs research_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_runs
    ADD CONSTRAINT research_runs_pkey PRIMARY KEY (id);


--
-- Name: researchers researchers_lane_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researchers
    ADD CONSTRAINT researchers_lane_key UNIQUE (lane);


--
-- Name: researchers researchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.researchers
    ADD CONSTRAINT researchers_pkey PRIMARY KEY (id);


--
-- Name: scan_runs scan_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_runs
    ADD CONSTRAINT scan_runs_pkey PRIMARY KEY (id);


--
-- Name: scan_scores scan_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scores
    ADD CONSTRAINT scan_scores_pkey PRIMARY KEY (id);


--
-- Name: scan_scores scan_scores_run_id_ticker_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scan_scores
    ADD CONSTRAINT scan_scores_run_id_ticker_key UNIQUE (run_id, ticker);


--
-- Name: strategies strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategies
    ADD CONSTRAINT strategies_pkey PRIMARY KEY (id);


--
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: trades trades_position_type_check; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.trades
    ADD CONSTRAINT trades_position_type_check CHECK ((position_type = ANY (ARRAY['SAME_DAY'::text, 'LONG_TERM'::text]))) NOT VALID;


--
-- Name: verification_reports verification_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_reports
    ADD CONSTRAINT verification_reports_pkey PRIMARY KEY (id);


--
-- Name: watchlist_candidates watchlist_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_candidates
    ADD CONSTRAINT watchlist_candidates_pkey PRIMARY KEY (ticker);


--
-- Name: daily_bars_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_bars_date_idx ON public.daily_bars USING btree (bar_date);


--
-- Name: ledger_entries_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_entries_date_idx ON public.ledger_entries USING btree (entry_date DESC);


--
-- Name: ledger_strategy_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ledger_strategy_idx ON public.ledger_entries USING btree (strategy_id);
