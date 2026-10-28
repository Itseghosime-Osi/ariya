import type { IconName } from "@/components/ui/icon";

export type NavGroup = "home" | "plan" | "day" | "manage";

export interface NavItem {
  name: string;
  href: string;
  icon: IconName;
  badge?: string;
  group?: NavGroup;
}

/** The sidebar's sections, in order. Grouped sections sit on a tinted panel. */
export const NAV_GROUPS: { id: NavGroup; label: string; panel: boolean }[] = [
  { id: "home", label: "Home", panel: false },
  { id: "plan", label: "Planning", panel: true },
  { id: "day", label: "On the day", panel: true },
  { id: "manage", label: "Manage", panel: false },
];

export interface SwitcherEvent {
  id: string;
  title: string;
  date: string;
  couple?: string | null;
}

export function isValidEventId(eventId?: string | null): eventId is string {
  const id = eventId?.trim();
  return Boolean(id && id !== "default");
}

export function getEventSections(eventId?: string | null): NavItem[] {
  if (!isValidEventId(eventId)) return [];
  const baseUrl = `/events/${eventId.trim()}`;

  return [
    { name: "Overview", href: baseUrl, icon: "space_dashboard", group: "home" },
    {
      name: "Guests",
      href: `${baseUrl}/guests`,
      icon: "menu_book",
      group: "plan",
    },
    {
      name: "Invitations",
      href: `${baseUrl}/invitations`,
      icon: "drafts",
      group: "plan",
    },
    {
      name: "Reminders",
      href: `${baseUrl}/reminders`,
      icon: "outgoing_mail",
      group: "plan",
    },
    {
      name: "Seating",
      href: `${baseUrl}/seating`,
      icon: "table_restaurant",
      group: "plan",
    },
    {
      name: "Check-in",
      href: `${baseUrl}/check-in`,
      icon: "qr_code_scanner",
      group: "day",
    },
    {
      name: "Vendors",
      href: `${baseUrl}/vendors`,
      icon: "restaurant_menu",
      group: "day",
    },
    {
      name: "Team",
      href: `${baseUrl}/team`,
      icon: "diversity_3",
      group: "manage",
    },
    {
      name: "Page editor",
      href: `${baseUrl}/page-editor`,
      icon: "styler",
      group: "plan",
    },
    {
      name: "Billing",
      href: `${baseUrl}/billing`,
      icon: "credit_card",
      group: "manage",
    },
    {
      name: "Settings",
      href: `${baseUrl}/settings`,
      icon: "settings",
      group: "manage",
    },
  ];
}

export function getNavItems(eventId?: string | null): NavItem[] {
  return [
    { name: "Home", href: "/events", icon: "celebration", group: "home" },
    ...getEventSections(eventId),
  ];
}

export function getPhonePrimaryTabs(eventId?: string | null): NavItem[] {
  const valid = isValidEventId(eventId);
  const baseUrl = valid ? `/events/${eventId.trim()}` : "/events";
  return [
    { name: "Home", href: "/events", icon: "celebration" },
    {
      name: "Guests",
      href: valid ? `${baseUrl}/guests` : "/events",
      icon: "menu_book",
    },
    {
      name: "Check-in",
      href: valid ? `${baseUrl}/check-in` : "/events",
      icon: "qr_code_scanner",
    },
  ];
}

export function getPhoneMoreSections(eventId?: string | null): NavItem[] {
  return getEventSections(eventId).filter(
    (item) => item.name !== "Guests" && item.name !== "Check-in"
  );
}
