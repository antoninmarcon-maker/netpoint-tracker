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
      feedback: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          chrono_seconds: number
          created_at: string
          current_set_number: number
          finished: boolean
          id: string
          match_data: Json
          metadata: Json | null
          share_token: string | null
          sides_swapped: boolean
          sport: string
          team_name_blue: string
          team_name_red: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chrono_seconds?: number
          created_at?: string
          current_set_number?: number
          finished?: boolean
          id?: string
          match_data: Json
          metadata?: Json | null
          share_token?: string | null
          sides_swapped?: boolean
          sport?: string
          team_name_blue?: string
          team_name_red?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chrono_seconds?: number
          created_at?: string
          current_set_number?: number
          finished?: boolean
          id?: string
          match_data?: Json
          metadata?: Json | null
          share_token?: string | null
          sides_swapped?: boolean
          sport?: string
          team_name_blue?: string
          team_name_red?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          id: string
          match_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          action: string
          created_at: string
          id: string
          match_id: string
          player_id: string | null
          point_value: number | null
          set_id: string | null
          team: string
          timestamp: number
          type: string
          x: number
          y: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          match_id: string
          player_id?: string | null
          point_value?: number | null
          set_id?: string | null
          team: string
          timestamp?: number
          type: string
          x?: number
          y?: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string | null
          point_value?: number | null
          set_id?: string | null
          team?: string
          timestamp?: number
          type?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          club: string
          created_at: string
          display_name: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          club?: string
          created_at?: string
          display_name?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          club?: string
          created_at?: string
          display_name?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          tutorial_step: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          tutorial_step?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          tutorial_step?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_players: {
        Row: {
          created_at: string
          id: string
          jersey_number: string | null
          name: string
          sport: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          name?: string
          sport?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: string | null
          name?: string
          sport?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          created_at: string
          duration: number
          id: string
          match_id: string
          number: number
          score_blue: number
          score_red: number
          winner: string | null
        }
        Insert: {
          created_at?: string
          duration?: number
          id?: string
          match_id: string
          number: number
          score_blue?: number
          score_red?: number
          winner?: string | null
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          match_id?: string
          number?: number
          score_blue?: number
          score_red?: number
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
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
