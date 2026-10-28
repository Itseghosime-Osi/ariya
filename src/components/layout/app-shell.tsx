import React from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { PhoneTabBar } from "./PhoneTabBar";
import { FloatingNewEvent } from "./FloatingNewEvent";

interface AppShellProps {
  children: React.ReactNode;
  eventId?: string;
  primaryEventId?: string;
  eventTitle?: string;
  eventDate?: string;
  daysAway?: number;
  userEmail?: string;
  showFloatingNewEvent?: boolean;
}

export function AppShell({
  children,
  eventId,
  primaryEventId,
  eventTitle,
  eventDate,
  daysAway,
  userEmail,
  showFloatingNewEvent = false,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-ivory text-night flex flex-col scroll-pt-20 scroll-pb-28 md:scroll-pb-8">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-burgundy focus:text-ivory focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      <Sidebar eventId={eventId} userEmail={userEmail} />

      <div className="flex-1 flex flex-col md:pl-[88px] lg:pl-[228px] pb-28 md:pb-12">
        <TopBar
          eventId={eventId}
          eventTitle={eventTitle}
          eventDate={eventDate}
          daysAway={daysAway}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 max-w-[1280px] w-full mx-auto focus:outline-none"
        >
          {children}
        </main>
      </div>

      {showFloatingNewEvent && <FloatingNewEvent />}
      <PhoneTabBar eventId={eventId} primaryEventId={primaryEventId} />
    </div>
  );
}
