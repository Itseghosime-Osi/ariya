import type { IconName } from "@/components/ui/icon";

export interface NavItem {
  name: string;
  href: string;
  icon: IconName;
  badge?: string;
}

export function getNavItems(eventId?: string): NavItem[] {
  const id = eventId?.trim();
  const hasValidEvent = Boolean(id && id !== "default");

  if (!hasValidEvent) {
    return [
      {
        name: "Events",
        href: "/events",
        icon: "celebration",
      },
    ];
  }

  const baseUrl = `/events/${id}`;

  return [
    {
      name: "Events",
      href: "/events",
      icon: "celebration",
    },
    {
      name: "Overview",
      href: baseUrl,
      icon: "space_dashboard",
    },
    {
      name: "Guests",
      href: `${baseUrl}/guests`,
      icon: "menu_book",
    },
    {
      name: "Invitations",
      href: `${baseUrl}/invitations`,
      icon: "drafts",
    },
    {
      name: "Seating",
      href: `${baseUrl}/seating`,
      icon: "table_restaurant",
    },
    {
      name: "Vendors",
      href: `${baseUrl}/vendors`,
      icon: "restaurant_menu",
    },
    {
      name: "Check-in",
      href: `${baseUrl}/check-in`,
      icon: "qr_code_scanner",
    },
    {
      name: "Page",
      href: `${baseUrl}/page-editor`,
      icon: "styler",
    },
    {
      name: "Team",
      href: `${baseUrl}/team`,
      icon: "diversity_3",
    },
    {
      name: "Reminders",
      href: `${baseUrl}/reminders`,
      icon: "outgoing_mail",
    },
    {
      name: "Billing",
      href: `${baseUrl}/billing`,
      icon: "credit_card",
    },
    {
      name: "Settings",
      href: `${baseUrl}/settings`,
      icon: "settings",
    },
  ];
}

/**
 * Returns 3–5 single-word navigation-only tabs for the phone bottom capsule bar,
 * using ONLY existing routes.
 */
export function getPhoneTabItems(
  eventId?: string,
  primaryEventId?: string
): NavItem[] {
  const targetId = (eventId || primaryEventId)?.trim();
  const hasValidEvent = Boolean(targetId && targetId !== "default");

  if (!hasValidEvent) {
    return [
      {
        name: "Events",
        href: "/events",
        icon: "celebration",
      },
    ];
  }

  const baseUrl = `/events/${targetId}`;
  return [
    {
      name: "Events",
      href: "/events",
      icon: "celebration",
    },
    {
      name: "Overview",
      href: baseUrl,
      icon: "space_dashboard",
    },
    {
      name: "Guests",
      href: `${baseUrl}/guests`,
      icon: "menu_book",
    },
    {
      name: "Seating",
      href: `${baseUrl}/seating`,
      icon: "table_restaurant",
    },
    {
      name: "Settings",
      href: `${baseUrl}/settings`,
      icon: "settings",
    },
  ];
}
