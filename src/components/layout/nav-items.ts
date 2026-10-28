import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  name: string;
  href: string;
  icon: IconName;
  badge?: string;
}

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
    { name: "Overview", href: baseUrl, icon: "space_dashboard" },
    { name: "Guests", href: `${baseUrl}/guests`, icon: "menu_book" },
    { name: "Invitations", href: `${baseUrl}/invitations`, icon: "drafts" },
    {
      name: "Reminders",
      href: `${baseUrl}/reminders`,
      icon: "outgoing_mail",
    },
    { name: "Seating", href: `${baseUrl}/seating`, icon: "table_restaurant" },
    {
      name: "Check-in",
      href: `${baseUrl}/check-in`,
      icon: "qr_code_scanner",
    },
    { name: "Vendors", href: `${baseUrl}/vendors`, icon: "restaurant_menu" },
    { name: "Team", href: `${baseUrl}/team`, icon: "diversity_3" },
    { name: "Page editor", href: `${baseUrl}/page-editor`, icon: "styler" },
    { name: "Billing", href: `${baseUrl}/billing`, icon: "credit_card" },
    { name: "Settings", href: `${baseUrl}/settings`, icon: "settings" },
  ];
}

export function getNavItems(eventId?: string | null): NavItem[] {
  return [
    { name: "Home", href: "/events", icon: "celebration" },
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
