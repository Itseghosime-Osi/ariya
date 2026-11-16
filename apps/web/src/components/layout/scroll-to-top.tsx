"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Every page opens at its top. Browsers otherwise put you back where you left off, on a reload and
 * on Back, which on a long page lands you in the middle of something you never chose to open.
 *
 * Runs before paint (SCROLL_TOP_BOOT in lib/scroll-top-boot.ts, in each root layout's <head>) to turn off the browser's own
 * restoring, and here on every change of page, including Back and Forward inside the app. A link
 * to a place on a page (#section) still goes to that place.
 */

export function ScrollToTop() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      if (location.hash) return;
    } else if (location.hash) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
