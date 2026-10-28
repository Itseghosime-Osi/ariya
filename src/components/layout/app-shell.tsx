"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { GlobalSearch } from "./global-search";

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

  return (
    <div className="min-h-screen bg-ivory overflow-x-hidden">
      <Sidebar eventId={eventId} userEmail={userEmail} />
      <div className="pl-0 md:pl-[84px] pb-20 md:pb-0">
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
