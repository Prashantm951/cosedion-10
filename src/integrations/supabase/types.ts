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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analyst_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          threat_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          threat_id: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          threat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyst_notes_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threats"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          alert_critical_email: boolean
          alert_email: string | null
          app_ids: string[]
          created_at: string
          domains: string[]
          handles: Json
          id: string
          keywords: string[]
          logo_url: string | null
          name: string
          phones: string[]
          team: Json
          user_id: string
        }
        Insert: {
          alert_critical_email?: boolean
          alert_email?: string | null
          app_ids?: string[]
          created_at?: string
          domains?: string[]
          handles?: Json
          id?: string
          keywords?: string[]
          logo_url?: string | null
          name: string
          phones?: string[]
          team?: Json
          user_id?: string
        }
        Update: {
          alert_critical_email?: boolean
          alert_email?: string | null
          app_ids?: string[]
          created_at?: string
          domains?: string[]
          handles?: Json
          id?: string
          keywords?: string[]
          logo_url?: string | null
          name?: string
          phones?: string[]
          team?: Json
          user_id?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          brand_id: string
          finished_at: string | null
          id: string
          profiles_analyzed: number
          started_at: string
          threats_found: number
          user_id: string
        }
        Insert: {
          brand_id: string
          finished_at?: string | null
          id?: string
          profiles_analyzed?: number
          started_at?: string
          threats_found?: number
          user_id?: string
        }
        Update: {
          brand_id?: string
          finished_at?: string | null
          id?: string
          profiles_analyzed?: number
          started_at?: string
          threats_found?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_apps: {
        Row: {
          ai_analysis: Json | null
          brand_id: string
          description: string | null
          detected_at: string
          developer: string
          id: string
          installs: string | null
          package_id: string
          permissions: string[]
          rating: number | null
          risk_score: number
          severity: string
          signals: Json
          status: string
          store: string
          title: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          brand_id: string
          description?: string | null
          detected_at?: string
          developer: string
          id?: string
          installs?: string | null
          package_id: string
          permissions?: string[]
          rating?: number | null
          risk_score?: number
          severity?: string
          signals?: Json
          status?: string
          store?: string
          title: string
          user_id?: string
        }
        Update: {
          ai_analysis?: Json | null
          brand_id?: string
          description?: string | null
          detected_at?: string
          developer?: string
          id?: string
          installs?: string | null
          package_id?: string
          permissions?: string[]
          rating?: number | null
          risk_score?: number
          severity?: string
          signals?: Json
          status?: string
          store?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspicious_apps_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      takedown_reports: {
        Row: {
          app_id: string | null
          brand_id: string
          content: Json
          created_at: string
          id: string
          platform: string | null
          status: string
          threat_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          brand_id: string
          content?: Json
          created_at?: string
          id?: string
          platform?: string | null
          status?: string
          threat_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          app_id?: string | null
          brand_id?: string
          content?: Json
          created_at?: string
          id?: string
          platform?: string | null
          status?: string
          threat_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "takedown_reports_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "suspicious_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_reports_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "takedown_reports_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threats"
            referencedColumns: ["id"]
          },
        ]
      }
      threats: {
        Row: {
          account_created_at: string | null
          ai_analysis: Json | null
          avatar_url: string | null
          bio: string | null
          brand_id: string
          detected_at: string
          display_name: string | null
          followers: number
          handle: string
          id: string
          platform: string
          risk_score: number
          severity: string
          signals: Json
          status: string
          type: string
          user_id: string
          verified: boolean
        }
        Insert: {
          account_created_at?: string | null
          ai_analysis?: Json | null
          avatar_url?: string | null
          bio?: string | null
          brand_id: string
          detected_at?: string
          display_name?: string | null
          followers?: number
          handle: string
          id?: string
          platform: string
          risk_score?: number
          severity?: string
          signals?: Json
          status?: string
          type: string
          user_id?: string
          verified?: boolean
        }
        Update: {
          account_created_at?: string | null
          ai_analysis?: Json | null
          avatar_url?: string | null
          bio?: string | null
          brand_id?: string
          detected_at?: string
          display_name?: string | null
          followers?: number
          handle?: string
          id?: string
          platform?: string
          risk_score?: number
          severity?: string
          signals?: Json
          status?: string
          type?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "threats_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
