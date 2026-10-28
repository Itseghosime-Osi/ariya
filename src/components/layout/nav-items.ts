import { IconName } from "@/components/ui/icon";

export interface NavItem {
  name: string;
  href: (eventId?: string) => string;
  icon: IconName;
  activePattern: RegExp;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: "Desk & Overview",
    href: (id) => (id ? `/events/${id}` : "/events"),
    icon: "space_dashboard",
    activePattern: /^\/events\/[^/]+$/,
  },
  {
    name: "Celebrations",
    href: () => "/events",
    icon: "celebration",
    activePattern: /^\/events$/,
  },
  {
    name: "Guest Registry",
    href: (id) => (id ? `/events/${id}/guests` : "/events"),
    icon: "menu_book",
    activePattern: /\/guests/,
  },
  {
    name: "Seating Plan",
    href: (id) => (id ? `/events/${id}/seating` : "/events"),
    icon: "table_restaurant",
    activePattern: /\/seating/,
  },
  {
    name: "Event Page & Editor",
    href: (id) => (id ? `/events/${id}/page-editor` : "/events"),
    icon: "edit",
    activePattern: /\/page-editor/,
  },
  {
    name: "Invitations",
    href: (id) => (id ? `/events/${id}/invitations` : "/events"),
    icon: "styler",
    activePattern: /\/invitations/,
  },
  {
    name: "Check-in Desk",
    href: (id) => (id ? `/events/${id}/check-in` : "/events"),
    icon: "qr_code_scanner",
    activePattern: /\/check-in/,
  },
  {
    name: "Vendors",
    href: (id) => (id ? `/events/${id}/vendors` : "/events"),
    icon: "restaurant_menu",
    activePattern: /\/vendors/,
  },
  {
    name: "Team & Roles",
    href: (id) => (id ? `/events/${id}/team` : "/events"),
    icon: "diversity_3",
    activePattern: /\/team/,
  },
  {
    name: "Billing & Invoicing",
    href: (id) => (id ? `/events/${id}/billing` : "/events"),
    icon: "credit_card",
    activePattern: /\/billing/,
  },
  {
    name: "Settings",
    href: (id) => (id ? `/events/${id}/settings` : "/events"),
    icon: "settings",
    activePattern: /\/settings/,
  },
];
