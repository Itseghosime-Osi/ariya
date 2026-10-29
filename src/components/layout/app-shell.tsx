"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { PhoneDock } from "./phone-dock";
import { isValidEventId, type SwitcherEvent } from "./nav-items";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "ariya-sidebar";

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  events: SwitcherEvent[];
  primaryEventId?: string;
}

/**
 * The persistent workspace frame, rendered once by app/(app)/layout.tsx.
 * The active event comes from the URL, so pages never pass it in.
 */
export function AppShell({
  children,
  userEmail,
  events,
  primaryEventId,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ eventId?: string }>();
  const eventId = params?.eventId;
  const userKey = userEmail?.trim().toLowerCase() || "default";
  const selectedKey = `ariya:selected-event:${userKey}`;

  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  // Remember whether the sidebar was folded; animate only once that is known, so the page doesn't slide on load.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "collapsed");
    } catch {
      /* storage unavailable: start open */
    }
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed");
      } catch {
        /* not remembered this time */
      }
      return !c;
    });
  }, []);

  // "[" folds and opens the sidebar, unless someone is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      )
        return;
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    if (isValidEventId(eventId)) return eventId;
    if (isValidEventId(primaryEventId)) return primaryEventId;
    return events[0]?.id;
  });

  const availableEvents = events;

  useEffect(() => {
    try {
      if (isValidEventId(eventId)) {
        setSelectedId(eventId);
        window.localStorage.setItem(selectedKey, eventId);
        return;
      }
      const stored = window.localStorage.getItem(selectedKey);
      if (stored && availableEvents.some((ev) => ev.id === stored)) {
        setSelectedId(stored);
        return;
      }
      const fallback = isValidEventId(primaryEventId)
        ? primaryEventId
        : availableEvents[0]?.id;
      setSelectedId(fallback);
    } catch {
      // Ignore storage errors
    }
  }, [availableEvents, eventId, primaryEventId, selectedKey]);

  const activeEvent = useMemo<SwitcherEvent | null>(() => {
    if (availableEvents.length === 0) return null;
    if (selectedId) {
      const found = availableEvents.find((ev) => ev.id === selectedId);
      if (found) return found;
    }
    if (isValidEventId(primaryEventId)) {
      const primary = availableEvents.find((ev) => ev.id === primaryEventId);
      if (primary) return primary;
    }
    return availableEvents[0] ?? null;
  }, [availableEvents, primaryEventId, selectedId]);

  const handleSelectEvent = (nextId: string) => {
    setSelectedId(nextId);
    try {
      window.localStorage.setItem(selectedKey, nextId);
    } catch {
      // Ignore storage errors
    }
    // On an event page, stay on the same section of the newly chosen event.
    if (isValidEventId(eventId) && nextId !== eventId) {
      const base = `/events/${eventId}`;
      const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
      router.push(`/events/${nextId}${rest}`);
    }
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-ivory text-night flex flex-col scroll-pt-20 scroll-pb-32 md:scroll-pb-8",
        ready && "sb-ready"
      )}
      style={
        { "--sb-offset": collapsed ? "108px" : "292px" } as React.CSSProperties
      }
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-burgundy focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar
        events={availableEvents}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
        userEmail={userEmail}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        ready={ready}
      />

      <div className="sb-offset flex-1 flex flex-col md:pl-[var(--sb-offset)] pb-[calc(8.75rem+env(safe-area-inset-bottom))] md:pb-12">
        <TopBar eventId={activeEvent?.id} userEmail={userEmail} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 max-w-[1280px] w-full mx-auto focus:outline-none"
        >
          {children}
        </main>
      </div>

      <PhoneDock
        events={availableEvents}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
      />
    </div>
  );
}
