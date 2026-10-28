import { IconName } from "@/components/ui/icon";

export type NavGroup = "home" | "plan" | "day" | "manage";

export interface NavItem {
  name: string;
  href: (eventId?: string) => string;
  icon: IconName;
  activePattern: RegExp;
  group: NavGroup;
}

/** The sidebar's sections, in order. Grouped sections sit on a tinted panel. */
export const NAV_GROUPS: { id: NavGroup; label: string; panel: boolean }[] = [
  { id: "home", label: "Home", panel: false },
  { id: "plan", label: "Planning", panel: true },
  { id: "day", label: "On the day", panel: true },
  { id: "manage", label: "Manage", panel: false },
];

export const NAV_ITEMS: NavItem[] = [
  {
    name: "Desk & Overview",
    href: (id) => (id ? `/events/${id}` : "/events"),
    icon: "space_dashboard",
    activePattern: /^\/events\/[^/]+$/,
    group: "home",
  },
  {
    name: "Celebrations",
    href: () => "/events",
    icon: "celebration",
    activePattern: /^\/events$/,
    group: "home",
  },
  {
    name: "Guest Registry",
    href: (id) => (id ? `/events/${id}/guests` : "/events"),
    icon: "menu_book",
    activePattern: /\/guests/,
    group: "plan",
  },
  {
    name: "Seating Plan",
    href: (id) => (id ? `/events/${id}/seating` : "/events"),
    icon: "table_restaurant",
    activePattern: /\/seating/,
    group: "plan",
  },
  {
    name: "Event Page & Editor",
    href: (id) => (id ? `/events/${id}/page-editor` : "/events"),
    icon: "edit",
    activePattern: /\/page-editor/,
    group: "plan",
  },
  {
    name: "Invitations",
    href: (id) => (id ? `/events/${id}/invitations` : "/events"),
    icon: "styler",
    activePattern: /\/invitations/,
    group: "plan",
  },
  {
    name: "Check-in Desk",
    href: (id) => (id ? `/events/${id}/check-in` : "/events"),
    icon: "qr_code_scanner",
    activePattern: /\/check-in/,
    group: "day",
  },
  {
    name: "Vendors",
    href: (id) => (id ? `/events/${id}/vendors` : "/events"),
    icon: "restaurant_menu",
    activePattern: /\/vendors/,
    group: "day",
  },
  {
    name: "Team & Roles",
    href: (id) => (id ? `/events/${id}/team` : "/events"),
    icon: "diversity_3",
    activePattern: /\/team/,
    group: "manage",
  },
  {
    name: "Billing & Invoicing",
    href: (id) => (id ? `/events/${id}/billing` : "/events"),
    icon: "credit_card",
    activePattern: /\/billing/,
    group: "manage",
  },
  {
    name: "Settings",
    href: (id) => (id ? `/events/${id}/settings` : "/events"),
    icon: "settings",
    activePattern: /\/settings/,
    group: "manage",
  },
];
