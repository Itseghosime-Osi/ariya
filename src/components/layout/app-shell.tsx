"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { GlobalSearch } from "./global-search";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "ariya-sidebar";

interface AppShellProps {
  children: React.ReactNode;
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  daysAway?: number | null;
  userEmail?: string;
}

export function AppShell({
  children,
  eventId,
  eventTitle,
  eventDate,
  daysAway,
  userEmail,
}: AppShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
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

  return (
    <div
      className={cn(
        "min-h-screen bg-ivory overflow-x-hidden",
        ready && "sb-ready"
      )}
      style={
        { "--sb-offset": collapsed ? "108px" : "292px" } as React.CSSProperties
      }
    >
      <Sidebar
        eventId={eventId}
        userEmail={userEmail}
        daysAway={daysAway}
        collapsed={collapsed}
        onToggle={toggleSidebar}
        ready={ready}
      />
      <div className="sb-offset pl-0 md:pl-[var(--sb-offset)] pb-20 md:pb-0">
        <TopBar
          title={eventTitle}
          dateStr={eventDate}
          daysAway={daysAway}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <main className="w-full pt-16 min-h-screen px-4 md:px-8 py-8 overflow-x-hidden">
          <div className="max-w-[1440px] w-full mx-auto">{children}</div>
        </main>
      </div>
      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        eventId={eventId}
      />
    </div>
  );
}
