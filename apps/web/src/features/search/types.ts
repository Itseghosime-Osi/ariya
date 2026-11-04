export interface SearchEventResult {
  id: string;
  title: string;
  couple: string;
  date: string;
  venue: string;
  slug: string;
  user_role: string;
}

export interface SearchGuestResult {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  side: string | null;
  group_name: string | null;
  event_title: string;
}

export interface SearchVendorResult {
  id: string;
  event_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  event_title: string;
}

export interface GlobalSearchResults {
  events: SearchEventResult[];
  guests: SearchGuestResult[];
  vendors: SearchVendorResult[];
}
