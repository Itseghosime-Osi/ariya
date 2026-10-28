"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  CalendarPlus,
  House,
  LayoutGrid,
  Plus,
  ScanLine,
  Send,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { EventSwitcher } from "./EventSwitcher";
import {
  getPhoneMoreSections,
  isValidEventId,
  type SwitcherEvent,
} from "./nav-items";

interface PhoneDockProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
}

interface DockTab {
  name: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
}

interface CreateAction {
  name: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  testId?: string;
}

const SPRING = { type: "spring", bounce: 0.22, duration: 0.5 } as const;
const SPARKS = 7;

/** Shows a small gold dot while a tapped tab's route is still loading. */
function PendingDot() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "dock-pending absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-gold",
        pending && "dock-pending-on"
      )}
    />
  );
}

function isSectionActive(pathname: string, href: string) {
  if (/^\/events\/[^/]+$/.test(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The phone navigation: a floating ivory pill whose burgundy capsule glides to
 * the current tab, and beside it a burgundy "Create" circle with a gold halo
 * that blooms into quick actions. Lives in the persistent layout, so the
 * capsule slides between pages instead of jumping.
 */
export function PhoneDock({
  events,
  activeEvent,
  onSelectEvent,
}: PhoneDockProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const menuId = useId();
  const createRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [typing, setTyping] = useState(false);
  const [burst, setBurst] = useState(0);
  const menuOpen = createOpen || moreOpen;

  const eventId = isValidEventId(activeEvent?.id) ? activeEvent.id : null;
  const base = eventId ? `/events/${eventId}` : null;
  const moreSections = getPhoneMoreSections(eventId);
  const moreActive =
    moreOpen ||
    moreSections.some((item) => isSectionActive(pathname, item.href));

  const tabs: DockTab[] = [
    {
      name: "Home",
      href: "/events",
      icon: House,
      active: pathname === "/events",
    },
    {
      name: "Guests",
      href: base ? `${base}/guests` : "/events",
      icon: Users,
      active: Boolean(base && pathname.startsWith(`${base}/guests`)),
    },
    {
      name: "Check-in",
      href: base ? `${base}/check-in` : "/events",
      icon: ScanLine,
      active: Boolean(base && pathname.startsWith(`${base}/check-in`)),
    },
  ];
  const activeTab = moreActive ? "More" : tabs.find((tab) => tab.active)?.name;

  const actions: CreateAction[] = [
    {
      name: "New event",
      hint: "Start a celebration",
      href: "/events/new",
      icon: CalendarPlus,
      testId: "floating-new-event",
    },
    ...(base
      ? [
          {
            name: "Add guests",
            hint: activeEvent?.title ?? "To this event",
            href: `${base}/guests/import`,
            icon: UserPlus,
          },
          {
            name: "Send invitations",
            hint: "Share the invite link",
            href: `${base}/invitations`,
            icon: Send,
          },
          {
            name: "Open check-in",
            hint: "Welcome guests at the door",
            href: `${base}/check-in`,
            icon: ScanLine,
          },
        ]
      : []),
  ];

  // Every navigation settles the dock: menus close, full size returns.
  useEffect(() => {
    setCreateOpen(false);
    setMoreOpen(false);
    setCompact(false);
  }, [pathname]);

  // iOS-style minimise: shrink while reading down, restore on the way back up.
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        if (Math.abs(delta) < 8) return;
        setCompact(delta > 0 && y > 96);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Step aside while the on-screen keyboard is up, so it never covers a field.
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) &&
      !(
        el instanceof HTMLInputElement &&
        /^(checkbox|radio|button|submit)$/.test(el.type)
      );
    const onFocusIn = (e: FocusEvent) => setTyping(isField(e.target));
    const onFocusOut = () => setTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Either menu: focus moves in; Escape closes it and returns focus to its button.
  useEffect(() => {
    if (!menuOpen) return;
    const opener = createOpen ? createRef.current : moreRef.current;
    if (createOpen) {
      firstActionRef.current?.focus();
    } else {
      morePanelRef.current
        ?.querySelector<HTMLElement>("a[href], button")
        ?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Let the event switcher's own dropdown close first.
      if (document.querySelector('[role="menu"][data-state="open"]')) return;
      setCreateOpen(false);
      setMoreOpen(false);
      opener?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, createOpen]);

  const toggleMore = () => {
    setCreateOpen(false);
    setMoreOpen((open) => !open);
  };

  const toggleCreate = () => {
    setMoreOpen(false);
    setCreateOpen((open) => {
      if (!open) {
        setBurst((n) => n + 1);
        try {
          navigator.vibrate?.(8);
        } catch {
          /* haptics are a nicety */
        }
      }
      return !open;
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* Soft wash so the floating dock reads over busy content */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-ivory via-ivory/80 to-transparent md:hidden"
      />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="scrim"
            aria-hidden="true"
            data-testid="phone-scrim"
            className="fixed inset-0 z-40 bg-night/25 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setCreateOpen(false);
              setMoreOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="dock fixed inset-x-3 z-50 md:hidden"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        initial={false}
        animate={
          typing
            ? { y: "160%", opacity: 0 }
            : { y: compact && !menuOpen ? 6 : 0, opacity: 1 }
        }
        transition={SPRING}
        inert={typing}
        data-hidden={typing || undefined}
      >
        {/* Celebration menu blooms up from More, above the pill */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              id={moreId}
              key="more-menu"
              ref={morePanelRef}
              role="group"
              aria-label="Celebration menu"
              data-testid="phone-more-sheet"
              className="absolute inset-x-0 bottom-full mx-auto mb-3 max-h-[min(70dvh,34rem)] max-w-md overflow-y-auto overscroll-contain rounded-[28px] bg-white/95 p-4 shadow-[0_24px_50px_-20px_rgba(28,7,13,0.5),0_2px_8px_-2px_rgba(28,7,13,0.12)] ring-1 ring-black/5"
              style={{ transformOrigin: "62% 100%" }}
              initial={{ opacity: 0, y: 28, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: SPRING }}
              exit={{
                opacity: 0,
                y: 18,
                scale: 0.92,
                transition: { duration: 0.16 },
              }}
            >
              <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                <h2 className="font-display text-lg font-bold text-night">
                  Celebration menu
                </h2>
                <span className="text-xs text-label-2">
                  Switch or jump to a section
                </span>
              </div>

              <EventSwitcher
                events={events}
                activeEvent={activeEvent}
                onSelectEvent={onSelectEvent}
              />

              {moreSections.length > 0 && (
                <div
                  data-testid="phone-more-sections"
                  className="grid grid-cols-2 gap-1.5 pt-3"
                >
                  {moreSections.map((item, i) => {
                    const active = isSectionActive(pathname, item.href);
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, y: 14, scale: 0.92 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: { ...SPRING, delay: 0.06 + i * 0.03 },
                        }}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex min-h-[48px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                            active
                              ? "bg-burgundy/[0.09] font-semibold text-burgundy ring-1 ring-burgundy/10"
                              : "bg-ivory font-medium text-night/80 hover:bg-burgundy/[0.06] hover:text-night"
                          )}
                        >
                          <Icon
                            name={item.icon}
                            size={16}
                            className="shrink-0"
                          />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick actions bloom up from the Create circle */}
        <AnimatePresence>
          {createOpen && (
            <motion.div
              id={menuId}
              key="create-menu"
              role="group"
              aria-label="Create"
              data-testid="phone-create-menu"
              className="absolute bottom-full right-0 mb-3 flex w-[min(19rem,calc(100vw-1.5rem))] flex-col gap-2"
            >
              {actions.map((action, i) => {
                const ActionIcon = action.icon;
                const fromEnd = actions.length - 1 - i;
                return (
                  <motion.div
                    key={action.name}
                    initial={{ opacity: 0, y: 24, scale: 0.86 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { ...SPRING, delay: fromEnd * 0.045 },
                    }}
                    exit={{
                      opacity: 0,
                      y: 16,
                      scale: 0.9,
                      transition: { duration: 0.14, delay: i * 0.02 },
                    }}
                    style={{ transformOrigin: "100% 100%" }}
                  >
                    <Link
                      ref={i === 0 ? firstActionRef : undefined}
                      href={action.href}
                      data-testid={action.testId}
                      onClick={() => setCreateOpen(false)}
                      className="dock-action group flex min-h-[56px] items-center gap-3 rounded-[22px] bg-white/95 py-2 pl-2 pr-4 text-left shadow-[0_18px_40px_-18px_rgba(28,7,13,0.45),0_2px_6px_-2px_rgba(28,7,13,0.12)] ring-1 ring-black/5 outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-burgundy/[0.08] text-burgundy transition-colors group-hover:bg-burgundy group-hover:text-ivory group-focus-visible:bg-burgundy group-focus-visible:text-ivory">
                        <ActionIcon size={20} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-night">
                          {action.name}
                        </span>
                        <span className="block truncate text-xs text-label-2">
                          {action.hint}
                        </span>
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mx-auto flex max-w-md items-center gap-2.5">
          <motion.nav
            aria-label="Mobile navigation"
            data-testid="phone-tab-bar"
            className="dock-pill flex min-w-0 flex-1 items-center rounded-full bg-white p-1.5"
            animate={{ scale: compact && !menuOpen ? 0.94 : 1 }}
            transition={SPRING}
            style={{ transformOrigin: "50% 100%" }}
          >
            <LayoutGroup id="phone-dock">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const active = activeTab === tab.name;
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                      active
                        ? "font-semibold text-burgundy"
                        : "font-medium text-night/60 active:text-night"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="dock-capsule"
                        aria-hidden="true"
                        className="dock-capsule absolute inset-0 rounded-full"
                        style={{ borderRadius: 9999 }}
                        transition={SPRING}
                      />
                    )}
                    <motion.span
                      className="relative"
                      animate={
                        active && !reduceMotion
                          ? { scale: [1, 1.16, 1], y: [0, -2, 0] }
                          : { scale: 1, y: 0 }
                      }
                      transition={{ duration: 0.42, ease: "easeOut" }}
                    >
                      <TabIcon
                        size={22}
                        strokeWidth={active ? 2.4 : 1.8}
                        fill={active ? "currentColor" : "none"}
                        fillOpacity={active ? 0.14 : 0}
                      />
                    </motion.span>
                    <span
                      className={cn(
                        "relative leading-none transition-[opacity,max-height] duration-300",
                        compact && !menuOpen
                          ? "max-h-0 opacity-0"
                          : "max-h-4 opacity-100"
                      )}
                    >
                      {tab.name}
                    </span>
                    <PendingDot />
                  </Link>
                );
              })}

              <button
                type="button"
                data-testid="phone-more-button"
                ref={moreRef}
                aria-expanded={moreOpen}
                aria-controls={moreOpen ? moreId : undefined}
                onClick={toggleMore}
                className={cn(
                  "relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy",
                  activeTab === "More"
                    ? "font-semibold text-burgundy"
                    : "font-medium text-night/60 active:text-night"
                )}
              >
                {activeTab === "More" && (
                  <motion.span
                    layoutId="dock-capsule"
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
                <span
                  className={cn(
                    "relative leading-none transition-[opacity,max-height] duration-300",
                    compact && !menuOpen
                      ? "max-h-0 opacity-0"
                      : "max-h-4 opacity-100"
                  )}
                >
                  More
                </span>
              </button>
            </LayoutGroup>
          </motion.nav>

          {/* Create: detached from the tabs, because actions aren't places */}
          <motion.button
            ref={createRef}
            type="button"
            data-testid="phone-create-button"
            aria-label={createOpen ? "Close create menu" : "Create"}
            aria-expanded={createOpen}
            aria-controls={createOpen ? menuId : undefined}
            onClick={toggleCreate}
            whileTap={{ scale: 0.9 }}
            transition={SPRING}
            className="dock-create relative grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full text-ivory outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            <span aria-hidden="true" className="dock-halo" />
            <motion.span
              className="relative"
              animate={{ rotate: createOpen ? 135 : 0 }}
              transition={SPRING}
            >
              <Plus size={26} strokeWidth={2.4} />
            </motion.span>
            <span
              key={burst}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {burst > 0 &&
                !reduceMotion &&
                Array.from({ length: SPARKS }, (_, i) => (
                  <i
                    key={i}
                    className="dock-spark"
                    style={
                      {
                        "--a": `${(i / SPARKS) * 360 + 12}deg`,
                        animationDelay: `${i * 18}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
            </span>
          </motion.button>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
