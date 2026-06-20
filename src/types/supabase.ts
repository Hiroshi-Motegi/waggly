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
      accessories: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          hidden_from_profile: boolean
          id: string
          image_url: string | null
          memo: string | null
          model: string | null
          purchase_url: string | null
          rating: number | null
          status: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          category: string
          created_at?: string
          hidden_from_profile?: boolean
          id?: string
          image_url?: string | null
          memo?: string | null
          model?: string | null
          purchase_url?: string | null
          rating?: number | null
          status?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          hidden_from_profile?: boolean
          id?: string
          image_url?: string | null
          memo?: string | null
          model?: string | null
          purchase_url?: string | null
          rating?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      accessory_images: {
        Row: {
          accessory_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
        }
        Insert: {
          accessory_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
        }
        Update: {
          accessory_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "accessory_images_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
        ]
      }
      account_deletion_reasons: {
        Row: {
          created_at: string
          id: string
          plan_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_chats: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id?: string
          created_at?: string
          id?: string
          message: string
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_tokens: number
          model: string
          output_tokens: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_counters: {
        Row: {
          count: number
          month: string
          source: string
          user_id: string
        }
        Insert: {
          count?: number
          month: string
          source: string
          user_id: string
        }
        Update: {
          count?: number
          month?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_makers: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_models: {
        Row: {
          alpen_pid: string | null
          category: string
          category_slug: string
          created_at: string
          description: string | null
          head_finish: string | null
          head_manufacture: string | null
          head_material: string | null
          id: string
          image_url: string | null
          is_visible: boolean
          maker: string
          maker_id: string
          maker_slug: string
          name: string
          price: number | null
          price_max: number | null
          price_min: number | null
          release_month: number | null
          release_year: number | null
          series_slug: string | null
          shaft_names: string[] | null
          sle_rule: string | null
          slug: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          alpen_pid?: string | null
          category: string
          category_slug: string
          created_at?: string
          description?: string | null
          head_finish?: string | null
          head_manufacture?: string | null
          head_material?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          maker: string
          maker_id: string
          maker_slug: string
          name: string
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          release_month?: number | null
          release_year?: number | null
          series_slug?: string | null
          shaft_names?: string[] | null
          sle_rule?: string | null
          slug?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          alpen_pid?: string | null
          category?: string
          category_slug?: string
          created_at?: string
          description?: string | null
          head_finish?: string | null
          head_manufacture?: string | null
          head_material?: string | null
          id?: string
          image_url?: string | null
          is_visible?: boolean
          maker?: string
          maker_id?: string
          maker_slug?: string
          name?: string
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          release_month?: number | null
          release_year?: number | null
          series_slug?: string | null
          shaft_names?: string[] | null
          sle_rule?: string | null
          slug?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_models_maker_id_fkey"
            columns: ["maker_id"]
            isOneToOne: false
            referencedRelation: "catalog_makers"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_specs: {
        Row: {
          bounce: number | null
          club_number: string
          created_at: string
          face_angle: number | null
          head_volume: number | null
          head_weight: number | null
          id: string
          length: number | null
          lie: number | null
          loft: number | null
          model_id: string
          sort_order: number
          swing_weight: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          bounce?: number | null
          club_number: string
          created_at?: string
          face_angle?: number | null
          head_volume?: number | null
          head_weight?: number | null
          id?: string
          length?: number | null
          lie?: number | null
          loft?: number | null
          model_id: string
          sort_order?: number
          swing_weight?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          bounce?: number | null
          club_number?: string
          created_at?: string
          face_angle?: number | null
          head_volume?: number | null
          head_weight?: number | null
          id?: string
          length?: number | null
          lie?: number | null
          loft?: number | null
          model_id?: string
          sort_order?: number
          swing_weight?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_specs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "catalog_models"
            referencedColumns: ["id"]
          },
        ]
      }
      club_images: {
        Row: {
          club_id: string
          created_at: string
          id: string
          image_url: string
          is_primary: boolean
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          image_url: string
          is_primary?: boolean
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          image_url?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "club_images_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_memos: {
        Row: {
          balls: number | null
          club_id: string
          condition: string | null
          created_at: string
          distance: number | null
          feeling_tags: Json | null
          gear_tags: Json | null
          id: string
          memo: string | null
          practice_session_id: string | null
          symptom_tags: Json | null
        }
        Insert: {
          balls?: number | null
          club_id: string
          condition?: string | null
          created_at?: string
          distance?: number | null
          feeling_tags?: Json | null
          gear_tags?: Json | null
          id?: string
          memo?: string | null
          practice_session_id?: string | null
          symptom_tags?: Json | null
        }
        Update: {
          balls?: number | null
          club_id?: string
          condition?: string | null
          created_at?: string
          distance?: number | null
          feeling_tags?: Json | null
          gear_tags?: Json | null
          id?: string
          memo?: string | null
          practice_session_id?: string | null
          symptom_tags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "club_memos_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          bag_number: number
          bounce: number | null
          category: string
          club_number: string
          created_at: string
          distance: number | null
          face_angle: number | null
          frequency: number | null
          grip_name: string | null
          grip_size: string | null
          head_volume: number | null
          head_weight: number | null
          hidden_from_profile: boolean
          id: string
          kick_point: string | null
          length: number | null
          lie: number | null
          loft: number | null
          maker: string | null
          memo: string | null
          model: string | null
          purchase_date: string | null
          purchase_price: number | null
          purchase_shop: string | null
          rating: number | null
          release_year: number | null
          shaft_flex: string | null
          shaft_name: string | null
          shaft_weight: number | null
          sole_shape: string | null
          sort_order: number
          status: string
          swing_weight: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          bag_number?: number
          bounce?: number | null
          category: string
          club_number: string
          created_at?: string
          distance?: number | null
          face_angle?: number | null
          frequency?: number | null
          grip_name?: string | null
          grip_size?: string | null
          head_volume?: number | null
          head_weight?: number | null
          hidden_from_profile?: boolean
          id?: string
          kick_point?: string | null
          length?: number | null
          lie?: number | null
          loft?: number | null
          maker?: string | null
          memo?: string | null
          model?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchase_shop?: string | null
          rating?: number | null
          release_year?: number | null
          shaft_flex?: string | null
          shaft_name?: string | null
          shaft_weight?: number | null
          sole_shape?: string | null
          sort_order?: number
          status?: string
          swing_weight?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          bag_number?: number
          bounce?: number | null
          category?: string
          club_number?: string
          created_at?: string
          distance?: number | null
          face_angle?: number | null
          frequency?: number | null
          grip_name?: string | null
          grip_size?: string | null
          head_volume?: number | null
          head_weight?: number | null
          hidden_from_profile?: boolean
          id?: string
          kick_point?: string | null
          length?: number | null
          lie?: number | null
          loft?: number | null
          maker?: string | null
          memo?: string | null
          model?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          purchase_shop?: string | null
          rating?: number | null
          release_year?: number | null
          shaft_flex?: string | null
          shaft_name?: string | null
          shaft_weight?: number | null
          sole_shape?: string | null
          sort_order?: number
          status?: string
          swing_weight?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          purpose: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          purpose?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          purpose?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_percent: number
          expires_at: string | null
          free_months: number
          id: string
          is_active: boolean
          max_uses: number | null
          name: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          free_months?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_percent?: number
          expires_at?: string | null
          free_months?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string | null
          used_count?: number
        }
        Relationships: []
      }
      favorite_clubs: {
        Row: {
          created_at: string
          id: string
          model_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_clubs_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_clubs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_courses: {
        Row: {
          address: string | null
          course_image_url: string | null
          course_name: string
          created_at: string
          evaluation: number | null
          gora_course_id: number | null
          id: string
          is_manual: boolean
          sort_order: number
          user_id: string
        }
        Insert: {
          address?: string | null
          course_image_url?: string | null
          course_name: string
          created_at?: string
          evaluation?: number | null
          gora_course_id?: number | null
          id?: string
          is_manual?: boolean
          sort_order?: number
          user_id: string
        }
        Update: {
          address?: string | null
          course_image_url?: string | null
          course_name?: string
          created_at?: string
          evaluation?: number | null
          gora_course_id?: number | null
          id?: string
          is_manual?: boolean
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_courses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          category: string
          created_at: string | null
          email: string
          id: string
          message: string
          name: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          email: string
          id?: string
          message: string
          name?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_auto_runs: {
        Row: {
          error_message: string | null
          id: string
          period_end: string
          period_start: string
          ran_at: string
          status: string
          summary: string
          topics_generated: number
          total_plans: number
          total_sessions: number
        }
        Insert: {
          error_message?: string | null
          id?: string
          period_end: string
          period_start: string
          ran_at?: string
          status: string
          summary: string
          topics_generated?: number
          total_plans?: number
          total_sessions?: number
        }
        Update: {
          error_message?: string | null
          id?: string
          period_end?: string
          period_start?: string
          ran_at?: string
          status?: string
          summary?: string
          topics_generated?: number
          total_plans?: number
          total_sessions?: number
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          auto_collected: boolean | null
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          source: string | null
          source_url: string | null
          title: string
        }
        Insert: {
          auto_collected?: boolean | null
          category: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          title: string
        }
        Update: {
          auto_collected?: boolean | null
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          source?: string | null
          source_url?: string | null
          title?: string
        }
        Relationships: []
      }
      line_notification_logs: {
        Row: {
          id: string
          notification_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          notification_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          notification_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenances: {
        Row: {
          club_id: string
          cost: number | null
          created_at: string
          description: string | null
          done_at: string
          id: string
          shop: string | null
          type: string
        }
        Insert: {
          club_id: string
          cost?: number | null
          created_at?: string
          description?: string | null
          done_at: string
          id?: string
          shop?: string | null
          type: string
        }
        Update: {
          club_id?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          done_at?: string
          id?: string
          shop?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenances_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ai_chat_monthly_limit: number
          ai_plan_monthly_limit: number
          billing_interval: string
          created_at: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          ai_chat_monthly_limit?: number
          ai_plan_monthly_limit?: number
          billing_interval?: string
          created_at?: string
          id: string
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          ai_chat_monthly_limit?: number
          ai_plan_monthly_limit?: number
          billing_interval?: string
          created_at?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      practice_clubs: {
        Row: {
          avg_distance: number | null
          balls: number
          club_id: string
          id: string
          session_id: string
        }
        Insert: {
          avg_distance?: number | null
          balls?: number
          club_id: string
          id?: string
          session_id: string
        }
        Update: {
          avg_distance?: number | null
          balls?: number
          club_id?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_clubs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_clubs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "practice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_plan_items: {
        Row: {
          balls: number
          club_id: string | null
          club_number: string | null
          detail: string | null
          focus: string
          id: string
          plan_id: string
          sort_order: number
        }
        Insert: {
          balls: number
          club_id?: string | null
          club_number?: string | null
          detail?: string | null
          focus: string
          id?: string
          plan_id: string
          sort_order?: number
        }
        Update: {
          balls?: number
          club_id?: string | null
          club_number?: string | null
          detail?: string | null
          focus?: string
          id?: string
          plan_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "practice_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_plans: {
        Row: {
          created_at: string
          id: string
          source: string
          status: string
          summary: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source: string
          status?: string
          summary: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source?: string
          status?: string
          summary?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          created_at: string
          id: string
          location: string | null
          memo: string | null
          plan_id: string | null
          practiced_at: string
          rating: number | null
          total_balls: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          memo?: string | null
          plan_id?: string | null
          practiced_at?: string
          rating?: number | null
          total_balls?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          memo?: string | null
          plan_id?: string | null
          practiced_at?: string
          rating?: number | null
          total_balls?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_cover_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_cover_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          average_score: number | null
          best_score: number | null
          bio: string | null
          created_at: string
          golf_start_date: string | null
          home_course: string | null
          id: string
          is_public: boolean
          nickname: string | null
          sns_links: Json | null
          updated_at: string
          username: string | null
          visible_fields: Json | null
        }
        Insert: {
          avatar_url?: string | null
          average_score?: number | null
          best_score?: number | null
          bio?: string | null
          created_at?: string
          golf_start_date?: string | null
          home_course?: string | null
          id: string
          is_public?: boolean
          nickname?: string | null
          sns_links?: Json | null
          updated_at?: string
          username?: string | null
          visible_fields?: Json | null
        }
        Update: {
          avatar_url?: string | null
          average_score?: number | null
          best_score?: number | null
          bio?: string | null
          created_at?: string
          golf_start_date?: string | null
          home_course?: string | null
          id?: string
          is_public?: boolean
          nickname?: string | null
          sns_links?: Json | null
          updated_at?: string
          username?: string | null
          visible_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          detail: string | null
          id: string
          reason: string
          reported_username: string
          reporter_email: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          detail?: string | null
          id?: string
          reason: string
          reported_username: string
          reporter_email?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          detail?: string | null
          id?: string
          reason?: string
          reported_username?: string
          reporter_email?: string | null
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          grace_period_end: string | null
          id: string
          payjp_customer_id: string | null
          payjp_subscription_id: string | null
          plan_id: string
          status: string
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          payjp_customer_id?: string | null
          payjp_subscription_id?: string | null
          plan_id: string
          status?: string
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_end?: string | null
          id?: string
          payjp_customer_id?: string | null
          payjp_subscription_id?: string | null
          plan_id?: string
          status?: string
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_providers: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: string
          provider: string
          provider_email: string | null
          provider_sub: string
          user_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          provider: string
          provider_email?: string | null
          provider_sub: string
          user_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: string
          provider?: string
          provider_email?: string | null
          provider_sub?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ad_free: boolean
          agreed_terms_at: string | null
          avatar_url: string | null
          created_at: string
          display_name: string
          google_email: string | null
          id: string
          is_admin: boolean
          onboarding_version: number
        }
        Insert: {
          ad_free?: boolean
          agreed_terms_at?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name: string
          google_email?: string | null
          id?: string
          is_admin?: boolean
          onboarding_version?: number
        }
        Update: {
          ad_free?: boolean
          agreed_terms_at?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          google_email?: string | null
          id?: string
          is_admin?: boolean
          onboarding_version?: number
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      decrement_usage_counter: {
        Args: { p_month: string; p_source: string; p_user_id: string }
        Returns: undefined
      }
      ensure_usage_counter: {
        Args: { p_month: string; p_source: string; p_user_id: string }
        Returns: undefined
      }
      get_line_notify_add_club: {
        Args: never
        Returns: {
          line_user_id: string
          user_id: string
        }[]
      }
      get_line_notify_share_card: {
        Args: never
        Returns: {
          line_user_id: string
          user_id: string
        }[]
      }
      get_my_user_id: { Args: never; Returns: string }
      increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: boolean
      }
      increment_usage_counter: {
        Args: {
          p_limit: number
          p_month: string
          p_source: string
          p_user_id: string
        }
        Returns: number
      }
      set_grace_period: {
        Args: { p_customer_id: string; p_grace_end: string }
        Returns: undefined
      }
      upsert_head: {
        Args: {
          p_affiliate_url: string
          p_category: string
          p_club_number: string
          p_distance: number
          p_head_volume: number
          p_head_weight: number
          p_image_url: string
          p_lie: number
          p_loft: number
          p_maker: string
          p_maker_normalized: string
          p_model: string
          p_model_normalized: string
        }
        Returns: string
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
