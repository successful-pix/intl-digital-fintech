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
      accounts: {
        Row: {
          account_number: string
          agency_code: string | null
          balance: number
          created_at: string
          currency: Database["public"]["Enums"]["account_currency"]
          id: string
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          agency_code?: string | null
          balance?: number
          created_at?: string
          currency: Database["public"]["Enums"]["account_currency"]
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          agency_code?: string | null
          balance?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          id?: string
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          attempts: number
          code: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          pending_session: Json | null
          purpose: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          code: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          pending_session?: Json | null
          purpose: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          pending_session?: Json | null
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notif_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notif_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          kyc_rejection_reason: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone: string | null
          transfer_pin_hash: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          transfer_pin_hash?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          kyc_rejection_reason?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          phone?: string | null
          transfer_pin_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          image_url: string | null
          is_admin: boolean
          read_by_admin: boolean
          read_by_user: boolean
          sender_user_id: string
          thread_user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean
          read_by_admin?: boolean
          read_by_user?: boolean
          sender_user_id: string
          thread_user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin?: boolean
          read_by_admin?: boolean
          read_by_user?: boolean
          sender_user_id?: string
          thread_user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          currency: Database["public"]["Enums"]["account_currency"]
          description: string | null
          external_recipient_account: string | null
          external_recipient_bank: string | null
          external_recipient_iban: string | null
          external_recipient_name: string | null
          id: string
          is_admin_adjustment: boolean
          receiver_account_id: string | null
          receiver_name: string | null
          receiver_user_id: string | null
          reference: string
          sender_account_id: string | null
          sender_name: string | null
          sender_user_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          currency: Database["public"]["Enums"]["account_currency"]
          description?: string | null
          external_recipient_account?: string | null
          external_recipient_bank?: string | null
          external_recipient_iban?: string | null
          external_recipient_name?: string | null
          id?: string
          is_admin_adjustment?: boolean
          receiver_account_id?: string | null
          receiver_name?: string | null
          receiver_user_id?: string | null
          reference?: string
          sender_account_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tx_type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["account_currency"]
          description?: string | null
          external_recipient_account?: string | null
          external_recipient_bank?: string | null
          external_recipient_iban?: string | null
          external_recipient_name?: string | null
          id?: string
          is_admin_adjustment?: boolean
          receiver_account_id?: string | null
          receiver_name?: string | null
          receiver_user_id?: string | null
          reference?: string
          sender_account_id?: string | null
          sender_name?: string | null
          sender_user_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          tx_type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_receiver_account_id_fkey"
            columns: ["receiver_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sender_account_id_fkey"
            columns: ["sender_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance:
        | {
            Args: { _account_id: string; _amount: number; _description: string }
            Returns: undefined
          }
        | {
            Args: {
              _account_id: string
              _amount: number
              _description: string
              _sender_name?: string
            }
            Returns: undefined
          }
      admin_set_account_status: {
        Args: {
          _account_id: string
          _status: Database["public"]["Enums"]["account_status"]
        }
        Returns: undefined
      }
      admin_set_kyc: {
        Args: {
          _reason: string
          _status: Database["public"]["Enums"]["kyc_status"]
          _user_id: string
        }
        Returns: undefined
      }
      grant_admin_by_email: { Args: { _email: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_transfer: {
        Args: { _approve: boolean; _tx_id: string }
        Returns: undefined
      }
      support_unread_for_user: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      account_currency: "USD" | "CAD" | "VND" | "BRL"
      account_status: "active" | "suspended" | "closed"
      app_role: "admin" | "user"
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      notif_type: "deposit" | "transfer" | "security" | "support" | "system"
      tx_status: "pending" | "successful" | "failed"
      tx_type: "deposit" | "transfer" | "withdrawal"
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
      account_currency: ["USD", "CAD", "VND", "BRL"],
      account_status: ["active", "suspended", "closed"],
      app_role: ["admin", "user"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      notif_type: ["deposit", "transfer", "security", "support", "system"],
      tx_status: ["pending", "successful", "failed"],
      tx_type: ["deposit", "transfer", "withdrawal"],
    },
  },
} as const
