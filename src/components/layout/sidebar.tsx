"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { daysUntil, getLagosDateKey } from "@/lib/format";
import { EventSwitcher } from "./EventSwitcher";
import { SignOutConfirmation } from "./SignOutConfirmation";
import {
  NAV_GROUPS,
  getEventSections,
  type NavItem,
  type SwitcherEvent,
} from "./nav-items";

interface SidebarProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
  userEmail?: string;
  collapsed: boolean;
  onToggle: () => void;
  ready?: boolean;
}

const HOME: NavItem = { name: "Home", href: "/events", icon: "celebration" };
const CONFETTI_KEY = "ariya-sidebar-confetti";

function isActiveHref(pathname: string, href: string) {
  if (href === "/events") return pathname === "/events";
  if (/^\/events\/[^/]+$/.test(href)) return pathname === href;
  return pathname.startsWith(href);
}

interface Spark {
  id: number;
  x: number;
  y: number;
  r: number;
  c: string;
  d: number;
}

const SPARK_COLOURS = ["#e9c98a", "#f6dca8", "#f4efe6", "#f57c8a", "#c1283d"];

function initials(email: string) {
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters =
    (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)) || "A";
  return letters.toUpperCase();
}

export function Sidebar({
  events,
  activeEvent,
  onSelectEvent,
  userEmail = "Host",
  collapsed,
  onToggle,
  ready = true,
}: SidebarProps) {
  const pathname = usePathname();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [spins, setSpins] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [pill, setPill] = useState({ top: 0, height: 44, visible: false });
  const [tip, setTip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const [cardPos, setCardPos] = useState({ left: 0, bottom: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const accountRef = useRef<HTMLDivElement>(null);

  const sections = getEventSections(activeEvent?.id);
  const activeItems = events.length > 0 ? [HOME, ...sections] : sections;
  const active = activeItems.find((item) => isActiveHref(pathname, item.href));

  // The gold pill glides to whichever item is active.
  const activeName = active?.name;
  useLayoutEffect(() => {
    const el = activeName ? itemRefs.current[activeName] : null;
    if (!el) {
      setPill((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }
    setPill({ top: el.offsetTop, height: el.offsetHeight, visible: true });
  }, [activeName, collapsed, sections.length]);

  // The account card closes on a click elsewhere or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node))
        setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  // Folded, each icon names itself in a pill that pops out beside the sidebar.
  const showTip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    const aside = e.currentTarget.closest("aside")?.getBoundingClientRect();
    setTip({
      label,
      top: r.top + r.height / 2,
      left: (aside?.right ?? r.right) + 12,
    });
  };
  const hideTip = () => setTip(null);
  const lastTip = useRef(tip);
  if (tip) lastTip.current = tip;
  const tipProps = (label: string) => ({
    onMouseEnter: showTip(label),
    onFocus: showTip(label),
    onMouseLeave: hideTip,
    onBlur: hideTip,
  });

  const openAccount = (e: React.MouseEvent<HTMLButtonElement>) => {
    const aside = e.currentTarget.closest("aside")?.getBoundingClientRect();
    const r = e.currentTarget.getBoundingClientRect();
    setCardPos({
      left: collapsed ? (aside?.right ?? r.right) + 12 : r.left,
      bottom: collapsed
        ? window.innerHeight - r.bottom
        : window.innerHeight - r.top + 10,
    });
    setTip(null);
    setAccountOpen((v) => !v);
  };

  const toggle = () => {
    setSpins((n) => n + 1);
    setAccountOpen(false);
    setTip(null);
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let celebrated = false;
    try {
      celebrated = sessionStorage.getItem(CONFETTI_KEY) === "1";
      sessionStorage.setItem(CONFETTI_KEY, "1");
    } catch {
      /* storage unavailable: celebrate anyway */
    }
    if (!reduce && !celebrated) {
      // A little burst of gold, like confetti at the door.
      const base = Date.now();
      const burst = Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4;
        const dist = 26 + Math.random() * 34;
        return {
          id: base + i,
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist,
          r: Math.random() * 540 - 270,
          c: SPARK_COLOURS[i % SPARK_COLOURS.length],
          d: Math.random() * 80,
        };
      });
      setSparks(burst);
      window.setTimeout(() => setSparks([]), 900);
    }
    onToggle();
  };

  const onNavMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      "--my",
      `${e.clientY - box.top + e.currentTarget.scrollTop}px`
    );
  };

  const renderItem = (item: NavItem) => {
    const isActive = item.name === activeName;
    return (
      <Link
        key={item.name}
        ref={(el) => {
          itemRefs.current[item.name] = el;
        }}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? item.name : undefined}
        {...tipProps(item.name)}
        className={cn(
          "sb-item group relative z-10 flex h-11 items-center gap-1.5 rounded-2xl outline-none",
          // The new item turns dark only once the gold pill has glided under it.
          isActive
            ? "text-night [transition:color_220ms_ease_260ms]"
            : "text-ivory/70 hover:text-ivory [transition:color_150ms_ease]"
        )}
      >
        <span
          className={cn(
            "sb-ico grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-colors duration-300",
            !isActive &&
              "group-hover:bg-ivory/[0.06] group-focus-visible:bg-ivory/[0.08]"
          )}
        >
          <Icon name={item.icon} size={20} />
        </span>
        <span className="sb-label flex h-11 flex-1 items-center truncate px-3 text-[13px] font-semibold tracking-wide">
          {item.name}
        </span>
      </Link>
    );
  };

  const ringDays =
    activeEvent && getLagosDateKey(activeEvent.date)
      ? daysUntil(activeEvent.date)
      : null;
  const ringProgress =
    ringDays === null ? 0 : Math.max(0.04, 1 - Math.min(ringDays, 120) / 120);

  return (
    <>
      {/* Desktop sidebar: a floating velvet panel that folds to its icons */}
      <aside
        className={cn(
          "sb fixed bottom-3 left-3 top-3 z-50 hidden flex-col rounded-[28px] md:flex",
          !ready && "sb-still"
        )}
        data-collapsed={collapsed}
        data-testid="desktop-sidebar"
        aria-label="Primary navigation"
      >
        {/* Brand */}
        <div className="relative flex h-[76px] shrink-0 items-center gap-3 px-5">
          <Link
            href="/events"
            aria-label="Àríyá Suite"
            className="sb-mono relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{ transform: `rotate(${spins * 360}deg)` }}
          >
            <span className="select-none font-display text-2xl font-bold text-gold">
              À
            </span>
          </Link>
          <div className="sb-label min-w-0 leading-tight">
            <div className="font-display text-[19px] font-bold text-ivory">
              Àríyá
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">
              Suite
            </div>
          </div>
        </div>

        {/* Countdown to the big day */}
        {ringDays !== null && (
          <div className="px-5 pb-2">
            <div
              className="sb-count flex items-center gap-3 rounded-2xl"
              role="group"
              aria-label={`${ringDays} ${ringDays === 1 ? "day" : "days"} until ${activeEvent?.title ?? "the big day"}`}
              {...tipProps(`${ringDays} days to go`)}
            >
              <div className="relative grid h-11 w-11 shrink-0 place-items-center">
                <svg
                  viewBox="0 0 44 44"
                  className="absolute inset-0 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="19"
                    fill="none"
                    stroke="rgba(233,201,138,0.18)"
                    strokeWidth="3"
                  />
                  <circle
                    className="sb-ring"
                    cx="22"
                    cy="22"
                    r="19"
                    fill="none"
                    stroke="#e9c98a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray="1"
                    style={{ strokeDashoffset: 1 - ringProgress }}
                  />
                </svg>
                <span className="text-[13px] font-bold text-gold">
                  {ringDays}
                </span>
              </div>
              <div className="sb-label min-w-0 leading-tight">
                <div className="text-[13px] font-semibold text-ivory">
                  {ringDays === 0
                    ? "It's today!"
                    : ringDays === 1
                      ? "Tomorrow!"
                      : `${ringDays} days to go`}
                </div>
                <div className="text-[11px] text-ivory/60">
                  Until the big day
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div
          ref={navRef}
          onMouseMove={onNavMove}
          className="sb-nav relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-3 pt-2"
        >
          <div className="sb-glow" aria-hidden="true" />
          <div
            className={cn("sb-pill", pill.visible && "sb-pill-on")}
            style={{
              transform: `translateY(${pill.top}px)`,
              height: pill.height,
            }}
            aria-hidden="true"
          >
            <span key={active?.name} className="sb-pill-chip" />
            <span className="sb-pill-label" />
          </div>
          <nav className="flex flex-col gap-3" aria-label="Main navigation">
            {events.length > 0 && (
              <div className="flex flex-col gap-1">{renderItem(HOME)}</div>
            )}
            <div
              className={cn(
                "flex",
                collapsed || events.length === 0 ? "justify-start" : "block"
              )}
            >
              <EventSwitcher
                events={events}
                activeEvent={activeEvent}
                onSelectEvent={onSelectEvent}
                tone="velvet"
                compact={collapsed}
              />
            </div>

            {sections.length > 0 && (
              <div
                data-testid="sidebar-event-sections"
                className="flex flex-col gap-3"
              >
                {NAV_GROUPS.map((group) => {
                  const items = sections.filter(
                    (item) => item.group === group.id
                  );
                  if (items.length === 0) return null;
                  return (
                    <div key={group.id}>
                      <div className="sb-section" aria-hidden="true">
                        <span className="sb-section-text">{group.label}</span>
                        <span className="sb-section-dot" />
                      </div>
                      <div
                        className={cn(
                          "flex flex-col gap-1",
                          group.panel && "sb-panel"
                        )}
                      >
                        {items.map(renderItem)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </nav>
        </div>

        {/* Fold */}
        <div className="relative shrink-0 px-5 pt-1">
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            {...tipProps("Expand sidebar")}
            className="sb-item group relative flex h-11 w-full items-center gap-1.5 rounded-2xl text-ivory/70 outline-none hover:text-gold"
          >
            <span className="sb-ico relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl group-hover:bg-ivory/[0.06] group-focus-visible:bg-ivory/[0.08]">
              {collapsed ? (
                <PanelLeftOpen size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
              <span
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {sparks.map((s) => (
                  <i
                    key={s.id}
                    className="sb-spark"
                    style={
                      {
                        "--x": `${s.x}px`,
                        "--y": `${s.y}px`,
                        "--r": `${s.r}deg`,
                        background: s.c,
                        animationDelay: `${s.d}ms`,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </span>
            </span>
            <span className="sb-label flex flex-1 items-center justify-between px-3 text-[13px] font-semibold tracking-wide">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              <kbd
                aria-hidden="true"
                className="rounded-md border border-ivory/15 px-1.5 py-0.5 font-sans text-[10px] text-ivory/50"
              >
                [
              </kbd>
            </span>
          </button>
        </div>

        {/* Account */}
        <div ref={accountRef} className="relative shrink-0 px-5 pb-5 pt-2">
          <div className="sb-account flex items-center gap-1.5 rounded-2xl">
            <button
              type="button"
              onClick={openAccount}
              aria-label={`${initials(userEmail)}, Account Menu`}
              aria-expanded={accountOpen}
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-gold to-[#b8864b] text-[12px] font-bold text-night ring-2 ring-night">
                {initials(userEmail)}
              </span>
              <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#5bd19a] ring-2 ring-night" />
            </button>
            <div className="sb-label min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-semibold text-ivory">
                {userEmail}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ivory/50">
                Host
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSignOutOpen(true)}
              aria-label="Sign out"
              title="Sign out"
              className="sb-label grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ivory/60 outline-none transition-colors hover:bg-ivory/[0.07] hover:text-gold focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>

          <div
            className={cn(
              "sb-popover",
              accountOpen && "sb-popover-on",
              collapsed && "sb-popover-side"
            )}
            style={{ left: cardPos.left, bottom: cardPos.bottom }}
            role="dialog"
            aria-label="Account"
            aria-hidden={!accountOpen}
          >
            <div className="truncate text-xs font-medium text-ivory/80">
              {userEmail}
            </div>
            <button
              type="button"
              onClick={() => setSignOutOpen(true)}
              tabIndex={accountOpen ? 0 : -1}
              className="flex items-center gap-2 rounded-xl bg-wine px-3 py-2 text-xs font-semibold tracking-wide text-ivory transition-colors hover:bg-wine/80"
            >
              <Icon name="logout" size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        <div
          className={cn("sb-tooltip", tip && "sb-tooltip-on")}
          style={
            lastTip.current
              ? { top: lastTip.current.top, left: lastTip.current.left }
              : undefined
          }
          role="presentation"
          aria-hidden="true"
        >
          {lastTip.current?.label}
        </div>
      </aside>
      <SignOutConfirmation open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  );
}
