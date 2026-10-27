import type { Database } from "@/lib/supabase/database.types";

export type Table = Database["public"]["Tables"]["tables"]["Row"];
export type TableInsert = Database["public"]["Tables"]["tables"]["Insert"];
export type TableUpdate = Database["public"]["Tables"]["tables"]["Update"];

export type TableShape = "round" | "rectangular" | "oval" | "head";

export interface SeatingGuest {
  id: string;
  name: string;
  side: string;
  group_name: string | null;
  is_vip: boolean;
  party_size: number;
  attending_count: number;
  status: "accepted" | "declined" | "pending";
  plus_one_name: string | null;
  dietary: string | null;
  table_id: string | null;
}

export interface TableWithGuests extends Table {
  guests: SeatingGuest[];
  occupiedSeats: number;
}

export interface SeatingDeskData {
  tables: TableWithGuests[];
  unseatedGuests: SeatingGuest[];
  stats: {
    totalCapacity: number;
    seatedAttendees: number;
    unseatedAttendees: number;
    readinessPct: number;
  };
}
