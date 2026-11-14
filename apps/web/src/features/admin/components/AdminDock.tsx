"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
} from "motion/react";
import {
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  PartyPopper,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, isActive } from "./AdminShell";

const SPRING = { type: "spring", bounce: 0.22, duration: 0.5 } as const;

/** The four places staff go most, on the pill; everything else is under More. */
const TABS: { href: string; name: string; icon: LucideIcon }[] = [
  { href: "/admin", name: "Overview", icon: LayoutDashboard },
  { href: "/admin/accounts", name: "Accounts", icon: Users },
  { href: "/admin/events", name: "Events", icon: PartyPopper },
  { href: "/admin/payments", name: "Payments", icon: CreditCard },
];

/**
 * The admin desk on a phone: the host dashboard's floating dock (a white pill with a gliding
 * capsule, and a More menu that blooms up from it), in the admin palette.
 */
export function AdminDock({ base }: { base: string }) {
  const pathname = usePathname() ?? base;
  const [moreOpen, setMoreOpen] = useState(false);
  const moreId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const at = (href: string) => href.replace(/^\/admin(?=\/|$)/, base);

  const tabHrefs = new Set(TABS.map((t) => t.href));
  const moreItems = ADMIN_NAV.filter((n) => !tabHrefs.has(n.href));
  const activeTab =
    TABS.find((t) => isActive(pathname, at(t.href), base))?.name ??
    (moreItems.some((n) => isActive(pathname, at(n.href), base))
      ? "More"
      : null);

  // Close More on navigation and on Escape, and return focus to the button.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-ivory via-ivory/80 to-transparent lg:hidden"
      />

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="scrim"
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-night/25 backdrop-blur-[2px] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      <div
        className="dock fixed inset-x-3 z-50 lg:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              id={moreId}
              ref={panelRef}
              role="group"
              aria-label="More admin sections"
              data-testid="admin-more-sheet"
              className="absolute inset-x-0 bottom-full mx-auto mb-3 max-w-md rounded-[28px] bg-white/95 p-4 shadow-[0_24px_50px_-20px_rgba(7,14,34,0.5),0_2px_8px_-2px_rgba(7,14,34,0.12)] ring-1 ring-black/5"
              style={{ transformOrigin: "88% 100%" }}
              initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.05 }}
              animate={{
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                transition: {
                  scaleX: {
                    type: "spring",
                    stiffness: 108,
                    damping: 7.46,
                    mass: 1.2,
                  },
                  scaleY: {
                    type: "spring",
                    stiffness: 79.5,
                    damping: 6.39,
                    mass: 1.2,
                  },
                  opacity: { duration: 0.25 },
                },
              }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <h2 className="font-display text-lg font-bold text-night">
                  Admin desk
                </h2>
                <span className="text-xs text-label-2">Jump to a section</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {moreItems.map((item, i) => {
                  const active = isActive(pathname, at(item.href), base);
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, y: 14, scale: 0.92 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { ...SPRING, delay: 0.25 + i * 0.05 },
                      }}
                    >
                      <Link
                        href={at(item.href)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-[48px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                          active
                            ? "bg-burgundy/[0.09] font-semibold text-burgundy ring-1 ring-burgundy/10"
                            : "bg-ivory font-medium text-night/80 hover:bg-burgundy/[0.06] hover:text-night"
                        )}
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                      </Link>
                    </motion.div>
                  );
                })}
                <Link
                  href="/events"
                  className="col-span-2 flex min-h-[48px] items-center gap-2.5 rounded-2xl bg-ivory px-3 py-2 text-xs font-medium text-night/80 outline-none hover:text-night focus-visible:ring-2 focus-visible:ring-burgundy"
                >
                  <Icon name="arrow_back" size={18} />
                  Back to my celebrations
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav
          aria-label="Admin navigation"
          data-testid="admin-dock"
          className="dock-pill mx-auto flex max-w-md items-center rounded-full bg-white p-1.5"
        >
          <LayoutGroup id="admin-dock">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.name;
              return (
                <Link
                  key={tab.href}
                  href={at(tab.href)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                    active
                      ? "font-semibold text-burgundy"
                      : "font-medium text-night/60 active:text-night"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-dock-capsule"
                      aria-hidden="true"
                      className="dock-capsule absolute inset-0 rounded-full"
                      style={{ borderRadius: 9999 }}
                      transition={SPRING}
                    />
                  )}
                  <span className="relative">
                    <TabIcon
                      size={22}
                      strokeWidth={active ? 2.4 : 1.8}
                      fill={active ? "currentColor" : "none"}
                      fillOpacity={active ? 0.14 : 0}
                    />
                  </span>
                  <span className="relative max-w-full truncate leading-none">
                    {tab.name}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              ref={moreRef}
              data-testid="admin-more-button"
              aria-expanded={moreOpen}
              aria-controls={moreOpen ? moreId : undefined}
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                activeTab === "More"
                  ? "font-semibold text-burgundy"
                  : "font-medium text-night/60 active:text-night"
              )}
            >
              {activeTab === "More" && (
                <motion.span
                  layoutId="admin-dock-capsule"
                  aria-hidden="true"
                  className="dock-capsule absolute inset-0 rounded-full"
                  style={{ borderRadius: 9999 }}
                  transition={SPRING}
                />
              )}
              <span className="relative">
                <LayoutGrid
                  size={22}
                  strokeWidth={activeTab === "More" ? 2.4 : 1.8}
                />
              </span>
              <span className="relative leading-none">More</span>
            </button>
          </LayoutGroup>
        </nav>
      </div>
    </MotionConfig>
  );
}
