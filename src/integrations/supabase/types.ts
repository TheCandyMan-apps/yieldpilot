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
      alerts_log: {
        Row: {
          executed_at: string | null
          id: string
          matches_found: number | null
          search_id: string | null
        }
        Insert: {
          executed_at?: string | null
          id?: string
          matches_found?: number | null
          search_id?: string | null
        }
        Update: {
          executed_at?: string | null
          id?: string
          matches_found?: number | null
          search_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_log_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          last_used_at: string | null
          name: string | null
          rate_limit: number | null
          scopes: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          last_used_at?: string | null
          name?: string | null
          rate_limit?: number | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          last_used_at?: string | null
          name?: string | null
          rate_limit?: number | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          user_id?: string | null
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
      capex_templates: {
        Row: {
          created_at: string | null
          id: string
          lines: Json
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lines?: Json
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lines?: Json
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      compliance_checks: {
        Row: {
          action_required: string | null
          check_type: string
          checked_at: string | null
          id: string
          listing_id: string
          message: string | null
          metadata: Json | null
          severity: string | null
          status: string
        }
        Insert: {
          action_required?: string | null
          check_type: string
          checked_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          status: string
        }
        Update: {
          action_required?: string | null
          check_type?: string
          checked_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          metadata?: Json | null
          severity?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_conversations: {
        Row: {
          context_hash: string | null
          created_at: string | null
          id: string
          listing_id: string | null
          messages: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          context_hash?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          messages?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          context_hash?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          messages?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
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
          assumptions_hash: string | null
          created_at: string | null
          deal_id: string | null
          generated_at: string | null
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
          assumptions_hash?: string | null
          created_at?: string | null
          deal_id?: string | null
          generated_at?: string | null
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
          assumptions_hash?: string | null
          created_at?: string | null
          deal_id?: string | null
          generated_at?: string | null
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
      deal_syndicates: {
        Row: {
          created_at: string | null
          deal_id: string | null
          id: string
          lead_investor_id: string
          status: string
          total_equity: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          lead_investor_id: string
          status: string
          total_equity?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          lead_investor_id?: string
          status?: string
          total_equity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_syndicates_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "listings"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
          yield_percentage?: number | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
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
      fx_rates: {
        Row: {
          base: string
          fetched_at: string | null
          rate: number
          target: string
        }
        Insert: {
          base: string
          fetched_at?: string | null
          rate: number
          target: string
        }
        Update: {
          base?: string
          fetched_at?: string | null
          rate?: number
          target?: string
        }
        Relationships: []
      }
      ingest_events: {
        Row: {
          created_at: string
          dataset_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          input_url: string
          items_count: number | null
          metadata: Json | null
          provider: string
          request_id: string | null
          run_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dataset_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_url: string
          items_count?: number | null
          metadata?: Json | null
          provider: string
          request_id?: string | null
          run_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dataset_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          input_url?: string
          items_count?: number | null
          metadata?: Json | null
          provider?: string
          request_id?: string | null
          run_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ingest_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          dataset_id: string | null
          error: Json | null
          id: string
          input_url: string
          listing_id: string | null
          normalized_url: string
          run_id: string | null
          site: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dataset_id?: string | null
          error?: Json | null
          id?: string
          input_url: string
          listing_id?: string | null
          normalized_url: string
          run_id?: string | null
          site: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dataset_id?: string | null
          error?: Json | null
          id?: string
          input_url?: string
          listing_id?: string | null
          normalized_url?: string
          run_id?: string | null
          site?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_jobs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          aum_range: string | null
          badges: Json | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          investment_strategy: string | null
          location_preferences: Json | null
          max_budget: number | null
          min_bedrooms: number | null
          min_yield_target: number | null
          preferred_regions: Json | null
          preferred_yield_max: number | null
          preferred_yield_min: number | null
          property_types: Json | null
          refurb_comfort: string | null
          reputation_score: number | null
          risk_tolerance: string | null
          successful_exits: number | null
          total_deals: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          visibility: string | null
        }
        Insert: {
          aum_range?: string | null
          badges?: Json | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          investment_strategy?: string | null
          location_preferences?: Json | null
          max_budget?: number | null
          min_bedrooms?: number | null
          min_yield_target?: number | null
          preferred_regions?: Json | null
          preferred_yield_max?: number | null
          preferred_yield_min?: number | null
          property_types?: Json | null
          refurb_comfort?: string | null
          reputation_score?: number | null
          risk_tolerance?: string | null
          successful_exits?: number | null
          total_deals?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          visibility?: string | null
        }
        Update: {
          aum_range?: string | null
          badges?: Json | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          investment_strategy?: string | null
          location_preferences?: Json | null
          max_budget?: number | null
          min_bedrooms?: number | null
          min_yield_target?: number | null
          preferred_regions?: Json | null
          preferred_yield_max?: number | null
          preferred_yield_min?: number | null
          property_types?: Json | null
          refurb_comfort?: string | null
          reputation_score?: number | null
          risk_tolerance?: string | null
          successful_exits?: number | null
          total_deals?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          visibility?: string | null
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
      listing_metrics: {
        Row: {
          assumptions: Json | null
          capex_annual_reserve: number | null
          capex_breakdown: Json | null
          capex_total: number | null
          created_at: string | null
          drivers: string[] | null
          enrichment: Json | null
          factors: Json | null
          fx_rate: number | null
          gross_yield_pct: number | null
          id: string
          kpis: Json | null
          listing_id: string
          net_yield_pct: number | null
          rank_score: number | null
          risks: string[] | null
          score: number | null
          updated_at: string | null
        }
        Insert: {
          assumptions?: Json | null
          capex_annual_reserve?: number | null
          capex_breakdown?: Json | null
          capex_total?: number | null
          created_at?: string | null
          drivers?: string[] | null
          enrichment?: Json | null
          factors?: Json | null
          fx_rate?: number | null
          gross_yield_pct?: number | null
          id?: string
          kpis?: Json | null
          listing_id: string
          net_yield_pct?: number | null
          rank_score?: number | null
          risks?: string[] | null
          score?: number | null
          updated_at?: string | null
        }
        Update: {
          assumptions?: Json | null
          capex_annual_reserve?: number | null
          capex_breakdown?: Json | null
          capex_total?: number | null
          created_at?: string | null
          drivers?: string[] | null
          enrichment?: Json | null
          factors?: Json | null
          fx_rate?: number | null
          gross_yield_pct?: number | null
          id?: string
          kpis?: Json | null
          listing_id?: string
          net_yield_pct?: number | null
          rank_score?: number | null
          risks?: string[] | null
          score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_metrics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_line1: string | null
          address_town: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          listing_url: string | null
          location_lat: number | null
          location_lng: number | null
          postcode: string | null
          price: number
          property_address: string
          property_type: string | null
          region: string | null
          source: string | null
          source_refs: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1?: string | null
          address_town?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          listing_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          postcode?: string | null
          price: number
          property_address: string
          property_type?: string | null
          region?: string | null
          source?: string | null
          source_refs?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_town?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          listing_url?: string | null
          location_lat?: number | null
          location_lng?: number | null
          postcode?: string | null
          price?: number
          property_address?: string
          property_type?: string | null
          region?: string | null
          source?: string | null
          source_refs?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      mortgage_rates: {
        Row: {
          created_at: string | null
          fees: Json | null
          id: string
          interest_rate: number
          is_active: boolean | null
          lender: string | null
          ltv_max: number | null
          product_type: string | null
          region: string
          term_years: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fees?: Json | null
          id?: string
          interest_rate: number
          is_active?: boolean | null
          lender?: string | null
          ltv_max?: number | null
          product_type?: string | null
          region: string
          term_years?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fees?: Json | null
          id?: string
          interest_rate?: number
          is_active?: boolean | null
          lender?: string | null
          ltv_max?: number | null
          product_type?: string | null
          region?: string
          term_years?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          invited_at: string | null
          joined_at: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
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
      portfolio_items: {
        Row: {
          added_at: string | null
          id: string
          listing_id: string
          portfolio_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          listing_id: string
          portfolio_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          listing_id?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
          org_id: string | null
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
          org_id?: string | null
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
          org_id?: string | null
          total_roi?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          analyses_count: number | null
          created_at: string | null
          default_assumptions: Json | null
          full_name: string | null
          id: string
          subscription_tier: string | null
          updated_at: string | null
        }
        Insert: {
          analyses_count?: number | null
          created_at?: string | null
          default_assumptions?: Json | null
          full_name?: string | null
          id: string
          subscription_tier?: string | null
          updated_at?: string | null
        }
        Update: {
          analyses_count?: number | null
          created_at?: string | null
          default_assumptions?: Json | null
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
      rate_limits: {
        Row: {
          count: number
          id: string
          key: string
          updated_at: string | null
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          key: string
          updated_at?: string | null
          window_start?: string
        }
        Update: {
          count?: number
          id?: string
          key?: string
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      regional_parameters: {
        Row: {
          closing_costs_pct: number | null
          created_at: string | null
          currency: string
          id: string
          insurance_pct: number | null
          locale: string | null
          maintenance_pct: number | null
          mortgage_interest_deductible: boolean | null
          property_tax_pct: number | null
          region: string
          stamp_duty_rates: Json | null
          updated_at: string | null
        }
        Insert: {
          closing_costs_pct?: number | null
          created_at?: string | null
          currency: string
          id?: string
          insurance_pct?: number | null
          locale?: string | null
          maintenance_pct?: number | null
          mortgage_interest_deductible?: boolean | null
          property_tax_pct?: number | null
          region: string
          stamp_duty_rates?: Json | null
          updated_at?: string | null
        }
        Update: {
          closing_costs_pct?: number | null
          created_at?: string | null
          currency?: string
          id?: string
          insurance_pct?: number | null
          locale?: string | null
          maintenance_pct?: number | null
          mortgage_interest_deductible?: boolean | null
          property_tax_pct?: number | null
          region?: string
          stamp_duty_rates?: Json | null
          updated_at?: string | null
        }
        Relationships: []
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
      saved_searches: {
        Row: {
          created_at: string | null
          criteria: Json
          frequency: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          criteria?: Json
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scenario_runs: {
        Row: {
          created_at: string | null
          id: string
          name: string
          parameters: Json
          portfolio_id: string
          results: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          parameters: Json
          portfolio_id: string
          results: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          parameters?: Json
          portfolio_id?: string
          results?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_runs_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      syndicate_members: {
        Row: {
          confirmed_at: string | null
          equity_percentage: number
          id: string
          investor_id: string | null
          invite_email: string | null
          invited_at: string | null
          status: string
          syndicate_id: string
        }
        Insert: {
          confirmed_at?: string | null
          equity_percentage: number
          id?: string
          investor_id?: string | null
          invite_email?: string | null
          invited_at?: string | null
          status: string
          syndicate_id: string
        }
        Update: {
          confirmed_at?: string | null
          equity_percentage?: number
          id?: string
          investor_id?: string | null
          invite_email?: string | null
          invited_at?: string | null
          status?: string
          syndicate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_members_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "deal_syndicates"
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
      usage_counters: {
        Row: {
          created_at: string | null
          exports_used: number | null
          id: string
          ingests_used: number | null
          period_end: string
          period_start: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exports_used?: number | null
          id?: string
          ingests_used?: number | null
          period_end: string
          period_start: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          exports_used?: number | null
          id?: string
          ingests_used?: number | null
          period_end?: string
          period_start?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string | null
          deal_id: string
          id: string
          notes: string | null
          pipeline_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deal_id: string
          id?: string
          notes?: string | null
          pipeline_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deal_id?: string
          id?: string
          notes?: string | null
          pipeline_status?: string | null
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
      get_preview_deal_ids: {
        Args: never
        Returns: {
          deal_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment: { Args: { row_id: string; x: number }; Returns: undefined }
      increment_usage_counter: {
        Args: {
          p_field: string
          p_period_end: string
          p_period_start: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      analysis_status: "pending" | "completed" | "failed"
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
      investment_score: ["A", "B", "C", "D", "E"],
      property_type: ["residential", "commercial", "mixed_use", "land"],
      team_role: ["owner", "editor", "viewer"],
    },
  },
} as const
