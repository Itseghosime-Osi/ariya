"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { SHOW_TIPS_EVENT } from "./RouteTips";
import { isOverviewPath, tipsForPath } from "./page-help";

/**
 * Help for the page that is open: the tour on a celebration's overview, the page's tips anywhere
 * else that has them. Not shown where there is nothing to bring back.
 */
export function HelpButton({ className }: { className?: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const overview = isOverviewPath(pathname);
  const tips = tipsForPath(pathname);
  if (!overview && !tips) return null;

  const open = () => {
    if (overview) {
      router.push(`${pathname}?tour=1`, { scroll: false });
      return;
    }
    window.dispatchEvent(new Event(SHOW_TIPS_EVENT, { cancelable: true }));
    // Bring the card into view: it sits at the top of the page.
    window.requestAnimationFrame(() =>
      document
        .querySelector(`[data-testid="page-tips-${tips?.key}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    );
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label={
        overview ? "Help: tour this page" : "Help: tips for this page"
      }
      title={overview ? "Show me around" : "Tips for this page"}
      data-testid="help-button"
      className={className}
    >
      <CircleHelp size={18} aria-hidden="true" />
    </button>
  );
}
