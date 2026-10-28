"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { PhoneTabBar } from "./PhoneTabBar";
import { FloatingNewEvent } from "./FloatingNewEvent";
import { isValidEventId, type SwitcherEvent } from "./nav-items";

interface AppShellProps {
  children: React.ReactNode;
  eventId?: string;
  primaryEventId?: string;
  eventTitle?: string;
  eventDate?: string;
  daysAway?: number;
  userEmail?: string;
  events?: SwitcherEvent[];
  showFloatingNewEvent?: boolean;
}

export function AppShell({
  children,
  eventId,
  primaryEventId,
  eventTitle,
  eventDate,
  userEmail,
  events: propEvents,
  showFloatingNewEvent = false,
}: AppShellProps) {
  const router = useRouter();
  const userKey = userEmail?.trim().toLowerCase() || "default";
  const selectedKey = `ariya:selected-event:${userKey}`;
  const cacheKey = `ariya:events-cache:${userKey}`;

  const [cachedEvents, setCachedEvents] = useState<SwitcherEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    if (isValidEventId(eventId)) return eventId;
    if (isValidEventId(primaryEventId)) return primaryEventId;
    return propEvents?.[0]?.id;
  });

  useEffect(() => {
    try {
      if (propEvents) {
        window.localStorage.setItem(cacheKey, JSON.stringify(propEvents));
      } else {
        const raw = window.localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = JSON.parse(raw) as SwitcherEvent[];
          if (Array.isArray(parsed)) {
            setCachedEvents(parsed);
          }
        }
      }
    } catch {
      // Ignore storage failures in private browsing or restricted contexts
    }
  }, [cacheKey, propEvents]);

  const availableEvents = useMemo<SwitcherEvent[]>(() => {
    const base = propEvents ?? cachedEvents;
    if (isValidEventId(eventId) && eventTitle) {
      const exists = base.some((ev) => ev.id === eventId);
      if (!exists) {
        return [
          { id: eventId, title: eventTitle, date: eventDate ?? "" },
          ...base,
        ];
      }
    }
    return base;
  }, [cachedEvents, eventDate, eventId, eventTitle, propEvents]);

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
    if (isValidEventId(eventId) && nextId !== eventId) {
      router.push(`/events/${nextId}`);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-night flex flex-col scroll-pt-20 scroll-pb-28 md:scroll-pb-8">
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
      />

      <div className="flex-1 flex flex-col md:pl-[244px] pb-[calc(8.75rem+env(safe-area-inset-bottom))] md:pb-12">
        <TopBar eventId={activeEvent?.id} userEmail={userEmail} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 max-w-[1280px] w-full mx-auto focus:outline-none"
        >
          {children}
        </main>
      </div>

      {showFloatingNewEvent && <FloatingNewEvent />}
      <PhoneTabBar
        events={availableEvents}
        activeEvent={activeEvent}
        onSelectEvent={handleSelectEvent}
      />
    </div>
  );
}
