export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      check_ins: {
        Row: {
          checked_in_at: string;
          checked_in_count: number;
          created_at: string;
          event_id: string;
          guest_id: string;
          id: string;
          notes: string | null;
          staff_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          checked_in_at?: string;
          checked_in_count?: number;
          created_at?: string;
          event_id: string;
          guest_id: string;
          id?: string;
          notes?: string | null;
          staff_id?: string | null;
        };
        Update: {
          checked_in_at?: string;
          checked_in_count?: number;
          created_at?: string;
          event_id?: string;
          guest_id?: string;
          id?: string;
          notes?: string | null;
          staff_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      email_log: {
        Row: {
          created_at: string;
          error_class: string | null;
          event_id: string;
          guest_id: string | null;
          id: string;
          provider_id: string | null;
          recipient_email: string;
          sent_at: string;
          status: string;
          subject: string;
          template_type: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          error_class?: string | null;
          event_id: string;
          guest_id?: string | null;
          id?: string;
          provider_id?: string | null;
          recipient_email: string;
          sent_at?: string;
          status?: string;
          subject: string;
          template_type: string;
        };
        Update: {
          created_at?: string;
          error_class?: string | null;
          event_id?: string;
          guest_id?: string | null;
          id?: string;
          provider_id?: string | null;
          recipient_email?: string;
          sent_at?: string;
          status?: string;
          subject?: string;
          template_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_log_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_log_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          },
        ];
      };
      event_invites: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          event_id: string;
          expires_at: string;
          id: string;
          invited_by: string | null;
          role: string;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          event_id: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role: string;
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          event_id?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string | null;
          role?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_invites_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_members: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          role: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          role: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_members_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          area: string | null;
          cover_image_url?: string | null;
          couple: string;
          created_at: string;
          date: string;
          description?: string | null;
          dress_code: string | null;
          id: string;
          is_public: boolean;
          paid_at: string | null;
          registry_code: string | null;
          rsvp_by: string | null;
          schedule?: Json | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
          venue: string;
        };
        ComputedFields: never;
        Insert: {
          area?: string | null;
          cover_image_url?: string | null;
          couple: string;
          created_at?: string;
          date: string;
          description?: string | null;
          dress_code?: string | null;
          id?: string;
          is_public?: boolean;
          paid_at?: string | null;
          registry_code?: string | null;
          rsvp_by?: string | null;
          schedule?: Json | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
          venue: string;
        };
        Update: {
          area?: string | null;
          cover_image_url?: string | null;
          couple?: string;
          created_at?: string;
          date?: string;
          description?: string | null;
          dress_code?: string | null;
          id?: string;
          is_public?: boolean;
          paid_at?: string | null;
          registry_code?: string | null;
          rsvp_by?: string | null;
          schedule?: Json | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          venue?: string;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          check_in_code: string;
          created_at: string;
          email: string | null;
          email_collected_via_rsvp: boolean;
          event_id: string;
          group_name: string | null;
          id: string;
          invited_at: string | null;
          is_vip: boolean;
          name: string;
          notes: string | null;
          party_size: number;
          phone: string | null;
          plus_ones_allowed: boolean;
          rsvp_token: string;
          seating_conflict_at: string | null;
          side: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          check_in_code?: string;
          created_at?: string;
          email?: string | null;
          email_collected_via_rsvp?: boolean;
          event_id: string;
          group_name?: string | null;
          id?: string;
          invited_at?: string | null;
          is_vip?: boolean;
          name: string;
          notes?: string | null;
          party_size?: number;
          phone?: string | null;
          plus_ones_allowed?: boolean;
          rsvp_token?: string;
          seating_conflict_at?: string | null;
          side?: string | null;
          updated_at?: string;
        };
        Update: {
          check_in_code?: string;
          created_at?: string;
          email?: string | null;
          email_collected_via_rsvp?: boolean;
          event_id?: string;
          group_name?: string | null;
          id?: string;
          invited_at?: string | null;
          is_vip?: boolean;
          name?: string;
          notes?: string | null;
          party_size?: number;
          phone?: string | null;
          plus_ones_allowed?: boolean;
          rsvp_token?: string;
          seating_conflict_at?: string | null;
          side?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_kobo: number;
          created_at: string;
          event_id: string;
          id: string;
          invoice_number: string;
          issued_at: string;
          paid_at: string | null;
          payment_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          created_at?: string;
          event_id: string;
          id?: string;
          invoice_number: string;
          issued_at?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          status?: string;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          event_id?: string;
          id?: string;
          invoice_number?: string;
          issued_at?: string;
          paid_at?: string | null;
          payment_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_kobo: number;
          channel: string | null;
          created_at: string;
          event_id: string;
          id: string;
          metadata: Json | null;
          paid_at: string | null;
          paystack_reference: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_kobo: number;
          channel?: string | null;
          created_at?: string;
          event_id: string;
          id?: string;
          metadata?: Json | null;
          paid_at?: string | null;
          paystack_reference: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_kobo?: number;
          channel?: string | null;
          created_at?: string;
          event_id?: string;
          id?: string;
          metadata?: Json | null;
          paid_at?: string | null;
          paystack_reference?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          reset_at: string;
        };
        ComputedFields: never;
        Insert: {
          count?: number;
          key: string;
          reset_at: string;
        };
        Update: {
          count?: number;
          key?: string;
          reset_at?: string;
        };
        Relationships: [];
      };
      rsvps: {
        Row: {
          attending_count: number;
          created_at: string;
          dietary: string | null;
          guest_id: string;
          id: string;
          note: string | null;
          plus_one_name: string | null;
          responded_at: string | null;
          revision_count: number;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          attending_count?: number;
          created_at?: string;
          dietary?: string | null;
          guest_id: string;
          id?: string;
          note?: string | null;
          plus_one_name?: string | null;
          responded_at?: string | null;
          revision_count?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attending_count?: number;
          created_at?: string;
          dietary?: string | null;
          guest_id?: string;
          id?: string;
          note?: string | null;
          plus_one_name?: string | null;
          responded_at?: string | null;
          revision_count?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rsvps_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: true;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          },
        ];
      };
      seat_assignments: {
        Row: {
          assigned_at: string;
          created_at: string;
          guest_id: string;
          id: string;
          table_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          created_at?: string;
          guest_id: string;
          id?: string;
          table_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string;
          created_at?: string;
          guest_id?: string;
          id?: string;
          table_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seat_assignments_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: true;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seat_assignments_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      tables: {
        Row: {
          capacity: number;
          created_at: string;
          event_id: string;
          id: string;
          name: string;
          position_x: number;
          position_y: number;
          shape: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          capacity: number;
          created_at?: string;
          event_id: string;
          id?: string;
          name: string;
          position_x?: number;
          position_y?: number;
          shape?: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          event_id?: string;
          id?: string;
          name?: string;
          position_x?: number;
          position_y?: number;
          shape?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tables_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_tasks: {
        Row: {
          created_at: string;
          due_date: string | null;
          event_id: string;
          id: string;
          is_done: boolean;
          task: string;
          updated_at: string;
          vendor_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          due_date?: string | null;
          event_id: string;
          id?: string;
          is_done?: boolean;
          task: string;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          due_date?: string | null;
          event_id?: string;
          id?: string;
          is_done?: boolean;
          task?: string;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_tasks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_tasks_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          category: string;
          contact_email: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          cost_kobo: number;
          created_at: string;
          deposit_kobo: number;
          event_id: string;
          id: string;
          name: string;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          cost_kobo?: number;
          created_at?: string;
          deposit_kobo?: number;
          event_id: string;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          contact_email?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          cost_kobo?: number;
          created_at?: string;
          deposit_kobo?: number;
          event_id?: string;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_team_invite: { Args: { p_token: string }; Returns: Json };
      assign_seat: {
        Args: { p_guest_id: string; p_table_id?: string };
        Returns: Json;
      };
      check_in: {
        Args: { p_code: string; p_count?: number; p_event_id: string };
        Returns: Json;
      };
      check_invitation_quota: {
        Args: { p_event_id: string; p_recipient_count: number };
        Returns: boolean;
      };
      create_event: {
        Args: {
          p_area?: string;
          p_couple: string;
          p_date: string;
          p_dress_code?: string;
          p_registry_code?: string;
          p_rsvp_by?: string;
          p_slug?: string;
          p_title: string;
          p_venue: string;
        };
        Returns: Json;
      };
      find_import_duplicates: {
        Args: { p_event_id: string; p_rows: Json };
        Returns: {
          duplicate_with: string;
          match_type: string;
          row_index: number;
        }[];
      };
      generate_check_in_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      generate_invitation_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      get_check_in_code: { Args: { p_token: string }; Returns: string };
      get_invitation: { Args: { p_token: string }; Returns: Json };
      get_public_event: { Args: { p_slug: string }; Returns: Json };
      get_user_events_with_metrics: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      global_search: {
        Args: { p_limit?: number; p_query: string };
        Returns: Json;
      };
      has_event_role: {
        Args: { p_event_id: string; p_roles: string[] };
        Returns: boolean;
      };
      hit_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window?: string };
        Returns: Json;
      };
      import_guests: {
        Args: { p_event_id: string; p_guests: Json };
        Returns: Json;
      };
      invite_team_member: {
        Args: { p_email: string; p_event_id: string; p_role: string };
        Returns: Json;
      };
      is_event_member:
        | { Args: { p_event_id: string }; Returns: boolean }
        | { Args: { p_event_id: string; p_user_id: string }; Returns: boolean };
      record_successful_payment: {
        Args: { p_payment_reference: string; p_paystack_data: Json };
        Returns: Json;
      };
      regenerate_guest_token: { Args: { p_guest_id: string }; Returns: string };
      remove_team_member: {
        Args: { p_event_id: string; p_target_user_id: string };
        Returns: boolean;
      };
      search_guests: {
        Args: {
          p_event_id: string;
          p_group?: string;
          p_is_vip?: boolean;
          p_limit?: number;
          p_offset?: number;
          p_rsvp_status?: string;
          p_search?: string;
          p_seated_status?: string;
          p_side?: string;
        };
        Returns: {
          created_at: string;
          email: string;
          event_id: string;
          group_name: string;
          id: string;
          invited_at: string;
          is_vip: boolean;
          name: string;
          notes: string;
          party_size: number;
          phone: string;
          plus_ones_allowed: boolean;
          rsvp_attending_count: number;
          rsvp_dietary: string;
          rsvp_id: string;
          rsvp_note: string;
          rsvp_plus_one_name: string;
          rsvp_responded_at: string;
          rsvp_status: string;
          rsvp_token: string;
          seat_table_id: string;
          seat_table_name: string;
          side: string;
          total_count: number;
          updated_at: string;
        }[];
      };
      submit_rsvp: {
        Args: {
          p_attending_count: number;
          p_contact_email?: string;
          p_dietary?: string;
          p_note?: string;
          p_plus_one_name?: string;
          p_status: string;
          p_token: string;
        };
        Returns: Json;
      };
      table_seats_used: {
        Args: { p_exclude_guest?: string; p_table_id: string };
        Returns: number;
      };
      track_invitations_sent: {
        Args: { p_guest_ids: string[] };
        Returns: number;
      };
      update_team_member_role: {
        Args: {
          p_event_id: string;
          p_new_role: string;
          p_target_user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
