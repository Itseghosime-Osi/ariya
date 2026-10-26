export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          couple: string;
          date: string;
          venue: string;
          area: string | null;
          dress_code: string | null;
          slug: string;
          status: "draft" | "active" | "archived";
          registry_code: string | null;
          rsvp_by: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          couple: string;
          date: string;
          venue: string;
          area?: string | null;
          dress_code?: string | null;
          slug: string;
          status?: "draft" | "active" | "archived";
          registry_code?: string | null;
          rsvp_by?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          couple?: string;
          date?: string;
          venue?: string;
          area?: string | null;
          dress_code?: string | null;
          slug?: string;
          status?: "draft" | "active" | "archived";
          registry_code?: string | null;
          rsvp_by?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_members: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: "owner" | "planner" | "couple" | "staff";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role: "owner" | "planner" | "couple" | "staff";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: "owner" | "planner" | "couple" | "staff";
          created_at?: string;
          updated_at?: string;
        };
      };
      tables: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          capacity: number;
          shape: "round" | "rectangular" | "oval" | "head";
          position_x: number;
          position_y: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          capacity: number;
          shape?: "round" | "rectangular" | "oval" | "head";
          position_x?: number;
          position_y?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          capacity?: number;
          shape?: "round" | "rectangular" | "oval" | "head";
          position_x?: number;
          position_y?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      guests: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          side:
            | "Bride"
            | "Groom"
            | "Family"
            | "VIP"
            | "Planner"
            | "Imported"
            | null;
          group_name: string | null;
          is_vip: boolean;
          party_size: number;
          plus_ones_allowed: boolean;
          rsvp_token: string;
          notes: string | null;
          invited_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          side?:
            | "Bride"
            | "Groom"
            | "Family"
            | "VIP"
            | "Planner"
            | "Imported"
            | null;
          group_name?: string | null;
          is_vip?: boolean;
          party_size?: number;
          plus_ones_allowed?: boolean;
          rsvp_token: string;
          notes?: string | null;
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          side?:
            | "Bride"
            | "Groom"
            | "Family"
            | "VIP"
            | "Planner"
            | "Imported"
            | null;
          group_name?: string | null;
          is_vip?: boolean;
          party_size?: number;
          plus_ones_allowed?: boolean;
          rsvp_token?: string;
          notes?: string | null;
          invited_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      rsvps: {
        Row: {
          id: string;
          guest_id: string;
          status: "pending" | "accepted" | "declined";
          attending_count: number;
          plus_one_name: string | null;
          dietary: string | null;
          note: string | null;
          revision_count: number;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          status?: "pending" | "accepted" | "declined";
          attending_count?: number;
          plus_one_name?: string | null;
          dietary?: string | null;
          note?: string | null;
          revision_count?: number;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guest_id?: string;
          status?: "pending" | "accepted" | "declined";
          attending_count?: number;
          plus_one_name?: string | null;
          dietary?: string | null;
          note?: string | null;
          revision_count?: number;
          responded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      seat_assignments: {
        Row: {
          id: string;
          guest_id: string;
          table_id: string;
          assigned_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          table_id: string;
          assigned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          guest_id?: string;
          table_id?: string;
          assigned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      vendors: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          category: string;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          cost_kobo: number;
          deposit_kobo: number;
          status: "draft" | "contracted" | "confirmed" | "completed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          category: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cost_kobo?: number;
          deposit_kobo?: number;
          status?: "draft" | "contracted" | "confirmed" | "completed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          category?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cost_kobo?: number;
          deposit_kobo?: number;
          status?: "draft" | "contracted" | "confirmed" | "completed";
          created_at?: string;
          updated_at?: string;
        };
      };
      vendor_tasks: {
        Row: {
          id: string;
          vendor_id: string;
          event_id: string;
          task: string;
          due_date: string | null;
          is_done: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          event_id: string;
          task: string;
          due_date?: string | null;
          is_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          event_id?: string;
          task?: string;
          due_date?: string | null;
          is_done?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      email_log: {
        Row: {
          id: string;
          event_id: string;
          guest_id: string | null;
          recipient_email: string;
          subject: string;
          template_type: string;
          provider_id: string | null;
          status: string;
          sent_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_id?: string | null;
          recipient_email: string;
          subject: string;
          template_type: string;
          provider_id?: string | null;
          status?: string;
          sent_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          guest_id?: string | null;
          recipient_email?: string;
          subject?: string;
          template_type?: string;
          provider_id?: string | null;
          status?: string;
          sent_at?: string;
          created_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          paystack_reference: string;
          amount_kobo: number;
          status: "pending" | "success" | "failed" | "refunded";
          channel: string | null;
          paid_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          paystack_reference: string;
          amount_kobo: number;
          status?: "pending" | "success" | "failed" | "refunded";
          channel?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          paystack_reference?: string;
          amount_kobo?: number;
          status?: "pending" | "success" | "failed" | "refunded";
          channel?: string | null;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          payment_id: string | null;
          event_id: string;
          invoice_number: string;
          amount_kobo: number;
          issued_at: string;
          paid_at: string | null;
          status: "draft" | "issued" | "paid" | "void";
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_id?: string | null;
          event_id: string;
          invoice_number: string;
          amount_kobo: number;
          issued_at?: string;
          paid_at?: string | null;
          status?: "draft" | "issued" | "paid" | "void";
          created_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string | null;
          event_id?: string;
          invoice_number?: string;
          amount_kobo?: number;
          issued_at?: string;
          paid_at?: string | null;
          status?: "draft" | "issued" | "paid" | "void";
          created_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          event_id: string;
          guest_id: string;
          staff_id: string | null;
          checked_in_count: number;
          checked_in_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_id: string;
          staff_id?: string | null;
          checked_in_count?: number;
          checked_in_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          guest_id?: string;
          staff_id?: string | null;
          checked_in_count?: number;
          checked_in_at?: string;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      get_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      submit_rsvp: {
        Args: {
          p_token: string;
          p_status: string;
          p_attending_count: number;
          p_plus_one_name?: string | null;
          p_dietary?: string | null;
          p_note?: string | null;
        };
        Returns: Json;
      };
    };
  };
}
