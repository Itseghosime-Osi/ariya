// Sample data for the public marketing pages. Same shapes as the product's
// entities, but fixed: nothing here is saved, sent or paid for.

export type RsvpStatus = "yes" | "no" | "pending";

export type SampleGuest = {
  id: string;
  name: string;
  party: number;
  plusOneAllowed: boolean;
  status: RsvpStatus;
  tableId: string | null;
};

export type SampleTable = {
  id: string;
  name: string;
  capacity: number;
};

export type SampleVendor = {
  id: string;
  name: string;
  category: string;
  task: string;
  due: string;
  done: boolean;
};

export const SAMPLE_EVENT = {
  title: "Chidinma & Tunde's wedding",
  couple: "Chidinma & Tunde",
  date: "2026-12-12",
  venue: "The Grand Pavilion",
  area: "Victoria Island, Lagos",
  dressCode: "Aso ebi: burgundy and gold",
} as const;

export const SAMPLE_TABLES: SampleTable[] = [
  { id: "t_head", name: "Head table", capacity: 10 },
  { id: "t1", name: "Table 1", capacity: 8 },
  { id: "t2", name: "Table 2", capacity: 8 },
  { id: "t3", name: "Table 3", capacity: 8 },
  { id: "t4", name: "Table 4", capacity: 8 },
  { id: "t5", name: "Table 5", capacity: 8 },
  { id: "t6", name: "Table 6", capacity: 8 },
  { id: "t7", name: "Table 7", capacity: 8 },
  { id: "t8", name: "Table 8", capacity: 8 },
];

const guest = (
  id: string,
  name: string,
  party: number,
  plusOneAllowed: boolean,
  status: RsvpStatus,
  tableId: string | null
): SampleGuest => ({ id, name, party, plusOneAllowed, status, tableId });

export const SAMPLE_GUESTS: SampleGuest[] = [
  guest("g_01", "Adaeze Okonkwo", 1, true, "pending", null),
  guest("g_02", "Bisi Adebayo", 5, false, "yes", "t3"),
  guest("g_03", "Emeka & Ifeoma Okafor", 2, false, "yes", "t5"),
  guest("g_04", "Femi Adeyemi", 1, true, "yes", "t2"),
  guest("g_05", "Ngozi Eze", 2, false, "yes", "t7"),
  guest("g_06", "Dayo Ogunleye", 1, false, "yes", "t1"),
  guest("g_07", "Kemi Balogun", 1, false, "yes", "t_head"),
  guest("g_08", "Tolu Bankole", 1, true, "pending", null),
  guest("g_09", "Seun & Ronke Alade", 2, false, "yes", "t7"),
  guest("g_10", "Chiamaka Nwosu", 1, false, "no", null),
  guest("g_11", "Ibrahim Musa", 1, true, "yes", "t2"),
  guest("g_12", "Funke Akindele-Bello", 3, false, "pending", null),
  guest("g_13", "Osaze Igbinedion", 2, false, "yes", "t4"),
  guest("g_14", "Efe Omoregie", 1, false, "yes", "t4"),
  guest("g_15", "Halima Abubakar", 1, false, "pending", null),
  guest("g_16", "Uche Nnaji", 1, false, "no", null),
  guest("g_17", "Yemisi Coker", 4, false, "yes", "t1"),
  guest("g_18", "Babatunde Lawal", 1, true, "yes", null),
  guest("g_19", "Amara Obi", 2, false, "yes", "t7"),
  guest("g_20", "Pastor & Mrs Adeola", 2, false, "yes", "t_head"),
  guest("g_21", "Zainab Yusuf", 1, false, "pending", null),
  guest("g_22", "Obinna Chukwu", 1, false, "yes", "t7"),
  guest("g_23", "Mummy Chidinma (Mrs Okeke)", 1, false, "yes", "t_head"),
  guest("g_24", "Papa Tunde (Chief Ajayi)", 1, false, "yes", "t_head"),
];

export const SAMPLE_VENDORS: SampleVendor[] = [
  {
    id: "v1",
    name: "Mama Put Royal Catering",
    category: "Catering",
    task: "Confirm final plate count",
    due: "2026-11-28",
    done: false,
  },
  {
    id: "v2",
    name: "Gele by Titi",
    category: "Aso ebi & gele",
    task: "Collect gele measurements",
    due: "2026-11-15",
    done: true,
  },
  {
    id: "v3",
    name: "Pavilion events team",
    category: "Venue",
    task: "Send seating chart for table cards",
    due: "2026-12-05",
    done: false,
  },
  {
    id: "v4",
    name: "DJ Kaycee",
    category: "Music",
    task: "Share processional and first dance songs",
    due: "2026-11-30",
    done: false,
  },
  {
    id: "v5",
    name: "Lens & Light Studio",
    category: "Photography",
    task: "Agree shot list and family portraits",
    due: "2026-11-25",
    done: true,
  },
  {
    id: "v6",
    name: "Blooms Lagos",
    category: "Decor",
    task: "Approve centrepiece sample",
    due: "2026-11-22",
    done: false,
  },
  {
    id: "v7",
    name: "Sweet Tiers",
    category: "Cake",
    task: "Pay balance and confirm delivery time",
    due: "2026-12-08",
    done: false,
  },
];

export const STATUS_LABEL: Record<RsvpStatus, { pill: string; text: string }> =
  {
    yes: { pill: "yes", text: "Confirmed" },
    no: { pill: "no", text: "Declined" },
    pending: { pill: "wait", text: "Pending" },
  };

export function seatsUsed(guests: SampleGuest[], tableId: string): number {
  return guests.reduce(
    (seated, g) =>
      seated + (g.tableId === tableId && g.status === "yes" ? g.party : 0),
    0
  );
}

export function guestCounts(guests: SampleGuest[]) {
  const counts = { yes: 0, no: 0, pending: 0, people: 0, seated: 0 };
  for (const g of guests) {
    counts[g.status]++;
    if (g.status === "yes") {
      counts.people += g.party;
      if (g.tableId) counts.seated += g.party;
    }
  }
  return counts;
}

export function tableById(id: string | null): SampleTable | null {
  return SAMPLE_TABLES.find((t) => t.id === id) ?? null;
}

export function sortVendors(vendors: SampleVendor[]): SampleVendor[] {
  return [...vendors].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due)
  );
}

export function formatDue(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
