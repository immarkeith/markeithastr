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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          dollars_per_day_trade: number
          id: number
          market_proxy: string
          max_universe: number
          min_avg_dollar_volume: number
          min_price: number
          min_score_to_trade: number
          num_day_trades: number
          profit_keep_pct: number
          provider: string
          settlement_days: number
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
          dollars_per_day_trade?: number
          id?: number
          market_proxy?: string
          max_universe?: number
          min_avg_dollar_volume?: number
          min_price?: number
          min_score_to_trade?: number
          num_day_trades?: number
          profit_keep_pct?: number
          provider?: string
          settlement_days?: number
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
          dollars_per_day_trade?: number
          id?: number
          market_proxy?: string
          max_universe?: number
          min_avg_dollar_volume?: number
          min_price?: number
          min_score_to_trade?: number
          num_day_trades?: number
          profit_keep_pct?: number
          provider?: string
          settlement_days?: number
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
      ledger_entries: {
        Row: {
          amount: number
          available_on: string
          created_at: string
          entry_date: string
          id: string
          kind: string
          note: string | null
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
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
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
      trades: {
        Row: {
          created_at: string
          dollars: number
          entry_date: string
          entry_price: number
          exit_date: string | null
          exit_price: number | null
          id: string
          kept: number | null
          kind: string
          profit: number | null
          status: string
          ticker: string
        }
        Insert: {
          created_at?: string
          dollars: number
          entry_date: string
          entry_price: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          kept?: number | null
          kind?: string
          profit?: number | null
          status?: string
          ticker: string
        }
        Update: {
          created_at?: string
          dollars?: number
          entry_date?: string
          entry_price?: number
          exit_date?: string | null
          exit_price?: number | null
          id?: string
          kept?: number | null
          kind?: string
          profit?: number | null
          status?: string
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
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
