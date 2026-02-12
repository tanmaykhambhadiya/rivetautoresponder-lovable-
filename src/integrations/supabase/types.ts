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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_senders: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          organization_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          organization_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approved_senders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rules: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          priority: number | null
          rule_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          priority?: number | null
          rule_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          priority?: number | null
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          access_token_encrypted: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          is_encrypted: boolean | null
          organization_id: string | null
          provider: string
          refresh_token: string
          refresh_token_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_encrypted?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          organization_id?: string | null
          provider: string
          refresh_token: string
          refresh_token_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          access_token_encrypted?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          is_encrypted?: boolean | null
          organization_id?: string | null
          provider?: string
          refresh_token?: string
          refresh_token_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string | null
          classification:
            | Database["public"]["Enums"]["email_classification"]
            | null
          created_at: string
          error_message: string | null
          grade: string | null
          id: string
          last_retry_at: string | null
          matched_nurse_id: string | null
          organization_id: string | null
          processed_at: string | null
          response_body: string | null
          response_time_ms: number | null
          retry_count: number | null
          sender_email: string
          shift_date: string | null
          shift_end: string | null
          shift_start: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string | null
          unit: string | null
        }
        Insert: {
          body?: string | null
          classification?:
            | Database["public"]["Enums"]["email_classification"]
            | null
          created_at?: string
          error_message?: string | null
          grade?: string | null
          id?: string
          last_retry_at?: string | null
          matched_nurse_id?: string | null
          organization_id?: string | null
          processed_at?: string | null
          response_body?: string | null
          response_time_ms?: number | null
          retry_count?: number | null
          sender_email: string
          shift_date?: string | null
          shift_end?: string | null
          shift_start?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          unit?: string | null
        }
        Update: {
          body?: string | null
          classification?:
            | Database["public"]["Enums"]["email_classification"]
            | null
          created_at?: string
          error_message?: string | null
          grade?: string | null
          id?: string
          last_retry_at?: string | null
          matched_nurse_id?: string | null
          organization_id?: string | null
          processed_at?: string | null
          response_body?: string | null
          response_time_ms?: number | null
          retry_count?: number | null
          sender_email?: string
          shift_date?: string | null
          shift_end?: string | null
          shift_start?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_matched_nurse_id_fkey"
            columns: ["matched_nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_emails: {
        Row: {
          body: string | null
          body_preview: string | null
          category: string
          created_at: string
          from_email: string
          from_name: string | null
          has_attachments: boolean
          id: string
          importance: string | null
          is_read: boolean
          is_starred: boolean
          organization_id: string | null
          outlook_message_id: string
          provider: string | null
          received_at: string
          subject: string | null
          synced_at: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          body_preview?: string | null
          category?: string
          created_at?: string
          from_email: string
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          importance?: string | null
          is_read?: boolean
          is_starred?: boolean
          organization_id?: string | null
          outlook_message_id: string
          provider?: string | null
          received_at: string
          subject?: string | null
          synced_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          body_preview?: string | null
          category?: string
          created_at?: string
          from_email?: string
          from_name?: string | null
          has_attachments?: boolean
          id?: string
          importance?: string | null
          is_read?: boolean
          is_starred?: boolean
          organization_id?: string | null
          outlook_message_id?: string
          provider?: string | null
          received_at?: string
          subject?: string | null
          synced_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbox_emails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          priority: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          priority?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          priority?: number
        }
        Relationships: [
          {
            foreignKeyName: "matching_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_availability: {
        Row: {
          available_date: string
          created_at: string
          id: string
          is_assigned: boolean
          nurse_id: string
          organization_id: string | null
          shift_end: string
          shift_start: string
          unit: string
        }
        Insert: {
          available_date: string
          created_at?: string
          id?: string
          is_assigned?: boolean
          nurse_id: string
          organization_id?: string | null
          shift_end: string
          shift_start: string
          unit: string
        }
        Update: {
          available_date?: string
          created_at?: string
          id?: string
          is_assigned?: boolean
          nurse_id?: string
          organization_id?: string | null
          shift_end?: string
          shift_start?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurse_availability_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nurses: {
        Row: {
          created_at: string
          grade: string
          id: string
          name: string
          organization_id: string | null
          units: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          name: string
          organization_id?: string | null
          units?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          name?: string
          organization_id?: string | null
          units?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          content: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          data: Json
          generated_at: string
          id: string
          organization_id: string | null
          period_end: string
          period_start: string
          report_type: string
        }
        Insert: {
          data: Json
          generated_at?: string
          id?: string
          organization_id?: string | null
          period_end: string
          period_start: string
          report_type: string
        }
        Update: {
          data?: Json
          generated_at?: string
          id?: string
          organization_id?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string
          email_log_id: string | null
          grade: string
          id: string
          nurse_id: string
          organization_id: string | null
          shift_date: string
          shift_end: string
          shift_start: string
          unit: string
        }
        Insert: {
          created_at?: string
          email_log_id?: string | null
          grade: string
          id?: string
          nurse_id: string
          organization_id?: string | null
          shift_date: string
          shift_end: string
          shift_start: string
          unit: string
        }
        Update: {
          created_at?: string
          email_log_id?: string | null
          grade?: string
          id?: string
          nurse_id?: string
          organization_id?: string | null
          shift_date?: string
          shift_end?: string
          shift_start?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "nurses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          organization_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          aliases: string[] | null
          code: string
          created_at: string | null
          hospital: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
        }
        Insert: {
          aliases?: string[] | null
          code: string
          created_at?: string | null
          hospital?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
        }
        Update: {
          aliases?: string[] | null
          code?: string
          created_at?: string | null
          hospital?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      email_accounts_decrypted: {
        Row: {
          access_token: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          is_encrypted: boolean | null
          organization_id: string | null
          provider: string | null
          refresh_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token?: never
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          is_encrypted?: boolean | null
          organization_id?: string | null
          provider?: string | null
          refresh_token?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: never
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string | null
          is_encrypted?: boolean | null
          organization_id?: string | null
          provider?: string | null
          refresh_token?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      decrypt_token: { Args: { encrypted_text: string }; Returns: string }
      encrypt_token: { Args: { plain_text: string }; Returns: string }
      get_user_organization_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      update_access_token: {
        Args: {
          p_access_token: string
          p_account_id: string
          p_expires_at: string
        }
        Returns: undefined
      }
      upsert_email_account: {
        Args: {
          p_access_token: string
          p_email: string
          p_expires_at: string
          p_organization_id: string
          p_provider: string
          p_refresh_token: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "super_admin"
      email_classification: "nhs_shift_asking" | "nhs_shift_confirmed" | "other"
      email_status: "pending" | "sent" | "failed" | "blocked"
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
      app_role: ["admin", "editor", "viewer", "super_admin"],
      email_classification: [
        "nhs_shift_asking",
        "nhs_shift_confirmed",
        "other",
      ],
      email_status: ["pending", "sent", "failed", "blocked"],
    },
  },
} as const
