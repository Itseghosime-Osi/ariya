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

  const href = isLoggedIn ? "/events" : "/sign-in?next=%2Fevents";
  const label = isLoggedIn ? "Go to dashboard" : "Sign in to dashboard";

  return (
    <Link
      className="btn gate-dashboard-btn"
      id="gateDashboardBtn"
      href={href}
      title={
        isLoggedIn
          ? "Go directly to your celebration dashboard"
          : "Sign in to access your dashboard"
      }
    >
      <span>{label}</span>
      <span aria-hidden="true" className="arrow">
        →
      </span>
    </Link>
  );
}
