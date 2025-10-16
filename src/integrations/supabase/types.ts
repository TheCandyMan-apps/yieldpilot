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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_matches: {
        Row: {
          alert_id: string
          deal_id: string
          id: string
          is_read: boolean | null
          matched_at: string | null
        }
        Insert: {
          alert_id: string
          deal_id: string
          id?: string
          is_read?: boolean | null
          matched_at?: string | null
        }
        Update: {
          alert_id?: string
          deal_id?: string
          id?: string
          is_read?: boolean | null
          matched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_matches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_matches_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          location_filter: string | null
          max_price: number | null
          min_price: number | null
          min_roi: number | null
          min_yield: number | null
          name: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          location_filter?: string | null
          max_price?: number | null
          min_price?: number | null
          min_roi?: number | null
          min_yield?: number | null
          name: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          location_filter?: string | null
          max_price?: number | null
          min_price?: number | null
          min_roi?: number | null
          min_yield?: number | null
          name?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      area_analytics: {
        Row: {
          avg_price_current: number | null
          avg_yield_current: number | null
          city: string
          confidence_score: number | null
          created_at: string | null
          data_date: string | null
          days_on_market_avg: number | null
          id: string
          market_gap_indicator: string | null
          opportunity_score: number | null
          postcode_prefix: string
          price_growth_1yr: number | null
          price_growth_5yr_forecast: number | null
          rental_growth_1yr: number | null
          transaction_volume: number | null
          updated_at: string | null
        }
        Insert: {
          avg_price_current?: number | null
          avg_yield_current?: number | null
          city: string
          confidence_score?: number | null
          created_at?: string | null
          data_date?: string | null
          days_on_market_avg?: number | null
          id?: string
          market_gap_indicator?: string | null
          opportunity_score?: number | null
          postcode_prefix: string
          price_growth_1yr?: number | null
          price_growth_5yr_forecast?: number | null
          rental_growth_1yr?: number | null
          transaction_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_price_current?: number | null
          avg_yield_current?: number | null
          city?: string
          confidence_score?: number | null
          created_at?: string | null
          data_date?: string | null
          days_on_market_avg?: number | null
          id?: string
          market_gap_indicator?: string | null
          opportunity_score?: number | null
          postcode_prefix?: string
          price_growth_1yr?: number | null
          price_growth_5yr_forecast?: number | null
          rental_growth_1yr?: number | null
          transaction_volume?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deal_interactions: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          interaction_data: Json | null
          interaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_summaries: {
        Row: {
          created_at: string | null
          deal_id: string | null
          id: string
          key_metrics: Json | null
          pdf_url: string | null
          recommendation: string | null
          risk_rating: string | null
          summary: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          key_metrics?: Json | null
          pdf_url?: string | null
          recommendation?: string | null
          risk_rating?: string | null
          summary: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          key_metrics?: Json | null
          pdf_url?: string | null
          recommendation?: string | null
          risk_rating?: string | null
          summary?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_summaries_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      deals_feed: {
        Row: {
          ai_recommendation: string | null
          ai_summary: string | null
          bathrooms: number | null
          bedrooms: number | null
          cash_flow_monthly: number | null
          city: string | null
          created_at: string | null
          estimated_rent: number | null
          id: string
          image_url: string | null
          investment_score:
            | Database["public"]["Enums"]["investment_score"]
            | null
          is_active: boolean | null
          listing_url: string | null
          location_lat: number | null
          location_lng: number | null
          postcode: string | null
          price: number
          property_address: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          roi_percentage: number | null
          source: string | null
          square_feet: number | null
          updated_at: string | null
          yield_percentage: number | null
        }
        Insert: {
          ai_recommendation?: string | null
          ai_summary?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cash_flow_monthly?: number | null
          city?: string | null
          created_at?: string | null
          estimated_rent?: number | null
          id?: string
          image_url?: string | null
          investment_score?:
            | Database["public"]["Enums"]["investment_score"]
            | null
          is_active?: boolean | null
          listing_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          postcode?: string | null
          price: number
          property_address: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          roi_percentage?: number | null
          source?: string | null
          square_feet?: number | null
          updated_at?: string | null
          yield_percentage?: number | null
        }
        Update: {
          ai_recommendation?: string | null
          ai_summary?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cash_flow_monthly?: number | null
          city?: string | null
          created_at?: string | null
          estimated_rent?: number | null
          id?: string
          image_url?: string | null
          investment_score?:
            | Database["public"]["Enums"]["investment_score"]
            | null
          is_active?: boolean | null
          listing_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          postcode?: string | null
          price?: number
          property_address?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          roi_percentage?: number | null
          source?: string | null
          square_feet?: number | null
          updated_at?: string | null
          yield_percentage?: number | null
        }
        Relationships: []
      }
      finance_products: {
        Row: {
          created_at: string | null
          fees: Json | null
          id: string
          interest_rate: number
          is_active: boolean | null
          lender: string
          ltv_max: number | null
          max_loan: number | null
          min_loan: number | null
          product_name: string
          product_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fees?: Json | null
          id?: string
          interest_rate: number
          is_active?: boolean | null
          lender: string
          ltv_max?: number | null
          max_loan?: number | null
          min_loan?: number | null
          product_name: string
          product_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fees?: Json | null
          id?: string
          interest_rate?: number
          is_active?: boolean | null
          lender?: string
          ltv_max?: number | null
          max_loan?: number | null
          min_loan?: number | null
          product_name?: string
          product_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      investor_profiles: {
        Row: {
          created_at: string | null
          id: string
          investment_strategy: string | null
          location_preferences: Json | null
          max_budget: number | null
          min_bedrooms: number | null
          preferred_yield_max: number | null
          preferred_yield_min: number | null
          property_types: Json | null
          refurb_comfort: string | null
          risk_tolerance: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          investment_strategy?: string | null
          location_preferences?: Json | null
          max_budget?: number | null
          min_bedrooms?: number | null
          preferred_yield_max?: number | null
          preferred_yield_min?: number | null
          property_types?: Json | null
          refurb_comfort?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          investment_strategy?: string | null
          location_preferences?: Json | null
          max_budget?: number | null
          min_bedrooms?: number | null
          preferred_yield_max?: number | null
          preferred_yield_min?: number | null
          property_types?: Json | null
          refurb_comfort?: string | null
          risk_tolerance?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investor_reports: {
        Row: {
          content: Json
          created_at: string | null
          deal_id: string | null
          id: string
          is_branded: boolean | null
          pdf_url: string | null
          report_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          deal_id?: string | null
          id?: string
          is_branded?: boolean | null
          pdf_url?: string | null
          report_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          deal_id?: string | null
          id?: string
          is_branded?: boolean | null
          pdf_url?: string | null
          report_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_reports_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      market_insights: {
        Row: {
          avg_price: number | null
          avg_rent: number | null
          avg_roi: number | null
          avg_yield: number | null
          city: string
          created_at: string | null
          data_date: string | null
          growth_forecast_1yr: number | null
          growth_forecast_5yr: number | null
          id: string
          postcode_prefix: string | null
          sample_size: number | null
          updated_at: string | null
        }
        Insert: {
          avg_price?: number | null
          avg_rent?: number | null
          avg_roi?: number | null
          avg_yield?: number | null
          city: string
          created_at?: string | null
          data_date?: string | null
          growth_forecast_1yr?: number | null
          growth_forecast_5yr?: number | null
          id?: string
          postcode_prefix?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_price?: number | null
          avg_rent?: number | null
          avg_roi?: number | null
          avg_yield?: number | null
          city?: string
          created_at?: string | null
          data_date?: string | null
          growth_forecast_1yr?: number | null
          growth_forecast_5yr?: number | null
          id?: string
          postcode_prefix?: string | null
          sample_size?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          bedrooms: number | null
          created_at: string | null
          current_value: number | null
          epc_rating: string | null
          id: string
          imported_from_analysis_id: string | null
          monthly_costs: number | null
          monthly_rent: number | null
          mortgage_balance: number | null
          property_address: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          purchase_date: string | null
          purchase_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bedrooms?: number | null
          created_at?: string | null
          current_value?: number | null
          epc_rating?: string | null
          id?: string
          imported_from_analysis_id?: string | null
          monthly_costs?: number | null
          monthly_rent?: number | null
          mortgage_balance?: number | null
          property_address: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          purchase_date?: string | null
          purchase_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bedrooms?: number | null
          created_at?: string | null
          current_value?: number | null
          epc_rating?: string | null
          id?: string
          imported_from_analysis_id?: string | null
          monthly_costs?: number | null
          monthly_rent?: number | null
          mortgage_balance?: number | null
          property_address?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          purchase_date?: string | null
          purchase_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_holdings_imported_from_analysis_id_fkey"
            columns: ["imported_from_analysis_id"]
            isOneToOne: false
            referencedRelation: "property_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_performance: {
        Row: {
          created_at: string | null
          date: string
          health_score: number | null
          id: string
          monthly_expenses: number | null
          monthly_income: number | null
          occupancy_rate: number | null
          portfolio_id: string
          total_debt: number | null
          total_equity: number | null
          total_value: number
        }
        Insert: {
          created_at?: string | null
          date?: string
          health_score?: number | null
          id?: string
          monthly_expenses?: number | null
          monthly_income?: number | null
          occupancy_rate?: number | null
          portfolio_id: string
          total_debt?: number | null
          total_equity?: number | null
          total_value: number
        }
        Update: {
          created_at?: string | null
          date?: string
          health_score?: number | null
          id?: string
          monthly_expenses?: number | null
          monthly_income?: number | null
          occupancy_rate?: number | null
          portfolio_id?: string
          total_debt?: number | null
          total_equity?: number | null
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_performance_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_properties: {
        Row: {
          added_at: string | null
          analysis_id: string
          portfolio_id: string
        }
        Insert: {
          added_at?: string | null
          analysis_id: string
          portfolio_id: string
        }
        Update: {
          added_at?: string | null
          analysis_id?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_properties_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "property_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_properties_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          total_roi: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          total_roi?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          total_roi?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          analyses_count: number | null
          created_at: string | null
          full_name: string | null
          id: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          analyses_count?: number | null
          created_at?: string | null
          full_name?: string | null
          id: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          analyses_count?: number | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      property_analyses: {
        Row: {
          ai_commentary: string | null
          analysis_status: Database["public"]["Enums"]["analysis_status"] | null
          cash_flow_monthly: number | null
          created_at: string | null
          deal_quality_score: number | null
          deposit_amount: number | null
          estimated_rent: number | null
          id: string
          monthly_costs: number | null
          mortgage_rate: number | null
          net_yield_percentage: number | null
          property_address: string
          property_price: number
          property_type: Database["public"]["Enums"]["property_type"] | null
          roi_percentage: number | null
          user_id: string
        }
        Insert: {
          ai_commentary?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          cash_flow_monthly?: number | null
          created_at?: string | null
          deal_quality_score?: number | null
          deposit_amount?: number | null
          estimated_rent?: number | null
          id?: string
          monthly_costs?: number | null
          mortgage_rate?: number | null
          net_yield_percentage?: number | null
          property_address: string
          property_price: number
          property_type?: Database["public"]["Enums"]["property_type"] | null
          roi_percentage?: number | null
          user_id: string
        }
        Update: {
          ai_commentary?: string | null
          analysis_status?:
            | Database["public"]["Enums"]["analysis_status"]
            | null
          cash_flow_monthly?: number | null
          created_at?: string | null
          deal_quality_score?: number | null
          deposit_amount?: number | null
          estimated_rent?: number | null
          id?: string
          monthly_costs?: number | null
          mortgage_rate?: number | null
          net_yield_percentage?: number | null
          property_address?: string
          property_price?: number
          property_type?: Database["public"]["Enums"]["property_type"] | null
          roi_percentage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      property_comments: {
        Row: {
          analysis_id: string | null
          comment: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          comment: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_comments_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "property_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      renovation_estimates: {
        Row: {
          condition_score: number | null
          created_at: string | null
          deal_id: string | null
          epc_current: string | null
          epc_potential: string | null
          epc_upgrade_cost: number | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          id: string
          post_refurb_value: number | null
          potential_rent_increase: number | null
          recommendations: Json | null
          user_id: string
        }
        Insert: {
          condition_score?: number | null
          created_at?: string | null
          deal_id?: string | null
          epc_current?: string | null
          epc_potential?: string | null
          epc_upgrade_cost?: number | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          post_refurb_value?: number | null
          potential_rent_increase?: number | null
          recommendations?: Json | null
          user_id: string
        }
        Update: {
          condition_score?: number | null
          created_at?: string | null
          deal_id?: string | null
          epc_current?: string | null
          epc_potential?: string | null
          epc_upgrade_cost?: number | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          post_refurb_value?: number | null
          potential_rent_increase?: number | null
          recommendations?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renovation_estimates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          portfolio_id: string | null
          role: Database["public"]["Enums"]["team_role"]
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          portfolio_id?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          portfolio_id?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_feed"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_tier_unchanged: {
        Args: { _new_tier: string; _user_id: string }
        Returns: boolean
      }
      increment: {
        Args: { row_id: string; x: number }
        Returns: undefined
      }
    }
    Enums: {
      analysis_status: "pending" | "completed" | "failed"
      investment_score: "A" | "B" | "C" | "D" | "E"
      property_type: "residential" | "commercial" | "mixed_use" | "land"
      team_role: "owner" | "editor" | "viewer"
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
    Enums: {
      analysis_status: ["pending", "completed", "failed"],
      investment_score: ["A", "B", "C", "D", "E"],
      property_type: ["residential", "commercial", "mixed_use", "land"],
      team_role: ["owner", "editor", "viewer"],
    },
  },
} as const
