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
// Deep gold and burgundy read on the white cards; pale gold and ivory catch on the dark scrim.
const SPARK_COLOURS = [
  "#d9a441",
  "#e9c98a",
  "#f6dca8",
  "#8a2338",
  "#f57c8a",
  "#d9a441",
];

interface Spark {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  star: boolean;
  colour: string;
  delay: number;
  dur: number;
}

interface Ring {
  id: number;
  x: number;
  y: number;
}

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
  const pillRef = useRef<HTMLElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [typing, setTyping] = useState(false);
  // The tab just tapped, shown as active right away while its page loads.
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const fxId = useRef(0);
  const menuOpen = createOpen || moreOpen;
  // Where the More button sits relative to the menu, so the bubble grows from
  // it and shrinks back into it.
  const [bubbleOrigin, setBubbleOrigin] = useState("62% 100%");

  const eventId = isValidEventId(activeEvent?.id) ? activeEvent.id : null;
  const hasEvents = events.length > 0;
  const base = eventId ? `/events/${eventId}` : null;
  const moreSections = getPhoneMoreSections(eventId);
  const moreActive =
    moreOpen ||
    moreSections.some((item) => isSectionActive(pathname, item.href));

  const tabs: DockTab[] = hasEvents
    ? [
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
      ]
    : [];
  const activeTab = hasEvents
    ? (pendingTab ??
      (moreActive ? "More" : tabs.find((tab) => tab.active)?.name))
    : undefined;

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
    setPendingTab(null);
  }, [pathname]);

  // If a tapped page never arrives (offline, failed), stop pretending it did.
  useEffect(() => {
    if (!pendingTab) return;
    const id = window.setTimeout(() => setPendingTab(null), 10000);
    return () => window.clearTimeout(id);
  }, [pendingTab]);

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
    const button = moreRef.current;
    const pill = pillRef.current;
    if (button && pill && !moreOpen) {
      const b = button.getBoundingClientRect();
      const n = pill.getBoundingClientRect();
      // The menu spans the dock (max 28rem) and floats 12px above the pill.
      const dockWidth = window.innerWidth - 24;
      const panelWidth = Math.min(dockWidth, 448);
      const panelLeft = 12 + (dockWidth - panelWidth) / 2;
      const x = b.left + b.width / 2 - panelLeft;
      const below = b.top + b.height / 2 - (n.top - 12);
      setBubbleOrigin(`${Math.round(x)}px calc(100% + ${Math.round(below)}px)`);
    }
    setMoreOpen((open) => !open);
  };

  /** A burst of gold from wherever the Create button was tapped. */
  const burst = (e: React.MouseEvent<HTMLButtonElement>, count: number) => {
    if (reduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Keyboard clicks have no pointer position: burst from the centre.
    const fromPointer = e.detail > 0;
    const clamp = (n: number) => Math.max(-24, Math.min(24, n));
    const x = fromPointer ? clamp(e.clientX - (rect.left + rect.width / 2)) : 0;
    const y = fromPointer ? clamp(e.clientY - (rect.top + rect.height / 2)) : 0;
    const batch: Spark[] = Array.from({ length: count }, () => {
      // Mostly up and out, like a popper, with a few going sideways.
      const angle =
        Math.random() < 0.72
          ? -Math.PI * (0.08 + Math.random() * 0.84)
          : Math.random() * Math.PI * 2;
      const dist = 52 + Math.random() * 78;
      return {
        id: ++fxId.current,
        x,
        y,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 720,
        size: 8 + Math.random() * 8,
        star: Math.random() < 0.5,
        colour: SPARK_COLOURS[Math.floor(Math.random() * SPARK_COLOURS.length)],
        delay: Math.random() * 90,
        dur: 700 + Math.random() * 380,
      };
    });
    const ring: Ring = { id: ++fxId.current, x, y };
    setSparks((all) => [...all, ...batch]);
    setRings((all) => [...all, ring]);
    window.setTimeout(() => {
      setSparks((all) => all.filter((sp) => !batch.includes(sp)));
      setRings((all) => all.filter((r) => r.id !== ring.id));
    }, 1300);
  };

  const toggleCreate = (e: React.MouseEvent<HTMLButtonElement>) => {
    setMoreOpen(false);
    const opening = !createOpen;
    setCreateOpen(opening);
    burst(e, opening ? 18 : 8);
    if (opening) {
      try {
        navigator.vibrate?.(8);
      } catch {
        /* haptics are a nicety */
      }
    }
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
              style={{
                transformOrigin: bubbleOrigin,
                // Stops catching taps as soon as it starts drawing back in.
                pointerEvents: moreOpen ? "auto" : "none",
              }}
              initial={{ opacity: 0, scaleX: 0.05, scaleY: 0.05 }}
              animate={{
                opacity: 1,
                scaleX: 1,
                scaleY: 1,
                transition: {
                  // Chewing-gum: the two axes spring at different rates and
                  // are barely damped, so it stretches, squashes and wobbles.
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
              exit={{
                opacity: 0,
                scaleX: [1, 0.9, 0.05],
                scaleY: [1, 1.08, 0.05],
                transition: {
                  // Pulled back into the tab: it thins, stretches, then snaps shut.
                  scaleX: {
                    duration: 0.8,
                    times: [0, 0.4, 1],
                    ease: "easeInOut",
                  },
                  scaleY: {
                    duration: 0.8,
                    times: [0, 0.4, 1],
                    ease: "easeInOut",
                  },
                  opacity: { duration: 0.2, delay: 0.6 },
                },
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
                          transition: { ...SPRING, delay: 0.3 + i * 0.05 },
                        }}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => {
                            setMoreOpen(false);
                            if (!active) setPendingTab("More");
                          }}
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

        <div
          className={cn(
            "mx-auto flex max-w-md items-center gap-2.5",
            !hasEvents && "justify-center"
          )}
        >
          {hasEvents && (
            <motion.nav
              ref={pillRef}
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
                      aria-current={
                        tab.active && !pendingTab ? "page" : undefined
                      }
                      onClick={() => {
                        // Respond on the tap, not when the page arrives: reveal
                        // the labels and glide the capsule over straight away.
                        setCompact(false);
                        if (!tab.active) setPendingTab(tab.name);
                      }}
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
          )}

          {/* Create: detached from the tabs, because actions aren't places */}
          <motion.button
            ref={createRef}
            type="button"
            data-testid="phone-create-button"
            aria-expanded={createOpen}
            aria-controls={createOpen ? menuId : undefined}
            onClick={toggleCreate}
            whileTap={{ scale: 0.86 }}
            transition={SPRING}
            className="dock-create relative grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full text-ivory outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            <span aria-hidden="true" className="dock-halo" />
            <motion.span
              className="relative"
              animate={{ rotate: createOpen ? 135 : 0 }}
              transition={SPRING}
              aria-hidden="true"
            >
              <Plus size={26} strokeWidth={2.4} />
            </motion.span>
            <span className="sr-only">
              {createOpen
                ? "Close create menu"
                : hasEvents
                  ? "Create"
                  : "Create your first event"}
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {rings.map((ring) => (
                <i
                  key={ring.id}
                  className="dock-ring"
                  style={{
                    left: `calc(50% + ${ring.x}px)`,
                    top: `calc(50% + ${ring.y}px)`,
                  }}
                />
              ))}
              {sparks.map((sp) => (
                <i
                  key={sp.id}
                  className={cn("dock-spark", sp.star && "dock-spark-star")}
                  style={
                    {
                      left: `calc(50% + ${sp.x}px)`,
                      top: `calc(50% + ${sp.y}px)`,
                      width: sp.size,
                      height: sp.size,
                      marginLeft: -sp.size / 2,
                      marginTop: -sp.size / 2,
                      background: sp.colour,
                      "--dx": `${sp.dx}px`,
                      "--dy": `${sp.dy}px`,
                      "--rot": `${sp.rot}deg`,
                      animationDelay: `${sp.delay}ms`,
                      animationDuration: `${sp.dur}ms`,
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
