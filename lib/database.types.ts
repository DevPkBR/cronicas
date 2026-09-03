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
      campaigns: {
        Row: {
          character_id: string
          created_at: string
          id: string
          owner_id: string
          state: Json
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          owner_id: string
          state: Json
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          owner_id?: string
          state?: Json
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_character_id_owner_id_fkey"
            columns: ["character_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      characters: {
        Row: {
          created_at: string
          goal: string
          id: string
          name: string
          origin: string
          owner_id: string
          weapon: string
        }
        Insert: {
          created_at?: string
          goal: string
          id?: string
          name: string
          origin: string
          owner_id: string
          weapon: string
        }
        Update: {
          created_at?: string
          goal?: string
          id?: string
          name?: string
          origin?: string
          owner_id?: string
          weapon?: string
        }
        Relationships: []
      }
      turns: {
        Row: {
          action: string
          campaign_id: string
          created_at: string
          entry: Json | null
          error_code: string | null
          id: string
          intent: Json | null
          lease_token: string | null
          lease_until: string | null
          owner_id: string
          provider: string | null
          request_id: string
          resolution: Json | null
          roll: number
          sequence: number
          status: string
          updated_at: string
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string
          entry?: Json | null
          error_code?: string | null
          id?: string
          intent?: Json | null
          lease_token?: string | null
          lease_until?: string | null
          owner_id: string
          provider?: string | null
          request_id: string
          resolution?: Json | null
          roll: number
          sequence: number
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string
          entry?: Json | null
          error_code?: string | null
          id?: string
          intent?: Json | null
          lease_token?: string | null
          lease_until?: string | null
          owner_id?: string
          provider?: string | null
          request_id?: string
          resolution?: Json | null
          roll?: number
          sequence?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "turns_campaign_id_owner_id_fkey"
            columns: ["campaign_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkpoint_turn: {
        Args: {
          p_intent: Json
          p_lease: string
          p_owner: string
          p_resolution: Json
          p_turn: string
        }
        Returns: undefined
      }
      create_campaign: {
        Args: {
          p_character: Json
          p_id: string
          p_owner: string
          p_state: Json
        }
        Returns: string
      }
      finish_turn: {
        Args: {
          p_entry: Json
          p_lease: string
          p_owner: string
          p_state: Json
          p_turn: string
        }
        Returns: undefined
      }
      release_turn: {
        Args: { p_lease: string; p_owner: string; p_turn: string }
        Returns: undefined
      }
      reserve_turn: {
        Args: {
          p_action: string
          p_campaign: string
          p_lease: string
          p_owner: string
          p_request: string
          p_roll: number
          p_version: number
        }
        Returns: {
          action: string
          campaign_id: string
          created_at: string
          entry: Json | null
          error_code: string | null
          id: string
          intent: Json | null
          lease_token: string | null
          lease_until: string | null
          owner_id: string
          provider: string | null
          request_id: string
          resolution: Json | null
          roll: number
          sequence: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "turns"
          isOneToOne: true
          isSetofReturn: false
        }
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
