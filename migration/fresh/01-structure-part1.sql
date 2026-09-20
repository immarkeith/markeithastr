-- ASTR fresh setup 1 of 4 (database structure)
-- Run parts in order, each in its own new query.

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: bar_dates_present(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bar_dates_present() RETURNS TABLE(bar_date date, ticker_count bigint)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT d.bar_date, count(*) AS ticker_count
  FROM public.daily_bars d
  GROUP BY d.bar_date
  ORDER BY d.bar_date DESC
$$;


--
-- Name: scan_input(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.scan_input(p_days integer, p_limit integer, p_offset integer) RETURNS TABLE(ticker text, bars jsonb)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  WITH dates AS (
    SELECT DISTINCT bar_date FROM public.daily_bars ORDER BY bar_date DESC LIMIT p_days
  ), b AS (
    SELECT d.ticker, d.bar_date, d.open, d.high, d.low, d.close, d.volume
    FROM public.daily_bars d
    JOIN dates ON dates.bar_date = d.bar_date
  )
  SELECT b.ticker,
         jsonb_agg(
           jsonb_build_array(b.bar_date, b.open, b.high, b.low, b.close, b.volume)
           ORDER BY b.bar_date
         ) AS bars
  FROM b
  GROUP BY b.ticker
  HAVING count(*) >= 55
  ORDER BY b.ticker
  LIMIT p_limit OFFSET p_offset
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id integer DEFAULT 1 NOT NULL,
    provider text DEFAULT 'polygon'::text NOT NULL,
    min_price numeric DEFAULT 10 NOT NULL,
    min_avg_dollar_volume numeric DEFAULT 5000000 NOT NULL,
    weight_trend numeric DEFAULT 25 NOT NULL,
    weight_momentum numeric DEFAULT 25 NOT NULL,
    weight_volume numeric DEFAULT 20 NOT NULL,
    weight_relative_strength numeric DEFAULT 15 NOT NULL,
    weight_volatility_quality numeric DEFAULT 15 NOT NULL,
    min_score_to_trade numeric DEFAULT 60 NOT NULL,
    num_day_trades integer DEFAULT 2 NOT NULL,
    dollars_per_day_trade numeric DEFAULT 25 NOT NULL,
    profit_keep_pct numeric DEFAULT 0.5 NOT NULL,
    settlement_days integer DEFAULT 1 NOT NULL,
    streak_suggest_days integer DEFAULT 5 NOT NULL,
    swing_dollars numeric DEFAULT 25 NOT NULL,
    swing_max_hold_days integer DEFAULT 7 NOT NULL,
    market_proxy text DEFAULT 'SPY'::text NOT NULL,
    max_universe integer DEFAULT 3000 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    paper_mode boolean DEFAULT true NOT NULL,
    auto_run boolean DEFAULT true NOT NULL,
    exit_buffer_minutes integer DEFAULT 8 NOT NULL,
    preopen_recheck_minutes integer DEFAULT 2 NOT NULL,
    notify_push boolean DEFAULT true NOT NULL,
    notify_day_pick boolean DEFAULT true NOT NULL,
    notify_swing boolean DEFAULT true NOT NULL,
    notify_theme boolean DEFAULT true NOT NULL,
    notify_trades boolean DEFAULT true NOT NULL,
    notify_health boolean DEFAULT true NOT NULL,
    active_strategy_id uuid,
    strategy_enabled boolean DEFAULT true NOT NULL,
    ml_enabled boolean DEFAULT false NOT NULL,
    ml_target text DEFAULT 'return'::text NOT NULL,
    ml_holding_days integer DEFAULT 1 NOT NULL,
    ml_train_days integer DEFAULT 120 NOT NULL,
    ml_test_days integer DEFAULT 20 NOT NULL,
    ml_min_return_pct numeric DEFAULT 1 NOT NULL,
    ml_trees integer DEFAULT 60 NOT NULL,
    ml_combine_weight numeric DEFAULT 0.5 NOT NULL,
    ml_retrain text DEFAULT 'manual'::text NOT NULL,
    bt_slippage_bps numeric DEFAULT 5 NOT NULL,
    bt_fee_pct numeric DEFAULT 0 NOT NULL,
    research_auto boolean DEFAULT false NOT NULL,
    fundamentals_available boolean DEFAULT false NOT NULL,
    hold_qualifying_positions boolean DEFAULT true NOT NULL,
    CONSTRAINT app_settings_singleton CHECK ((id = 1))
);


--
-- Name: backup_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_date date NOT NULL,
    lane text NOT NULL,
    researcher_name text NOT NULL,
    formula_version text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    picks jsonb DEFAULT '[]'::jsonb NOT NULL,
    entry_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    exit_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    horizons jsonb DEFAULT '{}'::jsonb NOT NULL,
    market_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    worked jsonb DEFAULT '[]'::jsonb NOT NULL,
    failed jsonb DEFAULT '[]'::jsonb NOT NULL,
    repeatable boolean DEFAULT false NOT NULL,
    discoveries jsonb DEFAULT '[]'::jsonb NOT NULL,
    problems jsonb DEFAULT '[]'::jsonb NOT NULL,
    escalate boolean DEFAULT false NOT NULL,
    edge numeric,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capital_ladder_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capital_ladder_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_date date DEFAULT CURRENT_DATE NOT NULL,
    direction text NOT NULL,
    from_stocks integer NOT NULL,
    from_dollars numeric NOT NULL,
    to_stocks integer NOT NULL,
    to_dollars numeric NOT NULL,
    capital numeric NOT NULL,
    required numeric NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: capital_ladder_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capital_ladder_state (
    id integer DEFAULT 1 NOT NULL,
    stocks_per_day integer DEFAULT 1 NOT NULL,
    position_dollars numeric DEFAULT 20 NOT NULL,
    stable_days integer DEFAULT 0 NOT NULL,
    breach_days integer DEFAULT 0 NOT NULL,
    pending_target text,
    hold_level boolean DEFAULT false NOT NULL,
    last_evaluated_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT capital_ladder_state_id_check CHECK ((id = 1))
);


--
-- Name: daily_bars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_bars (
    ticker text NOT NULL,
    bar_date date NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    volume numeric NOT NULL
);


--
-- Name: health_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    ok boolean DEFAULT true NOT NULL,
    issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    repairs jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text
);


