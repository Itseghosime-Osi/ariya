"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { accountInitials } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";
import { AdminDock } from "./AdminDock";

type AdminNavItem = { href: string; label: string; icon: IconName };

/** The desk's sections, grouped like the host dashboard's sidebar. */
export const ADMIN_NAV_GROUPS: {
  label: string;
  panel: boolean;
  items: AdminNavItem[];
}[] = [
  {
    label: "Home",
    panel: false,
    items: [{ href: "/admin", label: "Overview", icon: "space_dashboard" }],
  },
  {
    label: "People",
    panel: true,
    items: [
      { href: "/admin/accounts", label: "Accounts", icon: "person" },
      { href: "/admin/events", label: "Celebrations", icon: "celebration" },
    ],
  },
  {
    label: "Money & messages",
    panel: true,
    items: [
      { href: "/admin/payments", label: "Payments", icon: "credit_card" },
      { href: "/admin/emails", label: "Emails", icon: "mail" },
      { href: "/admin/ai", label: "AI connections", icon: "link" },
    ],
  },
  {
    label: "Oversight",
    panel: false,
    items: [
      { href: "/admin/health", label: "Health", icon: "check_circle" },
      { href: "/admin/log", label: "Admin log", icon: "receipt_long" },
    ],
  },
];

export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(
  (g) => g.items
);

export function isActive(pathname: string, href: string, home = "/admin") {
  return href === home
    ? pathname === home
    : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The admin desk's frame: the host dashboard's floating velvet sidebar and frosted top bar, in the
 * admin palette (see styles/admin.css). On phones the sections become a scrolling row of chips.
 */
export function AdminShell({
  email,
  base,
  children,
}: {
  email: string;
  /** The desk's secret address; the internal /admin paths below are shown under it. */
  base: string;
  children: React.ReactNode;
}) {
  const at = (href: string) => href.replace(/^\/admin(?=\/|$)/, base);
  const pathname = usePathname() ?? base;
  const current = ADMIN_NAV.find((n) => isActive(pathname, at(n.href), base));

  return (
    <div className="admin-theme min-h-dvh">
      <aside
        className="sb fixed bottom-3 left-3 top-3 z-50 hidden flex-col rounded-[28px] lg:flex"
        data-collapsed="false"
        aria-label="Admin navigation"
      >
        <div className="flex h-[76px] shrink-0 items-center gap-3 px-5">
          <Link
            href={base}
            aria-label="Àríyá admin desk"
            className="sb-mono grid h-11 w-11 shrink-0 place-items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span className="select-none font-display text-2xl font-bold text-gold">
              À
            </span>
          </Link>
          <div className="sb-label min-w-0 leading-tight">
            <div className="font-display text-[19px] font-bold text-[#f3f5f9]">
              Àríyá
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">
              Admin desk
            </div>
          </div>
        </div>

        <nav
          aria-label="Admin"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-4 pt-2"
        >
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="sb-section" aria-hidden="true">
                <span className="sb-section-text">{group.label}</span>
              </div>
              <div
                className={cn("flex flex-col gap-1", group.panel && "sb-panel")}
              >
                {group.items.map((item) => {
                  const on = isActive(pathname, at(item.href), base);
                  return (
                    <Link
                      key={item.href}
                      href={at(item.href)}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "sb-item group relative flex h-11 items-center gap-1.5 rounded-2xl outline-none",
                        on
                          ? "adm-on text-[#0d1526]"
                          : "text-[#f3f5f9]/75 hover:text-[#f3f5f9]"
                      )}
                    >
                      <span
                        className={cn(
                          "sb-ico grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors duration-300",
                          !on && "group-hover:bg-white/[0.06]"
                        )}
                      >
                        <Icon name={item.icon} size={20} />
                      </span>
                      <span className="sb-label flex h-11 flex-1 items-center truncate px-3 text-[13px] font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-[#0d1526]">
              {accountInitials(email)}
            </span>
            <div className="min-w-0 leading-tight">
              <p
                className="truncate text-xs font-medium text-[#f3f5f9]/85"
                title={email}
              >
                {email}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/70">
                Admin
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[292px]">
        <header className="adm-bar sticky top-0 z-40 border-b border-hairline">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
            <div className="min-w-0">
              <Link
                href={base}
                className="font-display text-lg font-bold lg:hidden"
              >
                Àríyá <span className="text-sm text-burgundy">Admin</span>
              </Link>
              <p className="hidden text-[11px] font-bold uppercase tracking-[0.16em] text-label-2 lg:block">
                Admin desk{current ? ` · ${current.label}` : ""}
              </p>
            </div>
            <Link
              href="/events"
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 desk-chip rounded-full px-3.5 text-xs font-semibold text-night hover:border-burgundy/40 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-burgundy"
            >
              <Icon name="arrow_back" size={14} />
              My celebrations
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
      <AdminDock base={base} />
    </div>
  );
}
