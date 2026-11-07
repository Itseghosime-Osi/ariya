"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cameFromApp, PREVIOUS_PAGE_KEY } from "@/lib/previous-page";

/**
 * A Back button that returns to the page the person came from. It is a real link to `href` (the
 * page to fall back to), so it still works with no script, in a new tab, or when they arrived from
 * outside the app; when they came from somewhere in the app it steps back through history instead,
 * which also restores that page's scroll position.
 */
export function BackLink({
  href,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  const router = useRouter();
  const [fromApp, setFromApp] = useState(false);

  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = sessionStorage.getItem(PREVIOUS_PAGE_KEY);
    } catch {
      /* no storage: the referrer is all there is */
    }
    setFromApp(
      cameFromApp({
        previous,
        referrer: document.referrer,
        current: window.location.pathname,
        origin: window.location.origin,
      })
    );
  }, []);

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        // Let a modified click (new tab, new window) behave like any link.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
          return;
        if (fromApp && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {children}
    </Link>
  );
}
