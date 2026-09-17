export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          active_strategy_id: string | null
          auto_run: boolean
          bt_fee_pct: number
          bt_slippage_bps: number
          dollars_per_day_trade: number
          exit_buffer_minutes: number
          fundamentals_available: boolean
          hold_qualifying_positions: boolean
          id: number
          market_proxy: string
          max_universe: number
          min_avg_dollar_volume: number
          min_price: number
          min_score_to_trade: number
          ml_combine_weight: number
          ml_enabled: boolean
          ml_holding_days: number
          ml_min_return_pct: number
          ml_retrain: string
          ml_target: string
          ml_test_days: number
          ml_train_days: number
          ml_trees: number
          notify_day_pick: boolean
          notify_health: boolean
          notify_push: boolean
          notify_swing: boolean
          notify_theme: boolean
          notify_trades: boolean
          num_day_trades: number
          paper_mode: boolean
          preopen_recheck_minutes: number
          profit_keep_pct: number
          provider: string
          research_auto: boolean
          settlement_days: number
          strategy_enabled: boolean
          streak_suggest_days: number
          swing_dollars: number
          swing_max_hold_days: number
          updated_at: string
          weight_momentum: number
          weight_relative_strength: number
          weight_trend: number
          weight_volatility_quality: number
          weight_volume: number
        }
        Insert: {
          active_strategy_id?: string | null
          auto_run?: boolean
          bt_fee_pct?: number
          bt_slippage_bps?: number
          dollars_per_day_trade?: number
          exit_buffer_minutes?: number
          fundamentals_available?: boolean
          hold_qualifying_positions?: boolean
          id?: number
          market_proxy?: string
          max_universe?: number
          min_avg_dollar_volume?: number
          min_price?: number
          min_score_to_trade?: number
          ml_combine_weight?: number
          ml_enabled?: boolean
          ml_holding_days?: number
          ml_min_return_pct?: number
          ml_retrain?: string
          ml_target?: string
          ml_test_days?: number
          ml_train_days?: number
          ml_trees?: number
          notify_day_pick?: boolean
          notify_health?: boolean
          notify_push?: boolean
          notify_swing?: boolean
          notify_theme?: boolean
          notify_trades?: boolean
          num_day_trades?: number
          paper_mode?: boolean
          preopen_recheck_minutes?: number
          profit_keep_pct?: number
          provider?: string
          research_auto?: boolean
          settlement_days?: number
          strategy_enabled?: boolean
          streak_suggest_days?: number
          swing_dollars?: number
          swing_max_hold_days?: number
          updated_at?: string
          weight_momentum?: number
          weight_relative_strength?: number
          weight_trend?: number
          weight_volatility_quality?: number
          weight_volume?: number
        }
        Update: {
          active_strategy_id?: string | null
          auto_run?: boolean
          bt_fee_pct?: number
          bt_slippage_bps?: number
          dollars_per_day_trade?: number
          exit_buffer_minutes?: number
          fundamentals_available?: boolean
          hold_qualifying_positions?: boolean
          id?: number
          market_proxy?: string
          max_universe?: number
          min_avg_dollar_volume?: number
          min_price?: number
          min_score_to_trade?: number
          ml_combine_weight?: number
          ml_enabled?: boolean
          ml_holding_days?: number
          ml_min_return_pct?: number
          ml_retrain?: string
          ml_target?: string
          ml_test_days?: number
          ml_train_days?: number
          ml_trees?: number
          notify_day_pick?: boolean
          notify_health?: boolean
          notify_push?: boolean
          notify_swing?: boolean
          notify_theme?: boolean
          notify_trades?: boolean
          num_day_trades?: number
          paper_mode?: boolean
          preopen_recheck_minutes?: number
          profit_keep_pct?: number
          provider?: string
          research_auto?: boolean
          settlement_days?: number
          strategy_enabled?: boolean
          streak_suggest_days?: number
          swing_dollars?: number
          swing_max_hold_days?: number
          updated_at?: string
          weight_momentum?: number
          weight_relative_strength?: number
          weight_trend?: number
          weight_volatility_quality?: number
          weight_volume?: number
        }
        Relationships: []
      }
      backup_tests: {
        Row: {
          created_at: string
          discoveries: Json
          edge: number | null
          entry_conditions: Json
          escalate: boolean
          exit_conditions: Json
          failed: Json
          formula_version: string
          horizons: Json
          id: string
          lane: string
          market_conditions: Json
          note: string | null
          params: Json
          picks: Json
          problems: Json
          repeatable: boolean
          researcher_name: string
          test_date: string
          worked: Json
        }
        Insert: {
          created_at?: string
          discoveries?: Json
          edge?: number | null
          entry_conditions?: Json
          escalate?: boolean
          exit_conditions?: Json
          failed?: Json
          formula_version: string
          horizons?: Json
          id?: string
          lane: string
          market_conditions?: Json
          note?: string | null
          params?: Json
          picks?: Json
          problems?: Json
          repeatable?: boolean
          researcher_name: string
          test_date: string
          worked?: Json
        }
        Update: {
          created_at?: string
          discoveries?: Json
          edge?: number | null
          entry_conditions?: Json
          escalate?: boolean
          exit_conditions?: Json
          failed?: Json
          formula_version?: string
          horizons?: Json
          id?: string
          lane?: string
          market_conditions?: Json
          note?: string | null
          params?: Json
          picks?: Json
          problems?: Json
          repeatable?: boolean
          researcher_name?: string
          test_date?: string
          worked?: Json
        }
        Relationships: []
      }
      capital_ladder_events: {
        Row: {
          capital: number
          created_at: string
          direction: string
          event_date: string
          from_dollars: number
          from_stocks: number
          id: string
          note: string | null
          required: number
          to_dollars: number
          to_stocks: number
        }
        Insert: {
          capital: number
          created_at?: string
          direction: string
          event_date?: string
          from_dollars: number
          from_stocks: number
          id?: string
          note?: string | null
          required: number
          to_dollars: number
          to_stocks: number
        }
        Update: {
          capital?: number
          created_at?: string
          direction?: string
          event_date?: string
          from_dollars?: number
          from_stocks?: number
          id?: string
          note?: string | null
          required?: number
          to_dollars?: number
          to_stocks?: number
        }
        Relationships: []
      }
      capital_ladder_state: {
        Row: {
          breach_days: number
          created_at: string
          hold_level: boolean
          id: number
          last_evaluated_date: string | null
          pending_target: string | null
          position_dollars: number
          stable_days: number
          stocks_per_day: number
          updated_at: string
        }
        Insert: {
          breach_days?: number
          created_at?: string
          hold_level?: boolean
          id?: number
          last_evaluated_date?: string | null
          pending_target?: string | null
          position_dollars?: number
          stable_days?: number
          stocks_per_day?: number
          updated_at?: string
        }
        Update: {
          breach_days?: number
          created_at?: string
          hold_level?: boolean
          id?: number
          last_evaluated_date?: string | null
          pending_target?: string | null
          position_dollars?: number
          stable_days?: number
          stocks_per_day?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_bars: {
        Row: {
          bar_date: string
          close: number
          high: number
          low: number
          open: number
          ticker: string
          volume: number
        }
        Insert: {
          bar_date: string
          close: number
          high: number
          low: number
          open: number
          ticker: string
          volume: number
        }
        Update: {
          bar_date?: string
          close?: number
          high?: number
          low?: number
          open?: number
          ticker?: string
          volume?: number
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          checked_at: string
          id: string
          issues: Json
          note: string | null
          ok: boolean
          repairs: Json
        }
        Insert: {
          checked_at?: string
          id?: string
          issues?: Json
          note?: string | null
          ok?: boolean
          repairs?: Json
        }
        Update: {
          checked_at?: string
          id?: string
          issues?: Json
          note?: string | null
          ok?: boolean
          repairs?: Json
        }
        Relationships: []
      }
      hook_tokens: {
        Row: {
          created_at: string
          id: number
          token: string
        }
        Insert: {
          created_at?: string
          id?: number
          token?: string
        }
        Update: {
          created_at?: string
          id?: number
          token?: string
        }
        Relationships: []
      }
      lead_tests: {
        Row: {
          contributing_rules: Json
          created_at: string
          edge: number | null
          entry_conditions: Json
          evidence: Json
          exit_conditions: Json
          factor_contributions: Json
          horizons: Json
          id: string
          losing_conditions: Json
          market_conditions: Json
          master_version: string
          note: string | null
          params: Json
          picks: Json
          test_date: string
          verdict: string
          winning_conditions: Json
        }
        Insert: {
          contributing_rules?: Json
          created_at?: string
          edge?: number | null
          entry_conditions?: Json
          evidence?: Json
          exit_conditions?: Json
          factor_contributions?: Json
          horizons?: Json
          id?: string
          losing_conditions?: Json
          market_conditions?: Json
          master_version: string
          note?: string | null
          params?: Json
          picks?: Json
          test_date: string
          verdict: string
          winning_conditions?: Json
        }
        Update: {
          contributing_rules?: Json
          created_at?: string
          edge?: number | null
          entry_conditions?: Json
          evidence?: Json
          exit_conditions?: Json
          factor_contributions?: Json
          horizons?: Json
          id?: string
          losing_conditions?: Json
          market_conditions?: Json
          master_version?: string
          note?: string | null
          params?: Json
          picks?: Json
          test_date?: string
          verdict?: string
          winning_conditions?: Json
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          available_on: string
          created_at: string
          entry_date: string
          id: string
          kind: string
          note: string | null
          strategy_id: string | null
          trade_id: string | null
        }
        Insert: {
          amount: number
          available_on?: string
          created_at?: string
          entry_date?: string
          id?: string
          kind: string
          note?: string | null
          strategy_id?: string | null
          trade_id?: string | null
        }
        Update: {
          amount?: number
          available_on?: string
          created_at?: string
          entry_date?: string
          id?: string
          kind?: string
          note?: string | null
          strategy_id?: string | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      master_formula_versions: {
        Row: {
          after_performance: Json
          before_performance: Json
          change_summary: string
          created_at: string
          discovered_by: string | null
          evidence: Json
          id: string
          params: Json
          reason: string
          rules: Json
          skeptic_note: string | null
          tests: number
          version: string
        }
        Insert: {
          after_performance?: Json
          before_performance?: Json
          change_summary: string
          created_at?: string
          discovered_by?: string | null
          evidence?: Json
          id?: string
          params?: Json
          reason: string
          rules?: Json
          skeptic_note?: string | null
          tests?: number
          version: string
        }
        Update: {
          after_performance?: Json
          before_performance?: Json
          change_summary?: string
          created_at?: string
          discovered_by?: string | null
          evidence?: Json
          id?: string
          params?: Json
          reason?: string
          rules?: Json
          skeptic_note?: string | null
          tests?: number
          version?: string
        }
        Relationships: []
      }
      master_rules: {
        Row: {
          band_high: number | null
          band_low: number | null
          best_edge: number | null
          confirmations: number
          created_at: string
          discovered_by: string
          evidence: Json
          factor: string | null
          failures: number
          filter_key: string | null
          filter_value: number | null
          first_seen_on: string
          id: string
          kind: string
          label: string
          last_edge: number | null
          promoted_on: string | null
          retired_on: string | null
          signature: string
          skeptic_note: string | null
          status: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          band_high?: number | null
          band_low?: number | null
          best_edge?: number | null
          confirmations?: number
          created_at?: string
          discovered_by: string
          evidence?: Json
          factor?: string | null
          failures?: number
          filter_key?: string | null
          filter_value?: number | null
          first_seen_on?: string
          id?: string
          kind: string
          label: string
          last_edge?: number | null
          promoted_on?: string | null
          retired_on?: string | null
          signature: string
          skeptic_note?: string | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          band_high?: number | null
          band_low?: number | null
          best_edge?: number | null
          confirmations?: number
          created_at?: string
          discovered_by?: string
          evidence?: Json
          factor?: string | null
          failures?: number
          filter_key?: string | null
          filter_value?: number | null
          first_seen_on?: string
          id?: string
          kind?: string
          label?: string
          last_edge?: number | null
          promoted_on?: string | null
          retired_on?: string | null
          signature?: string
          skeptic_note?: string | null
          status?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: []
      }
      model_predictions: {
        Row: {
          actual_return: number | null
          as_of_date: string
          astr_score: number | null
          benchmark_return: number | null
          combined_score: number | null
          created_at: string
          features: Json
          id: string
          model_version_id: string | null
          predicted_return: number | null
          prob_positive: number | null
          prob_target: number | null
          result: string | null
          rf_prediction: number | null
          ticker: string
        }
        Insert: {
          actual_return?: number | null
          as_of_date: string
          astr_score?: number | null
          benchmark_return?: number | null
          combined_score?: number | null
          created_at?: string
          features?: Json
          id?: string
          model_version_id?: string | null
          predicted_return?: number | null
          prob_positive?: number | null
          prob_target?: number | null
          result?: string | null
          rf_prediction?: number | null
          ticker: string
        }
        Update: {
          actual_return?: number | null
          as_of_date?: string
          astr_score?: number | null
          benchmark_return?: number | null
          combined_score?: number | null
          created_at?: string
          features?: Json
          id?: string
          model_version_id?: string | null
          predicted_return?: number | null
          prob_positive?: number | null
          prob_target?: number | null
          result?: string | null
          rf_prediction?: number | null
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_predictions_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          created_at: string
          data_version: string | null
          feature_importance: Json
          feature_set_version: string
          holding_days: number
          id: string
          kind: string
          metrics: Json
          notes: string | null
          params: Json
          target: string
          test_end: string | null
          test_start: string | null
          train_end: string | null
          train_start: string | null
          trained_at: string
          version: string
        }
        Insert: {
          created_at?: string
          data_version?: string | null
          feature_importance?: Json
          feature_set_version?: string
          holding_days?: number
          id?: string
          kind?: string
          metrics?: Json
          notes?: string | null
          params?: Json
          target?: string
          test_end?: string | null
          test_start?: string | null
          train_end?: string | null
          train_start?: string | null
          trained_at?: string
          version: string
        }
        Update: {
          created_at?: string
          data_version?: string | null
          feature_importance?: Json
          feature_set_version?: string
          holding_days?: number
          id?: string
          kind?: string
          metrics?: Json
          notes?: string | null
          params?: Json
          target?: string
          test_end?: string | null
          test_start?: string | null
          train_end?: string | null
          train_start?: string | null
          trained_at?: string
          version?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          meta: Json
          pushed_at: string | null
          read_at: string | null
          severity: string
          ticker: string | null
          title: string
        }
        Insert: {
          action?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          meta?: Json
          pushed_at?: string | null
          read_at?: string | null
          severity?: string
          ticker?: string | null
          title: string
        }
        Update: {
          action?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          meta?: Json
          pushed_at?: string | null
          read_at?: string | null
          severity?: string
          ticker?: string | null
          title?: string
        }
        Relationships: []
      }
      paper_slots: {
        Row: {
          breach_days: number
          created_at: string
          enabled: boolean
          id: number
          lane: string | null
          last_evaluated_date: string | null
          position_dollars: number
          stable_days: number
          started_on: string
          stocks_per_day: number
          strategy_id: string | null
          updated_at: string
        }
        Insert: {
          breach_days?: number
          created_at?: string
          enabled?: boolean
          id: number
          lane?: string | null
          last_evaluated_date?: string | null
          position_dollars?: number
          stable_days?: number
          started_on?: string
          stocks_per_day?: number
          strategy_id?: string | null
          updated_at?: string
        }
        Update: {
          breach_days?: number
          created_at?: string
          enabled?: boolean
          id?: number
          lane?: string | null
          last_evaluated_date?: string | null
          position_dollars?: number
          stable_days?: number
          started_on?: string
          stocks_per_day?: number
          strategy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_slots_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          failures: number
          id: string
          label: string | null
          last_sent_at: string | null
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          failures?: number
          id?: string
          label?: string | null
          last_sent_at?: string | null
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          failures?: number
          id?: string
          label?: string | null
          last_sent_at?: string | null
          p256dh?: string
        }
        Relationships: []
      }
      research_candidates: {
        Row: {
          base_version: string | null
          change_summary: string
          confidence: number | null
          created_at: string
          decided_at: string | null
          evidence: Json
          expected_improvement: number | null
          hypothesis: string
          id: string
          name: string
          params: Json
          robustness: number | null
          status: string
          updated_at: string
          warnings: Json
        }
        Insert: {
          base_version?: string | null
          change_summary?: string
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          evidence?: Json
          expected_improvement?: number | null
          hypothesis?: string
          id?: string
          name: string
          params?: Json
          robustness?: number | null
          status?: string
          updated_at?: string
          warnings?: Json
        }
        Update: {
          base_version?: string | null
          change_summary?: string
          confidence?: number | null
          created_at?: string
          decided_at?: string | null
          evidence?: Json
          expected_improvement?: number | null
          hypothesis?: string
          id?: string
          name?: string
          params?: Json
          robustness?: number | null
          status?: string
          updated_at?: string
          warnings?: Json
        }
        Relationships: []
      }
      research_dead_ends: {
        Row: {
          created_at: string
          edge: number | null
          hits: number
          id: string
          label: string
          lane: string
          reason: string
          signature: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edge?: number | null
          hits?: number
          id?: string
          label?: string
          lane: string
          reason?: string
          signature: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edge?: number | null
          hits?: number
          id?: string
          label?: string
          lane?: string
          reason?: string
          signature?: string
          updated_at?: string
        }
        Relationships: []
      }
      research_findings: {
        Row: {
          adopted: boolean
          change_summary: string
          confidence: number | null
          created_at: string
          edge: number | null
          evidence: Json
          generation: number
          hypothesis: string
          id: string
          lane: string
          lead_note: string | null
          name: string
          objections: Json
          params: Json
          robustness: number | null
          verdict: string
        }
        Insert: {
          adopted?: boolean
          change_summary?: string
          confidence?: number | null
          created_at?: string
          edge?: number | null
          evidence?: Json
          generation?: number
          hypothesis?: string
          id?: string
          lane: string
          lead_note?: string | null
          name: string
          objections?: Json
          params?: Json
          robustness?: number | null
          verdict?: string
        }
        Update: {
          adopted?: boolean
          change_summary?: string
          confidence?: number | null
          created_at?: string
          edge?: number | null
          evidence?: Json
          generation?: number
          hypothesis?: string
          id?: string
          lane?: string
          lead_note?: string | null
          name?: string
          objections?: Json
          params?: Json
          robustness?: number | null
          verdict?: string
        }
        Relationships: []
      }
      research_notebook: {
        Row: {
          accepted: boolean
          conclusion: string
          created_at: string
          edge: number | null
          experiment_no: number
          generation: number
          horizons: Json
          id: string
          lane: string
          new_value: string
          previous_value: string
          result: string
          variable: string
        }
        Insert: {
          accepted?: boolean
          conclusion?: string
          created_at?: string
          edge?: number | null
          experiment_no?: number
          generation?: number
          horizons?: Json
          id?: string
          lane: string
          new_value?: string
          previous_value?: string
          result?: string
          variable?: string
        }
        Update: {
          accepted?: boolean
          conclusion?: string
          created_at?: string
          edge?: number | null
          experiment_no?: number
          generation?: number
          horizons?: Json
          id?: string
          lane?: string
          new_value?: string
          previous_value?: string
          result?: string
          variable?: string
        }
        Relationships: []
      }
      research_runs: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: string
          summary: Json
          warnings: Json
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          summary?: Json
          warnings?: Json
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: string
          summary?: Json
          warnings?: Json
        }
        Relationships: []
      }
      researchers: {
        Row: {
          best_edge: number | null
          best_evidence: Json
          best_params: Json | null
          created_at: string
          enabled: boolean
          experiments_run: number
          focus: string
          generation: number
          id: string
          lane: string
          last_run_at: string | null
          mission: string
          name: string
          params: Json
          updated_at: string
        }
        Insert: {
          best_edge?: number | null
          best_evidence?: Json
          best_params?: Json | null
          created_at?: string
          enabled?: boolean
          experiments_run?: number
          focus?: string
          generation?: number
          id?: string
          lane: string
          last_run_at?: string | null
          mission?: string
          name: string
          params?: Json
          updated_at?: string
        }
        Update: {
          best_edge?: number | null
          best_evidence?: Json
          best_params?: Json | null
          created_at?: string
          enabled?: boolean
          experiments_run?: number
          focus?: string
          generation?: number
          id?: string
          lane?: string
          last_run_at?: string | null
          mission?: string
          name?: string
          params?: Json
          updated_at?: string
        }
        Relationships: []
      }
      scan_runs: {
        Row: {
          bars_as_of: string | null
          created_at: string
          id: string
          note: string | null
          run_date: string
          scored_count: number
          status: string
          universe_size: number
        }
        Insert: {
          bars_as_of?: string | null
          created_at?: string
          id?: string
          note?: string | null
          run_date: string
          scored_count?: number
          status?: string
          universe_size?: number
        }
        Update: {
          bars_as_of?: string | null
          created_at?: string
          id?: string
          note?: string | null
          run_date?: string
          scored_count?: number
          status?: string
          universe_size?: number
        }
        Relationships: []
      }
      scan_scores: {
        Row: {
          close: number
          factors: Json
          id: string
          invalidation: string | null
          rank: number
          run_id: string
          score: number
          sma20: number | null
          ticker: string
          tradeable: boolean
        }
        Insert: {
          close: number
          factors?: Json
          id?: string
          invalidation?: string | null
          rank: number
          run_id: string
          score: number
          sma20?: number | null
          ticker: string
          tradeable?: boolean
        }
        Update: {
          close?: number
          factors?: Json
          id?: string
          invalidation?: string | null
          rank?: number
          run_id?: string
          score?: number
          sma20?: number | null
          ticker?: string
          tradeable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "scan_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "scan_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          builtin: boolean
          created_at: string
          description: string
          id: string
          name: string
          params: Json
        }
        Insert: {
          builtin?: boolean
          created_at?: string
          description?: string
          id?: string
          name: string
          params?: Json
        }
        Update: {
          builtin?: boolean
          created_at?: string
          description?: string
          id?: string
          name?: string
          params?: Json
        }
        Relationships: []
      }
      trades: {
        Row: {
          broker_order_id: string | null
          created_at: string
          dollars: number
          entry_at: string | null
          entry_date: string
          entry_price: number
          exit_at: string | null
          exit_date: string | null
          exit_price: number | null
          filled_qty: number | null
          hold_days: number
          hold_target_date: string | null
          id: string
          kept: number | null
          kind: string
          mode: string
          position_type: string
          profit: number | null
          same_day_at: string | null
          same_day_pct: number | null
          same_day_price: number | null
          same_day_profit: number | null
          status: string
          status_note: string | null
          strategy_id: string | null
          ticker: string
        }
        Insert: {
          broker_order_id?: string | null
          created_at?: string
          dollars: number
          entry_at?: string | null
          entry_date: string
          entry_price: number
          exit_at?: string | null
          exit_date?: string | null
          exit_price?: number | null
          filled_qty?: number | null
          hold_days?: number
          hold_target_date?: string | null
          id?: string
          kept?: number | null
          kind?: string
          mode?: string
          position_type?: string
          profit?: number | null
          same_day_at?: string | null
          same_day_pct?: number | null
          same_day_price?: number | null
          same_day_profit?: number | null
          status?: string
          status_note?: string | null
          strategy_id?: string | null
          ticker: string
        }
        Update: {
          broker_order_id?: string | null
          created_at?: string
          dollars?: number
          entry_at?: string | null
          entry_date?: string
          entry_price?: number
          exit_at?: string | null
          exit_date?: string | null
          exit_price?: number | null
          filled_qty?: number | null
          hold_days?: number
          hold_target_date?: string | null
          id?: string
          kept?: number | null
          kind?: string
          mode?: string
          position_type?: string
          profit?: number | null
          same_day_at?: string | null
          same_day_pct?: number | null
          same_day_price?: number | null
          same_day_profit?: number | null
          status?: string
          status_note?: string | null
          strategy_id?: string | null
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_reports: {
        Row: {
          assistant_id: string
          backtest_version: string
          comparable_signals: number
          conclusion: string
          confidence: string
          created_at: string
          data_quality: string
          data_source: string
          dedupe_key: string
          direction: string
          entry_conditions: Json
          exit_conditions: Json
          formula: Json
          history_end: string | null
          history_start: string | null
          id: string
          lane: string
          limitations: Json
          lookback_sessions: number
          reason: string
          results: Json
          sample_size: number
          scientist_name: string
          signal_at: string
          signal_date: string
          signal_strength: number | null
          strategy_id: string
          strategy_version: string
          ticker: string
        }
        Insert: {
          assistant_id: string
          backtest_version: string
          comparable_signals?: number
          conclusion: string
          confidence: string
          created_at?: string
          data_quality?: string
          data_source?: string
          dedupe_key: string
          direction: string
          entry_conditions?: Json
          exit_conditions?: Json
          formula?: Json
          history_end?: string | null
          history_start?: string | null
          id?: string
          lane: string
          limitations?: Json
          lookback_sessions?: number
          reason?: string
          results?: Json
          sample_size?: number
          scientist_name: string
          signal_at?: string
          signal_date: string
          signal_strength?: number | null
          strategy_id: string
          strategy_version: string
          ticker: string
        }
        Update: {
          assistant_id?: string
          backtest_version?: string
          comparable_signals?: number
          conclusion?: string
          confidence?: string
          created_at?: string
          data_quality?: string
          data_source?: string
          dedupe_key?: string
          direction?: string
          entry_conditions?: Json
          exit_conditions?: Json
          formula?: Json
          history_end?: string | null
          history_start?: string | null
          id?: string
          lane?: string
          limitations?: Json
          lookback_sessions?: number
          reason?: string
          results?: Json
          sample_size?: number
          scientist_name?: string
          signal_at?: string
          signal_date?: string
          signal_strength?: number | null
          strategy_id?: string
          strategy_version?: string
          ticker?: string
        }
        Relationships: []
      }
      watchlist_candidates: {
        Row: {
          approved_at: string | null
          best_pick_ever: boolean
          hold_until: string | null
          last_seen_date: string | null
          status: string
          streak_days: number
          ticker: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          best_pick_ever?: boolean
          hold_until?: string | null
          last_seen_date?: string | null
          status?: string
          streak_days?: number
          ticker: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          best_pick_ever?: boolean
          hold_until?: string | null
          last_seen_date?: string | null
          status?: string
          streak_days?: number
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bar_dates_present: {
        Args: never
        Returns: {
          bar_date: string
          ticker_count: number
        }[]
      }
      scan_input: {
        Args: { p_days: number; p_limit: number; p_offset: number }
        Returns: {
          bars: Json
          ticker: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