--
-- Name: hook_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hook_tokens (
    id integer DEFAULT 1 NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.hook_tokens FORCE ROW LEVEL SECURITY;


--
-- Name: lead_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_date date NOT NULL,
    master_version text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    picks jsonb DEFAULT '[]'::jsonb NOT NULL,
    factor_contributions jsonb DEFAULT '{}'::jsonb NOT NULL,
    entry_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    exit_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    horizons jsonb DEFAULT '{}'::jsonb NOT NULL,
    market_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    winning_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    losing_conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    contributing_rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    edge numeric,
    verdict text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entry_date date DEFAULT CURRENT_DATE NOT NULL,
    kind text NOT NULL,
    amount numeric NOT NULL,
    available_on date DEFAULT CURRENT_DATE NOT NULL,
    note text,
    trade_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    strategy_id uuid
);


--
-- Name: master_formula_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_formula_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    rules jsonb DEFAULT '[]'::jsonb NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    change_summary text NOT NULL,
    reason text NOT NULL,
    discovered_by text,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    skeptic_note text,
    before_performance jsonb DEFAULT '{}'::jsonb NOT NULL,
    after_performance jsonb DEFAULT '{}'::jsonb NOT NULL,
    tests integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: master_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    signature text NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    factor text,
    band_low numeric,
    band_high numeric,
    filter_key text,
    filter_value numeric,
    weight numeric,
    discovered_by text NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'observation'::text NOT NULL,
    confirmations integer DEFAULT 0 NOT NULL,
    failures integer DEFAULT 0 NOT NULL,
    last_edge numeric,
    best_edge numeric,
    skeptic_note text,
    first_seen_on date DEFAULT ((now() AT TIME ZONE 'utc'::text))::date NOT NULL,
    promoted_on date,
    retired_on date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: model_predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    model_version_id uuid,
    as_of_date date NOT NULL,
    ticker text NOT NULL,
    astr_score numeric,
    rf_prediction numeric,
    prob_positive numeric,
    prob_target numeric,
    combined_score numeric,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    predicted_return numeric,
    actual_return numeric,
    benchmark_return numeric,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: model_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    version text NOT NULL,
    kind text DEFAULT 'random_forest'::text NOT NULL,
    target text DEFAULT 'return'::text NOT NULL,
    holding_days integer DEFAULT 1 NOT NULL,
    feature_set_version text DEFAULT 'fs1'::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    train_start date,
    train_end date,
    test_start date,
    test_end date,
    data_version text,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    feature_importance jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    trained_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    ticker text,
    severity text DEFAULT 'info'::text NOT NULL,
    action text,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    dedupe_key text,
    pushed_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: paper_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paper_slots (
    id integer NOT NULL,
    strategy_id uuid,
    enabled boolean DEFAULT true NOT NULL,
    stocks_per_day integer DEFAULT 1 NOT NULL,
    position_dollars numeric DEFAULT 20 NOT NULL,
    stable_days integer DEFAULT 0 NOT NULL,
    breach_days integer DEFAULT 0 NOT NULL,
    last_evaluated_date date,
    started_on date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lane text
);

ALTER TABLE ONLY public.paper_slots FORCE ROW LEVEL SECURITY;


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone,
    failures integer DEFAULT 0 NOT NULL
);

ALTER TABLE ONLY public.push_subscriptions FORCE ROW LEVEL SECURITY;


--
-- Name: research_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    base_version text,
    change_summary text DEFAULT ''::text NOT NULL,
    hypothesis text DEFAULT ''::text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    evidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    expected_improvement numeric,
    confidence numeric,
    robustness numeric,
    status text DEFAULT 'research'::text NOT NULL,
    warnings jsonb DEFAULT '[]'::jsonb NOT NULL,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
