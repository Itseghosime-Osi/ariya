"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export const ADMIN_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Overview", icon: "space_dashboard" },
  { href: "/admin/accounts", label: "Accounts", icon: "person" },
  { href: "/admin/events", label: "Celebrations", icon: "celebration" },
  { href: "/admin/payments", label: "Payments", icon: "credit_card" },
  { href: "/admin/emails", label: "Emails", icon: "mail" },
  { href: "/admin/ai", label: "AI connections", icon: "link" },
  { href: "/admin/health", label: "Health", icon: "check_circle" },
  { href: "/admin/log", label: "Admin log", icon: "receipt_long" },
];

export function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** The admin desk's frame: a dark rail on wide screens, a scrolling tab row on phones. */
export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/admin";

  return (
    <div className="min-h-dvh bg-ivory text-night lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden flex-col bg-night px-4 py-6 text-ivory lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <Link
          href="/admin"
          className="px-2 font-display text-2xl font-bold text-gold"
        >
          Àríyá
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory/60">
            Admin desk
          </span>
        </Link>
        <nav aria-label="Admin" className="mt-8 flex flex-col gap-1">
          {ADMIN_NAV.map((item) => {
            const on = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gold",
                  on
                    ? "bg-ivory/10 text-gold"
                    : "text-ivory/80 hover:bg-ivory/[0.06] hover:text-ivory"
                )}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-ivory/10 px-2 pt-4 text-xs text-ivory/60">
          <p className="truncate" title={email}>
            {email}
          </p>
          <Link
            href="/events"
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 font-semibold text-ivory/80 hover:text-gold"
          >
            <Icon name="arrow_back" size={14} />
            Back to my celebrations
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-hairline bg-ivory/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <Link href="/admin" className="font-display text-xl font-bold">
              Àríyá <span className="text-sm text-gold-ink">Admin</span>
            </Link>
            <Link
              href="/events"
              className="text-xs font-semibold text-label-2 underline-offset-2 hover:underline"
            >
              My celebrations
            </Link>
          </div>
          <nav
            aria-label="Admin"
            className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]"
          >
            {ADMIN_NAV.map((item) => {
              const on = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold",
                    on ? "bg-night text-gold" : "text-label-2 hover:bg-night/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
