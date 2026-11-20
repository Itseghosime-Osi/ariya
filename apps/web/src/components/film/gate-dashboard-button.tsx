"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function GateDashboardButton() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    try {
      const supabase = createClient();
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (active) {
            setIsLoggedIn(Boolean(data.session));
          }
        })
        .catch(() => {
          if (active) setIsLoggedIn(false);
        });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) {
          setIsLoggedIn(Boolean(session));
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch {
      if (active) setIsLoggedIn(false);
    }
  }, []);

  // The gate leads with planning; the film's colour, sound and viewing choices come second.
  // One door: new visitors start planning (sign-up links to sign-in for returning hosts).
  if (!isLoggedIn) {
    return (
      <Link
        prefetch={false}
        className="btn gold gate-dashboard-btn gate-start-btn"
        id="gateDashboardBtn"
        href="/sign-up"
        title="Create your first event"
      >
        <span>Start planning</span>
        <span aria-hidden="true" className="arrow">
          →
        </span>
      </Link>
    );
  }

  return (
    <Link
      prefetch={false}
      className="btn gold gate-dashboard-btn gate-start-btn"
      id="gateDashboardBtn"
      href="/events"
      title="Go directly to your celebration dashboard"
    >
      <span>Go to dashboard</span>
      <span aria-hidden="true" className="arrow">
        →
      </span>
    </Link>
  );
}
